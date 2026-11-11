/** SMD-SITE-MEDIA-R1-CF5A: deterministic presentation-only V5 image model.
 * An admission marker is a typed consumer contract, NOT proof of publication.
 * CF4 Core and CF5-B resolver must establish publication authority before use.
 * This module neither fetches media nor performs browser-side source fallback.
 */
import {isSiteMediaFixedSlotId, type SiteImageDisplayMode,
  type SiteMediaFixedSlotId} from '@smd/content-contracts/site-media-contracts';
import {siteMediaPresentationPolicy} from './site-media-policy.ts';

export type SiteImageRenderInput = Readonly<{
  admission: 'V5_BINDING_ADMITTED';
  slotId: SiteMediaFixedSlotId;
  src: string;
  alt: string;
  title: string;
  width: number;
  height: number;
  displayMode: SiteImageDisplayMode;
}>;

export type SiteImageRenderModel = Readonly<{
  slotId: SiteMediaFixedSlotId;
  src: string;
  alt: string;
  title: string;
  width: number;
  height: number;
  displayMode: SiteImageDisplayMode;
  frameClass: string;
  imageClass: string;
  loading: 'eager' | 'lazy';
  fetchPriority: 'high' | 'auto';
}>;

export class SiteImageRenderError extends Error {
  readonly code: 'SITE_MEDIA_RENDER_INPUT_INVALID';
  readonly field: string;
  constructor(code: 'SITE_MEDIA_RENDER_INPUT_INVALID', field: string) {
    super(`${code}: ${field}`);
    this.code=code;
    this.field=field;
  }
}

const isRecord = (v:unknown):v is Record<string,unknown> =>
  v!==null && typeof v==='object' && !Array.isArray(v);
function fail(field:string):never {
  throw new SiteImageRenderError('SITE_MEDIA_RENDER_INPUT_INVALID',field);
}

/** Slot-layout authority, transcribed from existing Public Vue frames. Never CMS CSS. */
export const SITE_MEDIA_CONTAIN_FRAME_CLASS: Readonly<Record<Exclude<SiteMediaFixedSlotId,'site.header.symbol'>,string>> = {
  'home.hero.image': 'aspect-[4/3]',
  'home.statement.image': 'aspect-[4/3]',
  'home.practiceTeaser.mainImage': 'aspect-[16/10]',
  'home.practiceTeaser.secondaryImage': 'aspect-[4/3]',
  'about.heroImage': 'aspect-[16/7]',
  'about.instructor.image': 'aspect-[4/3]',
  'practice.image': 'aspect-[16/8]',
};

const highPriority = new Set<SiteMediaFixedSlotId>([
  'home.hero.image',
  'about.heroImage',
]);

/** CF4-approved same-origin path contract. CF5A does not create that API. */
const PUBLIC_MEDIA_PATH = /^\/api\/media\/image\/sm_[a-f0-9]{64}$/;
const REQUIRED_FIELDS = [
  'admission','slotId','src','alt','title','width','height','displayMode',
] as const;

function validText(value:unknown, max:number, allowEmpty:boolean):value is string {
  return typeof value==='string' && value.length<=max &&
    (allowEmpty || value.length>0) && value.trim()===value &&
    !/[\u0000-\u001f\u007f]/.test(value);
}

/** Pure, stable for the same input on server and client. No environment probes. */
export function resolveSiteImageRender(value:unknown):SiteImageRenderModel {
  if(!isRecord(value) ||
     JSON.stringify(Object.keys(value).sort())!==JSON.stringify([...REQUIRED_FIELDS].sort()))
    fail('model');
  const input=value as Record<string,unknown>;
  const slotId=input.slotId;
  if(!isSiteMediaFixedSlotId(slotId)||slotId==='site.header.symbol')fail('slotId');
  const policy=siteMediaPresentationPolicy(slotId);
  if(!policy || input.admission!==policy.effectiveOnlyWhen)fail('admission');
  const src=input.src;
  if(typeof src!=='string'||!PUBLIC_MEDIA_PATH.test(src))fail('src');
  const alt=input.alt;
  const title=input.title;
  if(!validText(alt,240,false))fail('alt');
  if(!validText(title,240,false))fail('title');
  const width=input.width;
  const height=input.height;
  if(typeof width!=='number'||typeof height!=='number'||
     !Number.isSafeInteger(width)||width<=0 ||
     !Number.isSafeInteger(height)||height<=0 ||
     width*height>Number.MAX_SAFE_INTEGER)
    fail('width/height');
  const displayMode=input.displayMode;
  if(displayMode!=='natural' && displayMode!=='contain')fail('displayMode');
  const isNatural=displayMode==='natural';
  const priority=highPriority.has(slotId);
  return {
    slotId,src,alt,title,width,height,displayMode,
    frameClass:isNatural
      ? 'relative block w-full rounded-lg bg-background-100'
      : `relative w-full overflow-hidden rounded-lg bg-background-100 ${SITE_MEDIA_CONTAIN_FRAME_CLASS[slotId]}`,
    imageClass:isNatural
      ? 'block h-auto w-full max-w-full rounded-lg'
      : 'block h-full w-full object-contain object-center',
    loading:priority?'eager':'lazy',
    fetchPriority:priority?'high':'auto',
  };
}
