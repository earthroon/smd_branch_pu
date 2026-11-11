import test from 'node:test';
import assert from 'node:assert/strict';
import { galleryPaginate, galleryPageTokens, GALLERY_PAGE_SIZE } from '../../app/utils/gallery-view.ts';

const ids = n => Array.from({ length: n }, (_, i) => `item-${i + 1}`);
const pages = n => galleryPaginate(ids(n), 1);

test('CF3: page size 9, empty, 9, 10, 21, and 500 entries', () => {
  assert.equal(GALLERY_PAGE_SIZE, 9);
  assert.deepEqual(pages(0), { currentPage: 1, totalPages: 0, items: [] });
  assert.equal(pages(9).totalPages, 1);
  assert.deepEqual(galleryPaginate(ids(10), 2).items, ['item-10']);
  assert.deepEqual(galleryPaginate(ids(21), 3).items, ['item-19', 'item-20', 'item-21']);
  assert.equal(galleryPaginate(ids(500), 56).items.length, 5);
});

test('CF3: page beyond end clamps to last visible page, without input mutation', () => {
  const input = ids(10);
  const result = galleryPaginate(input, 99);
  assert.equal(result.currentPage, 2);
  assert.deepEqual(result.items, ['item-10']);
  assert.equal(input.length, 10);
});

test('CF3: zero or noninteger page is rejected, never coerced', () => {
  for (const page of [0, -1, 1.2, NaN, Infinity]) {
    assert.throws(() => galleryPaginate(ids(10), page), /SMD_GALLERY_R1_PAGINATION_INVALID/);
  }
});

test('CF3: Figma 1/2/3 displays exact three tokens, no extra placeholders', () => {
  assert.deepEqual(galleryPageTokens(3, 1), [
    { kind: 'page', key: 'page-1', page: 1 },
    { kind: 'page', key: 'page-2', page: 2 },
    { kind: 'page', key: 'page-3', page: 3 },
  ]);
  assert.deepEqual(galleryPageTokens(0, 1), []);
  assert.deepEqual(galleryPageTokens(1, 1), []);
});

test('CF3: bounded window keeps first, neighbors, and last with ellipses', () => {
  const tokens = galleryPageTokens(30, 15);
  assert.deepEqual(tokens.map(x => x.kind === 'page' ? x.page : '…'), [1, '…', 14, 15, 16, '…', 30]);
  assert.equal(tokens.length, 7);
  assert.equal(galleryPageTokens(30, 1).length <= 6, true);
});

test('CF3: invalid total/window request rejects explicitly', () => {
  assert.throws(() => galleryPageTokens(-1, 1), /SMD_GALLERY_R1_PAGINATION_INVALID/);
  assert.throws(() => galleryPageTokens(3, 4), /SMD_GALLERY_R1_PAGINATION_INVALID/);
  assert.throws(() => galleryPageTokens(3, 0), /SMD_GALLERY_R1_PAGINATION_INVALID/);
  assert.throws(() => galleryPageTokens(0, 2), /SMD_GALLERY_R1_PAGINATION_INVALID/);
});
