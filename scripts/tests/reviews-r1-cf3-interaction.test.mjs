import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeReviewCollectionDigestV1,
} from '../../app/utils/reviews-contract.ts';
import {
  REVIEW_INITIAL_VISIBLE, REVIEW_LOAD_INCREMENT,
  admitReviewCategoryQuery, buildReviewProjectionV1,
  reviewInitialInteractionState, reviewRebaseInteraction,
  reviewVisibleItems, reviewLoadMore, reviewFilterChangeIntent,
  reviewKeyboardTabIntent, reviewTabAccessibility,
  reviewNavigationCompletionIsCurrent,
} from '../../app/utils/reviews-view.ts';

const entry = (i, category = 'glass-film', visibility = 'public') => ({
  id: `review-${String(i).padStart(3, '0')}`, category, title: `검증용 제목 ${i}`,
  body: '가상 테스트 문구', authorDisplayName: '시험 작성자', courseLabel: '시험 과정',
  displayOrder: i, visibility,
  consent: { verified: visibility === 'public', receiptId: visibility === 'public' ? `fixture-${i}` : null },
});
const projection = rows => {
  const source = { contract: 'SMD_REVIEW_COLLECTION_V1', schemaVersion: 1,
    sourceRevision: 'test-interaction-r1', sourceDigest: '0'.repeat(64), entries: rows };
  return buildReviewProjectionV1({ ...source, sourceDigest: computeReviewCollectionDigestV1(source) });
};

test('CF3: absent/exact/legacy all queries admitted or canonicalized', () => {
  assert.deepEqual(admitReviewCategoryQuery({}), {kind:'admitted', filter:'all'});
  assert.deepEqual(admitReviewCategoryQuery({unrelated:'keep'}), {kind:'admitted', filter:'all'});
  for (const category of ['interior-film', 'glass-film', 'career-prep']) {
    assert.deepEqual(admitReviewCategoryQuery({category}), {kind:'admitted', filter: category});
  }
  assert.deepEqual(admitReviewCategoryQuery({category:'all'}),
    {kind:'canonicalize', filter:'all', replace:true});
});

test('CF3: bogus/empty/repeated/array/malformed category is 400, never all fallback', () => {
  for (const query of [null, [], 'category=all', {},
    { category: '' }, { category: 'bogus' }, { category: 'ALL' },
    { category: null }, { category: undefined }, { category: 0 },
    { category: ['glass-film', 'career-prep'] }, { category: ['glass-film'] },
  ]) {
    if (query && typeof query === 'object' && !Array.isArray(query) && !('category' in query)) continue;
    assert.deepEqual(admitReviewCategoryQuery(query),
      {kind:'rejected', statusCode:400, code:'SMD_REVIEWS_R1_QUERY_INVALID'});
  }
});

test('CF3: 0/1/2/3/4/6/7/10 entries are sliced exactly; empty is a real result', () => {
  assert.equal(REVIEW_INITIAL_VISIBLE, 3);
  assert.equal(REVIEW_LOAD_INCREMENT, 3);
  for (const total of [0,1,2,3,4,6,7,10]) {
    const p = projection(Array.from({length:total}, (_,i) => entry(i)));
    let state = reviewInitialInteractionState(p.sourceDigest);
    const first = reviewVisibleItems(p, 'all', state);
    assert.equal(first.visibleCount, Math.min(total,3));
    assert.equal(first.hasMore, total>3);
    assert.equal(first.empty, total===0);
    for (let i=0;i<4;i+=1) {
      const previous = state;
      state = reviewLoadMore(state,'all',total);
      const result=reviewVisibleItems(p,'all',state);
      assert.equal(result.visibleCount, Math.min(total,3*(i+2)));
      assert.equal(result.hasMore, result.visibleCount<total);
      if (previous.visibleByFilter.all>=total) assert.equal(previous,state);
    }
  }
});

test('CF3: per-category count is preserved when URL filter changes; no activeFilter field', () => {
  const p = projection(Array.from({length:10},(_,i)=>entry(i,'glass-film')));
  const first = reviewInitialInteractionState(p.sourceDigest);
  const all6 = reviewLoadMore(first,'all',10);
  const all9 = reviewLoadMore(all6,'all',10);
  const glass6 = reviewLoadMore(all9,'glass-film',10);
  assert.equal(reviewVisibleItems(p,'all',glass6).visibleCount,9);
  assert.equal(reviewVisibleItems(p,'glass-film',glass6).visibleCount,6);
  assert.equal(reviewVisibleItems(p,'career-prep',glass6).visibleCount,0);
  assert.equal(Object.prototype.hasOwnProperty.call(glass6,'activeFilter'),false);
  assert.equal(first.visibleByFilter.all,3);
});

test('CF3: sourceDigest rebase resets all counts and rejects stale view until rebased', () => {
  const first = projection(Array.from({length:10},(_,i)=>entry(i)));
  const second = projection([entry(20, 'interior-film')]);
  assert.notEqual(first.sourceDigest, second.sourceDigest);
  const extended = reviewLoadMore(reviewInitialInteractionState(first.sourceDigest), 'all', 10);
  assert.throws(() => reviewVisibleItems(second,'all',extended), /SMD_REVIEWS_R1_SOURCE_STALE/);
  const updated = reviewRebaseInteraction(extended,second.sourceDigest);
  assert.equal(reviewVisibleItems(second,'glass-film',updated).empty,true);
  assert.deepEqual(Object.values(updated.visibleByFilter),[3,3,3,3]);
  assert.equal(reviewRebaseInteraction(updated,second.sourceDigest), updated);
});

