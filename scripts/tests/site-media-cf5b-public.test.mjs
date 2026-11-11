import test from 'node:test';import assert from 'node:assert/strict';
import {makeSiteMediaBindingsV1} from '@smd/content-contracts/site-media-contracts';
import {resolvePublishedSiteMediaSlot} from '../../app/utils/site-media-binding.ts';
import {validateRenderResponseV5} from '../../server/utils/site-media-v5-render.ts';
import {validateRenderEnvelopeV5} from '../../server/utils/render.ts';
import {readFileSync} from 'node:fs';
const pageCopy=JSON.parse(readFileSync(new URL('./fixtures/page-copy-v1.golden.json',import.meta.url)));
import {EMPTY_PAGE_SLOTS} from '@smd/content-contracts/page-slot-contracts';
const fakePub={id:'p1',revision:2,digest:'c'.repeat(64),at:'2026-10-16T00:00:00.000Z'};
const assetId='sm_'+'a'.repeat(64);
globalThis.createError=({statusCode,statusMessage})=>Object.assign(new Error(statusMessage),{statusCode,statusMessage});
async function sample(slots=['home.hero.image']){
 const bindings=await makeSiteMediaBindingsV1(1,slots.map(slotId=>({slotId,assetId,alt:'ALT',title:'TITLE',displayMode:'natural'})));
 const siteMedia={schema:'SMD_SITE_MEDIA_PUBLIC_PROJECTION_V1',publicationId:'p1',publicationDigest:fakePub.digest,bindings,assets:slots.length?[{assetId,width:20,height:10,mimeType:'image/png'}]:[]};
 const content={publication:fakePub,siteMedia,pageSlots:EMPTY_PAGE_SLOTS,pages:pageCopy,archive:{kind:'archive-collection',schemaVersion:2,items:[]},navigation:{},promotion:{}};
 const render={schema:'SMD_RENDER_RESPONSE_V5',publication:fakePub,requestedPath:'/',resolvedPath:'/',shared:content,selected:{mode:'legacy',pageId:'home',templateKind:'legacy-home-v1',seo:{title:'t',description:'d',noindex:false},slots:{}}};
 return {render,content};
}
test('CF5B render V5 validator and resolver produce an admitted image',async()=>{
 const {render,content}=await sample();const verified=await validateRenderResponseV5(render,'/');assert.equal(verified.schema,'SMD_RENDER_RESPONSE_V5');
 const r=resolvePublishedSiteMediaSlot(content,{id:'p1',digest:fakePub.digest},'home.hero.image');
 assert.equal(r.kind,'v5');assert.equal(r.image.src,`/api/media/image/${assetId}`);assert.equal(r.image.width,20);
 assert.equal(r.image.admission,'V5_BINDING_ADMITTED');
});
test('CF5B absent V5 binding and V1-V4 content use legacy only',async()=>{
 const {render,content}=await sample([]);
 await validateRenderResponseV5(render,'/');
 assert.deepEqual(resolvePublishedSiteMediaSlot(content,{id:'p1',digest:fakePub.digest},'home.hero.image'),{kind:'legacy'});
 const {siteMedia,...legacy}=content;
 assert.deepEqual(resolvePublishedSiteMediaSlot(legacy,{id:'p1',digest:fakePub.digest},'home.hero.image'),{kind:'legacy'});
});
test('CF5B validates projection publication identity and rejects incomplete bound metadata',async()=>{
 const {render}=await sample();
 await assert.rejects(()=>validateRenderResponseV5({...render,shared:{...render.shared,siteMedia:{...render.shared.siteMedia,assets:[]}}},'/'),e=>e.statusCode===503);
 await assert.rejects(()=>validateRenderResponseV5({...render,shared:{...render.shared,siteMedia:{...render.shared.siteMedia,publicationDigest:'b'.repeat(64)}}},'/'),e=>e.statusCode===503);
 await assert.rejects(()=>validateRenderResponseV5({...render,requestedPath:'/about'},'/'),e=>e.statusCode===503);
});
test('CF5B unadmitted identity does not fall back to legacy when binding exists',async()=>{
 const {content}=await sample();
 assert.throws(()=>resolvePublishedSiteMediaSlot(content,{id:'p2',digest:fakePub.digest},'home.hero.image'),e=>e.code==='SITE_MEDIA_BINDING_INVALID');
 assert.throws(()=>resolvePublishedSiteMediaSlot({...content,siteMedia:{...content.siteMedia,assets:[]}},
   {id:'p1',digest:fakePub.digest},'home.hero.image'),e=>e.code==='SITE_MEDIA_BINDING_INVALID');
});
test('CF5B V5 and historic envelope dispatch preserve validation ownership',async()=>{
 const {render}=await sample();const result=await validateRenderEnvelopeV5({schema:'SMD_RENDER_ENVELOPE_V5',kind:'site-media-v1',render},'/');assert.equal(result.schema,'SMD_RENDER_RESPONSE_V5');
 await assert.rejects(()=>validateRenderEnvelopeV5({schema:'SMD_RENDER_ENVELOPE_V5',kind:'historical',render},'/'),e=>e.statusCode===503);
});
test('CF5B core contract tarball at Public pin has exact source digest',()=>{
 const rel=JSON.parse(readFileSync(new URL('../../vendor/content-contracts/RELEASE.json',import.meta.url)));
 assert.equal(rel.version,'0.7.0');assert.match(rel.sha256,/^[a-f0-9]{64}$/);
});

test('CF5B historical V4 envelope remains validated through original V3 path',async()=>{
 const {render}=await sample([]);
 const {schema,shared,...old}=render;
 const {siteMedia,...legacyShared}=shared;
 const historical={...old,shared:legacyShared};
 const result=await validateRenderEnvelopeV5({schema:'SMD_RENDER_ENVELOPE_V4',kind:'historical',render:historical},'/');
 assert.deepEqual(result,historical);
});
