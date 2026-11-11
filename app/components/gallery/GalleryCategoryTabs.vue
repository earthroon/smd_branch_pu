<script setup lang="ts">
import {
  GALLERY_FILTER_ORDER,
  GALLERY_FILTER_V1,
  type GalleryFilterId,
} from '~/utils/gallery-view';

const props = defineProps<{ active: GalleryFilterId }>();
const emit = defineEmits<{ change: [value: GalleryFilterId] }>();
const listElement = ref<HTMLElement | null>(null);

function onKeydown(event: KeyboardEvent, index: number): void {
  let next: number;
  switch (event.key) {
    case 'ArrowRight': next = (index + 1) % GALLERY_FILTER_ORDER.length; break;
    case 'ArrowLeft': next = (index + GALLERY_FILTER_ORDER.length - 1) % GALLERY_FILTER_ORDER.length; break;
    case 'Home': next = 0; break;
    case 'End': next = GALLERY_FILTER_ORDER.length - 1; break;
    default: return;
  }
  event.preventDefault();
  const target = GALLERY_FILTER_ORDER[next];
  if (!target) throw new Error('SMD_GALLERY_R1_FILTER_INVALID');
  emit('change', target);
  nextTick(() => {
    listElement.value?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
  });
}
</script>

<template>
  <div ref="listElement" class="smd-gallery-tabs" role="tablist" aria-label="수강갤러리 종류">
    <button
      v-for="(filter, index) in GALLERY_FILTER_ORDER"
      :id="`smd-gallery-tab-${filter}`"
      :key="filter"
      type="button"
      role="tab"
      :class="['smd-gallery-tabs__tab', { 'smd-gallery-tabs__tab--active': props.active === filter }]"
      :aria-selected="props.active === filter"
      aria-controls="smd-gallery-panel"
      :tabindex="props.active === filter ? 0 : -1"
      :data-figma-node="filter === 'all' ? 'node-1:81' : filter === 'photo' ? 'node-1:73' : 'node-1:74'"
      @click="emit('change', filter)"
      @keydown="onKeydown($event, index)"
    >{{ GALLERY_FILTER_V1[filter].label }}</button>
  </div>
</template>
