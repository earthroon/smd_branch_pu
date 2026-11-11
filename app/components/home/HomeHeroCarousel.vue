<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue';
import { useStandalonePublishedMedia } from '~/composables/useStandalonePublishedMedia';
import { useContentMode } from '~/composables/useContentMode';
import { resolveHomeHeroLocalMedia } from '~/utils/homeHeroLocalMedia';
import { heroDissolveLayerPhase, heroDissolveSwipeDirection, nextHeroDissolveIndex,
  type HeroDirection } from '~/utils/homeHeroDissolveState';
import type { HeroMediaStatus } from '~/utils/homeIntroMediaGate';
import {
  HERO_CAROUSEL_DELAY_MS, HERO_CAROUSEL_REVISION, HERO_DISSOLVE_DURATION_MS,
  HERO_CAPTION_START_DELAY_MS, resolveHeroCarouselSlots,
  type HeroCarouselSlot,
} from '~/data/home-hero-carousel';

const emit = defineEmits<{ 'media-status': [status: HeroMediaStatus] }>();
const media = useStandalonePublishedMedia();
const contentMode = useContentMode();
const slides = computed(() => resolveHeroCarouselSlots(id => {
  const binding = media.image('home', id);
  switch (binding.kind) {
    case 'local':
      switch (contentMode) {
        case 'standalone': {
          const local = resolveHomeHeroLocalMedia(id);
          return {kind: 'local' as const, ...local};
        }
        case 'cms': return binding; // CMS Hero schema is not yet part of HomeR2PublicProjection.
      }
      throw new Error('SMD_HOME_HERO_CONTENT_MODE_UNSUPPORTED');
    case 'published':case 'unbound': return binding;
  }
}));
const sourceRevision = computed(() => slides.value.map(s =>
  `${s.slotId}:${s.src}:${s.width}x${s.height}:${s.publicationId ?? 'local'}:${s.assetId ?? 'local'}`,
).join('|'));

// Preserve Nuxt's shared Figma/semantic selection and single active timer lease.
const selectedIndex = useState<number>('smd-hero-carousel-selected-r1', () => 0);
const autoplayLease = useState<string | null>('smd-hero-carousel-autoplay-lease-r1', () => null);
const instanceId = useId();
const viewportId = `${instanceId}-viewport`;
const root = ref<HTMLElement | null>(null);
const owner = ref(false);
const intersecting = ref(false);
const pageVisible = ref(true);
const reducedMotion = ref(false);
const hovered = ref(false);
const focused = ref(false);
const loadedKeys = ref<ReadonlySet<string>>(new Set());
const decodingKeys = new Set<string>();
const loadFault = ref<string | null>(null);

// Local presentation state; never copy the immutable Figma text into a carousel slide.
// The existing Figma and semantic captions respond through the parent CSS :has() selector.
const leavingIndex = ref<number | null>(null);
const enteringVisible = ref(true);
const captionPhase = ref<'visible' | 'hidden'>('visible');
const transitioning = computed(() => leavingIndex.value !== null);
const pendingIndex = ref<number | null>(null);
let motionEpoch = 0;
let autoplayTimer: ReturnType<typeof setTimeout> | null = null;
let captionTimer: ReturnType<typeof setTimeout> | null = null;
let fadeTimer: ReturnType<typeof setTimeout> | null = null;
let prepareFrame: number | null = null;
let revealFrame: number | null = null;
let touchStart: {pointerId: number; x: number; y: number} | null = null;
let desktopQuery: MediaQueryList | null = null;
let reducedQuery: MediaQueryList | null = null;
let intersectionObserver: IntersectionObserver | null = null;
let resizeObserver: ResizeObserver | null = null;
let mounted = false;

const imageKey = (s: HeroCarouselSlot): string => `${s.imageId}|${s.src}`;
const ready = computed(() => slides.value.every(s => loadedKeys.value.has(imageKey(s))));
const canPlay = computed(() => owner.value && intersecting.value && pageVisible.value &&
  !reducedMotion.value && !hovered.value && !focused.value && !loadFault.value && ready.value);

