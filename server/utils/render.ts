import {validateHomeR2RenderEnvelopeV6} from './home-r2-v6-render.ts';
import type {RenderResponseV6Candidate} from '../../app/utils/homeR2ScaffoldAdmission';
import {validateArchiveCollectionV2} from '@smd/content-contracts/archive-contracts';
import type {RenderResponseV5} from '@smd/content-contracts/contracts';
import {validateRenderResponseV5} from './site-media-v5-render.ts';
import type {RenderEnvelopeV4,RenderResponseV4} from '@smd/content-contracts/contracts';
import {LEGACY_CANONICAL_PATHS} from '@smd/content-contracts/category-page-contracts';
import type {RenderResponseV3,PublicRenderedPageV3} from '@smd/content-contracts/contracts';
const record=(x:unknown):x is Record<string,unknown>=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const meta=(x:unknown):x is {id:string;revision:number;digest:string;at:string}=>record(x)&&
  typeof x.id==='string'&&typeof x.digest==='string'&&typeof x.at==='string'&&
  Number.isSafeInteger(x.revision);
export function validateRenderResponse(x:unknown,requestedPath:string):RenderResponseV3 {
  if(!record(x)||x.requestedPath!==requestedPath||x.resolvedPath!==requestedPath||
    !meta(x.publication)||!record(x.shared)||!meta(x.shared.publication)||!record(x.selected))
    throw createError({statusCode:503,statusMessage:'CMS_RENDER_CONTRACT_INVALID'});
  const p=x.publication,s=x.shared.publication;
  if(p.id!==s.id||p.digest!==s.digest||p.revision!==s.revision||!record(x.shared.pageSlots)||
    !record(x.shared.pages)||!record(x.shared.navigation)||!record(x.shared.archive)||
    !record(x.shared.promotion)||typeof x.selected.pageId!=='string'||
    !record(x.selected.seo)||typeof x.selected.seo.title!=='string'||
    typeof x.selected.seo.description!=='string'||typeof x.selected.seo.noindex!=='boolean')
    throw createError({statusCode:503,statusMessage:'CMS_RENDER_CONTRACT_INVALID'});
  const selected=x.selected as PublicRenderedPageV3;
  switch(selected.mode){
    case 'legacy':
      if(typeof selected.templateKind!=='string'||!selected.templateKind.startsWith('legacy-')||
        LEGACY_CANONICAL_PATHS[selected.pageId]!==requestedPath||!record(selected.slots))throw createError({statusCode:503,statusMessage:'CMS_RENDER_CONTRACT_INVALID'});
      break;
    case 'category':
      if(!['archive-category-v1','category-standard-v1'].includes(selected.templateKind)||
        Object.values(LEGACY_CANONICAL_PATHS).includes(requestedPath as (typeof LEGACY_CANONICAL_PATHS)[keyof typeof LEGACY_CANONICAL_PATHS])||
        typeof selected.categoryId!=='string'||!record(selected.hero)||!record(selected.slots)||
        (selected.templateKind==='archive-category-v1'&&!Array.isArray(selected.archiveItems)))
        throw createError({statusCode:503,statusMessage:'CMS_RENDER_CONTRACT_INVALID'});
      break;
    default:throw createError({statusCode:503,statusMessage:'CMS_RENDER_CONTRACT_INVALID'});
  }
  return x as RenderResponseV3;
}

/** Validates the versioned Core response without downcasting ArchiveCollectionV2 to V1. */
export function validateRenderEnvelopeV4(input:unknown,path:string):RenderResponseV3|RenderResponseV4{
  if(!record(input)||input.schema!=='SMD_RENDER_ENVELOPE_V4')
    throw createError({statusCode:503,statusMessage:'CMS_RENDER_ENVELOPE_INVALID'});
  if(input.kind==='historical')return validateRenderResponse(input.render,path);
  if(input.kind!=='archive-v2'||!record(input.render))
    throw createError({statusCode:503,statusMessage:'CMS_RENDER_ENVELOPE_INVALID'});
  const r=input.render;
  if(r.schema!=='SMD_RENDER_RESPONSE_V4'||r.requestedPath!==path||r.resolvedPath!==path||
     !meta(r.publication)||!record(r.shared)||!meta(r.shared.publication)||!record(r.selected)||
     r.selected.mode!=='legacy'||LEGACY_CANONICAL_PATHS[r.selected.pageId as keyof typeof LEGACY_CANONICAL_PATHS]!==path||
     !record(r.selected.slots)||!record(r.selected.seo)||
     r.selected.templateKind!=='legacy-'+r.selected.pageId+'-v1'||
     typeof r.selected.seo.title!=='string'||typeof r.selected.seo.description!=='string'||
     typeof r.selected.seo.noindex!=='boolean'||!record(r.shared.pageSlots)||
     !record(r.shared.pages)||!record(r.shared.navigation)||!record(r.shared.promotion)||
     r.shared.publication.id!==r.publication.id||r.shared.publication.digest!==r.publication.digest||
     r.shared.publication.revision!==r.publication.revision)
    throw createError({statusCode:503,statusMessage:'CMS_RENDER_V4_CONTRACT_INVALID'});
  try{validateArchiveCollectionV2(r.shared.archive);}catch{
    throw createError({statusCode:503,statusMessage:'CMS_RENDER_V4_ARCHIVE_INVALID'});
  }
  return r as RenderResponseV4;
}


/** Old envelopes retain their exact V4 validator and output shape. */
export async function validateRenderEnvelopeV5(input:unknown,path:string):Promise<RenderResponseV3|RenderResponseV4|RenderResponseV5|RenderResponseV6Candidate>{
  if(!record(input))throw createError({statusCode:503,statusMessage:'CMS_RENDER_ENVELOPE_INVALID'});
  switch(input.schema){
    case 'SMD_RENDER_ENVELOPE_V6':return validateHomeR2RenderEnvelopeV6(input,path);
    case 'SMD_RENDER_ENVELOPE_V4':return validateRenderEnvelopeV4(input,path);
    case 'SMD_RENDER_ENVELOPE_V5':{
      if(input.kind!=='site-media-v1')throw createError({statusCode:503,statusMessage:'CMS_RENDER_ENVELOPE_INVALID'});
      return validateRenderResponseV5(input.render,path);
    }
    default:throw createError({statusCode:503,statusMessage:'CMS_RENDER_ENVELOPE_INVALID'});
  }
}
