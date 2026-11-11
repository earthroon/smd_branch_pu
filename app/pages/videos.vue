<script setup lang="ts">
import {useSiteContent} from '~/composables/useSiteContent';
import {useSelectedCategoryPage} from '~/composables/useSelectedCategoryPage';
import ArchiveGallery from '~/components/feature/ArchiveGallery.vue';
const content=useSiteContent();
const selected=useSelectedCategoryPage();
const page=computed(()=>selected.value?.selected.mode==='archive-lane'&&
  selected.value.selected.pageId==='videos'?selected.value.selected:null);
useSeoMeta({title:computed(()=>page.value?.seo.title??'영상 | SMD 아카데미'),
  description:computed(()=>page.value?.seo.description??'')});
</script>
<template>
  <main v-if="page&&content&&'kind' in content.archive&&content.archive.kind==='archive-collection'&&content.archive.schemaVersion===3">
    <div class="smd-video-lane-head container-x pt-36 pb-8">
      <p class="font-label text-sm uppercase tracking-widest text-primary-500">VIDEO</p>
      <h1 class="mt-3 font-heading text-4xl font-bold">영상</h1>
      <p class="mt-3 text-foreground-600">{{page.seo.description}}</p>
    </div>
    <ArchiveGallery mode="full" lane="video" />
  </main>
</template>
