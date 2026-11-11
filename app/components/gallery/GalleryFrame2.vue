<script setup lang="ts">
import type { ArchiveCollectionV3 } from '@smd/content-contracts/archive-contracts';
import {
  buildGalleryProjectionV1,
  galleryPaginate,
  galleryInitialState,
  galleryActivateFilter,
  gallerySelectPage,
  type GalleryFilterId,
} from '~/utils/gallery-view';
import { GALLERY_FIGMA_FILE_KEY } from '~/utils/gallery-presentation';
import GalleryCategoryTabs from './GalleryCategoryTabs.vue';
import GalleryMediaCard from './GalleryMediaCard.vue';
import GalleryPagination from './GalleryPagination.vue';
import { galleryMediaOwnerKey } from '~/utils/gallery-media';

const props = defineProps<{
  archive: ArchiveCollectionV3;
  publicationId: string;
  publicationDigest: string;
  eyebrow: string;
  titleLines: readonly string[];
  ledeSegments: readonly string[];
}>();

const projection = computed(() => buildGalleryProjectionV1(props.archive, {
  id: props.publicationId,
  digest: props.publicationDigest,
}));
const session = ref(galleryInitialState());
const activeFilter = computed(() => session.value.activeFilter);
const filteredItems = computed(() => projection.value.views[activeFilter.value]);
const pageResult = computed(() => galleryPaginate(
  filteredItems.value, session.value.pageByFilter[activeFilter.value],
));

function cardOwnerKey(entryId: string): string {
  return galleryMediaOwnerKey({
    publicationId: props.publicationId,
    publicationDigest: props.publicationDigest,
    filter: activeFilter.value,
    page: pageResult.value.currentPage,
    entryId,
  });
}

function selectFilter(filter: GalleryFilterId): void {
  session.value = galleryActivateFilter(session.value, filter);
}

function selectPage(page: number): void {
  session.value = gallerySelectPage(session.value, page, pageResult.value.totalPages);
}

// Published identity (not tab interaction) owns the reset boundary.
watch(() => [props.publicationId, props.publicationDigest] as const, () => {
  session.value = galleryInitialState();
}, { flush: 'sync' });
</script>

<template>
  <section class="smd-gallery-frame2" data-figma-node="node-1:27" :data-figma-file-key="GALLERY_FIGMA_FILE_KEY" aria-labelledby="smd-gallery-title"
    :data-gallery-publication-id="publicationId"
    :data-gallery-publication-digest="publicationDigest"
    :data-gallery-active-filter="activeFilter"
    :data-gallery-current-page="pageResult.currentPage"
    :data-gallery-total-pages="pageResult.totalPages">
    <div class="smd-gallery-frame2__inner">
      <div class="smd-gallery-frame2__intro">
        <p class="smd-gallery-frame2__eyebrow" data-figma-node="node-1:72">{{ eyebrow }}</p>
        <h1 id="smd-gallery-title" class="smd-gallery-frame2__title" data-figma-node="node-1:83">
          {{ titleLines.join(' ') }}
        </h1>
        <div class="smd-gallery-frame2__lede" data-figma-node="node-1:82">
          <p v-for="(segment, index) in ledeSegments" :key="index">{{ segment }}</p>
        </div>
      </div>

      <GalleryCategoryTabs :active="activeFilter" @change="selectFilter" />
      <div id="smd-gallery-panel" class="smd-gallery-frame2__panel" role="tabpanel"
        :aria-labelledby="`smd-gallery-tab-${activeFilter}`" tabindex="0">
        <div v-if="pageResult.items.length" class="smd-gallery-frame2__grid">
          <GalleryMediaCard v-for="entry in pageResult.items"
            :key="cardOwnerKey(entry.id)" :owner-key="cardOwnerKey(entry.id)" :entry="entry" />
        </div>
        <p v-else class="smd-gallery-frame2__empty" role="status">
          {{ activeFilter === 'photo' ? '등록된 사진이 없습니다.' : activeFilter === 'video' ? '등록된 영상이 없습니다.' : '등록된 콘텐츠가 없습니다.' }}
        </p>
        <GalleryPagination
          :page="pageResult.currentPage"
          :total-pages="pageResult.totalPages"
          @select-page="selectPage"
        />
      </div>
    </div>
  </section>
</template>

<style src="~/assets/css/gallery-r1.css"></style>
