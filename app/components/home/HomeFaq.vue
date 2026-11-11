<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref } from 'vue';
import HomeFigmaText from './HomeFigmaText.vue';
import { homeCopyRefs } from '~/data/home-r2-composition';
import { resolveHomeFaqRows, type HomeFaqId } from '~/data/homeFaqApprovedCopy';
import { faqAlignmentTarget, faqScrollEase, type FaqAlignmentResult } from '~/utils/homeFaqLayout';
import { useHomeR2Published } from '~/composables/useHomeR2Published';
import { useSiteContent } from '~/composables/useSiteContent';

const props = withDefaults(defineProps<{ wide?: boolean }>(), { wide: false });
const root = ref<HTMLElement | null>(null);
const expandedId = ref<HomeFaqId | null>(null);
const alignmentState = ref<'idle' | 'aligning' | 'aligned' | 'cancelled'>('idle');
const alignmentMode = ref<FaqAlignmentResult['mode'] | null>(null);
const generation = ref(0);
const published = useHomeR2Published();
const content = useSiteContent();
const route = useRoute();
const currentFaq = computed(() => {
  switch (route.path) {
    case '/': break;
    default: return [];
  }
  const projection = published.value;
  switch (projection) {
    case null: return [];
    default: break;
  }
  const current = content.value?.publication;
  switch (current) {
    case null:
    case undefined: throw new Error('SMD_HOME_FAQ_PUBLICATION_OWNER_UNAVAILABLE');
    default: break;
  }
  switch (projection.publicationId === current.id
    && projection.publicationDigest === current.digest) {
    case true: return projection.faq;
    default: throw new Error('SMD_HOME_FAQ_PUBLICATION_STALE');
  }
});
const rows = computed(() => resolveHomeFaqRows(currentFaq.value));
const contentAuthority = computed(() => {
  switch (currentFaq.value.length) {
    case 0: return 'USER_APPROVED_QA_R1';
    case 4: return 'CMS_PUBLICATION_V1';
    default: return 'EXPLICIT_MIXED_ROW_AUTHORITY';
  }
});

let scrollFrame: number | null = null;
let layoutFrame: number | null = null;
let activeScrollListeners = false;
let scrollElement: HTMLElement | null = null;
let previousScrollBehavior: { value: string; priority: string } | null = null;

function restoreScrollBehavior(): void {
  const element = scrollElement;
  const old = previousScrollBehavior;
  scrollElement = null;
  previousScrollBehavior = null;
  if (!element || !old) return;
  if (element.style.getPropertyValue('scroll-behavior') !== 'auto'
    || element.style.getPropertyPriority('scroll-behavior') !== 'important') return;
  switch (old.value) {
    case '': element.style.removeProperty('scroll-behavior'); break;
    default: element.style.setProperty('scroll-behavior', old.value, old.priority); break;
  }
}

function removeScrollListeners(): void {
  if (!activeScrollListeners) return;
  window.removeEventListener('wheel', onUserScroll, true);
  window.removeEventListener('touchstart', onUserScroll, true);
  window.removeEventListener('keydown', onScrollKey, true);
  activeScrollListeners = false;
}

function stopScroll(): void {
  if (scrollFrame !== null) window.cancelAnimationFrame(scrollFrame);
  scrollFrame = null;
  removeScrollListeners();
  restoreScrollBehavior();
}

function cancelAlignment(): void {
  if (alignmentState.value !== 'aligning') return;
  generation.value++;
  if (layoutFrame !== null) window.cancelAnimationFrame(layoutFrame);
  layoutFrame = null;
  stopScroll();
  alignmentState.value = 'cancelled';
}

function onUserScroll(): void { cancelAlignment(); }
function onScrollKey(event: KeyboardEvent): void {
  if (event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.target instanceof Element && event.target.closest('input,textarea,select,[contenteditable]')) return;
  if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(event.key)) cancelAlignment();
}
function installScrollListeners(): void {
  if (activeScrollListeners) return;
  window.addEventListener('wheel', onUserScroll, { capture: true, passive: true });
  window.addEventListener('touchstart', onUserScroll, { capture: true, passive: true });
  window.addEventListener('keydown', onScrollKey, true);
  activeScrollListeners = true;
}

