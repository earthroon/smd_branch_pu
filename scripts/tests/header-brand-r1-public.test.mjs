import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makeSiteMediaBindingsV1} from '@smd/content-contracts/site-media-contracts';
import {resolvePublishedBrandSymbol,resolvePublishedSiteMediaSlot} from '../../app/utils/site-media-binding.ts';
import {validateRenderResponseV5} from '../../server/utils/site-media-v5-render.ts';
import {EMPTY_PAGE_SLOTS} from '@smd/content-contracts/page-slot-contracts';
const p={id:'p1',revision:11,digest:'a'.repeat(64),at:'2026-10-19T00:00:00.000Z'};
const sb='sb_'+'b'.repeat(64),sm='sm_'+'c'.repeat(64);
const brand={slotId:'site.header.symbol',assetId:sb,alt:'로고',title:'로고',displayMode:'contain'};
const raster={slotId:'home.hero.image',assetId:sm,alt:'사진',title:'사진',displayMode:'natural'};
const base={publication:p,navigation:{},promotion:{},archive:{kind:'archive-collection',schemaVersion:2,items:[]}};
const pageCopy=JSON.parse(readFileSync(new URL('./fixtures/page-copy-v1.golden.json',import.meta.url)));
const assets=[{assetId:sb,width:142,height:142,mimeType:'image/svg+xml'},
 {assetId:sm,width:120,height:80,mimeType:'image/png'}];
async function fixture(bindingRows=[brand,raster]){
 const bindings=await makeSiteMediaBindingsV1(3,bindingRows);
 const content={...base,pages:pageCopy,pageSlots:EMPTY_PAGE_SLOTS,siteMedia:{
  schema:'SMD_SITE_MEDIA_PUBLIC_PROJECTION_V1',publicationId:p.id,
  publicationDigest:p.digest,bindings,assets:assets.filter(a=>bindingRows.some(b=>b.assetId===a.assetId))}};
 return content;
}
const render=content=>({schema:'SMD_RENDER_RESPONSE_V5',publication:p,requestedPath:'/',resolvedPath:'/',
 shared:content,selected:{mode:'legacy',pageId:'home',templateKind:'legacy-home-v1',
   slots:EMPTY_PAGE_SLOTS.home,seo:{title:'home',description:'home',noindex:false}}});
globalThis.createError=({statusCode,statusMessage})=>Object.assign(new Error(statusMessage),{statusCode,statusMessage});
test('CF5 V5 header brand and historic raster co-exist in one projection',async()=>{
 const content=await fixture();await validateRenderResponseV5(render(content),'/');
 const brandSymbol=resolvePublishedBrandSymbol(content,p);
 assert.deepEqual(brandSymbol,{kind:'published-svg',src:`/api/media/brand/${sb}`,assetId:sb,width:142,height:142});
 const img=resolvePublishedSiteMediaSlot(content,p,'home.hero.image');
 assert.equal(img.kind,'v5');assert.equal(img.image.src,`/api/media/image/${sm}`);
});
test('CF5 missing published brand returns legacy S while raster remains V5',async()=>{
 const content=await fixture([raster]);
 assert.deepEqual(resolvePublishedBrandSymbol(content,p),{kind:'legacy'});
 assert.equal(resolvePublishedSiteMediaSlot(content,p,'home.hero.image').kind,'v5');
});
test('CF5 stale identity and missing brand asset explicitly reject',async()=>{
 const content=await fixture();
 assert.throws(()=>resolvePublishedBrandSymbol(content,{...p,id:'different'}),/BINDING_INVALID/);
 assert.throws(()=>resolvePublishedBrandSymbol({...content,siteMedia:{...content.siteMedia,assets:[]}},p),/BINDING_INVALID/);
});
test('CF5 raster resolver never accepts the brand slot',async()=>{
 const content=await fixture();
 assert.throws(()=>resolvePublishedSiteMediaSlot(content,p,'site.header.symbol'),/BINDING_INVALID/);
});
test('CF5 malformed brand asset MIME rejected, not interpreted as raster',async()=>{
 const content=await fixture();
 const broken={...content,siteMedia:{...content.siteMedia,
   assets:content.siteMedia.assets.map(a=>a.assetId===sb?{...a,mimeType:'image/png'}:a)}};
 await assert.rejects(()=>validateRenderResponseV5(render(broken),'/'),e=>e.statusCode===503);
});
