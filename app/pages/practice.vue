<script setup lang="ts">
import {useSiteContent} from '~/composables/useSiteContent';
import {usePublishedSiteMedia} from '~/composables/usePublishedSiteMedia';
import SiteImage from '~/components/media/SiteImage.vue';
const siteImage_0=usePublishedSiteMedia('practice.image');
import CmsSlot from '~/components/cms/CmsSlot.vue';
const c=useSiteContent();
const pages=computed(()=>c.value?.pages);
import PageHero from '~/components/feature/PageHero.vue';
import Reveal from '~/components/feature/Reveal.vue';
import CtaBand from '~/components/feature/CtaBand.vue';
const facilities=computed(()=>pages.value?.practice.facilities??[]);
useSeoMeta({title:'실습공간 | SMD 아카데미'});
</script>
<template>
  <PageHero :eyebrow="pages?.practice.hero.eyebrow??''" :lede="pages?.practice.hero.ledeSegments.join(' ')"><template #title>{{ pages?.practice.hero.titleLines[0] }}<br />{{ pages?.practice.hero.titleLines[1] }}</template></PageHero>
  <section class="py-16 md:py-24"><div class="container-x"><Reveal><SiteImage v-if="siteImage_0?.kind==='v5'" :key="siteImage_0.key" :image="siteImage_0.image" /><template v-else-if="siteImage_0?.kind==='legacy'"><div class="aspect-[16/8] w-full overflow-hidden rounded-lg bg-background-100"><img :src="pages?.practice.image.src" :alt="pages?.practice.image.alt" :title="pages?.practice.image.title" class="h-full w-full object-cover object-top" /></div></template></Reveal><div class="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"><Reveal v-for="(item,index) in facilities" :key="item.title" :delay="index*90"><div class="h-full rounded-lg border border-background-200 bg-background-50 p-6"><div class="grid h-11 w-11 place-items-center rounded-md bg-secondary-100 text-secondary-700"><i :class="[item.icon,'text-xl']" /></div><h3 class="mt-5 font-heading text-base font-semibold text-foreground-950">{{ item.title }}</h3><p class="mt-2 text-sm leading-relaxed text-foreground-600">{{ item.desc }}</p></div></Reveal></div></div></section>
  <CmsSlot :nodes="c?.pageSlots.practice.afterFacilities??[]" />
  <CmsSlot :nodes="c?.pageSlots.practice.beforeCta??[]" />
  <CtaBand :title="pages?.practice.cta.title??''" :link-label="pages?.practice.cta.label" external />
</template>