test('CF3: invalid visible counts, invalid filters, invalid total and digest fail closed', () => {
  const p=projection([entry(1)]);
  const initial=reviewInitialInteractionState(p.sourceDigest);
  assert.throws(() => reviewInitialInteractionState('wrong'), /SMD_REVIEWS_R1_INTERACTION_STATE_INVALID/);
  assert.throws(() => reviewLoadMore(initial,'wrong',1), /SMD_REVIEWS_R1_FILTER_INVALID/);
  assert.throws(() => reviewLoadMore(initial,'all',-1), /SMD_REVIEWS_R1_VISIBLE_COUNT_INVALID/);
  assert.throws(() => reviewLoadMore(initial,'all',1.5), /SMD_REVIEWS_R1_VISIBLE_COUNT_INVALID/);
  assert.throws(() => reviewLoadMore({sourceDigest:p.sourceDigest,visibleByFilter:{all:0,
    'interior-film':3,'glass-film':3,'career-prep':3}},'all',1),
    /SMD_REVIEWS_R1_VISIBLE_COUNT_INVALID/);
  assert.throws(() => reviewVisibleItems(p,'incorrect',initial), /SMD_REVIEWS_R1_FILTER_INVALID/);
});

test('CF3: internal filter navigation intent is one push or exact noop; URL remains owner', () => {
  assert.deepEqual(reviewFilterChangeIntent('all','all'),{kind:'noop',filter:'all'});
  assert.deepEqual(reviewFilterChangeIntent('all','glass-film'),
    {kind:'navigate',filter:'glass-film',history:'push',query:{category:'glass-film'}});
  assert.deepEqual(reviewFilterChangeIntent('glass-film','all'),
    {kind:'navigate',filter:'all',history:'push',query:{}});
  assert.throws(() => reviewFilterChangeIntent('all','bogus'), /SMD_REVIEWS_R1_FILTER_INVALID/);
});

test('CF3: back/forward query playback returns selected filter without extra local authority', () => {
  const history = [{}, {category:'glass-film'}, {category:'career-prep'}];
  const forward = history.map(query => admitReviewCategoryQuery(query));
  assert.deepEqual(forward.map(result => result.filter),['all','glass-film','career-prep']);
  assert.equal(admitReviewCategoryQuery(history[1]).filter,'glass-film');
  assert.equal(admitReviewCategoryQuery(history[0]).filter,'all');
});

test('CF3: stale async navigation completion never gets a presentation approval', () => {
  assert.equal(reviewNavigationCompletionIsCurrent(1,2,{category:'glass-film'},
    {category:'career-prep'}), false);
  assert.equal(reviewNavigationCompletionIsCurrent(2,2,{category:'career-prep'},
    {category:'career-prep'}),true);
  assert.equal(reviewNavigationCompletionIsCurrent(2,2,{category:'all'},{}),false);
  assert.equal(reviewNavigationCompletionIsCurrent(2,2,{category:'bogus'},{}),false);
});

test('CF3: keyboard Arrow/Home/End, native activation, and roving ARIA', () => {
  assert.equal(reviewKeyboardTabIntent('all','ArrowLeft'),'career-prep');
  assert.equal(reviewKeyboardTabIntent('all','ArrowRight'),'interior-film');
  assert.equal(reviewKeyboardTabIntent('glass-film','Home'),'all');
  assert.equal(reviewKeyboardTabIntent('all','End'),'career-prep');
  assert.equal(reviewKeyboardTabIntent('glass-film','Enter'),null);
  assert.equal(reviewKeyboardTabIntent('glass-film',' '),null);
  assert.deepEqual(reviewTabAccessibility('glass-film','glass-film'),
    {role:'tab','aria-selected':true,'aria-controls':'reviews-results',tabindex:0});
  assert.equal(reviewTabAccessibility('all','glass-film').tabindex,-1);
});

test('CF3: hidden/draft items remain inaccessible even after repeated load more', () => {
  const p=projection([entry(1,'glass-film','draft'),...Array.from({length:10},(_,i)=>entry(i+2))]);
  let state=reviewInitialInteractionState(p.sourceDigest);
  for (let i=0;i<6;i+=1) state=reviewLoadMore(state,'all',p.views.all.length);
  assert.equal(reviewVisibleItems(p,'all',state).total,10);
  assert.equal(reviewVisibleItems(p,'all',state).items.some(x=>x.id==='review-001'),false);
});

test('CF3: non-plain URL query and interaction states reject rather than coerce', () => {
  assert.deepEqual(admitReviewCategoryQuery(new Date()),
    { kind:'rejected', statusCode:400, code:'SMD_REVIEWS_R1_QUERY_INVALID' });
  const p = projection([]);
  const state = Object.assign(Object.create({ inOtherRealm: true }),
    reviewInitialInteractionState(p.sourceDigest));
  assert.throws(() => reviewLoadMore(state,'all',0),
    /SMD_REVIEWS_R1_INTERACTION_STATE_INVALID/);
});
