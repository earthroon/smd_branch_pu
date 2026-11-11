<script setup lang="ts">
import { usePublicConsultationHref } from '~/composables/usePublicConsultationHref';
import { HOME_HEADER_BRAND_R1, assertHomeHeaderBrandR1 } from '~/data/home-r2-brand-display';
import { homeHeaderNavigationV2, homeHeaderNavigationV3, assertHomeHeaderNavigationV2, assertHomeHeaderNavigationV3, homeHeaderTargetStatus } from '~/data/home-r2-navigation';
import { useContentMode } from '~/composables/useContentMode';
import { GALLERY_FIGMA_FILE_KEY, galleryHeaderNodeForItem } from '~/utils/gallery-presentation';

assertHomeHeaderNavigationV2();
assertHomeHeaderNavigationV3();
assertHomeHeaderBrandR1();
const ctaHref = usePublicConsultationHref();
const route = useRoute();
const scrolled = ref(false);
const open = ref(false);

const atDocumentTop = ref(true);

const introHeaderReveal = useState<boolean>(
  'smd-home-header-scroll-intent-r1',
  () => false
);

const homeHeaderMode = computed<'top' | 'menu'>(() => {
  switch (true) {
    case route.path !== '/':
    case open.value:
    case !atDocumentTop.value:
    case introHeaderReveal.value:
      return 'menu';

    default:
      return 'top';
  }
});

let previousScrollY = 0;
const toggle = ref<HTMLButtonElement | null>(null);
const nav = homeHeaderNavigationV2.items; // Same owner for both desktop and compact navigation.
const headerContentMode = useContentMode();
const standalone = headerContentMode === 'standalone';
const catalogueEnabled = true;

const active = (to: string) => route.path === to;
const galleryHeader = computed(() => route.path === '/archive');
const brand = HOME_HEADER_BRAND_R1.displayText;

let oldBodyOverflow: string | null = null;
function releaseDrawerLock() {
  if (!import.meta.client || oldBodyOverflow === null) return;
  document.body.style.overflow = oldBodyOverflow;
  oldBodyOverflow = null;
}
function setDrawerLock(enabled: boolean) {
  if (!import.meta.client) return;
  if (enabled) {
    if (oldBodyOverflow === null) {
      oldBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
  } else releaseDrawerLock();
}
function closeDrawer(restoreFocus = false) {
  open.value = false;
  if (restoreFocus && import.meta.client) nextTick(() => toggle.value?.focus());
}
function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && open.value) closeDrawer(true);
}

function onScroll(): void {
  const y = Math.max(0, window.scrollY);

  scrolled.value = y > 16;
  atDocumentTop.value = y <= 2;

  // 실제 아래 영역에서 최상단으로 돌아왔을 때 초기화
  if (previousScrollY > 2 && y <= 2) {
    introHeaderReveal.value = false;
  }

  previousScrollY = y;
}

watch(open, setDrawerLock, { flush: 'sync' });

watch(() => route.path, () => {
  closeDrawer();
  introHeaderReveal.value = false;

  if (import.meta.client) {
    void nextTick(() => {
      previousScrollY = window.scrollY;
      onScroll();
    });
  }
});

onMounted(() => {
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('keydown', onKeydown);
});
onUnmounted(() => {
  window.removeEventListener('scroll', onScroll);
  window.removeEventListener('keydown', onKeydown);
  releaseDrawerLock();
});
const figmaLogoError = ref(false);
</script>
<template>

