<script setup lang="ts">
import {useSelectedCategoryPage} from '~/composables/useSelectedCategoryPage';
import ArchiveCategoryPage from '~/components/pages/ArchiveCategoryPage.vue';
import CategoryStandardPage from '~/components/pages/CategoryStandardPage.vue';
import {LEGACY_CANONICAL_PATHS} from '@smd/content-contracts/category-page-contracts';
const route=useRoute();
const state=useSelectedCategoryPage();
const chosen=computed(()=>state.value?.path===route.path?state.value.selected:null);
const page=computed(()=>chosen.value?.mode==='category'?chosen.value:null);
if(!page.value||Object.values(LEGACY_CANONICAL_PATHS).includes(route.path as typeof LEGACY_CANONICAL_PATHS[keyof typeof LEGACY_CANONICAL_PATHS]))
  throw createError({statusCode:503,statusMessage:'CMS_CATEGORY_ROUTE_DISPATCH_INVALID',fatal:true});
if(page.value.templateKind!=='archive-category-v1'&&page.value.templateKind!=='category-standard-v1')
  throw createError({statusCode:503,statusMessage:'CMS_CATEGORY_TEMPLATE_UNKNOWN',fatal:true});
useSeoMeta({
  title:()=>page.value?.seo.title??'',
  description:()=>page.value?.seo.description??'',
  robots:()=>page.value?.seo.noindex?'noindex,follow':'index,follow',
});
const config=useRuntimeConfig();
const canonicalOrigin=String(config.public.siteOrigin||'');
useHead({link:()=>canonicalOrigin&&/^https:\/\/[a-z0-9.-]+$/i.test(canonicalOrigin)
  ?[{rel:'canonical',href:`${canonicalOrigin}${route.path}`}]:[]});
</script>
<template>
  <ArchiveCategoryPage v-if="page?.templateKind==='archive-category-v1'" :page="page" />
  <CategoryStandardPage v-else-if="page?.templateKind==='category-standard-v1'" :page="page" />
</template>
