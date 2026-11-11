/** SMD-SITE-MEDIA-R1 CF1: presentation policy, not a renderer promotion.
 * CF5 will consume this only when a V5 media binding is actually admitted.
 * Historical V1-V4 CSS remains unchanged. */
import {isSiteMediaFixedSlotId,type SiteMediaFixedSlotId,
  type SiteImageDisplayMode} from '@smd/content-contracts/site-media-contracts';

export type SiteMediaPresentationPolicy = Readonly<{
  slotId: SiteMediaFixedSlotId;
  v5DefaultDisplay: SiteImageDisplayMode;
  legacyDisplay: 'cover';
  effectiveOnlyWhen: 'V5_BINDING_ADMITTED';
}>;

export function siteMediaPresentationPolicy(slotId:unknown):SiteMediaPresentationPolicy|null {
  if(isSiteMediaFixedSlotId(slotId))
    return {slotId,v5DefaultDisplay:'natural',legacyDisplay:'cover',
      effectiveOnlyWhen:'V5_BINDING_ADMITTED'};
  return null;
}
