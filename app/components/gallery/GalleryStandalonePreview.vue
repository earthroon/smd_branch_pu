<script setup lang="ts">
import {
  galleryActivateFilter,
  galleryInitialState,
  galleryPaginate,
  gallerySelectPage,
  type GalleryFilterId,
} from '~/utils/gallery-view';
import { GALLERY_FIGMA_FILE_KEY } from '~/utils/gallery-presentation';
import GalleryCategoryTabs from './GalleryCategoryTabs.vue';
import GalleryPagination from './GalleryPagination.vue';

/**
 * Dev-only Figma visual fixture. These nine cards are explicitly not Archive
 * publications, images, YouTube videos, or CMS asset records. Node identities
 * and the six-video / three-photo arrangement come from Figma Gallery FRAME2.
 */
type FigmaPlaceholder = Readonly<{
  id: string;
  mediaNode: string;
  badgeNode: string;
  kind: 'photo' | 'video';
}>;
const placeholders: readonly FigmaPlaceholder[] = [
  { id: 'figma:1:69', mediaNode: 'node-1:69', badgeNode: 'node-1:66', kind: 'video' },
  { id: 'figma:1:68', mediaNode: 'node-1:68', badgeNode: 'node-1:62', kind: 'photo' },
  { id: 'figma:1:67', mediaNode: 'node-1:67', badgeNode: 'node-1:64', kind: 'video' },
  { id: 'figma:1:54', mediaNode: 'node-1:54', badgeNode: 'node-1:51', kind: 'video' },
  { id: 'figma:1:53', mediaNode: 'node-1:53', badgeNode: 'node-1:47', kind: 'photo' },
  { id: 'figma:1:52', mediaNode: 'node-1:52', badgeNode: 'node-1:49', kind: 'video' },
  { id: 'figma:1:36', mediaNode: 'node-1:36', badgeNode: 'node-1:33', kind: 'video' },
  { id: 'figma:1:35', mediaNode: 'node-1:35', badgeNode: 'node-1:29', kind: 'photo' },
  { id: 'figma:1:34', mediaNode: 'node-1:34', badgeNode: 'node-1:31', kind: 'video' },
];

const state = ref(galleryInitialState());
const activeFilter = computed(() => state.value.activeFilter);
const filtered = computed(() => placeholders.filter(card =>
  activeFilter.value === 'all' || card.kind === activeFilter.value));
const pageResult = computed(() => galleryPaginate(
  filtered.value, state.value.pageByFilter[activeFilter.value],
));
function selectFilter(filter: GalleryFilterId): void {
  state.value = galleryActivateFilter(state.value, filter);
}
function selectPage(page: number): void {
  state.value = gallerySelectPage(state.value, page, pageResult.value.totalPages);
}
</script>

<template>
  <section
    class="smd-gallery-frame2"
    data-figma-node="node-1:27" :data-figma-file-key="GALLERY_FIGMA_FILE_KEY"
    data-gallery-preview-only="true"
    :data-gallery-active-filter="activeFilter"
    aria-labelledby="smd-gallery-title"
  >
    <div class="smd-gallery-frame2__inner">
      <div class="smd-gallery-frame2__intro">
        <p class="smd-gallery-frame2__eyebrow" data-figma-node="node-1:72">SMD ACADEMY / CLASS GALLERY</p>
        <h1 id="smd-gallery-title" class="smd-gallery-frame2__title" data-figma-node="node-1:83">수강갤러리</h1>
        <div class="smd-gallery-frame2__lede" data-figma-node="node-1:82">
          <p>직접 배우고, 함께 완성하는 수업의 순간들.</p>
          <p>사진과 영상으로 SMD아카데미의 교육 현장을 만나보세요.</p>
        </div>
      </div>
      <GalleryCategoryTabs :active="activeFilter" @change="selectFilter" />
      <div
        id="smd-gallery-panel"
        class="smd-gallery-frame2__panel"
        role="tabpanel"
        :aria-labelledby="`smd-gallery-tab-${activeFilter}`"
        tabindex="0"
      >
        <div v-if="pageResult.items.length" class="smd-gallery-frame2__grid">
          <article v-for="card in pageResult.items" :key="card.id" class="smd-gallery-card">
            <div
              class="smd-gallery-card__media"
              :data-figma-node="card.mediaNode"
              role="img"
              :aria-label="`Figma ${card.kind === 'photo' ? '사진' : '영상'} 자리 표시 영역. 실제 미디어가 아닙니다.`"
            >
              <span class="smd-gallery-card__badge" :data-figma-node="card.badgeNode">{{ card.kind === 'photo' ? '사진' : '영상' }}</span>
            </div>
            <h2 class="smd-gallery-card__title">제목</h2>
            <p class="smd-gallery-card__description">{{ card.kind === 'photo' ? '사진으로 보는 수업 현장' : '영상으로 보는 수업 현장' }}</p>
          </article>
        </div>
        <p v-else class="smd-gallery-frame2__empty" role="status">등록된 콘텐츠가 없습니다.</p>
        <GalleryPagination :page="pageResult.currentPage" :total-pages="pageResult.totalPages" @select-page="selectPage" />
      </div>
    </div>
  </section>
</template>

<style src="~/assets/css/gallery-r1.css"></style>
