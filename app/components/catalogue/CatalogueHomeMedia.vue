<script setup lang="ts">
import { usePublicStaticAssetUrl } from '~/composables/usePublicStaticAssetUrl';
/** HomeMediaFrame retains image src, metadata, CMS publication and display-mode ownership. */
import HomeMediaFrame from '~/components/home/HomeMediaFrame.vue';
import { homeMediaSlots, type HomeMediaSlotId } from '~/data/home-r2-manifest';
import { useHomeMediaSlot } from '~/composables/useHomeMediaSlot';
import { assertCatalogueR7HomeMediaSlot } from '~/data/catalogue-r7-sheet-plan';
import CatalogueMedia from './CatalogueMedia.vue';

const props = defineProps<{ slotId: HomeMediaSlotId }>();
const approvedIds = Object.keys(homeMediaSlots);
const admitted = computed(() => assertCatalogueR7HomeMediaSlot(props.slotId, approvedIds));
const resolved = useHomeMediaSlot(() => props.slotId);
const failedSrc = ref<string | null>(null);
const state = computed<'bound' | 'unbound' | 'failed'>(() => {
  const image = resolved.value;
  switch (true) {
    case image === null: return 'unbound';
    case image?.src === failedSrc.value: return 'failed';
    default: return 'bound';
  }
});
function onMediaError(event: Event): void {
  const image = event.target;
  if (!(image instanceof HTMLImageElement)) return;
  if (resolved.value?.src && (image.currentSrc || image.src) === new URL(publicAssetUrl(resolved.value.src), document.baseURI).href) {
    failedSrc.value = resolved.value.src;
  }
}
const publicAssetUrl = usePublicStaticAssetUrl();
</script>

<template>
  <CatalogueMedia v-if="admitted" :media-key="slotId" :state="state" @error.capture="onMediaError">
    <HomeMediaFrame :slot-id="slotId" />
    <template v-if="$slots.caption" #caption><slot name="caption" /></template>
  </CatalogueMedia>
</template>
