import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import { galleryMediaOwnerKey } from '../../app/utils/gallery-media.ts';
const read = path => readFileSync(new URL(`../../${path}`,import.meta.url),'utf8');
const digest='b'.repeat(64);
const owner={publicationId:'publication-1',publicationDigest:digest,filter:'all',page:1,entryId:'entry-1'};

test('CF4: player owner is deterministic with all five semantic dimensions',()=>{
 const key=galleryMediaOwnerKey(owner);
 assert.equal(key,galleryMediaOwnerKey({...owner}));
 for (const changed of [
  {...owner,publicationId:'publication-2'},
  {...owner,publicationDigest:'c'.repeat(64)},
  {...owner,filter:'video'},
  {...owner,page:2},
  {...owner,entryId:'entry-2'},
 ]) assert.notEqual(galleryMediaOwnerKey(changed),key);
});
test('CF4: invalid owner generations reject rather than silently continuing',()=>{
 for (const changed of [
  {...owner,publicationId:''}, {...owner,publicationDigest:'nohash'},
  {...owner,page:0}, {...owner,page:1.5},
  {...owner,filter:'other'}, {...owner,entryId:''},
 ]) assert.throws(()=>galleryMediaOwnerKey(changed),/SMD_GALLERY_R1_CF4_PLAYER_OWNER_INVALID/);
});
test('CF4: FRAME2 ties vnode key and media component to the same owner',()=>{
 const frame=read('app/components/gallery/GalleryFrame2.vue');
 assert.match(frame,/galleryMediaOwnerKey\(/);
 assert.match(frame,/:key="cardOwnerKey\(entry\.id\)"/);
 assert.match(frame,/:owner-key="cardOwnerKey\(entry\.id\)"/);
 assert.match(frame,/publicationId: props\.publicationId/);
 assert.match(frame,/publicationDigest: props\.publicationDigest/);
 assert.match(frame,/filter: activeFilter\.value/);
 assert.match(frame,/page: pageResult\.value\.currentPage/);
 assert.match(frame,/entryId/);
 assert.match(frame,/:data-gallery-active-filter="activeFilter"/);
 assert.doesNotMatch(frame,/router\.push|navigateTo|useAsyncData/);
});
test('CF4: Gallery default and /videos player semantics are separated',()=>{
 const player=read('app/components/archive/ArchiveYoutubePlayer.vue');
 const gallery=read('app/components/gallery/GalleryMediaCard.vue');
 const videos=read('app/pages/videos.vue');
 assert.match(gallery,/frame-mode="gallery"/);
 assert.match(player,/frameMode\?:'default'\|'gallery'/);
 assert.match(player,/frameMode:'default'/);
 assert.match(player,/props\.frameMode==='gallery'/);
 assert.match(videos,/<ArchiveGallery mode="full" lane="video"\s*\/>/);
 assert.doesNotMatch(videos,/GalleryFrame2/);
});