function startAlignment(targetY: number, token: number): void {
  const from = window.scrollY;
  const distance = targetY - from;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (Math.abs(distance) < 2 || reduceMotion) {
    window.scrollTo({ top: targetY, behavior: 'instant' });
    alignmentState.value = 'aligned';
    return;
  }
  const scrolling = document.scrollingElement;
  if (!(scrolling instanceof HTMLElement)) throw new Error('SMD_HOME_FAQ_SCROLL_ELEMENT_UNAVAILABLE');
  scrollElement = scrolling;
  previousScrollBehavior = {
    value: scrolling.style.getPropertyValue('scroll-behavior'),
    priority: scrolling.style.getPropertyPriority('scroll-behavior'),
  };
  scrolling.style.setProperty('scroll-behavior', 'auto', 'important');
  installScrollListeners();
  const start = performance.now();
  const duration = Math.min(440, Math.max(220, Math.abs(distance) * 0.4));
  const tick = (now: number): void => {
    scrollFrame = null;
    if (generation.value !== token || alignmentState.value !== 'aligning') return;
    const progress = Math.min(1, Math.max(0, (now - start) / duration));
    window.scrollTo({ top: from + distance * faqScrollEase(progress), behavior: 'auto' });
    switch (progress >= 1) {
      case true:
        stopScroll();
        alignmentState.value = 'aligned';
        break;
      default:
        scrollFrame = window.requestAnimationFrame(tick);
        break;
    }
  };
  scrollFrame = window.requestAnimationFrame(tick);
}

async function toggle(id: HomeFaqId): Promise<void> {
  generation.value++;
  const token = generation.value;
  if (layoutFrame !== null) window.cancelAnimationFrame(layoutFrame);
  layoutFrame = null;
  stopScroll();
  expandedId.value = expandedId.value === id ? null : id;
  alignmentMode.value = null;
  // Both opening and closing recenter the clicked row, per the FAQ selection contract.
  alignmentState.value = 'aligning';
  await nextTick();
  if (generation.value !== token) return;
  layoutFrame = window.requestAnimationFrame(() => {
    layoutFrame = null;
    if (generation.value !== token) return;
    const selected = Array.from(root.value?.querySelectorAll<HTMLElement>('[data-faq-id]') ?? [])
      .find(node => node.dataset.faqId === id);
    const header = document.querySelector<HTMLElement>('.smd-site-header');
    if (!selected?.isConnected || !header?.isConnected) {
      alignmentState.value = 'cancelled';
      console.error('SMD_HOME_FAQ_ALIGNMENT_TARGET_UNAVAILABLE', id);
      return;
    }
    try {
      const bounds = selected.getBoundingClientRect();
      const target = faqAlignmentTarget({
        scrollY: window.scrollY,
        itemTop: bounds.top,
        itemHeight: bounds.height,
        viewportHeight: window.innerHeight,
        headerHeight: header.getBoundingClientRect().height,
        documentHeight: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight),
        safeGap: 16,
      });
      alignmentMode.value = target.mode;
      startAlignment(target.targetY, token);
    } catch (error) {
      stopScroll();
      alignmentState.value = 'cancelled';
      console.error('SMD_HOME_FAQ_ALIGNMENT_FAILED', error);
    }
  });
}

onBeforeUnmount(() => {
  generation.value++;
  if (layoutFrame !== null) window.cancelAnimationFrame(layoutFrame);
  layoutFrame = null;
  stopScroll();
});
</script>

<template>
  <section ref="root" class="smd-home-section smd-home--faq" data-home-section="faq"
    data-figma-node="node-1:22" data-faq-contract="SMD_HOME_FAQ_R1"
    :data-faq-renderer="props.wide ? 'wide-semantic' : 'responsive-semantic'"
    :data-faq-content-authority="contentAuthority" :data-faq-expanded-id="expandedId ?? undefined"
    :data-faq-alignment-state="alignmentState" :data-faq-alignment-mode="alignmentMode ?? undefined"
    :data-faq-selection-generation="generation">
    <div class="smd-home__container">
      <h2 class="smd-home__section-heading smd-home__faq-heading"><HomeFigmaText :text-key="homeCopyRefs.faq.title" /></h2>
      <div class="smd-home__faq-list" data-faq-item-count="4">
        <div v-for="row in rows" :key="row.id" class="smd-home__faq-item"
          :data-faq-id="row.id" :data-faq-row-authority="row.authority"
          :data-faq-open="expandedId === row.id ? 'true' : 'false'">
          <h3 class="smd-home__faq-question">
            <button type="button" class="smd-home__faq-trigger"
              :id="`smd-home-faq-question-${row.id.slice(-2)}`"
              :aria-controls="`smd-home-faq-answer-${row.id.slice(-2)}`"
              :aria-expanded="expandedId === row.id" @click="toggle(row.id)">
              <span class="smd-home__faq-question-text">{{ row.question }}</span>
              <span class="smd-home__faq-plus" aria-hidden="true" />
            </button>
          </h3>
          <div v-show="expandedId === row.id" class="smd-home__faq-answer-panel"
            :id="`smd-home-faq-answer-${row.id.slice(-2)}`"
            role="region" :aria-labelledby="`smd-home-faq-question-${row.id.slice(-2)}`">
            <p v-for="(paragraph,index) in row.paragraphs" :key="index" class="smd-home__faq-answer-paragraph">{{ paragraph }}</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
