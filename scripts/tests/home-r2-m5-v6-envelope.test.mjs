import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makeSiteMediaBindingsV1} from '@smd/content-contracts/site-media-contracts';
import {EMPTY_PAGE_SLOTS} from '@smd/content-contracts/page-slot-contracts';
import {homeR2Source} from '../../app/data/home-r2-manifest.ts';
import {validateRenderEnvelopeV5} from '../../server/utils/render.ts';
const pages=JSON.parse(readFileSync(new URL('./fixtures/page-copy-v1.golden.json',import.meta.url)));
const pub={id:'fixture-v6',revision:12,digest:'a'.repeat(64),at:'2026-10-30T00:00:00.000Z'};
globalThis.createError=({statusCode,statusMessage})=>Object.assign(new Error(statusMessage),{statusCode,statusMessage});
const assetId='sm_'+'f'.repeat(64);
async function sample(){
 const bindings=await makeSiteMediaBindingsV1(1,[]);
 const siteMedia={schema:'SMD_SITE_MEDIA_PUBLIC_PROJECTION_V1',publicationId:pub.id,publicationDigest:pub.digest,
  bindings,assets:[]};
 const shared={publication:pub,siteMedia,pageSlots:EMPTY_PAGE_SLOTS,pages,
  archive:{kind:'archive-collection',schemaVersion:2,items:[]},navigation:{},promotion:{}};
 const homeR2={contract:'SMD_HOME_R2_PUBLIC_V1',publicationId:pub.id,publicationDigest:pub.digest,
  sourceSnapshotDigest:homeR2Source.sourceSnapshotDigest,sourceWitnessDigest:homeR2Source.sourceWitnessDigest,
  draftRevision:2,draftDigest:'c'.repeat(64),faq:[{id:'home.faq.01',question:'수업 신청은 어떻게 하나요?',answer:'상담신청을 이용합니다.',visible:true}],
  mediaBindings:[{slotId:'home.methods.01.image',assetId,alt:'실습 장면',title:'현장 수업',displayMode:'contain'}],
  assets:[{assetId,width:491,height:416,mimeType:'image/png'}]};
 const render={schema:'SMD_RENDER_RESPONSE_V6',publication:pub,requestedPath:'/',resolvedPath:'/',shared,
  selected:{mode:'legacy',pageId:'home',templateKind:'legacy-home-v1',seo:{title:'SMD',description:'SMD',noindex:false},slots:{}},homeR2};
 return {schema:'SMD_RENDER_ENVELOPE_V6',kind:'home-r2-v1',render};
}
const bad=async(input,code)=>assert.rejects(()=>validateRenderEnvelopeV5(input,'/'),e=>e.statusCode===503&&e.statusMessage===code);
test('M5 end-to-end pure V6 envelope validates V5 legacy share and Home R2 addendum',async()=>{
 const model=await sample();const r=await validateRenderEnvelopeV5(model,'/');
 assert.equal(r.schema,'SMD_RENDER_RESPONSE_V6');assert.equal(r.homeR2.faq[0].id,'home.faq.01');
 assert.equal(r.homeR2.publicationId,r.publication.id);
});
test('M5 V6 identity and public media must bind exactly',async()=>{
 const v=await sample();v.render.homeR2.publicationDigest='b'.repeat(64);
 await bad(v,'SMD_HOME_M4_V6_PROJECTION_INVALID');
});
test('M5 V6 cannot downcast silently into old V5 envelope',async()=>{
 const v=await sample();v.schema='SMD_RENDER_ENVELOPE_V5';v.kind='site-media-v1';
 await bad(v,'CMS_RENDER_V5_CONTRACT_INVALID');
});
test('M5 V6 source mismatch cannot display stale FAQ and media',async()=>{
 const v=await sample();v.render.homeR2.sourceSnapshotDigest='b'.repeat(64);
 await bad(v,'SMD_HOME_M4_V6_PROJECTION_INVALID');
});
test('M5 old V5 envelope continues accepted without Home R2',async()=>{
 const v=await sample();const {homeR2,...legacy}=v.render;
 const r=await validateRenderEnvelopeV5({schema:'SMD_RENDER_ENVELOPE_V5',kind:'site-media-v1',render:{...legacy,schema:'SMD_RENDER_RESPONSE_V5'}},'/');
 assert.equal(r.schema,'SMD_RENDER_RESPONSE_V5');assert.equal('homeR2' in r,false);
});
