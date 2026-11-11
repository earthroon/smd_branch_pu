import type { aboutSourceAssets } from './about-r1-assets.generated.ts';
import type { aboutSourceText } from './about-r1-copy.generated.ts';
import type { aboutR1Source } from './about-r1-manifest.ts';
import type { CmsRootNode } from '@smd/content-contracts/page-slot-contracts';
export type AboutSectionId = typeof aboutR1Source.sections[number]['id'];
export type AboutTextId = keyof typeof aboutSourceText;
export type AboutPhotoSlotId = keyof typeof aboutSourceAssets.photos;
export type AboutIconId = keyof typeof aboutSourceAssets.icons;
export type AboutOperationalState = Readonly<{
  publicationKey: string; consultationUrl: string | null;
  afterAudience: readonly CmsRootNode[]; beforeCta: readonly CmsRootNode[];
}>;
