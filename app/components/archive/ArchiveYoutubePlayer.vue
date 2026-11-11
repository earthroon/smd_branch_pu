<script setup lang="ts">
import {ARCHIVE_YOUTUBE_ID} from '@smd/content-contracts/archive-contracts';
import {galleryPosterUrl, GALLERY_POSTER_LOAD_ERROR} from '~/utils/gallery-media';
const props=withDefaults(defineProps<{youtubeId:string;title:string;posterKey:string|null;frameMode?:'default'|'gallery'}>(),{frameMode:'default'});
const playing=ref(false);
const posterElement=ref<HTMLImageElement|null>(null);
const posterState=ref<'loading'|'ready'|'failed'>('loading');
const valid=computed(()=>ARCHIVE_YOUTUBE_ID.test(props.youtubeId));
const originalUrl=computed(()=>`https://www.youtube.com/watch?v=${props.youtubeId}`);
const embedUrl=computed(()=>`https://www.youtube.com/embed/${props.youtubeId}`);
// The default /videos and home player keeps its existing source policy.
const poster=computed(()=>props.frameMode==='gallery' ? galleryPosterUrl(props.posterKey,props.youtubeId) :
  props.posterKey?`/api/archive/media/${props.posterKey.slice(8)}`:
  `https://i.ytimg.com/vi/${props.youtubeId}/hqdefault.jpg`);
function onPosterEvent(state:'ready'|'failed'):void {
  if(props.frameMode==='gallery'&&!playing.value)posterState.value=state;
}
onMounted(()=>{
  const image=posterElement.value;
  if(props.frameMode==='gallery'&&image?.complete)
    posterState.value=image.naturalWidth>0?'ready':'failed';
});
watch(()=>[props.youtubeId,props.posterKey] as const,()=>{
  if(props.frameMode==='gallery'){
    posterState.value='loading';
    playing.value=false;
  }
},{flush:'sync'});
</script>
<template>
  <div :class="['relative overflow-hidden rounded-lg bg-foreground-900', props.frameMode === 'gallery' ? 'h-full w-full' : 'aspect-[4/3]']"
    :data-gallery-player-phase="props.frameMode==='gallery' ? (valid ? (playing ? 'iframe-mounted' : 'poster') : 'invalid') : undefined">
    <template v-if="valid">
      <iframe v-if="playing" class="h-full w-full" :src="embedUrl" :title="`${title} YouTube 영상`"
        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerpolicy="strict-origin-when-cross-origin" allowfullscreen />
      <button v-else type="button" class="relative block h-full w-full cursor-pointer"
        :aria-label="`${title} 영상 재생`" @click="playing=true"
        :data-gallery-poster-origin="props.frameMode==='gallery' ? (props.posterKey===null?'youtube-cdn':'archive-r2') : undefined"
        :data-gallery-poster-state="props.frameMode==='gallery'?posterState:undefined">
        <img ref="posterElement" v-if="props.frameMode!=='gallery'||posterState!=='failed'"
          :src="poster" :alt="`${title} 영상 미리보기`" loading="lazy" class="h-full w-full"
          :class="props.frameMode === 'gallery' ? 'object-contain' : 'object-cover'"
          @load="onPosterEvent('ready')" @error="onPosterEvent('failed')" />
        <span v-else class="smd-gallery-player__poster-error" role="status"
          :data-gallery-error-code="GALLERY_POSTER_LOAD_ERROR">영상 미리보기를 불러오지 못했습니다.</span>
        <span class="absolute inset-0 grid place-items-center bg-black/10 transition-colors hover:bg-black/25">
          <span class="grid h-14 w-14 place-items-center rounded-full bg-background-50/95 text-foreground-950 shadow-md">
            <i aria-hidden="true" class="ri-play-fill text-3xl" />
          </span>
        </span>
      </button>
      <a :href="originalUrl" target="_blank" rel="noopener noreferrer"
         class="absolute bottom-2 right-2 rounded bg-black/70 px-2 py-1 text-[11px] text-white">YouTube에서 보기 ↗</a>
    </template>
    <span v-else class="grid h-full place-items-center text-sm text-white">영상 주소가 올바르지 않습니다.</span>
  </div>
</template>
