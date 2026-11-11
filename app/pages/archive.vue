<script setup lang="ts">
import CatalogueCover from '~/components/catalogue/CatalogueCover.vue';
import CatalogueSheet from '~/components/catalogue/CatalogueSheet.vue';
import { useSiteContent } from '~/composables/useSiteContent';
import CmsSlot from '~/components/cms/CmsSlot.vue';
import PageHero from '~/components/feature/PageHero.vue';
import ArchiveGallery from '~/components/feature/ArchiveGallery.vue';
import GalleryFrame2 from '~/components/gallery/GalleryFrame2.vue';
import GalleryStandalonePreview from '~/components/gallery/GalleryStandalonePreview.vue';
import { useContentMode } from '~/composables/useContentMode';
import CtaBand from '~/components/feature/CtaBand.vue';
import GalleryCtaFrame3 from '~/components/gallery/GalleryCtaFrame3.vue';
import { galleryNavigationPresentation } from '~/utils/gallery-presentation';

const c = useSiteContent();
// Standalone uses an explicitly UNPUBLISHED gallery design fixture in dev and Workers production.
// This route-local decision never changes CMS/V3 or other page data sources.
const localGalleryPreview = useContentMode() === 'standalone';
const pages = computed(() => c.value?.pages);
const galleryV3 = computed(() => {
  const archive = c.value?.archive;
  return archive && 'kind' in archive && archive.kind === 'archive-collection' &&
    archive.schemaVersion === 3 ? archive : null;
});
const archiveNavigationLabel=computed(()=>{
  const all=[...(c.value?.navigation.leftNav??[]),...(c.value?.navigation.rightNav??[])];
  return galleryNavigationPresentation(all.find(link=>link.to==='/archive') ?? { to: '/archive', label: '수강갤러리' }).label;
});
useSeoMeta({title:computed(()=>`${archiveNavigationLabel.value} | SMD 아카데미`)});
</script>

<template>
  <div class="smd-r7-route smd-r7-route--archive" data-r7-route-owner="archive" data-r7-hero="fullscreen">
    <CatalogueCover page-id="archive" eyebrow="ARCHIVE / CLASS GALLERY" heading="수강갤러리"
      description="실습 현장의 사진과 영상을 확인합니다." />
    <CatalogueSheet page-id="archive" section-id="content" :ordinal="2" :total="2"
      variant="standard" fit="flow" label="ARCHIVE / CLASS GALLERY" heading-id="r7-archive-content" >
      <div class="smd-r7-route__listing">
        <h2 id="r7-archive-content">수강갤러리</h2>

  <GalleryStandalonePreview v-if="localGalleryPreview" />
  <template v-else>
  <GalleryFrame2
    v-if="galleryV3 && c"
    :archive="galleryV3"
    :publication-id="c.publication.id"
    :publication-digest="c.publication.digest"
    :eyebrow="pages?.archive.hero.eyebrow ?? ''"
    :title-lines="pages?.archive.hero.titleLines ?? []"
    :lede-segments="pages?.archive.hero.ledeSegments ?? []"
  />
  <template v-else>
    <!-- Historical V2 or legacy publication: preserve the original rendering semantics. -->
    <PageHero :eyebrow="pages?.archive.hero.eyebrow ?? ''" :lede="pages?.archive.hero.ledeSegments.join(' ')">
      <template #title>{{ pages?.archive.hero.titleLines[0] }}<br />{{ pages?.archive.hero.titleLines[1] }}</template>
    </PageHero>
    <ArchiveGallery mode="full" />
  </template>
  </template>
  <CmsSlot :nodes="c?.pageSlots.archive.afterGallery ?? []" />
  <CmsSlot :nodes="c?.pageSlots.archive.beforeCta ?? []" />
  <GalleryCtaFrame3 v-if="localGalleryPreview || galleryV3" />
  <CtaBand v-else :title="pages?.archive.cta.title ?? ''" :link-label="pages?.archive.cta.label" external />

      </div>
    </CatalogueSheet>
  </div>
</template>
