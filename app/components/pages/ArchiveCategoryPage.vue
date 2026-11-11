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
  <section class="bg-foreground-950 py-16 md:py-24">
    <div class="container-x grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <article v-for="item in page.archiveItems??[]" :key="item.title" class="group">
        <div class="relative flex aspect-[4/3] items-end overflow-hidden rounded-lg border border-foreground-800 bg-gradient-to-br from-foreground-900 to-foreground-950 p-4">
          <img v-if="item.image" :src="item.image" :alt="item.title" class="absolute inset-0 h-full w-full object-cover" />
          <span class="relative rounded-full border border-foreground-800 bg-foreground-900/80 px-3 py-1 text-[11px] text-foreground-400">{{ item.category }}</span>
        </div>
        <h2 class="mt-4 font-heading text-base font-medium text-background-50">{{ item.title }}</h2>
        <p class="mt-1 text-sm text-foreground-500">{{ item.sub }}</p>
      </article>
    </div>
  </section>
  <CmsSlot :nodes="page.slots.beforeCta??[]" />
  <CtaBand :title="site?.pages.archive.cta.title??''" :link-label="site?.pages.archive.cta.label" external />
</template>
