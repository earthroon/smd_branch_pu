<script setup lang="ts">
import type {ArchiveCardView} from '~/utils/archive-view';
import ArchiveYoutubePlayer from './ArchiveYoutubePlayer.vue';
const props=defineProps<{entry:ArchiveCardView}>();
const src=computed(()=>props.entry.media.kind==='image'?`/api/archive/media/${props.entry.media.assetKey.slice(8)}`:
  props.entry.media.kind==='legacy-image'?props.entry.media.src:null);
const alt=computed(()=>props.entry.media.kind==='image'||props.entry.media.kind==='legacy-image'?props.entry.media.alt:props.entry.title);
</script>
<template>
  <article class="group h-full">
    <ArchiveYoutubePlayer v-if="entry.media.kind==='youtube'" :youtube-id="entry.media.youtubeId"
      :poster-key="entry.media.posterKey" :title="entry.title" />
    <div v-else class="relative aspect-[4/3] overflow-hidden rounded-lg border border-foreground-800 bg-gradient-to-br from-foreground-900 to-foreground-950">
      <img v-if="src" :src="src" :alt="alt" loading="lazy" class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]" />
      <span v-else class="grid h-full place-items-center text-foreground-500"><i class="ri-image-line text-3xl" aria-hidden="true" /></span>
    </div>
    <h3 class="mt-4 font-heading text-base font-semibold text-background-50">{{entry.title}}</h3>
    <p class="mt-1 text-sm leading-relaxed text-foreground-500">{{entry.description}}</p>
    <div v-if="entry.media.kind==='youtube'&&entry.media.thumbnails.length" class="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="영상 관련 사진">
      <a v-for="(thumbnail,index) in entry.media.thumbnails" :key="thumbnail.assetKey"
        :href="`/api/archive/media/${thumbnail.assetKey.slice(8)}`" target="_blank" rel="noopener noreferrer"
        :aria-label="`${entry.title} 관련 사진 ${index+1} 자세히 보기`"
        class="block overflow-hidden rounded border border-foreground-800">
        <img :src="`/api/archive/media/${thumbnail.assetKey.slice(8)}`" :alt="thumbnail.alt"
          loading="lazy" class="aspect-[4/3] w-full object-contain" />
      </a>
    </div>
  </article>
</template>
