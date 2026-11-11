import { homeFilmAssets } from '../data/home-film.ts';
import type { FilmImageId } from '../data/home-film.ts';
import type { FilmSelection } from './homeFilmSelection.ts';

/** Focus is an optional *presentation* authority; it never commits selection. */
export const FILM_FOCUS_PROTOCOL = 'film-focus-v1' as const;
export type FilmFocusChunkV1 = {
  schema: 'film-focus-chunk-v1'; imageId: FilmImageId;
  sourceImageSha256: string; sourceWidthPx: number; sourceHeightPx: number;
  chunkId: string; url: string; renditionId: string; chunkSha256: string;
  chunkWidthPx: number; chunkHeightPx: number;
  sourceRectPx: { x:number; y:number; width:number; height:number };
  uv: [number,number,number,number]; paddingPx:number; maxZoom:number;
  assetRevision:string; publicationWitness:string;
};
export type FilmPublicationApproval = {
  imageId:FilmImageId; publicationWitness:string; assetRevision:string;
  sourceImageSha256:string; chunkSha256:string;
};
export type FilmFocusPolicy = {
  visible: boolean; workerAvailable: boolean; webGpuAvailable: boolean;
  eco: boolean; dataSaver: boolean; reducedMotion: boolean;
};
export type FilmFocusDecision =
  | {kind:'css'|'static';reason:string;imageId:FilmImageId|null}
  | {kind:'worker-webgpu';imageId:FilmImageId;focusGeneration:number;
     chunk:FilmFocusChunkV1;layoutRevision:string};
export type FilmFocusRequestIdentity = {
  imageId:FilmImageId;interactionGeneration:number;focusGeneration:number;
  layoutRevision:string;assetRevision:string;deviceGeneration:number;hostGeneration:number;
};
export type FilmFocusRequest =
  | {kind:'init';protocol:typeof FILM_FOCUS_PROTOCOL;hostGeneration:number;canvas:OffscreenCanvas}
  | {kind:'focus';identity:FilmFocusRequestIdentity;chunk:FilmFocusChunkV1;
     surfacePx:{width:number;height:number}}
  | {kind:'cancel';hostGeneration:number;focusGeneration:number}
  | {kind:'dispose';hostGeneration:number};
export type FilmFocusResponse =
  | {kind:'ready';hostGeneration:number;deviceGeneration:number}
  | {kind:'rendered';identity:FilmFocusRequestIdentity}
  | {kind:'failed';identity:Partial<FilmFocusRequestIdentity>;stage:string;reason:string};

const sha256=/^[a-f0-9]{64}$/;
const present=(v:string)=>v.trim().length>0;

/** An asset registry alone is not a trusted publication authority. */
export function validateFilmFocusChunk(chunk: unknown, origin: string):
  {kind:'valid';chunk:FilmFocusChunkV1}|{kind:'rejected';reason:string} {
  if(typeof chunk!=='object'||chunk===null)return {kind:'rejected',reason:'FILM_FOCUS_ASSET_UNVERIFIED'};
  const c=chunk as Partial<FilmFocusChunkV1>;
  if(c.schema!=='film-focus-chunk-v1'||!homeFilmAssets.some(a=>a.id===c.imageId)||
      !c.sourceImageSha256||!sha256.test(c.sourceImageSha256)||
      !c.chunkSha256||!sha256.test(c.chunkSha256)||
      !c.chunkId||!present(c.chunkId)||!c.renditionId||!present(c.renditionId)||
      !c.assetRevision||!present(c.assetRevision)||
      !c.publicationWitness||!present(c.publicationWitness)||
      !c.url||!c.url.startsWith('/')||c.url.startsWith('//')){
    return {kind:'rejected',reason:'FILM_FOCUS_ASSET_UNVERIFIED'};
  }
  const dimensions=[c.sourceWidthPx,c.sourceHeightPx,c.chunkWidthPx,c.chunkHeightPx,c.maxZoom];
  if(!dimensions.every(n=>typeof n==='number'&&Number.isFinite(n)&&n>0)||
      typeof c.paddingPx!=='number'||!Number.isFinite(c.paddingPx)||c.paddingPx<0||
      !c.sourceRectPx||!c.uv||!Array.isArray(c.uv)||c.uv.length!==4||
      !c.uv.every(n=>Number.isFinite(n)&&n>=0&&n<=1)){
    return {kind:'rejected',reason:'FILM_FOCUS_CHUNK_GEOMETRY_INVALID'};
  }
  const rect=c.sourceRectPx;
  if(![rect.x,rect.y,rect.width,rect.height].every(Number.isFinite)||
     rect.x<0||rect.y<0||rect.width<=0||rect.height<=0||
     rect.x+rect.width>c.sourceWidthPx!||rect.y+rect.height>c.sourceHeightPx!||
     c.uv[0]!>=c.uv[2]!||c.uv[1]!>=c.uv[3]!||c.paddingPx>=Math.min(c.chunkWidthPx!,c.chunkHeightPx!)/2){
    return {kind:'rejected',reason:'FILM_FOCUS_CHUNK_GEOMETRY_INVALID'};
  }
  try {
    const base=new URL(origin),url=new URL(c.url??'',origin);
    if(base.protocol!=='http:'&&base.protocol!=='https:')throw new Error('origin');
    if(url.origin!==base.origin||!url.pathname.startsWith('/')||url.username||url.password||url.hash){
      return {kind:'rejected',reason:'FILM_FOCUS_PUBLICATION_UNVERIFIED'};
    }
  }catch {return {kind:'rejected',reason:'FILM_FOCUS_PUBLICATION_UNVERIFIED'};}
  return {kind:'valid',chunk:c as FilmFocusChunkV1};
}

