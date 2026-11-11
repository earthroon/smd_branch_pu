<script setup lang="ts">
import {useSiteContent} from '~/composables/useSiteContent';
import { usePublicConsultationHref } from '~/composables/usePublicConsultationHref';
import {usePublishedSiteMedia} from '~/composables/usePublishedSiteMedia';
import SiteImage from '~/components/media/SiteImage.vue';
const siteImage_0=usePublishedSiteMedia('home.practiceTeaser.mainImage');
const siteImage_1=usePublishedSiteMedia('home.practiceTeaser.secondaryImage');
import Reveal from './Reveal.vue';
const c=useSiteContent();
const pages=computed(()=>c.value?.pages);
const consultationHref = usePublicConsultationHref();
</script>
<template>
  <section class="border-t border-background-200 bg-background-50 py-16 md:py-24"><div class="container-x grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
    <Reveal><span class="eyebrow">{{ pages?.home.practiceTeaser.eyebrow }}</span><h2 class="mt-5 font-heading text-3xl font-semibold leading-[1.25] tracking-tight text-foreground-950 md:text-4xl">{{ pages?.home.practiceTeaser.titleLines[0] }}<br />{{ pages?.home.practiceTeaser.titleLines[1] }}</h2><p class="mt-6 max-w-lg text-sm leading-relaxed text-foreground-600 md:text-base">{{ pages?.home.practiceTeaser.paragraph }}</p><div class="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4"><NuxtLink to="/practice" class="link-arrow">{{ pages?.home.practiceTeaser.viewLabel }} <i class="ri-arrow-right-line" /></NuxtLink><a v-if="consultationHref" :href="consultationHref" target="_blank" rel="noopener noreferrer" class="link-arrow">{{ pages?.home.practiceTeaser.contactLabel }} <i class="ri-arrow-right-line" /></a><span v-else class="link-arrow opacity-60" role="status">상담 연결 준비 중</span></div></Reveal>
    <Reveal :delay="120"><div class="grid grid-cols-2 gap-4"><SiteImage v-if="siteImage_0?.kind==='v5'" class="col-span-2 min-w-0" :key="siteImage_0.key" :image="siteImage_0.image" /><template v-else-if="siteImage_0?.kind==='legacy'"><div class="col-span-2 aspect-[16/10] w-full overflow-hidden rounded-lg bg-background-100"><img :src="pages?.home.practiceTeaser.mainImage.src" :alt="pages?.home.practiceTeaser.mainImage.alt" :title="pages?.home.practiceTeaser.mainImage.title" class="h-full w-full object-cover object-top" /></div></template><SiteImage v-if="siteImage_1?.kind==='v5'" :key="siteImage_1.key" :image="siteImage_1.image" /><template v-else-if="siteImage_1?.kind==='legacy'"><div class="aspect-[4/3] w-full overflow-hidden rounded-lg bg-background-100"><img :src="pages?.home.practiceTeaser.secondaryImage.src" :alt="pages?.home.practiceTeaser.secondaryImage.alt" :title="pages?.home.practiceTeaser.secondaryImage.title" class="h-full w-full object-cover object-top" /></div></template><div class="flex aspect-[4/3] w-full flex-col justify-between rounded-lg border border-background-200 bg-accent-50 p-5"><i class="ri-tools-line text-2xl text-accent-700"/><div><div class="font-heading text-2xl font-semibold text-foreground-950">{{ pages?.home.practiceTeaser.factValue }}</div><div class="text-xs text-foreground-600">{{ pages?.home.practiceTeaser.factLabel }}</div></div></div></div></Reveal>
  </div></section>
</template>
