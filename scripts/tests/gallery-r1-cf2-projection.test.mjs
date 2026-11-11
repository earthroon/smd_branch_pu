import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GALLERY_FILTER_V1,
  GALLERY_PAGE_SIZE,
  buildGalleryProjectionV1,
} from '../../app/utils/gallery-view.ts';
import { archiveLaneOf, validateArchiveCollectionV3 } from '@smd/content-contracts/archive-contracts';

const digest = 'a'.repeat(64);
const publication = { id: 'published-r1', digest };
const asset = index => `archive/${index.toString(16).padStart(64, '0')}.webp`;
const img = (index, sortOrder = index, visible = true) => ({
  id: `photo-${String(index).padStart(3, '0')}`, title: `사진 ${index}`, description: '수강 현장',
  sortOrder, visible,
  media: { kind: 'image', assetKey: asset(index + 1), alt: '수강 현장 사진' },
});
const vid = (index, sortOrder = index, visible = true) => ({
  id: `video-${String(index).padStart(3, '0')}`, title: `영상 ${index}`, description: '실습 현장',
  sortOrder, visible,
  media: { kind: 'youtube', youtubeId: 'M7lc1UVf-VE', posterKey: asset(index + 100),
    thumbnails: [{ assetKey: asset(index + 200), alt: '관련 사진' }] },
});
const collection = items => ({ kind: 'archive-collection', schemaVersion: 3, items });
const project = items => buildGalleryProjectionV1(collection(items), publication);

test('CF2: fixed filter labels and page size 9', () => {
  assert.deepEqual(Object.keys(GALLERY_FILTER_V1), ['all', 'photo', 'video']);
  assert.deepEqual(GALLERY_FILTER_V1.all.lanes, ['photo', 'video']);
  assert.equal(GALLERY_FILTER_V1.photo.label, '사진');
  assert.equal(GALLERY_FILTER_V1.video.label, '영상');
  assert.equal(GALLERY_PAGE_SIZE, 9);
});

test('CF2: canonical sortOrder/id, visibility and precise badge labels', () => {
  const source = [vid(1, 9), img(2, 9), img(1, 20), vid(2, 1),
    { ...img(3, 0, false), media: null }];
  const result = project(source);
  assert.equal(result.contract, 'SMD_GALLERY_PROJECTION_V1');
  assert.equal(result.sourcePublicationId, publication.id);
  assert.equal(result.sourcePublicationDigest, publication.digest);
  assert.deepEqual(result.views.all.map(x => x.id),
    ['video-002', 'photo-002', 'video-001', 'photo-001']);
  assert.deepEqual(result.views.photo.map(x => x.id), ['photo-002', 'photo-001']);
  assert.deepEqual(result.views.video.map(x => x.id), ['video-002', 'video-001']);
  assert.deepEqual(result.views.all.map(x => x.badgeLabel), ['영상', '사진', '영상', '사진']);
  assert.deepEqual(result.views.all.map(x => x.mediaKind), ['video', 'photo', 'video', 'photo']);
  assert.deepEqual(result.views.video[0].media.thumbnails.length, 1);
  assert.equal(result.views.all.length, result.views.photo.length + result.views.video.length);
  assert.equal(new Set(result.views.all.map(x => x.id)).size, result.views.all.length);
  assert.equal(result.views.all.some(x => x.id === 'photo-003'), false);
  assert.deepEqual(source.at(-1).media, null); // No mutation of source.
});

test('CF2: canonical archiveLaneOf remains source of actual media kind', () => {
  const original = collection([img(1), vid(2)]);
  const validated = validateArchiveCollectionV3(original);
  assert.deepEqual(validated.items.map(archiveLaneOf), ['photo', 'video']);
  const projected = project(original.items);
  assert.equal(projected.views.photo[0].media.kind, 'image');
  assert.equal(projected.views.video[0].media.kind, 'youtube');
});

test('CF2: 4 photos and 5 videos are all nine unique posts, not supplemental thumbs', () => {
  const items = [...Array.from({ length: 4 }, (_, i) => img(i + 1, i * 2)),
    ...Array.from({ length: 5 }, (_, i) => vid(i + 1, i * 2 + 1))];
  const result = project(items);
  assert.deepEqual([result.views.all.length, result.views.photo.length, result.views.video.length], [9, 4, 5]);
  assert.equal(result.views.all.some(x => x.id.includes('thumbnail')), false);
  assert.equal(result.views.all.filter(x => x.mediaKind === 'video').length, 5);
});

test('CF2: empty valid V3 is a legitimate empty projection', () => {
  const v = project([]);
  assert.deepEqual([v.views.all.length, v.views.photo.length, v.views.video.length], [0, 0, 0]);
});

test('CF2: historical V2 is explicitly not promoted to Gallery V3', () => {
  assert.throws(() => buildGalleryProjectionV1({ kind: 'archive-collection', schemaVersion: 2, items: [] }, publication),
    /SMD_GALLERY_R1_ARCHIVE_SCHEMA_UNSUPPORTED/);
});

test('CF2: invalid publication is rejected, not assigned a fabricated identity', () => {
  assert.throws(() => buildGalleryProjectionV1(collection([]), { id: '', digest }),
    /SMD_GALLERY_R1_PUBLICATION_STALE/);
  assert.throws(() => buildGalleryProjectionV1(collection([]), { id: 'x', digest: 'invalid' }),
    /SMD_GALLERY_R1_PUBLICATION_STALE/);
});

test('CF2: visible missing media, invalid kind, and duplicate ID retain existing validator failures', () => {
  assert.throws(() => project([{ ...img(1), media: null }]), /ARCHIVE_VISIBLE_MEDIA_REQUIRED/);
  assert.throws(() => project([{ ...img(1), media: { kind: 'mp4' } }]), /ARCHIVE_MEDIA_KIND_INVALID/);
  assert.throws(() => project([img(1), img(1)]), /ARCHIVE_ENTRY_ID_DUPLICATE/);
});

test('CF2: title contains 영상 but actual verified image still classifies as photo', () => {
  const v = project([{ ...img(1), title: '영상으로 보는 수업' }]);
  assert.equal(v.views.all[0].mediaKind, 'photo');
  assert.equal(v.views.all[0].badgeLabel, '사진');
});