function clearAutoplay(): void {
  if (autoplayTimer !== null) clearTimeout(autoplayTimer);
  autoplayTimer = null;
}
function clearMotionCallbacks(): void {
  if (captionTimer !== null) clearTimeout(captionTimer);
  if (fadeTimer !== null) clearTimeout(fadeTimer);
  if (prepareFrame !== null) cancelAnimationFrame(prepareFrame);
  if (revealFrame !== null) cancelAnimationFrame(revealFrame);
  captionTimer = null;
  fadeTimer = null;
  prepareFrame = null;
  revealFrame = null;
}
function settleMotion(): void {
  ++motionEpoch; // Invalidate older nextTick, frames and timers.
  clearMotionCallbacks();
  leavingIndex.value = null;
  enteringVisible.value = true;
  pendingIndex.value = null;
  captionPhase.value = 'visible';
}
function syncAutoplay(): void {
  if (!mounted || !canPlay.value || slides.value.length < 2) {
    clearAutoplay();
    // Stop the old timer before releasing the lease to another responsive instance.
    if (autoplayLease.value === instanceId) autoplayLease.value = null;
    return;
  }
  if (autoplayLease.value !== null && autoplayLease.value !== instanceId) {
    clearAutoplay();
    return;
  }
  if (autoplayLease.value === null) autoplayLease.value = instanceId;
  if (autoplayTimer !== null) return;
  autoplayTimer = setTimeout(() => {
    autoplayTimer = null;
    if (!mounted || !canPlay.value || autoplayLease.value !== instanceId) return;
    const next = nextHeroDissolveIndex(selectedIndex.value, 'next', slides.value.length);
    requestTransition(next, 'auto');
  }, HERO_CAROUSEL_DELAY_MS);
}
function finishTransition(epoch: number): void {
  if (!mounted || motionEpoch !== epoch) return;
  clearMotionCallbacks();
  leavingIndex.value = null;
  enteringVisible.value = true;
  captionPhase.value = 'visible';
  const pending = pendingIndex.value;
  pendingIndex.value = null;
  if (pending !== null && pending !== selectedIndex.value && owner.value && ready.value && !loadFault.value) {
    requestTransition(pending, 'manual');
    return;
  }
  syncAutoplay();
}
function requestTransition(target: number, reason: 'auto' | 'manual'): void {
  if (!mounted || !owner.value || !ready.value || loadFault.value || !pageVisible.value) return;
  if (!Number.isInteger(target) || target < 0 || target >= slides.value.length) {
    throw new Error('HERO_DISSOLVE_TARGET_INVALID');
  }
  // Manual requests during a fade are coalesced, last requested target wins.
  if (transitioning.value) {
    if (reason === 'manual') {
      pendingIndex.value = target;
      clearAutoplay();
    }
    return;
  }
  if (target === selectedIndex.value) {
    if (reason === 'manual') {
      clearAutoplay();
      syncAutoplay();
    }
    return;
  }
  clearAutoplay();
  if (reducedMotion.value) {
    settleMotion();
    selectedIndex.value = target;
    syncAutoplay();
    return;
  }

  const epoch = ++motionEpoch;
  leavingIndex.value = selectedIndex.value;
  selectedIndex.value = target;
  enteringVisible.value = false;

  // Two animation frames ensure the incoming layer's opacity:0 is painted
  // before revealing it with a 700ms CSS transition; no horizontal travel.
  void nextTick().then(() => {
    if (!mounted || motionEpoch !== epoch || !owner.value) return;
    prepareFrame = requestAnimationFrame(() => {
      prepareFrame = null;
      if (!mounted || motionEpoch !== epoch || !owner.value) return;
      revealFrame = requestAnimationFrame(() => {
        revealFrame = null;
        if (!mounted || motionEpoch !== epoch || !owner.value) return;
        captionPhase.value = 'hidden';
        enteringVisible.value = true;
        // Caption delay is measured from image fade start, NOT its completion.
        captionTimer = setTimeout(() => {
          captionTimer = null;
          if (mounted && motionEpoch === epoch) captionPhase.value = 'visible';
        }, HERO_CAPTION_START_DELAY_MS);
        fadeTimer = setTimeout(() => {
          fadeTimer = null;
          if (mounted && motionEpoch === epoch && transitioning.value) {
            console.warn('HERO_DISSOLVE_TRANSITIONEND_TIMEOUT', epoch);
          }
          finishTransition(epoch);
        }, HERO_DISSOLVE_DURATION_MS + 96); // Missing transitionend watchdog.
        syncAutoplay();
      });
    });
  });
}
function onLayerTransitionEnd(event: TransitionEvent, slide: HeroCarouselSlot): void {
  if (event.target !== event.currentTarget || event.propertyName !== 'opacity' ||
      slide.order !== selectedIndex.value || !transitioning.value || !enteringVisible.value) return;
  // The previous image is released only after the incoming opacity transition ends.
  finishTransition(motionEpoch);
}
function layerPhase(index: number) {
  return heroDissolveLayerPhase(index, selectedIndex.value, leavingIndex.value, enteringVisible.value);
}
function navigate(direction: HeroDirection): void {
  if (!owner.value || !ready.value || loadFault.value || !pageVisible.value) return;
  const base = pendingIndex.value ?? selectedIndex.value;
  requestTransition(nextHeroDissolveIndex(base, direction, slides.value.length), 'manual');
}
function onKeydown(event: KeyboardEvent): void {
  if (!owner.value || event.altKey || event.ctrlKey || event.metaKey) return;
  switch (event.key) {
    case 'ArrowRight': event.preventDefault(); navigate('next'); return;
    case 'ArrowLeft': event.preventDefault(); navigate('previous'); return;
  }
}
function onSwipeStart(event: PointerEvent): void {
  if (event.pointerType !== 'touch' || !event.isPrimary || !owner.value || !ready.value) return;
  touchStart = {pointerId:event.pointerId, x:event.clientX, y:event.clientY};
}
function onSwipeEnd(event: PointerEvent): void {
  const start = touchStart;
  touchStart = null;
  if (!start || start.pointerId !== event.pointerId || event.pointerType !== 'touch') return;
  const direction = heroDissolveSwipeDirection(event.clientX - start.x, event.clientY - start.y);
  if (direction !== null) navigate(direction);
}
function onSwipeCancel(): void { touchStart = null; }

