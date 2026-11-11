<script setup lang="ts">
/** The containing media owner is supplied as a slot, not synthesized here. */
const props = defineProps<{
  mediaKey: string;
  state: 'bound' | 'unbound' | 'failed';
}>();
if (!props.mediaKey || props.mediaKey.trim() !== props.mediaKey) {
  throw new Error('R7_CF3_SOURCE_SLOT_DRIFT');
}
const status = computed(() => {
  switch (props.state) {
    case 'unbound': return '미디어가 아직 연결되지 않았습니다.';
    case 'failed': return '미디어를 불러오지 못했습니다.';
    case 'bound': return null;
    default: throw new Error('R7_CF3_MEDIA_STATE_INVALID');
  }
});
</script>

<template>
  <figure class="smd-r7-media" :data-catalogue-media-key="mediaKey" :data-catalogue-media-state="state">
    <div class="smd-r7-media__frame">
      <slot />
      <p v-if="status" class="smd-r7-media__status" role="status">{{ status }}</p>
    </div>
    <figcaption v-if="$slots.caption" class="smd-r7-media__caption"><slot name="caption" /></figcaption>
  </figure>
</template>