export function decideFilmFocus(args:{
  selection:FilmSelection;layoutRevision:string;focusGeneration:number;
  policy:FilmFocusPolicy;manifest:readonly unknown[];
  approvals:readonly FilmPublicationApproval[];origin:string;
}):FilmFocusDecision {
  const s=args.selection;
  const imageId=s.kind==='idle'?null:s.imageId;
  if(imageId===null)return {kind:'static',reason:'FILM_FOCUS_NO_INTENT',imageId:null};
  if(!args.policy.visible)return {kind:'static',reason:'FILM_FOCUS_HOST_HIDDEN',imageId};
  if(args.policy.reducedMotion||args.policy.eco||args.policy.dataSaver){
    return {kind:'static',reason:'FILM_FOCUS_POLICY_DISABLED',imageId};
  }
  const raw=args.manifest.find((item)=>typeof item==='object'&&item!==null&&
      'imageId' in item&&(item as {imageId:unknown}).imageId===imageId);
  if(!raw)return {kind:'css',reason:'FILM_FOCUS_ASSET_UNVERIFIED',imageId};
  const checked=validateFilmFocusChunk(raw,args.origin);
  if(checked.kind==='rejected')return {kind:'css',reason:checked.reason,imageId};
  const chunk=checked.chunk;
  const approved=args.approvals.some(a=>a.imageId===imageId&&
    a.publicationWitness===chunk.publicationWitness&&a.assetRevision===chunk.assetRevision&&
    a.sourceImageSha256===chunk.sourceImageSha256&&a.chunkSha256===chunk.chunkSha256);
  if(!approved)return {kind:'css',reason:'FILM_FOCUS_PUBLICATION_UNVERIFIED',imageId};
  if(!args.policy.workerAvailable||!args.policy.webGpuAvailable){
    return {kind:'css',reason:'FILM_FOCUS_GPU_UNAVAILABLE',imageId};
  }
  return {kind:'worker-webgpu',imageId,focusGeneration:args.focusGeneration,
    chunk,layoutRevision:args.layoutRevision};
}

export function filmFocusSameIdentity(a:FilmFocusRequestIdentity,b:FilmFocusRequestIdentity):boolean {
  return a.imageId===b.imageId&&a.interactionGeneration===b.interactionGeneration&&
    a.focusGeneration===b.focusGeneration&&a.layoutRevision===b.layoutRevision&&
    a.assetRevision===b.assetRevision&&a.deviceGeneration===b.deviceGeneration&&
    a.hostGeneration===b.hostGeneration;
}
export function filmFocusResponseCurrent(response:FilmFocusResponse,
  current:FilmFocusRequestIdentity|null):boolean {
  return response.kind==='rendered'&&current!==null&&filmFocusSameIdentity(response.identity,current);
}

/** Client-only singleton. Only the *visible admitted* host may own a Focus Worker. */
let focusHost:{token:number;retire:()=>void}|null=null;
export function claimFilmFocusHost(token:number,retire:()=>void):void {
  if(focusHost?.token===token)return;
  const old=focusHost;focusHost={token,retire};old?.retire();
}
export function releaseFilmFocusHost(token:number):void {
  if(focusHost?.token===token)focusHost=null;
}
export function ownsFilmFocusHost(token:number):boolean {return focusHost?.token===token;}
/** This input ZIP has no publisher-signed R2 Focus V1 authority; never synthesize one. */
export const homeFilmApprovedFocusPublications:readonly FilmPublicationApproval[] = Object.freeze([]);
let nextHostToken=0;
export function allocateFilmFocusHostToken():number {return ++nextHostToken;}