function eventIsCurrent(node: EventTarget | null, slot: HeroCarouselSlot): node is HTMLImageElement {
  return node instanceof HTMLImageElement &&
    node.getAttribute('src') === slot.src &&
    slides.value.some(current => current.imageId === slot.imageId && current.src === slot.src);
}
function decodeImage(img: HTMLImageElement, slot: HeroCarouselSlot): void {
  if (!img.complete || img.naturalWidth <= 0 || !eventIsCurrent(img, slot)) return;
  const key = imageKey(slot);
  const revision = sourceRevision.value;
  const decodingKey = `${revision}|${key}`;
  if (loadedKeys.value.has(key) || decodingKeys.has(decodingKey)) return;
  decodingKeys.add(decodingKey);
  const decoded = typeof img.decode === 'function' ? img.decode() : Promise.resolve();
  void decoded.then(() => {
    decodingKeys.delete(decodingKey);
    if (!mounted || revision !== sourceRevision.value || !img.isConnected || !eventIsCurrent(img, slot)) return;
    const next = new Set(loadedKeys.value);
    next.add(key);
    loadedKeys.value = next;
  }).catch(error => {
    decodingKeys.delete(decodingKey);
    if (!mounted || revision !== sourceRevision.value || !img.isConnected || !eventIsCurrent(img, slot)) return;
    loadFault.value = `HERO_CAROUSEL_IMAGE_DECODE_FAILED:${slot.imageId}`;
    console.error(loadFault.value, error);
  });
}
function onImageLoad(event: Event, slot: HeroCarouselSlot): void {
  const img = event.currentTarget;
  if (!eventIsCurrent(img, slot)) return;
  decodeImage(img, slot);
}
function reportImageLoadFailure(slot: HeroCarouselSlot): void {
  loadFault.value = `HERO_CAROUSEL_IMAGE_LOAD_FAILED:${slot.imageId}`;
  console.error(loadFault.value);
}
function onImageError(event: Event, slot: HeroCarouselSlot): void {
  if (!eventIsCurrent(event.currentTarget, slot)) return;
  reportImageLoadFailure(slot);
}
function reconcileLoadedImages(): void {
  if (!root.value) return;
  const valid = new Map(slides.value.map(s => [s.imageId, s] as const));
  for (const img of root.value.querySelectorAll<HTMLImageElement>('img[data-hero-image-id]')) {
    const slot = valid.get(img.dataset.heroImageId as HeroCarouselSlot['imageId']);
    if (!slot || img.getAttribute('src') !== slot.src || !img.complete) continue;
    if (img.naturalWidth > 0) decodeImage(img, slot);
    else if (eventIsCurrent(img, slot)) reportImageLoadFailure(slot);
  }
}
watch([owner, ready, loadFault, sourceRevision], () => {
  if (!owner.value) return;
  emit('media-status', {
    phase: loadFault.value ? 'failed' : ready.value ? 'ready' : 'loading',
    sourceRevision: sourceRevision.value,
    reason: loadFault.value,
  });
}, { flush: 'post' });
watch(sourceRevision, () => {
  // A late decode from a previous publication never admits the new generation.
  settleMotion();
  clearAutoplay();
  loadedKeys.value = new Set();
  decodingKeys.clear();
  loadFault.value = null;
  void nextTick().then(() => { if (mounted) reconcileLoadedImages(); });
}, { flush: 'post' });
watch([owner, pageVisible, reducedMotion, loadFault], () => {
  if (!owner.value || !pageVisible.value || reducedMotion.value || loadFault.value) {
    settleMotion();
    onSwipeCancel();
  }
  syncAutoplay();
}, { flush: 'sync' });
watch(canPlay, syncAutoplay, { flush: 'sync' });
watch(autoplayLease, syncAutoplay, { flush: 'sync' });

