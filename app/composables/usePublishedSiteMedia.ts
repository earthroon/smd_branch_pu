import {useSiteContent} from '~/composables/useSiteContent';
import {useSelectedCategoryPage} from '~/composables/useSelectedCategoryPage';
/** One synchronous projection from the current route/pub state, never a second network fetch. */
import {resolvePublishedSiteMediaSlot} from '~/utils/site-media-binding';
import type {SiteMediaFixedSlotId} from '@smd/content-contracts/site-media-contracts';
export function usePublishedSiteMedia(slotId:SiteMediaFixedSlotId){
  const content=useSiteContent();
  const selected=useSelectedCategoryPage();
  const route=useRoute();
  return computed(()=>{
    const page=selected.value;
    if(!page||page.path!==route.path||!content.value||
      page.publicationId!==content.value.publication.id||
      page.publicationDigest!==content.value.publication.digest)return null;
    return resolvePublishedSiteMediaSlot(content.value,
      {id:page.publicationId,digest:page.publicationDigest},slotId);
  });
}
