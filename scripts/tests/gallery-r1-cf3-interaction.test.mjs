import test from 'node:test';
import assert from 'node:assert/strict';
import {
  galleryActivateFilter,
  galleryInitialState,
  gallerySelectPage,
  GALLERY_FILTER_ORDER,
} from '../../app/utils/gallery-view.ts';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('CF3: initial all-page1 and independent page stores', () => {
  const state = galleryInitialState();
  assert.equal(state.activeFilter, 'all');
  assert.deepEqual(state.pageByFilter, { all: 1, photo: 1, video: 1 });
  assert.deepEqual(GALLERY_FILTER_ORDER, ['all', 'photo', 'video']);
});

test('CF3: category switching preserves each category page and original immutable input', () => {
  const initial = galleryInitialState();
  const all3 = gallerySelectPage(initial, 3, 3);
  const photos = galleryActivateFilter(all3, 'photo');
  const photo2 = gallerySelectPage(photos, 2, 4);
  const videos = galleryActivateFilter(photo2, 'video');
  const video2 = gallerySelectPage(videos, 2, 3);
  const back = galleryActivateFilter(video2, 'photo');
  assert.equal(back.pageByFilter.photo, 2);
  assert.equal(back.pageByFilter.all, 3);
  assert.equal(back.pageByFilter.video, 2);
  assert.equal(initial.pageByFilter.all, 1);
  assert.deepEqual(galleryInitialState().pageByFilter, { all: 1, photo: 1, video: 1 });
});

test('CF3: repeated filter/page intent is an exact no-op', () => {
  const state = galleryInitialState();
  assert.equal(galleryActivateFilter(state, 'all'), state);
  assert.equal(gallerySelectPage(state, 1, 3), state);
});

test('CF3: invalid category and page actions are explicit errors', () => {
  const state = galleryInitialState();
  assert.throws(() => galleryActivateFilter(state, 'images'), /SMD_GALLERY_R1_FILTER_INVALID/);
  for (const page of [0, -1, 2, 1.5, Number.NaN]) {
    assert.throws(() => gallerySelectPage(state, page, 1), /SMD_GALLERY_R1_PAGINATION_INVALID/);
  }
});

test('CF3: active pub identity is the only Gallery session reset owner', () => {
  const source = read('app/components/gallery/GalleryFrame2.vue');
  assert.match(source, /watch\(\(\) => \[props\.publicationId, props\.publicationDigest\]/);
  assert.match(source, /session\.value = galleryInitialState\(\)/);
  assert.match(source, /session\.value = galleryActivateFilter\(session\.value, filter\)/);
  assert.match(source, /session\.value = gallerySelectPage\(session\.value, page, pageResult\.value\.totalPages\)/);
  assert.doesNotMatch(source, /useAsyncData|\$fetch|navigateTo|router\.push|localStorage|sessionStorage/);
});

test('CF3: real tabs are buttons with keyboard, roving focus and no native link navigation', () => {
  const source = read('app/components/gallery/GalleryCategoryTabs.vue');
  assert.match(source, /role="tablist"/);
  assert.match(source, /role="tab"/);
  assert.match(source, /:aria-selected=/);
  assert.match(source, /:tabindex=/);
  for (const key of ['ArrowRight', 'ArrowLeft', 'Home', 'End']) assert.ok(source.includes(key));
  assert.match(source, /@click="emit\('change', filter\)"/);
  assert.doesNotMatch(source, /<NuxtLink|<a\s+href/);
});

test('CF3: gallery player keeps old click-to-play path, new gallery frame is opt-in', () => {
  const player = read('app/components/archive/ArchiveYoutubePlayer.vue');
  const card = read('app/components/gallery/GalleryMediaCard.vue');
  assert.match(player, /frameMode\?:'default'\|'gallery'/);
  assert.match(player, /frameMode:'default'/);
  assert.match(player, /v-if="playing"/);
  assert.match(player, /@click="playing=true"/);
  assert.match(player, /aspect-\[4\/3\]/);
  assert.match(card, /frame-mode="gallery"/);
  assert.match(card, /entry\.media\.kind === 'youtube'/);
  assert.match(card, /entry\.badgeLabel/);
});
