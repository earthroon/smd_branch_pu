import type {PublicRenderedPageV3,RenderResponseV5} from '@smd/content-contracts/contracts';
export type SelectedPublicPageState = {
  path:string;publicationId:string;publicationDigest:string;selected:PublicRenderedPageV3|RenderResponseV5['selected'];
};
/** Request-scoped and hydration-safe; no module-global site snapshot. */
export const useSelectedCategoryPage = () => useState<SelectedPublicPageState|null>(
  'smd-selected-publication-page',()=>null);