function updateOwner(): void {
  if (!mounted || !root.value || !desktopQuery || !reducedQuery) return;
  const figma = Boolean(root.value.closest('.smd-home--figma-scene'));
  const semantic = Boolean(root.value.closest('.smd-home--semantic-reflow'));
  const catalogue = Boolean(root.value.closest('.smd-r7-home'));
  const match = catalogue || (figma && desktopQuery.matches) || (semantic && !desktopQuery.matches);
  const rect = root.value.getBoundingClientRect();
  owner.value = match && rect.width > 0 && rect.height > 0 &&
    getComputedStyle(root.value).visibility !== 'hidden';
  reducedMotion.value = reducedQuery.matches;
  pageVisible.value = !document.hidden;
}
function onVisibility(): void {
  pageVisible.value = !document.hidden;
  updateOwner();
}
function onPointerEnter(event: PointerEvent): void {
  if (event.pointerType === 'mouse') hovered.value = true;
}
function onPointerLeave(event: PointerEvent): void {
  if (event.pointerType === 'mouse') hovered.value = false;
}
function onFocusIn(event: FocusEvent): void {
  const target = event.target;
  focused.value = target instanceof HTMLElement && target.matches(':focus-visible');
}
function onFocusOut(event: FocusEvent): void {
  const next = event.relatedTarget;
  if (!root.value || !(next instanceof Node) || !root.value.contains(next)) focused.value = false;
}
onMounted(() => {
  mounted = true;
  if (typeof IntersectionObserver !== 'function' || typeof ResizeObserver !== 'function') {
    throw new Error('HERO_CAROUSEL_OBSERVER_UNAVAILABLE');
  }
  desktopQuery = matchMedia('(min-width: 1100px)');
  reducedQuery = matchMedia('(prefers-reduced-motion: reduce)');
  desktopQuery.addEventListener('change', updateOwner);
  reducedQuery.addEventListener('change', updateOwner);
  document.addEventListener('visibilitychange', onVisibility);
  intersectionObserver = new IntersectionObserver(entries => {
    intersecting.value = Boolean(entries[0]?.isIntersecting);
  }, { threshold: 0 });
  resizeObserver = new ResizeObserver(updateOwner);
  if (root.value) {
    intersectionObserver.observe(root.value);
    resizeObserver.observe(root.value);
  }
  updateOwner();
  reconcileLoadedImages();
});
onBeforeUnmount(() => {
  mounted = false;
  clearAutoplay();
  settleMotion();
  if (autoplayLease.value === instanceId) autoplayLease.value = null;
  decodingKeys.clear();
  intersectionObserver?.disconnect();
  resizeObserver?.disconnect();
  desktopQuery?.removeEventListener('change', updateOwner);
  reducedQuery?.removeEventListener('change', updateOwner);
  document.removeEventListener('visibilitychange', onVisibility);
});
</script>

