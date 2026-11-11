/** CF5B: pure fixed-slot resolution from a validated, same-publication V5 render payload. */
import type {PublicContentV2,PublicContentV4,PublicContentV5} from '@smd/content-contracts/contracts';
import {isSiteMediaFixedSlotId,type SiteMediaFixedSlotId} from '@smd/content-contracts/site-media-contracts';
import type {SiteImageRenderInput} from './site-media-render.ts';
export type SiteMediaSlotResolution={kind:'legacy'}|{kind:'v5';key:string;image:SiteImageRenderInput};
export class SiteMediaBindingError extends Error{
  readonly code='SITE_MEDIA_BINDING_INVALID';
  readonly field:string;
  constructor(field:string){super(`SITE_MEDIA_BINDING_INVALID: ${field}`);this.field=field;}
}
function fail(field:string):never{throw new SiteMediaBindingError(field);}
export function resolvePublishedSiteMediaSlot(
  content:PublicContentV2|PublicContentV4|PublicContentV5|null,
  currentIdentity:{id:string;digest:string}|null,slotId:SiteMediaFixedSlotId
):SiteMediaSlotResolution{
  if(!isSiteMediaFixedSlotId(slotId)||slotId==='site.header.symbol')fail('slotId');
  if(!content||!currentIdentity||content.publication.id!==currentIdentity.id||
    content.publication.digest!==currentIdentity.digest)return fail('publication');
  if(!('siteMedia' in content))return {kind:'legacy'};
  const projection=content.siteMedia;
  if(!projection||projection.schema!=='SMD_SITE_MEDIA_PUBLIC_PROJECTION_V1'||
    projection.publicationId!==currentIdentity.id||projection.publicationDigest!==currentIdentity.digest)
    return fail('projection');
  const binding=projection.bindings.bindings.find(row=>row.slotId===slotId);
  if(!binding)return {kind:'legacy'};
  const assets=projection.assets.filter(row=>row.assetId===binding.assetId);
  const asset=assets[0];
  if(assets.length!==1 || !asset)return fail('asset');
  const image:SiteImageRenderInput={
    admission:'V5_BINDING_ADMITTED',slotId,
    src:`/api/media/image/${asset.assetId}`,alt:binding.alt,title:binding.title,
    width:asset.width,height:asset.height,displayMode:binding.displayMode
  };
  return {kind:'v5',key:`${currentIdentity.id}:${currentIdentity.digest}:${slotId}:${binding.assetId}`,image};
}

/** Header-specific vector resolver; never runs the raster layout policy on SVG. */
export function resolvePublishedBrandSymbol(
  content:PublicContentV2|PublicContentV4|PublicContentV5|null,
  currentIdentity:{id:string;digest:string}|null
):{kind:'legacy'}|{kind:'published-svg';src:string;assetId:string;width:number;height:number}{
  if(!content||!currentIdentity||content.publication.id!==currentIdentity.id||
    content.publication.digest!==currentIdentity.digest)fail('publication');
  if(!('siteMedia' in content))return {kind:'legacy'};
  const p=content.siteMedia;
  if(!p||p.schema!=='SMD_SITE_MEDIA_PUBLIC_PROJECTION_V1'||
    p.publicationId!==currentIdentity.id||p.publicationDigest!==currentIdentity.digest)fail('brand-projection');
  const bindings=p.bindings.bindings.filter(b=>b.slotId==='site.header.symbol');
  if(bindings.length===0)return {kind:'legacy'};
  if(bindings.length!==1||bindings[0]!.displayMode!=='contain'||
    !/^sb_[0-9a-f]{64}$/.test(bindings[0]!.assetId))fail('brand-binding');
  const match=p.assets.filter(a=>a.assetId===bindings[0]!.assetId);
  if(match.length!==1||match[0]!.mimeType!=='image/svg+xml'||
    !Number.isSafeInteger(match[0]!.width)||match[0]!.width<1||
    !Number.isSafeInteger(match[0]!.height)||match[0]!.height<1)fail('brand-asset');
  return {kind:'published-svg',src:`/api/media/brand/${match[0]!.assetId}`,
    assetId:match[0]!.assetId,width:match[0]!.width,height:match[0]!.height};
}
