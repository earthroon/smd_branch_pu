import type {RenderResponseV6Candidate} from '../../app/utils/homeR2ScaffoldAdmission';
import {coreResponse} from '../utils/public-core';
import {validateRenderEnvelopeV5} from '../utils/render';
import type {RenderResponseV3} from '@smd/content-contracts/contracts';
import type {RenderResponseV4,RenderResponseV5} from '@smd/content-contracts/contracts';
import {LEGACY_CANONICAL_PATHS,LEGACY_SEO_TITLES} from '@smd/content-contracts/category-page-contracts';
import {LEGACY_PAGE_IDS,type LegacyPageId} from '@smd/content-contracts/cms-kind-registry';
import { devFixtureContent } from '../utils/dev-fixture';

function fail(code:number,message:string):never {throw createError({statusCode:code,statusMessage:message});}
export default defineEventHandler(async(event):Promise<RenderResponseV3|RenderResponseV4|RenderResponseV5|void|RenderResponseV6Candidate>=>{
  const query=getQuery(event);
  const requested=query.path;
  if(typeof requested!=='string'||!requested.startsWith('/')||requested.length>200||
    requested.includes('%')||requested.includes('?')||requested.includes('#'))
    fail(400,'CATEGORY_PATH_INVALID');
  if(requested==='/admin'||requested.startsWith('/admin/'))fail(404,'PUBLIC_ADMIN_ROUTE_NOT_FOUND');
  setHeader(event,'cache-control','no-store');
  // EXPLICIT local preview only: DEV fixture overrides even a configured Core binding.
  // No automatic fallback and no production fixture: both dev mode and the flag are required.
  if(import.meta.dev && process.env.SMD_DEV_FIXTURE_ONLY==='1'){
    const matched=LEGACY_PAGE_IDS.find(k=>LEGACY_CANONICAL_PATHS[k]===requested);
    if(matched){
      setHeader(event,'x-content-authority','DEV_FIXTURE_ONLY');
      const shared=devFixtureContent();
      const response:RenderResponseV3={publication:shared.publication,requestedPath:requested,resolvedPath:requested,
        shared,selected:{mode:'legacy',pageId:matched as LegacyPageId,templateKind:`legacy-${matched}-v1`,
          slots:{},seo:{title:LEGACY_SEO_TITLES[matched],description:'인테리어필름 시공 실습 중심 교육기관 SMD 아카데미.',noindex:false}}};
      return response;
    }
    fail(503,'CORE_SERVICE_BINDING_UNAVAILABLE');
  }
  // Explicit V6 opt-in; deployed V5 continues unchanged by default.
  const useV6=process.env.SMD_HOME_R2_V6_RENDER==='true';
  const response=await coreResponse(event,`/${useV6?'v6':'v5'}/render?path=${encodeURIComponent(requested)}`);
  if(response.status===308){
    const destination=response.headers.get('location');
    if(!destination||!/^\/[a-z0-9/-]+$/.test(destination)||destination.includes('//'))
      fail(503,'CMS_RENDER_REDIRECT_INVALID');
    await sendRedirect(event,destination,308);
    return;
  }
  let data:unknown;
  try{data=await response.json();}catch{fail(503,'CORE_RENDER_RESPONSE_INVALID');}
  if(response.status!==200){
    const code=(data&&typeof data==='object'&&'error' in data&&typeof data.error==='string')
      ?data.error:'CORE_RENDER_FAILED';
    fail([400,404,503].includes(response.status)?response.status:503,code);
  }
  return await validateRenderEnvelopeV5(data,requested);
});
