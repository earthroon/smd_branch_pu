<script setup lang="ts">
import { homeMediaSlots, type HomeMediaSlotId } from '~/data/home-r2-manifest';
import {useHomeMediaSlot} from '~/composables/useHomeMediaSlot';
const props = defineProps<{slotId: HomeMediaSlotId}>();
const source = computed(() => homeMediaSlots[props.slotId]);
const image=useHomeMediaSlot(()=>props.slotId);
const frameStyle = computed(() => ({
  aspectRatio: `${source.value.sourceFrameRect[2]} / ${source.value.sourceFrameRect[3]}`,
  borderRadius: source.value.sourceRadii.map(r => `min(${r}px, 9vw)`).join(' '),
  backgroundColor: `rgba(${source.value.placeholderRgba.slice(0,3).map(n => Math.round(n*255)).join(',')},${source.value.placeholderRgba[3]})`,
}));
</script>
<template>
  <div class="smd-home__media-frame w-full shrink-0 overflow-hidden" :data-media-slot="source.slotId"
    :data-media-state="image ? (image.kind==='local'?'local':'published') : 'unbound'"
    :data-media-origin="image?.kind??'unbound'" :style="frameStyle" :aria-hidden="image?undefined:'true'">
    <img v-if="image" :key="image.src"
      :src="image.src" :alt="image.alt" :title="image.title" :width="image.width" :height="image.height"
    loading="lazy"
decoding="async"
:style="{
  display: 'block',
  width: '100%',
  height: '100%',
  objectFit:
    slotId.startsWith('home.methods.') ||
    slotId === 'home.special-start.photo'
      ? 'cover'
      : 'contain',
  objectPosition: 'center'
}" />
  </div>
</template>
