/** SMD_HOME_MEDIA_SLOT_R1 · single slot authority for SVG and semantic Vue. */
import {computed,toValue,type MaybeRefOrGetter} from 'vue';
import type {HomeMediaSlotId} from '~/data/home-r2-manifest';
import {useHomeR2Published} from '~/composables/useHomeR2Published';
import {useSiteContent} from '~/composables/useSiteContent';
import {useStandalonePublishedMedia} from '~/composables/useStandalonePublishedMedia';
import {useContentMode} from '~/composables/useContentMode';
import {resolveHomeR2PublicImage} from '~/utils/home-r2-v6-public';
import {resolveHomeLocalMedia,selectHomeMediaSlot} from '~/utils/homeLocalMedia';

export function useHomeMediaSlot(
  slot:MaybeRefOrGetter<HomeMediaSlotId|undefined>,
  enabled:MaybeRefOrGetter<boolean>=true,
){
  const route=useRoute();
  const contentMode=useContentMode();
  const standalone=useStandalonePublishedMedia();
  const publication=useSiteContent();
  const homePublished=useHomeR2Published();
  return computed(()=>{
    const id=toValue(slot);
    if(!toValue(enabled)||!id||route.path!=='/')return null;
    switch(contentMode){
      case 'cms': {
        const cms=homePublished.value&&publication.value
          ? resolveHomeR2PublicImage(homePublished.value,publication.value.publication,id)
          : null;
        return selectHomeMediaSlot(contentMode,null,cms,null);
      }
      case 'standalone': {
        const source=standalone.image('home',id);
        const local=source.kind==='local'?resolveHomeLocalMedia(id):null;
        return selectHomeMediaSlot(contentMode,source,null,local);
      }
    }
  });
}
