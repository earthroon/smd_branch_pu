import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { reviewsSha256Utf8 } from '../../app/utils/reviews-sha256.ts';
import {
  REVIEW_FILTER_ORDER, REVIEW_FILTER_V1, computeReviewCollectionDigestV1,
  validateReviewCollectionV1, isReviewCategoryId,
} from '../../app/utils/reviews-contract.ts';
import { buildReviewProjectionV1 } from '../../app/utils/reviews-view.ts';
import { standaloneReviewsR1Source } from '../../app/data/reviews-r1-source.ts';

const item = (id, category = 'interior-film', more = {}) => ({
  id, category,
  title: `시험 제목 ${id}`, body: '공개 검증용 가상 문구',
  authorDisplayName: '테스트 작성자', courseLabel: '검증용 과정',
  displayOrder: 0, visibility: 'public',
  consent: { verified: true, receiptId: `fixture-receipt-${id}` },
  ...more,
});
const draft = id => item(id, 'interior-film', { visibility: 'draft', consent: { verified: false, receiptId: null } });
const source = (entries, revision = 'fixture-r1') => {
  const input = { contract: 'SMD_REVIEW_COLLECTION_V1', schemaVersion: 1,
    sourceRevision: revision, sourceDigest: '0'.repeat(64), entries };
  return { ...input, sourceDigest: computeReviewCollectionDigestV1(input) };
};

test('CF2: SHA-256 pure TS matches independent Node SHA-256 including UTF-8 and multi-block', () => {
  for (const s of ['', 'abc', '후기 테스트😀', '가'.repeat(70), 'z'.repeat(65_537)]) {
    assert.equal(reviewsSha256Utf8(s), createHash('sha256').update(s, 'utf8').digest('hex'));
  }
});

test('CF2: categories are three explicit authoring lanes; all is lookup-only', () => {
  assert.deepEqual(REVIEW_FILTER_ORDER, ['all', 'interior-film', 'glass-film', 'career-prep']);
  assert.deepEqual(Object.keys(REVIEW_FILTER_V1), [...REVIEW_FILTER_ORDER]);
  assert.equal(isReviewCategoryId('all'), false);
  assert.equal(isReviewCategoryId('career-prep'), true);
  assert.throws(() => source([item('review-id', 'all')]), /SMD_REVIEWS_R1_CATEGORY_INVALID/);
});

test('CF2: supplied source has NO invented student testimonials or CMS ID', () => {
  assert.deepEqual(standaloneReviewsR1Source.entries, []);
  assert.equal(validateReviewCollectionV1(standaloneReviewsR1Source).entries.length, 0);
  assert.equal(buildReviewProjectionV1(standaloneReviewsR1Source).views.all.length, 0);
  assert.match(standaloneReviewsR1Source.sourceRevision, /^standalone-empty-/);
});

test('CF2: stable canonical digest is independent from key insertion order, but array order counts', () => {
  const a = source([item('film-c'), item('film-a')]);
  const b = { entries: a.entries, sourceDigest: a.sourceDigest, sourceRevision: a.sourceRevision,
    schemaVersion: a.schemaVersion, contract: a.contract };
  assert.equal(computeReviewCollectionDigestV1(b), a.sourceDigest);
  assert.notEqual(computeReviewCollectionDigestV1({ ...a, entries: [...a.entries].reverse() }), a.sourceDigest);
  assert.notEqual(computeReviewCollectionDigestV1({ ...a, sourceRevision: 'fixture-r2' }), a.sourceDigest);
  assert.deepEqual(validateReviewCollectionV1(a).entries.map(x => x.id), ['film-c', 'film-a']);
});

test('CF2: category projection sorts by order then stable ID; draft never publishes', () => {
  const a = source([
    item('review-z', 'glass-film', { displayOrder: 9 }),
    item('review-y', 'career-prep', { displayOrder: 0 }),
    item('review-b', 'interior-film', { displayOrder: 1 }),
    draft('review-hidden'),
    item('review-a', 'interior-film', { displayOrder: 1 }),
  ]);
  const projection = buildReviewProjectionV1(a);
  assert.deepEqual(projection.views.all.map(x => x.id),
    ['review-y', 'review-a', 'review-b', 'review-z']);
  assert.deepEqual(projection.views['glass-film'].map(x => x.id), ['review-z']);
  assert.deepEqual(projection.views['career-prep'].map(x => x.id), ['review-y']);
  assert.deepEqual(projection.views['interior-film'].map(x => x.id), ['review-a', 'review-b']);
  assert.equal(projection.views.all.some(x => x.id === 'review-hidden'), false);
  assert.equal(a.entries[0].id, 'review-z');
});

