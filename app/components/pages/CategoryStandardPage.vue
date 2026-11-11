<script setup lang="ts">
import {useSiteContent} from '~/composables/useSiteContent';
import type {PublicRenderedPageV3} from '@smd/content-contracts/contracts';
import PageHero from '~/components/feature/PageHero.vue';
import CtaBand from '~/components/feature/CtaBand.vue';
import CmsSlot from '~/components/cms/CmsSlot.vue';
defineProps<{page:Extract<PublicRenderedPageV3,{mode:'category'}>}>();
const site=useSiteContent();
</script>
<template>
  <PageHero :eyebrow="page.hero.eyebrow" :lede="page.hero.summary"><template #title>{{ page.hero.heading }}</template></PageHero>
  <CmsSlot :nodes="page.slots.afterHero??[]" />
  <CmsSlot :nodes="page.slots.main??[]" />
  <CmsSlot :nodes="page.slots.beforeCta??[]" />
  <CtaBand :title="site?.pages.archive.cta.title??''" :link-label="site?.pages.archive.cta.label" to="/contact" />
</template>
