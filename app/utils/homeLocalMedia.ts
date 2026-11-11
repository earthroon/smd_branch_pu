/** SMD_HOME_MEDIA_SLOT_R1 · explicit local drafts and strict authority selection. */
import {homeMediaSlots, type HomeMediaSlotId} from '../data/home-r2-manifest.ts';
import {homeLocalMediaSlots, type HomeLocalMediaDraft} from '../data/home-local-media.ts';
import type {ResolvedStandaloneMedia} from './standalone-media-public.ts';

export type HomeLocalMediaImage = Readonly<{
  kind: 'local'; src: string; alt: string; title: string;
  width: number; height: number; assetId: null;
}>;
export type HomeCmsMediaImage = Readonly<{
  src: string; alt: string; title: string; width: number; height: number; assetId: string;
}>;
export type HomeMediaSlotImage = HomeLocalMediaImage
  | Readonly<{kind:'cms'} & HomeCmsMediaImage>
  | Extract<ResolvedStandaloneMedia,{kind:'published'}>;

const pathPart=/^[\p{L}\p{N}_-][\p{L}\p{N}._-]*$/u;
const ext=/\.(png|jpe?g|webp)$/i;
export function assertHomeLocalMediaPath(src: string): void {
  const segments=src.split('/');
  switch(true){
    case !src.startsWith('/media/home/'):
    case segments.length<4:
    case segments[0]!=='':
    case segments[1]!=='media':
    case segments[2]!=='home':
    case segments.slice(3).some(s=>!pathPart.test(s)||s==='.'||s==='..'):
    case !ext.test(src):
      throw new Error('SMD_HOME_LOCAL_MEDIA_PATH_INVALID');
    default:return;
  }
}
export function resolveHomeLocalMedia(
  slotId: HomeMediaSlotId,
  drafts: Readonly<Partial<Record<HomeMediaSlotId,HomeLocalMediaDraft>>> = homeLocalMediaSlots,
): HomeLocalMediaImage|null {
  if(!Object.prototype.hasOwnProperty.call(homeMediaSlots,slotId))
    throw new Error(`SMD_HOME_LOCAL_MEDIA_SLOT_UNKNOWN:${slotId}`);
  const entry=drafts[slotId];
  if(!entry || entry.src===null)return null;
  const {src,alt,title,width,height}=entry;
  assertHomeLocalMediaPath(src);
  if(!alt.trim()||!title.trim()||/[<>\u0000-\u001f]/.test(alt+title)||
    alt.length>240||title.length>240||
    !Number.isSafeInteger(width)||!Number.isSafeInteger(height)||
    Number(width)<1||Number(height)<1||Number(width)>50000||Number(height)>50000)
    throw new Error(`SMD_HOME_LOCAL_MEDIA_METADATA_INVALID:${slotId}`);
  return {kind:'local',src,alt,title,width:width as number,height:height as number,assetId:null};
}

/** Refuse drift in the known eight-slot manifest; empty local src is intentional. */
export function assertHomeLocalMediaRegistry(
  drafts: Readonly<Partial<Record<HomeMediaSlotId,HomeLocalMediaDraft>>> = homeLocalMediaSlots,
): void {
  const known=Object.keys(homeMediaSlots).sort();
  if(JSON.stringify(Object.keys(drafts).sort())!==JSON.stringify(known))
    throw new Error('SMD_HOME_LOCAL_MEDIA_SLOT_REGISTRY_DRIFT');
  for(const slotId of known) resolveHomeLocalMedia(slotId as HomeMediaSlotId,drafts);
}

/** CMS is authoritative in CMS mode; published standalone is authoritative in published mode.
 * NO local fallback from a CMS/standalone-published unbound slot. */
export function selectHomeMediaSlot(
  contentMode:'standalone'|'cms',
  standalone:ResolvedStandaloneMedia|null,
  cms:HomeCmsMediaImage|null,
  local:HomeLocalMediaImage|null,
):HomeMediaSlotImage|null {
  switch(contentMode){
    case 'cms':return cms===null?null:{...cms,kind:'cms'};
    case 'standalone':
      switch(standalone?.kind){
        case 'published':return standalone;
        case 'unbound':return null;
        case 'local':return local;
        default:throw new Error('SMD_HOME_MEDIA_AUTHORITY_MISSING');
      }
  }
}
