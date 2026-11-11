<script setup lang="ts">
/** Keep the old paint-geometry ABI until HomeIntroStage and both Figma/semantic
 * consumers are explicitly migrated. This component no longer owns film motion. */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import HomeHeroCarousel from './HomeHeroCarousel.vue';
import { useStandalonePublishedMedia } from '~/composables/useStandalonePublishedMedia';
import { HERO_CAROUSEL_REVISION } from '~/data/home-hero-carousel';
import type { FilmPaintGeometry } from '~/utils/homeIntroOverlayGeometry';
import type { HeroMediaStatus } from '~/utils/homeIntroMediaGate';

const props = defineProps<{ paintHeightCssPx?: number | null }>();
const emit = defineEmits<{
  'film-paint-geometry': [geometry: FilmPaintGeometry];
  'film-media-status': [status: HeroMediaStatus];
}>();
const root = ref<HTMLElement | null>(null);
const publishedMedia = useStandalonePublishedMedia();
const rootStyle = computed(() => props.paintHeightCssPx !== null &&
  props.paintHeightCssPx !== undefined && Number.isFinite(props.paintHeightCssPx) &&
  props.paintHeightCssPx > 0 ? { height: `${props.paintHeightCssPx}px` } : undefined);

let observer: ResizeObserver | null = null;
let mounted = false;
let generation = 0;
let previousGeometryKey = '';
let scheduled = false;

function publishGeometry(): void {
  if (!mounted || !root.value || !root.value.isConnected || document.hidden) return;
  const bounds = root.value.getBoundingClientRect();
  if (!(bounds.width > 0 && bounds.height > 0)) return; // inactive responsive instance
  const host = root.value.closest<HTMLElement>(
    '.smd-figma-scene-section--hero, .smd-home--hero',
  );
  if (!host) throw new Error('HERO_CAROUSEL_PAINT_HOST_MISSING');
  const hostBounds = host.getBoundingClientRect();
  const paintedTop = Math.max(bounds.top, hostBounds.top);
  const paintedBottom = Math.min(bounds.bottom, hostBounds.bottom);
  const paintedHeight = paintedBottom - paintedTop;
  if (!(paintedHeight > 0)) throw new Error('HERO_CAROUSEL_PAINT_GEOMETRY_INVALID');
  const key = [bounds.left, bounds.top, bounds.width, bounds.height,
    paintedTop, paintedHeight, publishedMedia.publicationId.value ?? 'local'].join('|');
  if (key === previousGeometryKey) return;
  previousGeometryKey = key;
  generation += 1;
  emit('film-paint-geometry', {
    owner: 'HomeHeroFilm',
    viewportRectCss: {
      left: bounds.left, top: bounds.top, width: bounds.width, height: bounds.height,
    },
    paintedTopCss: paintedTop - bounds.top,
    paintedHeightCss: paintedHeight,
    layoutRevision: `${HERO_CAROUSEL_REVISION}|${key}`,
    generation,
  });
}
function scheduleGeometry(): void {
  if (scheduled || !mounted) return;
  scheduled = true;
  void nextTick().then(() => {
    scheduled = false;
    if (mounted) publishGeometry();
  });
}
onMounted(() => {
  mounted = true;
  if (typeof ResizeObserver !== 'function') {
    throw new Error('HERO_CAROUSEL_RESIZE_OBSERVER_UNAVAILABLE');
  }
  observer = new ResizeObserver(scheduleGeometry);
  if (root.value) observer.observe(root.value);
  window.addEventListener('resize', scheduleGeometry);
  document.addEventListener('visibilitychange', scheduleGeometry);
  scheduleGeometry();
});
watch(() => props.paintHeightCssPx, scheduleGeometry, { flush: 'post' });
watch(publishedMedia.publicationId, scheduleGeometry, { flush: 'post' });
onBeforeUnmount(() => {
  mounted = false;
  observer?.disconnect();
  observer = null;
  window.removeEventListener('resize', scheduleGeometry);
  document.removeEventListener('visibilitychange', scheduleGeometry);
});
</script>

<template>
  <div ref="root" class="smd-hero-film" data-film-fill="intro-viewport"
    data-hero-carousel-contract="SMD-HOME-HERO-CAROUSEL-R1-CF1-CF3"
    data-hero-cover="true" :style="rootStyle">
    <HomeHeroCarousel @media-status="emit('film-media-status', $event)" />
  </div>
</template>