<template>
  <div ref="root" class="smd-hero-carousel"
    :data-hero-revision="HERO_CAROUSEL_REVISION"
    data-hero-motion="dissolve-r2"
    :data-hero-owner="owner ? 'active' : 'inactive'"
    :data-hero-selected-index="selectedIndex"
    :data-hero-delay-ms="HERO_CAROUSEL_DELAY_MS"
    :data-hero-ready="ready ? 'true' : 'false'"
    :data-hero-caption-phase="captionPhase"
    :data-hero-transitioning="transitioning ? 'true' : 'false'"
    :data-hero-fault="loadFault ?? undefined"
    role="region" aria-roledescription="carousel" aria-label="시공 현장 이미지"
    tabindex="0" @keydown="onKeydown" @pointerenter="onPointerEnter"
    @pointerleave="onPointerLeave" @focusin="onFocusIn" @focusout="onFocusOut">
    <div :id="viewportId" class="smd-hero-carousel__viewport"
      @pointerdown="onSwipeStart" @pointerup="onSwipeEnd" @pointercancel="onSwipeCancel">
      <div class="smd-hero-carousel__container">
        <figure v-for="slide in slides" :key="`${slide.slotId}:${slide.src}`"
          class="smd-hero-carousel__slide" :data-hero-slot-id="slide.slotId"
          :data-hero-layer-state="layerPhase(slide.order)"
          @transitionend="onLayerTransitionEnd($event, slide)"
          :aria-hidden="slide.order !== selectedIndex"
          :style="{
            '--hero-focal-x': `${slide.focalPoint.xPercent}%`,
            '--hero-focal-y': `${slide.focalPoint.yPercent}%`,
          }">
          <img :src="slide.src" :alt="slide.alt" :width="slide.width" :height="slide.height"
            :data-hero-image-id="slide.imageId" loading="eager"
            :fetchpriority="slide.order === 0 ? 'high' : 'auto'" decoding="async"
            draggable="false" @load="onImageLoad($event, slide)" @error="onImageError($event, slide)" />
        </figure>
      </div>
    </div>

    <div
      class="smd-hero-carousel__pagination"
      role="group"
      aria-label="히어로 이미지 선택"
    >
      <button
        v-for="slide in slides"
        :key="slide.slotId"
        type="button"
        class="smd-hero-carousel__dot"
        :class="{
          'is-active': slide.order === selectedIndex
        }"
        :aria-label="`${slide.order + 1}번 이미지`"
        :aria-pressed="slide.order === selectedIndex"
        :aria-controls="viewportId"
        :disabled="!owner || !ready || Boolean(loadFault)"
        @click.stop="requestTransition(slide.order, 'manual')"
      />
    </div>
  </div>
</template>
