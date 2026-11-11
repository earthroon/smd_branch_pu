/** CF7/CF8: strict, Pure Public Standalone media projection.
 * Layout, motion and route authority remain in the existing Public components.
 */
import {homeMediaSlots} from '~/data/home-r2-manifest';
import {homeFilmAssets} from '~/data/home-film';
import {aboutSourceAssets} from '~/data/about-r1-assets.generated';
import {curriculumSourceAssets} from '~/data/curriculum-r1-assets.generated';

const SHA=/^[0-9a-f]{64}$/;
const ASSET=/^sm_[0-9a-f]{64}$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PAGES=['home','about','curriculum','practice','archive','promotion','contact','reviews','faq'] as const;
const known=new Map<string,string>([
  ...Object.keys(homeMediaSlots).map(id=>[id,'home'] as const),
  ...homeFilmAssets.map(item=>[item.id,'home'] as const),
  ...Object.keys(aboutSourceAssets.photos).map(id=>[id,'about'] as const),
  ...Object.keys(curriculumSourceAssets.photos).map(id=>[id,'curriculum'] as const),
]);
const record=(v:unknown):v is Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const keys=(v:Record<string,unknown>,expect:readonly string[])=>
  JSON.stringify(Object.keys(v).sort())===JSON.stringify([...expect].sort());
const fail=(code:string):never=>{throw new Error(code);};

export type PublishedMediaBinding=Readonly<{
  pageId:string;slotId:string;kind:'site-raster';assetId:string;
  alt:string;title:string;width:number;height:number;mimeType:'image/png'|'image/jpeg'|'image/webp';
}>;
export type StandaloneMediaManifest=Readonly<{
  schema:'SMD_STANDALONE_MEDIA_MANIFEST_V1';publicGitTreeSha:string;sourceLockDigest:string;
  publication:Readonly<{id:string;sequence:number;digest:string}>;
  bindings:readonly PublishedMediaBinding[];
}>;
/** Read authority is the trusted Core projection; format validation isn't a signature. */
export function validateStandaloneMediaManifest(raw:unknown,expectedSourceLockDigest:string):StandaloneMediaManifest{
  if(!SHA.test(expectedSourceLockDigest)||!record(raw)||
     !keys(raw,['schema','publicGitTreeSha','sourceLockDigest','publication','bindings'])||
     raw.schema!=='SMD_STANDALONE_MEDIA_MANIFEST_V1'||
     raw.sourceLockDigest!==expectedSourceLockDigest||
     typeof raw.publicGitTreeSha!=='string'||!/^[a-f0-9]{40}$/.test(raw.publicGitTreeSha)||
     !record(raw.publication)||!keys(raw.publication,['id','sequence','digest'])||
     typeof raw.publication.id!=='string'||!UUID.test(raw.publication.id)||
     !Number.isSafeInteger(raw.publication.sequence)||Number(raw.publication.sequence)<1||
     typeof raw.publication.digest!=='string'||!SHA.test(raw.publication.digest)||
     !Array.isArray(raw.bindings)||raw.bindings.length>4096)
    return fail('STANDALONE_MEDIA_MANIFEST_INVALID');
  const seen=new Set<string>();let previous='';
  for(const bind of raw.bindings){
    if(!record(bind)||!keys(bind,['pageId','slotId','kind','assetId','alt','title','width','height','mimeType'])||
       typeof bind.pageId!=='string'||typeof bind.slotId!=='string'||
       !PAGES.includes(bind.pageId as typeof PAGES[number])||
       known.get(bind.slotId)!==bind.pageId||bind.kind!=='site-raster'||
       typeof bind.assetId!=='string'||!ASSET.test(bind.assetId)||
       typeof bind.alt!=='string'||typeof bind.title!=='string'||
       bind.alt.length>240||bind.title.length>240||/[<>\u0000-\u001f]/.test(bind.alt+bind.title)||
       !Number.isSafeInteger(bind.width)||Number(bind.width)<1||
       !Number.isSafeInteger(bind.height)||Number(bind.height)<1||
       !['image/png','image/jpeg','image/webp'].includes(String(bind.mimeType)))
      return fail('STANDALONE_MEDIA_BINDING_INVALID');
    const key=`${bind.pageId}:${bind.slotId}`;
    if(seen.has(key)||key<=previous)return fail('STANDALONE_MEDIA_BINDING_DUPLICATE_OR_ORDER_DRIFT');
    seen.add(key);previous=key;
  }
  return raw as StandaloneMediaManifest;
}

export type ResolvedStandaloneMedia=
  | {kind:'local'}
  | {kind:'unbound'}
  | {kind:'published';publicationId:string;assetId:string;src:string;
     alt:string;title:string;width:number;height:number;mimeType:string};
export function resolveStandaloneMedia(
  mode:'local'|'published',manifest:StandaloneMediaManifest|null,pageId:string,slotId:string
):ResolvedStandaloneMedia{
  switch(mode){
    case 'local':return {kind:'local'};
    case 'published':{
      if(!manifest)return fail('STANDALONE_MEDIA_MANIFEST_UNAVAILABLE');
      if(known.get(slotId)!==pageId)return fail('STANDALONE_MEDIA_SLOT_UNKNOWN');
      const binding=manifest.bindings.find(b=>b.pageId===pageId&&b.slotId===slotId);
      if(!binding)return {kind:'unbound'};
      const {id}=manifest.publication;
      return {kind:'published',publicationId:id,assetId:binding.assetId,
        src:`/api/media/standalone/${id}/${binding.assetId}`,
        alt:binding.alt,title:binding.title,width:binding.width,height:binding.height,mimeType:binding.mimeType};
    }
  }
}
