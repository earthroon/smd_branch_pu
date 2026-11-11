<script setup lang="ts">
import {useSiteContent} from '~/composables/useSiteContent';
import {usePublishedSiteMedia} from '~/composables/usePublishedSiteMedia';
import SiteImage from '~/components/media/SiteImage.vue';
const siteImage_0=usePublishedSiteMedia('about.heroImage');
const siteImage_1=usePublishedSiteMedia('about.instructor.image');
import CmsSlot from '~/components/cms/CmsSlot.vue';
import PageHero from '~/components/feature/PageHero.vue';
import Reveal from '~/components/feature/Reveal.vue';
import CtaBand from '~/components/feature/CtaBand.vue';
const c=useSiteContent();
const pages=computed(()=>c.value?.pages);
useSeoMeta({title:'아카데미 소개 | SMD 아카데미'});
</script>
<template>
  <PageHero :eyebrow="pages?.about.hero.eyebrow??''" :lede="pages?.about.hero.ledeSegments.join(' ')">
    <template #title>{{ pages?.about.hero.titleLines[0] }}<br />{{ pages?.about.hero.titleLines[1] }}</template>
    <SiteImage v-if="siteImage_0?.kind==='v5'" :key="siteImage_0.key" :image="siteImage_0.image" /><template v-else-if="siteImage_0?.kind==='legacy'"><div class="aspect-[16/7] w-full overflow-hidden rounded-lg bg-background-100"><img :src="pages?.about.heroImage.src" :alt="pages?.about.heroImage.alt" :title="pages?.about.heroImage.title" class="h-full w-full object-cover object-top" /></div></template>
  </PageHero>
  <section class="py-16 md:py-24"><div class="container-x"><Reveal><span class="eyebrow">{{ pages?.about.pillarsEyebrow }}</span><h2 class="mt-5 font-heading text-3xl font-semibold tracking-tight text-foreground-950 md:text-4xl">{{ pages?.about.pillarsHeading }}</h2></Reveal><div class="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3"><Reveal v-for="(pillar,index) in c?.about.pillars" :key="pillar.num" :delay="index*100"><div class="h-full rounded-lg border border-background-200 bg-background-50 p-7"><div class="font-label text-sm tracking-[0.1em] text-primary-600">{{ pillar.num }}</div><h3 class="mt-5 font-heading text-xl font-semibold tracking-tight text-foreground-950">{{ pillar.title }}</h3><p class="mt-3 text-sm leading-relaxed text-foreground-600">{{ pillar.desc }}</p></div></Reveal></div></div></section>
  <CmsSlot :nodes="c?.pageSlots.about.afterPillars??[]" />
  <section class="border-t border-background-200 bg-background-100 py-16 md:py-24"><div class="container-x grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16"><Reveal><SiteImage v-if="siteImage_1?.kind==='v5'" :key="siteImage_1.key" :image="siteImage_1.image" /><template v-else-if="siteImage_1?.kind==='legacy'"><div class="aspect-[4/3] w-full overflow-hidden rounded-lg bg-background-200"><img :src="pages?.about.instructor.image.src" :alt="pages?.about.instructor.image.alt" :title="pages?.about.instructor.image.title" class="h-full w-full object-cover object-top" /></div></template></Reveal><Reveal :delay="120"><span class="eyebrow">{{ pages?.about.instructor.eyebrow }}</span><h2 class="mt-5 font-heading text-3xl font-semibold tracking-tight text-foreground-950 md:text-4xl">{{ pages?.about.instructor.heading }}</h2><p class="mt-5 text-sm leading-relaxed text-foreground-600 md:text-base">{{ pages?.about.instructor.paragraph }}</p><ul class="mt-7 space-y-3"><li v-for="point in c?.about.instructorPoints" :key="point" class="flex items-start gap-3 text-sm text-foreground-700"><i class="ri-check-line mt-0.5 text-primary-600"/><span>{{ point }}</span></li></ul></Reveal></div></section>
  <CmsSlot :nodes="c?.pageSlots.about.beforeCta??[]" />
  <CtaBand :title="pages?.about.cta.title??''" to="/curriculum" :link-label="pages?.about.cta.label" />
</template>