<header
  :class="[
    'smd-site-header',
    {
      'smd-site-header--scrolled': scrolled || open,
      'smd-site-header--home': route.path === '/'
    }
  ]"
  :data-home-header-mode="homeHeaderMode"

    :data-header-contract="standalone ? 'SMD_HOME_HEADER_NAV_V3' : 'SMD_HOME_HEADER_NAV_V2'"
    :data-figma-node="galleryHeader ? 'node-1:4' : 'node-1:6'"
    :data-figma-file-key="galleryHeader ? GALLERY_FIGMA_FILE_KEY : undefined"
  >
    <div class="smd-site-header__inner">
      <NuxtLink to="/" class="smd-site-header__brand" :aria-label="`${brand} 홈으로`" @click="closeDrawer()">
        <img v-if="catalogueEnabled" class="smd-r7-brand-logo" src="/media/catalogue/r7-logo.svg"
          width="280" height="50" alt="SMD 아카데미" decoding="async" />
        <template v-else>
        <span class="smd-site-header__symbol" :data-figma-node="galleryHeader ? 'node-1:6' : undefined">
          <img v-if="!figmaLogoError"
            src="/figma/smd-academy-header-logo.svg"
            class="smd-site-header__figma-logo"
            width="80" height="80" alt="" aria-hidden="true" decoding="async"
            @error="figmaLogoError = true" />
          <span v-else class="smd-site-header__logo-error" role="status">로고 오류</span>
        </span>
        <span class="smd-site-header__brand-label" :data-figma-node="galleryHeader ? 'node-1:21' : undefined">{{ brand }}</span>
        </template>
      </NuxtLink>

      <nav class="smd-site-header__desktop-nav" aria-label="주 메뉴">
        <NuxtLink
          v-for="item in nav" :key="item.id" :to="item.to"
          :data-header-item="item.id" :data-target-status="homeHeaderTargetStatus(item, headerContentMode)" :data-figma-node="galleryHeaderNodeForItem(route.path, item.id, item.sourceNodeKey)"
          :aria-current="active(item.to) ? 'page' : undefined"
          class="smd-site-header__nav-link"
        >{{ item.label }}</NuxtLink>
      </nav>

      <NuxtLink v-if="standalone" to="/contact"
        class="smd-site-header__cta smd-site-header__desktop-cta"
        :data-figma-node="galleryHeader ? 'node-1:22' : 'node-1:19'"
        :data-figma-background-node="galleryHeader ? 'node-1:23' : undefined"
      >{{ homeHeaderNavigationV3.cta.label }}</NuxtLink>
      <a v-else-if="ctaHref" :href="ctaHref" target="_blank" rel="noopener noreferrer"
        class="smd-site-header__cta smd-site-header__desktop-cta"
        :data-figma-node="galleryHeader ? 'node-1:22' : 'node-1:19'"
        :data-figma-background-node="galleryHeader ? 'node-1:23' : undefined"
      >{{ homeHeaderNavigationV2.cta.label }}</a>
      <span v-else class="smd-site-header__cta-unavailable smd-site-header__desktop-cta" role="status">상담 연결 불가</span>

      <button ref="toggle" type="button" class="smd-site-header__toggle"
        :aria-expanded="open" aria-controls="smd-header-menu-drawer"
        :aria-label="open ? '메뉴 닫기' : '메뉴 열기'"
        @click="open ? closeDrawer(true) : (open = true)"
      ><i :class="['text-2xl', open ? 'ri-close-line' : 'ri-menu-line']" aria-hidden="true" /></button>
    </div>
    <div id="smd-header-menu-drawer" class="smd-site-header__drawer" :class="{ 'smd-site-header__drawer--open': open }" :inert="!open">
      <nav class="smd-site-header__drawer-nav" aria-label="모바일 메뉴">
        <NuxtLink v-for="item in nav" :key="item.id" :to="item.to"
          class="smd-site-header__drawer-link" :aria-current="active(item.to) ? 'page' : undefined"
          :data-header-item="item.id" :data-target-status="homeHeaderTargetStatus(item, headerContentMode)" @click="closeDrawer()"
        >{{ item.label }}</NuxtLink>
        <NuxtLink v-if="standalone" to="/contact" class="smd-site-header__drawer-cta"
          @click="closeDrawer()">{{ homeHeaderNavigationV3.cta.label }}</NuxtLink>
        <a v-else-if="ctaHref" :href="ctaHref" target="_blank" rel="noopener noreferrer"
          class="smd-site-header__drawer-cta" @click="closeDrawer()"
        >{{ homeHeaderNavigationV2.cta.label }}</a>
        <p v-else class="smd-site-header__drawer-unavailable" role="status">상담 연결을 사용할 수 없습니다.</p>
      </nav>
    </div>
  </header>
</template>
<style src="~/assets/css/home-r2-header.css"></style>
