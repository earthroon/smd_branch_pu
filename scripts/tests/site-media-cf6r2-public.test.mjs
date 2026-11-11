import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makeSiteMediaBindingsV1} from '@smd/content-contracts/site-media-contracts';
import {EMPTY_PAGE_SLOTS} from '@smd/content-contracts/page-slot-contracts';
import {validateRenderResponseV5} from '../../server/utils/site-media-v5-render.ts';
globalThis.createError=({statusCode,statusMessage})=>Object.assign(new Error(statusMessage),{statusCode,statusMessage});
const pages=JSON.parse(readFileSync(new URL('./fixtures/page-copy-v1.golden.json',import.meta.url)));
const pub={id:'v5-page-r2',revision:2,digest:'a'.repeat(64),at:'2026-10-16T00:00:00.000Z'};
const notice={id:'notice-alpha',kind:'notice',schemaVersion:1,props:{heading:'공지',body:'슬롯 유지',tone:'neutral'}};
async function fixture(){
 const pageSlots=structuredClone(EMPTY_PAGE_SLOTS);pageSlots.home.afterHero=[notice];
 const bindings=await makeSiteMediaBindingsV1(1,[]);
 return{schema:'SMD_RENDER_RESPONSE_V5',publication:pub,requestedPath:'/',resolvedPath:'/',
   shared:{pages,pageSlots,archive:{kind:'archive-collection',schemaVersion:2,items:[]},
     navigation:{},promotion:{},publication:pub,
     siteMedia:{schema:'SMD_SITE_MEDIA_PUBLIC_PROJECTION_V1',publicationId:pub.id,
       publicationDigest:pub.digest,bindings,assets:[]}},
   selected:{mode:'legacy',pageId:'home',templateKind:'legacy-home-v1',slots:structuredClone(pageSlots.home),
     seo:{title:'title',description:'desc',noindex:false}}
 };
}
const is503=e=>e.statusCode===503;
test('CF6R2 Published V5 V2 slot tree validates with authored root',async()=>{
 const x=await fixture();const r=await validateRenderResponseV5(x,'/');
 assert.equal(r.selected.slots.afterHero[0].id,'notice-alpha');
});
test('CF6R2 mismatched published selected slots are rejected, never hidden by legacy image',async()=>{
 const x=await fixture();x.selected.slots={};await assert.rejects(()=>validateRenderResponseV5(x,'/'),is503);
});
test('CF6R2 dynamic PageSetV2 slot cannot introduce unregistered CMS block',async()=>{
 const x=await fixture();x.shared.pageSlots.home.afterHero=[{...notice,kind:'unknown-node'}];
 x.selected.slots=x.shared.pageSlots.home;await assert.rejects(()=>validateRenderResponseV5(x,'/'),is503);
});
test('CF6R2 V5 slot map requires all seven legacy page keys',async()=>{
 const x=await fixture();delete x.shared.pageSlots.contact;
 await assert.rejects(()=>validateRenderResponseV5(x,'/'),is503);
});
