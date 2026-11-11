import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { computeReviewCollectionDigestV1 } from '../../app/utils/reviews-contract.ts';
import {buildReviewProjectionV1,reviewInitialInteractionState,reviewRebaseInteraction,
  reviewVisibleItems,reviewLoadMore,reviewFilterChangeIntent,admitReviewCategoryQuery} from '../../app/utils/reviews-view.ts';
import {standaloneReviewsR1Source} from '../../app/data/reviews-r1-source.ts';
import {reviewsVisualSourceLock,reviewsVisualQualification} from '../../app/data/reviews-r1-manifest.ts';
const read=f=>readFileSync(new URL('../../'+f,import.meta.url),'utf8');
function fixture(n){
 const entries=Array.from({length:n},(_,i)=>({id:`consented-${i+10}`,category:['interior-film','glass-film','career-prep'][i%3],
 title:`수강 경험 ${i}`,body:`동결 테스트 내용 ${i}`,authorDisplayName:`익명${i}`,courseLabel:'회귀용',
 displayOrder:i,visibility:'public',consent:{verified:true,receiptId:`test-consent-${i}`}}));
 const base={contract:'SMD_REVIEW_COLLECTION_V1',schemaVersion:1,sourceRevision:`fixture-${n}`,
 sourceDigest:'0'.repeat(64),entries};
 return {...base,sourceDigest:computeReviewCollectionDigestV1(base)};
}

test('CF6: production source has no fabricated review cards or consent receipts',()=>{
 const prod=buildReviewProjectionV1(standaloneReviewsR1Source);
 assert.equal(prod.views.all.length,0);
 for(const filter of ['all','interior-film','glass-film','career-prep']){
  const visible=reviewVisibleItems(prod,filter,reviewInitialInteractionState(prod.sourceDigest));
  assert.equal(visible.empty,true);assert.equal(visible.items.length,0);assert.equal(visible.hasMore,false);
 }
 assert.equal(reviewsVisualSourceLock.productCommitAllowed,false);
 assert.equal(reviewsVisualQualification.pixelParity,'NOT_RUN');
});

test('CF6: test-only 1/2/3/4/6/7/10 review dataset partitions and reveals 3 at a time',()=>{
 for(const n of [1,2,3,4,6,7,10]){
  const source=fixture(n),p=buildReviewProjectionV1(source);
  let state=reviewInitialInteractionState(p.sourceDigest);
  const initial=reviewVisibleItems(p,'all',state);
  assert.equal(initial.items.length,Math.min(3,n));
  assert.equal(initial.hasMore,n>3);
  const expectedOrder=source.entries.map(x=>x.id);
  while(reviewVisibleItems(p,'all',state).hasMore){
   const old=state;state=reviewLoadMore(state,'all',n);
   assert.notEqual(state,old);
  }
  const final=reviewVisibleItems(p,'all',state);
  assert.deepEqual(final.items.map(x=>x.id),expectedOrder);
  assert.equal(final.hasMore,false);
  assert.equal(reviewLoadMore(state,'all',n),state);
  assert.equal(p.views['interior-film'].length+p.views['glass-film'].length+p.views['career-prep'].length,n);
  assert.equal(state.visibleByFilter['glass-film'],3); // Other filters retain their own state.
 }
});

test('CF6: previous category count persists, new source digest resets every category',()=>{
 const p=buildReviewProjectionV1(fixture(10));
 let state=reviewInitialInteractionState(p.sourceDigest);
 state=reviewLoadMore(state,'all',10);
 assert.equal(state.visibleByFilter.all,6);
 assert.equal(reviewFilterChangeIntent('all','glass-film').kind,'navigate');
 assert.equal(reviewVisibleItems(p,'all',state).visibleCount,6);
 const newer=buildReviewProjectionV1(fixture(7));
 const reset=reviewRebaseInteraction(state,newer.sourceDigest);
 assert.equal(reset.visibleByFilter.all,3);
 assert.throws(()=>reviewVisibleItems(newer,'all',state),/SMD_REVIEWS_R1_SOURCE_STALE/);
 assert.equal(reviewVisibleItems(newer,'all',reset).visibleCount,3);
});

test('CF6: Worker deployment is not accidentally pointed to legacy smd-web',()=>{
 const wrangler=read('wrangler.toml');
 assert.match(wrangler,/name\s*=\s*"smd-web"/);
 const script=read('scripts/reviews-r1/verify-target.mjs');
 assert.match(script,/smd-aca-pu/);
 assert.match(script,/DEPLOY_TARGET_MISMATCH/);
 assert.doesNotMatch(script,/deploy\s*\(/);
 const page=read('app/pages/reviews.vue');
 assert.match(page,/noindex,follow/);
 assert.match(page,/v-if="standalone"/);
 assert.match(page,/data-cms-scaffold-only/);
 assert.equal(admitReviewCategoryQuery({category:undefined}).kind,'rejected');
});
