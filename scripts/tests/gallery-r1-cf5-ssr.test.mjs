import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import { galleryInitialState, galleryPaginate, buildGalleryProjectionV1, galleryActivateFilter } from '../../app/utils/gallery-view.ts';
const read=p=>readFileSync(new URL(`../../${p}`,import.meta.url),'utf8');
const publication={id:'pub-42',digest:'f'.repeat(64)};
const image=i=>({id:`media-${String(i).padStart(3,'0')}`,title:`Photo ${i}`,description:'A',visible:true,sortOrder:i,media:{kind:'image',assetKey:`archive/${'e'.repeat(64)}.jpg`,alt:'A'}});
const video=i=>({id:`media-${String(i).padStart(3,'0')}`,title:`Video ${i}`,description:'B',visible:true,sortOrder:i,media:{kind:'youtube',youtubeId:'A1b2C3_d4-E',posterKey:null,thumbnails:[]}});
const fixture={kind:'archive-collection',schemaVersion:3,items:Array.from({length:21},(_,i)=>i%2?video(i):image(i))};

test('CF5: identical published V3 produces deterministic SSR and hydration initial IDs',()=>{
 const server=buildGalleryProjectionV1(fixture,publication);
 const client=buildGalleryProjectionV1(JSON.parse(JSON.stringify(fixture)),publication);
 const init=galleryInitialState();
 const pages=[server,client].map(x=>galleryPaginate(x.views[init.activeFilter],init.pageByFilter.all));
 assert.deepEqual(pages.map(x=>x.items.map(y=>y.id)),[pages[0].items.map(y=>y.id),pages[0].items.map(y=>y.id)]);
 assert.equal(pages[0].totalPages,3);
 assert.deepEqual(pages[0].items.map(x=>x.badgeLabel),pages[1].items.map(x=>x.badgeLabel));
 assert.equal(server.sourcePublicationDigest,client.sourcePublicationDigest);
});
test('CF5: filter is UI-only and never publishes a new archive/source',()=>{
 const src=JSON.stringify(fixture);
 const projection=buildGalleryProjectionV1(fixture,publication);
 const filter=galleryActivateFilter(galleryInitialState(),'video');
 assert.equal(galleryPaginate(projection.views[filter.activeFilter],1).items.every(x=>x.mediaKind==='video'),true);
 assert.equal(JSON.stringify(fixture),src);
});
test('CF5: initial UI state, pub reset and category events are source deterministic',()=>{
 const frame=read('app/components/gallery/GalleryFrame2.vue');
 assert.match(frame,/const session = ref\(galleryInitialState\(\)\)/);
 assert.match(frame,/watch\(\(\) => \[props\.publicationId, props\.publicationDigest\]/);
 assert.match(frame,/session\.value = galleryInitialState\(\)/);
 assert.match(frame,/galleryActivateFilter\(session\.value, filter\)/);
 assert.match(frame,/gallerySelectPage\(session\.value, page/);
 assert.doesNotMatch(frame,/window\.|localStorage|sessionStorage|Math\.random|useAsyncData|fetch\(/);
});
