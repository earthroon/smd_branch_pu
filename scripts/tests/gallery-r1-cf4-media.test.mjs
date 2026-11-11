import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  galleryArchiveMediaUrl, galleryPosterUrl,
  galleryImageInitialState, galleryImageTransition,
  GALLERY_IMAGE_LOAD_ERROR, GALLERY_POSTER_LOAD_ERROR,
} from '../../app/utils/gallery-media.ts';
const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const hex='e'.repeat(64), id='A1b2C3_d4-E';
const asset=ext=>`archive/${hex}.${ext}`;

test('CF4: all authorized archive image formats map to the single Public media path',()=>{
  for (const ext of ['jpg','jpeg','png','webp'])
    assert.equal(galleryArchiveMediaUrl(asset(ext)),`/api/archive/media/${hex}.${ext}`);
});
test('CF4: invalid paths, external URLs and unsupported formats fail closed',()=>{
  for (const key of [
    `/${asset('jpg')}`,`archive/../${hex}.png`,`https://r2.example/${hex}.jpg`,
    `other/${hex}.png`,`archive/${hex}.gif`,`archive/${hex}.svg`,
    `archive/${hex.toUpperCase()}.jpg`,`archive/${hex}.jpeg?x=1`,
    '',`archive/${'a'.repeat(63)}.png`,
  ]) assert.throws(()=>galleryArchiveMediaUrl(key),/SMD_GALLERY_R1_CF4_MEDIA_ASSET_INVALID/);
});
test('CF4: poster origin exactly follows verified posterKey presence',()=>{
  assert.equal(galleryPosterUrl(asset('webp'),id),`/api/archive/media/${hex}.webp`);
  assert.equal(galleryPosterUrl(null,id),`https://i.ytimg.com/vi/${id}/hqdefault.jpg`);
  assert.throws(()=>galleryPosterUrl('invalid',id),/SMD_GALLERY_R1_CF4_MEDIA_ASSET_INVALID/);
  assert.throws(()=>galleryPosterUrl(null,'invalid'),/ARCHIVE_YOUTUBE_ID_INVALID/);
});
test('CF4: image failure is observable and never replaces source with another URL',()=>{
  const start=galleryImageInitialState('owner-1',`/api/archive/media/${hex}.jpg`);
  assert.equal(start.kind,'loading');
  const failure=galleryImageTransition(start,'error','owner-1',start.src);
  assert.deepEqual(failure,{kind:'failed',ownerKey:'owner-1',src:start.src,code:GALLERY_IMAGE_LOAD_ERROR});
  const ready=galleryImageTransition(start,'load','owner-1',start.src);
  assert.deepEqual(ready,{kind:'ready',ownerKey:'owner-1',src:start.src});
});
test('CF4: late load and error cannot mutate a new owner or source',()=>{
  const start=galleryImageInitialState('new-owner','/api/archive/media/current.png');
  assert.equal(galleryImageTransition(start,'load','old-owner',start.src),start);
  assert.equal(galleryImageTransition(start,'error','new-owner','/api/archive/media/old.png'),start);
});
test('CF4: card exposes explicit load and error, preserves noncrop, badge and alt',()=>{
  const card=read('app/components/gallery/GalleryMediaCard.vue');
  const css=read('app/assets/css/gallery-r1.css');
  assert.match(card,/galleryArchiveMediaUrl\(props\.entry\.media\.assetKey\)/);
  assert.match(card,/@load="onImageEvent\(\$event, 'load'\)"/);
  assert.match(card,/@error="onImageEvent\(\$event, 'error'\)"/);
  assert.match(card,/data-gallery-error-code/);
  assert.match(card,/이미지를 불러오지 못했습니다/);
  assert.match(card,/:alt="entry\.media\.alt"/);
  assert.match(card,/:data-badge-kind="entry\.mediaKind"/);
  assert.match(card,/{{ entry\.badgeLabel }}/);
  assert.match(css,/aspect-ratio: 343\.7843 \/ 305\.8026/);
  assert.match(css,/object-fit: contain/);
  assert.match(css,/\.smd-gallery-card__badge[\s\S]*?pointer-events: none/);
  assert.doesNotMatch(css,/object-fit: cover/);
  assert.doesNotMatch(card,/https:\/\/i\.ytimg\.com|onerror=".*src=/);
});
test('CF4: poster status displays explicit error without removing play button',()=>{
  const player=read('app/components/archive/ArchiveYoutubePlayer.vue');
  assert.match(player,/GALLERY_POSTER_LOAD_ERROR/);
  assert.match(player,/:data-gallery-poster-origin=/);
  assert.match(player,/영상 미리보기를 불러오지 못했습니다/);
  assert.match(player,/@click="playing=true"/);
  assert.match(player,/v-if="playing"/);
  assert.match(player,/iframe/);
  assert.match(player,/frameMode:'default'/);
  assert.match(player,/aspect-\[4\/3\]/);
  assert.match(player,/posterKey\?`\/api\/archive\/media/);
  assert.equal(GALLERY_POSTER_LOAD_ERROR,'SMD_GALLERY_R1_CF4_POSTER_LOAD_FAILED');
});
