/** CF5B: validates published image resolution before any V5 image enters a Vue component. */
import {assertSiteMediaBindingsV1} from '@smd/content-contracts/site-media-contracts';
import type {RenderResponseV5,SiteMediaPublicAssetV1} from '@smd/content-contracts/contracts';
import {LEGACY_CANONICAL_PATHS} from '@smd/content-contracts/category-page-contracts';
import {validateArchiveCollectionAny} from '@smd/content-contracts/archive-contracts';
import {LEGACY_PAGE_IDS} from '@smd/content-contracts/cms-kind-registry';
import {validatePagesDocumentV2} from '@smd/content-contracts/page-slot-contracts';
const record=(v:unknown):v is Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const keys=(v:Record<string,unknown>,k:readonly string[])=>
  JSON.stringify(Object.keys(v).sort())===JSON.stringify([...k].sort());
const hex=/^[a-f0-9]{64}$/;
const assetId=/^(sm|sb)_[a-f0-9]{64}$/;
function canonicalSlots(value:unknown):string{
  const sort=(x:unknown):unknown=>Array.isArray(x)?x.map(sort):record(x)?
    Object.fromEntries(Object.keys(x).sort().map(k=>[k,sort(x[k])])):x;
  return JSON.stringify(sort(value));
}
function fail():never{throw createError({statusCode:503,statusMessage:'CMS_RENDER_V5_CONTRACT_INVALID'});}

export async function validateRenderResponseV5(value:unknown,path:string):Promise<RenderResponseV5>{
  if(!record(value)||!keys(value,['schema','publication','requestedPath','resolvedPath','shared','selected'])||
    value.schema!=='SMD_RENDER_RESPONSE_V5'||value.requestedPath!==path||value.resolvedPath!==path||
    !record(value.publication)||!record(value.shared)||!record(value.selected))return fail();
  const pub=value.publication,shared=value.shared,selected=value.selected;
  if(typeof pub.id!=='string'||pub.id.length===0||typeof pub.revision!=='number'||!Number.isSafeInteger(pub.revision)||pub.revision<1||
    typeof pub.at!=='string'||!Number.isFinite(Date.parse(pub.at))||typeof pub.digest!=='string'||!hex.test(pub.digest)||
    !record(shared.publication)||shared.publication.id!==pub.id||
    shared.publication.revision!==pub.revision||shared.publication.digest!==pub.digest||
    !record(shared.pageSlots)||!record(shared.pages)||!record(shared.archive)||
    !record(shared.navigation)||!record(shared.promotion)||!record(shared.siteMedia)||
    typeof selected.pageId!=='string'||!record(selected.slots)||
    !record(selected.seo)||typeof selected.seo.title!=='string'||
    typeof selected.seo.description!=='string'||typeof selected.seo.noindex!=='boolean')return fail();
  const videoMode=selected.mode==='archive-lane';
  const navigation=shared.navigation as Record<string,unknown>;
  const listed=[...(Array.isArray(navigation.leftNav)?navigation.leftNav:[]),
    ...(Array.isArray(navigation.rightNav)?navigation.rightNav:[])].filter(v=>
      record(v)&&v.to==='/videos');
  if(videoMode){
    if(path!=='/videos'||selected.pageId!=='videos'||
      selected.templateKind!=='archive-video-v1'||selected.lane!=='video'||
      Object.keys(selected.slots).length!==0||
      !record(shared.archive)||shared.archive.schemaVersion!==3||listed.length!==1)return fail();
  }else{
    if(selected.mode!=='legacy'||
      LEGACY_CANONICAL_PATHS[selected.pageId as keyof typeof LEGACY_CANONICAL_PATHS]!==path||
      selected.templateKind!==`legacy-${selected.pageId}-v1`)return fail();
    if(shared.archive.schemaVersion===3?listed.length!==1:listed.length!==0)return fail();
  }
  // Reassemble solely for validation, never persist or change the published identity.
  // PageCopyV1 output is the public projection; the entire PageSetV2 stays in V5 snapshot.
  if(!keys(shared.pageSlots,LEGACY_PAGE_IDS))return fail();
  const routes=Object.fromEntries(LEGACY_PAGE_IDS.map(id=>[id,{
    kind:'page',schemaVersion:1,templateKind:`legacy-${id}-v1`,slots:(shared.pageSlots as Record<string,unknown>)[id]
  }]));
  try {validatePagesDocumentV2({kind:'page-set',schemaVersion:2,registryRevision:1,
    legacy:shared.pages,routes});}catch{return fail();}
  const selectedSlotTree=(shared.pageSlots as Record<string,unknown>)[String(selected.pageId)];
  if(!videoMode&&(!record(selectedSlotTree)||canonicalSlots(selected.slots)!==canonicalSlots(selectedSlotTree)))return fail();
  try{validateArchiveCollectionAny(shared.archive);}catch{return fail();}
  const projection=shared.siteMedia;
  if(!keys(projection,['schema','publicationId','publicationDigest','bindings','assets'])||
    projection.schema!=='SMD_SITE_MEDIA_PUBLIC_PROJECTION_V1'||
    projection.publicationId!==pub.id||projection.publicationDigest!==pub.digest||
    !Array.isArray(projection.assets)||projection.assets.length>8)return fail();
  try{await assertSiteMediaBindingsV1(projection.bindings);}catch{return fail();}
  const bindings=projection.bindings as RenderResponseV5['shared']['siteMedia']['bindings'];
  const assets=projection.assets as unknown[];
  const wanted=new Set(bindings.bindings.map(v=>v.assetId));
  const actual=new Set<string>();
  let previous='';
  for(const value of assets){
    if(!record(value)||!keys(value,['assetId','width','height','mimeType'])||
      typeof value.assetId!=='string'||!assetId.test(value.assetId)||
      !wanted.has(value.assetId as SiteMediaPublicAssetV1['assetId'])||actual.has(value.assetId)||
      previous>=value.assetId||typeof value.width!=='number'||!Number.isSafeInteger(value.width)||value.width<1||
      typeof value.height!=='number'||!Number.isSafeInteger(value.height)||value.height<1||value.width*value.height>Number.MAX_SAFE_INTEGER||
      !(value.assetId.startsWith('sb_')?value.mimeType==='image/svg+xml':
        ['image/png','image/jpeg','image/webp'].includes(String(value.mimeType))))return fail();
    actual.add(value.assetId);previous=value.assetId;
  }
  if(actual.size!==wanted.size)return fail();
  return value as RenderResponseV5;
}