test('CF2: unapproved public entry is a fatal admission failure, not a filtered fallback', () => {
  const wrong = item('review-no-consent', 'interior-film', { consent: { verified: false, receiptId: null } });
  assert.throws(() => source([wrong]), /SMD_REVIEWS_R1_PUBLIC_CONSENT_MISSING/);
  assert.throws(() => source([item('review-without-receipt', 'interior-film',
    { consent: { verified: true, receiptId: null } })]), /SMD_REVIEWS_R1_PUBLIC_CONSENT_MISSING/);
});

test('CF2: draft-only collection is admissible, but view remains empty', () => {
  const collection = source([draft('review-draft-a'), draft('review-draft-b')]);
  const projection = buildReviewProjectionV1(collection);
  assert.equal(projection.views.all.length, 0);
  assert.equal(projection.views['interior-film'].length, 0);
});

test('CF2: duplicate IDs across draft/public rejected', () => {
  assert.throws(() => source([item('reused-id'), draft('reused-id')]), /SMD_REVIEWS_R1_DUPLICATE_ID/);
});

test('CF2: invalid schemas, unexpected fields, inherited prototype and cyclic entry are rejected', () => {
  const a = source([]);
  for (const mutant of [
    { ...a, schemaVersion: 2 },
    { ...a, publicationId: 'pretend-cms' },
    { ...a, entries: null },
    Object.assign(Object.create({ hidden: true }), a),
  ]) assert.throws(() => validateReviewCollectionV1(mutant), /SMD_REVIEWS_R1_SCHEMA_INVALID/);
  const accessor = { ...a };
  Object.defineProperty(accessor, 'entries', { enumerable: true, get() { return []; } });
  assert.throws(() => validateReviewCollectionV1(accessor), /SMD_REVIEWS_R1_SCHEMA_INVALID/);
  const cyclic = item('cycle-entry');
  cyclic.consent = cyclic;
  assert.throws(() => source([cyclic]), /SMD_REVIEWS_R1_ENTRY_INVALID/);
});

test('CF2: malformed fields and displayOrder are rejected without truncation/coercion', () => {
  const changes = [
    { title: '' }, { title: ' '.repeat(2) }, { title: 't'.repeat(121) },
    { body: 'a'.repeat(3001) }, { authorDisplayName: '\u0000' },
    { title: '\uD800' }, { courseLabel: '과정\n개행' },
    { displayOrder: 0.5 }, { displayOrder: Number.NaN },
    { displayOrder: Number.MAX_SAFE_INTEGER + 1 }, { displayOrder: -1 },
    { id: '0' }, { id: 'index-0' },
  ];
  for (const [idx, change] of changes.entries()) {
    assert.throws(() => source([item('review-valid', 'interior-film', change)]),
      /SMD_REVIEWS_R1_ENTRY_INVALID/, `bad field variant ${idx}`);
  }
});

test('CF2: tampered content/digest and future mutations cannot modify admitted snapshots', () => {
  const a = source([item('review-immutable')]);
  const clone = structuredClone(a);
  clone.entries[0].title = '출처 없이 바꾼 제목';
  assert.throws(() => validateReviewCollectionV1(clone), /SMD_REVIEWS_R1_SOURCE_DIGEST_MISMATCH/);
  assert.throws(() => validateReviewCollectionV1({ ...a, sourceDigest: 'f'.repeat(64) }),
    /SMD_REVIEWS_R1_SOURCE_DIGEST_MISMATCH/);
  const admitted = validateReviewCollectionV1(a);
  a.entries[0].title = '검증 이후 변조';
  assert.notEqual(admitted.entries[0].title, a.entries[0].title);
  assert.equal(Object.isFrozen(admitted.entries[0]), true);
  assert.equal(Object.isFrozen(admitted.entries[0].consent), true);
});

test('CF2: sparse/extended Array instances cannot mutate canonical membership silently', () => {
  const seed = source([]);
  const sparse = new Array(2);
  sparse[0] = item('review-present');
  assert.throws(() => validateReviewCollectionV1({ ...seed, entries: sparse }),
    /SMD_REVIEWS_R1_SCHEMA_INVALID/);
  const extra = [];
  extra.custom = 'not-a-review';
  assert.throws(() => validateReviewCollectionV1({ ...seed, entries: extra }),
    /SMD_REVIEWS_R1_SCHEMA_INVALID/);
});
