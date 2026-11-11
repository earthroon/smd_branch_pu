import {computed} from 'vue';
import {resolveStandaloneMedia,type StandaloneMediaManifest} from '~/utils/standalone-media-public';
/** Nuxt per-request state; app.vue owns SSR loading and revalidation. */
export const useStandaloneMediaState=()=>useState<StandaloneMediaManifest|null>(
  'smd-standalone-media-publication-v1',()=>null);
export function useStandalonePublishedMedia(){
  const mode=String(useRuntimeConfig().public.standaloneMediaMode??'local');
  const state=useStandaloneMediaState();
  const resolvedMode=mode==='published'?'published':mode==='local'?'local':null;
  if(!resolvedMode)throw new Error('STANDALONE_MEDIA_MODE_INVALID');
  return {
    state,
    image:(pageId:string,slotId:string)=>resolveStandaloneMedia(resolvedMode,state.value,pageId,slotId),
    publicationId:computed(()=>state.value?.publication.id??null),
  };
}
