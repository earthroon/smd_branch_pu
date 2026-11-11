import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { reviewsVisualSourceLock, reviewsTokenSource } from '../../app/data/reviews-r1-manifest.ts';
import { reviewsFigmaNodes, reviewsFigmaSemanticSlots, reviewsFigmaFilterBindings } from '../../app/data/reviews-r1-figma.ts';
import {
  assertReviewsVisualSourceV1,
  assertReviewsLedgerDetails,
  assertReviewsTokenSourceV1,
} from '../reviews-r1/verify-source.mjs';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const rows = () => read('scripts/fixtures/reviews-r1/skin.jsonl').trim().split('\n').map(JSON.parse);
const mutate = (records, kind, key) => records.find(row => row.kind === kind && (row.nodeKey ?? row.target) === key);

test('CF1: SHA lock, 177 native nodes, 35 semantic nodes, and immutable product qualification', () => {
  const receipt = assertReviewsVisualSourceV1();
  assert.equal(receipt.nodeCount, 177);
  assert.equal(receipt.bindingCount, 35);
  assert.equal(receipt.nodeIdentityStatus, 'PASS');
  assert.equal(receipt.blockedPaintCasesPreserved, true);
  assert.equal(receipt.pixelParity, 'NOT_RUN');
  assert.equal(receipt.productCommitAllowed, false);
  const digest = createHash('sha256').update(read('scripts/fixtures/reviews-r1/skin.jsonl')).digest('hex');
  assert.equal(digest, reviewsVisualSourceLock.figmaJsonlSha256);
  assert.deepEqual(reviewsVisualSourceLock.viewport, [1920, 3033]);
  assert.equal(reviewsFigmaNodes['node-4:200'].nodeKind, 'FRAME');
  assert.equal(reviewsFigmaSemanticSlots.cards.length, 3);
});

test('CF1: Figma text buttons and semantic registry are exactly bound, not review ID authority', () => {
  assert.deepEqual(Object.keys(reviewsFigmaFilterBindings),
    ['all', 'interior-film', 'glass-film', 'career-prep']);
  assert.deepEqual(Object.values(reviewsFigmaFilterBindings).map(binding => binding.label),
    ['전체 후기', '인테리어필름', '유리필름', '취업·창업 준비']);
  assert.deepEqual(reviewsFigmaNodes['node-4:351'].worldTopLeft, [434, 359]);
  assert.deepEqual(reviewsFigmaNodes['node-4:353'].worldTopLeft, [436, 412]);
  assert.deepEqual(reviewsFigmaNodes['node-4:326'].worldTopLeft, [466, 944]);
  assert.deepEqual(reviewsFigmaNodes['node-4:312'].worldTopLeft.map(Math.round), [438, 1077]);
  assert.equal(reviewsFigmaNodes['node-4:353'].paintQualification.status, 'blocked');
  assert.equal(reviewsFigmaNodes['node-4:353'].text.lineHeight.value, 83.61741638183594);
});

test('CF1: duplicate Node ID fails, even when node count is unchanged', () => {
  const input = rows();
  mutate(input, 'node', 'node-4:325').nodeKey = 'node-4:326';
  assert.throws(() => assertReviewsLedgerDetails(input), /SMD_REVIEWS_R1_NODE_DUPLICATE/);
});

test('CF1: deleted semantic key and invalid ancestor fail closed', () => {
  const input = rows();
  mutate(input, 'node', 'node-4:327').parent = 'node-not-found';
  assert.throws(() => assertReviewsLedgerDetails(input), /SMD_REVIEWS_R1_NODE_MISSING/);
});

test('CF1: changed world geometry cannot be admitted as the source layout', () => {
  const input = rows();
  mutate(input, 'node', 'node-4:353').rectLocal[1] += 4;
  assert.throws(() => assertReviewsLedgerDetails(input), /SMD_REVIEWS_R1_COORDINATE_DRIFT/);
});

test('CF1: source text cannot be edited without source revision', () => {
  const input = rows();
  mutate(input, 'native-text', 'node-4:324').characters = '유리창필름';
  assert.throws(() => assertReviewsLedgerDetails(input), /SMD_REVIEWS_R1_TEXT_SOURCE_DRIFT/);
});

test('CF1: blocked paint is never promoted by a candidate SVG render case', () => {
  const input = rows();
  mutate(input, 'node-paint-source-v9-r2a', 'node-4:321').status = 'candidate';
  assert.throws(() => assertReviewsLedgerDetails(input), /SMD_REVIEWS_R1_SOURCE_WITNESS_MISMATCH/);
});

test('CF1: verified global token sources and CF5 versioned Standalone reviews transition', () => {
  const main = read('app/assets/css/main.css');
  const header = read('app/assets/css/home-r2-header.css');
  const tw = read('tailwind.config.ts');
  assert.equal(assertReviewsTokenSourceV1(main, header, tw), true);
  assert.equal(reviewsTokenSource.contentMaxWidth.px, 1280);
  assert.equal(reviewsTokenSource.proposedReviewsInnerWidthPx, 1046);
  assert.throws(() => assertReviewsTokenSourceV1(main.replace('#172C57', '#112233'), header, tw),
    /SMD_REVIEWS_R1_TOKEN_SOURCE_DRIFT/);
  const page = read('app/pages/reviews.vue');
  const root = read('app/app.vue');
  assert.match(page, /<ReviewsBodyStage v-if="standalone"/);
  assert.match(page, /data-cms-scaffold-only="true"/);
  assert.match(root, /kind: 'reviews'/);
  assert.match(read('app/pages/archive.vue'), /GalleryStandalonePreview/);
  assert.match(read('app/data/home-r2-navigation.ts'), /targetStatus: 'scaffold'/);
});
