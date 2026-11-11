<script setup lang="ts">
/** Keep the existing media mode/publication selector; only the frame geometry changes. */
import { computed, ref, watch } from 'vue';
import { useStandalonePublishedMedia } from '~/composables/useStandalonePublishedMedia';
import { aboutSourceAssets } from '~/data/about-r1-assets.generated';
import { curriculumSourceAssets } from '~/data/curriculum-r1-assets.generated';
const props = withDefaults(defineProps<{
  page: 'about'|'curriculum'; slotId: string; priority?: boolean;
}>(), {priority:false});
type SourcePhoto = Readonly<{fileName:string;sha256:string;alt:string;sourceWidth:number;sourceHeight:number}>;
const photo = computed(() => {
  const table = (props.page === 'about' ? aboutSourceAssets.photos : curriculumSourceAssets.photos) as unknown as Record<string,SourcePhoto>;
  const value = table[props.slotId];
  if (!value) throw new Error(`R7_SOURCE_MEDIA_SLOT_UNAVAILABLE:${props.page}:${props.slotId}`);
  return value;
});
const published = useStandalonePublishedMedia();
const src = computed(() => {
  const binding = published.image(props.page, props.slotId);
  switch (binding.kind) {
    case 'local': return `/${props.page}/${encodeURIComponent(photo.value.fileName)}?v=${photo.value.sha256}`;
    case 'published': return binding.src;
    case 'unbound': throw new Error(`R7_SOURCE_MEDIA_NOT_PUBLISHED:${props.page}:${props.slotId}`);
  }
});
const failure = ref<string|null>(null);
watch(src, () => {failure.value = null;});
function onError(event:Event):void {
  const target=event.currentTarget;
  if (target instanceof HTMLImageElement && target.getAttribute('src')===src.value)
    failure.value=src.value;
}
</script>
<template>
  <figure class="smd-r7-route__source-media" :data-media-slot="slotId"
    :data-media-state="failure ? 'failed' : 'bound'">
    <img v-if="!failure" :key="src" :src="src"
      :alt="decodeURIComponent(photo.alt)" :width="photo.sourceWidth" :height="photo.sourceHeight"
      :loading="priority ? 'eager' : 'lazy'" :fetchpriority="priority ? 'high' : 'auto'"
      decoding="async" @error="onError" />
    <p v-else role="status" class="smd-r7-route__media-error">이미지를 불러오지 못했습니다.</p>
  </figure>
</template>
