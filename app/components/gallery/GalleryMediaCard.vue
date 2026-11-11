<script setup lang="ts">
import type { GalleryCardView } from '~/utils/gallery-view';
import {
  galleryArchiveMediaUrl,
  galleryImageInitialState,
  galleryImageTransition,
  type GalleryImageLoadState,
} from '~/utils/gallery-media';
import ArchiveYoutubePlayer from '~/components/archive/ArchiveYoutubePlayer.vue';

const props = defineProps<{ entry: GalleryCardView; ownerKey: string }>();
const imageSrc = computed(() => {
  switch (props.entry.media.kind) {
    case 'image':
      return galleryArchiveMediaUrl(props.entry.media.assetKey);
    case 'youtube':
      return null;
  }
});
const imageElement = ref<HTMLImageElement | null>(null);
const imageState = ref<GalleryImageLoadState | null>(imageSrc.value
  ? galleryImageInitialState(props.ownerKey, imageSrc.value) : null);
const staleImageEvents = ref(0);
watch(() => [props.ownerKey, imageSrc.value] as const, ([ownerKey, src]) => {
  imageState.value = src ? galleryImageInitialState(ownerKey, src) : null;
}, { flush: 'sync' });

function updateImageState(image: HTMLImageElement, type: 'load' | 'error'): void {
  const src = imageSrc.value;
  const state = imageState.value;
  if (!src || !state) {
    staleImageEvents.value += 1;
    return;
  }
  const absolute = new URL(src, document.baseURI).href;
  if (image.src !== absolute || (image.currentSrc && image.currentSrc !== absolute)) {
    staleImageEvents.value += 1;
    return;
  }
  imageState.value = galleryImageTransition(state, type, props.ownerKey, src);
}
function onImageEvent(event: Event, type: 'load' | 'error'): void {
  const image = event.currentTarget;
  if (image instanceof HTMLImageElement) {
    updateImageState(image, type === 'load' && image.naturalWidth === 0 ? 'error' : type);
  }
}
// Cached images may finish before hydration attaches the load handler.
onMounted(() => {
  const image = imageElement.value;
  if (image?.complete) updateImageState(image, image.naturalWidth > 0 ? 'load' : 'error');
});
</script>

<template>
  <article class="smd-gallery-card" :data-media-kind="entry.mediaKind"
    :data-gallery-owner="ownerKey" :data-gallery-stale-image-events="staleImageEvents">
    <div class="smd-gallery-card__media"
      :data-gallery-media-state="entry.media.kind === 'image' ? imageState?.kind : 'video'">
      <ArchiveYoutubePlayer
        v-if="entry.media.kind === 'youtube'"
        :youtube-id="entry.media.youtubeId"
        :poster-key="entry.media.posterKey"
        :title="entry.title"
        frame-mode="gallery"
      />
      <img
        v-else-if="entry.media.kind === 'image' && imageSrc && imageState?.kind !== 'failed'"
        ref="imageElement"
        class="smd-gallery-card__image"
        :src="imageSrc"
        :alt="entry.media.alt"
        loading="lazy"
        decoding="async"
        @load="onImageEvent($event, 'load')"
        @error="onImageEvent($event, 'error')"
      />
      <span v-if="entry.media.kind === 'image' && imageState?.kind === 'failed'"
        class="smd-gallery-card__media-error" role="status"
        :data-gallery-error-code="imageState?.kind === 'failed' ? imageState.code : undefined">이미지를 불러오지 못했습니다.</span>
      <span class="smd-gallery-card__badge" :data-badge-kind="entry.mediaKind">
        {{ entry.badgeLabel }}
      </span>
    </div>
    <h2 class="smd-gallery-card__title">{{ entry.title }}</h2>
    <p class="smd-gallery-card__description">{{ entry.description }}</p>
  </article>
</template>
