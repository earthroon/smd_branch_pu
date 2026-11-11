<script setup lang="ts">
import {useSiteContent} from '~/composables/useSiteContent';
import CmsSlot from '~/components/cms/CmsSlot.vue';
import PageHero from '~/components/feature/PageHero.vue';
import Reveal from '~/components/feature/Reveal.vue';
import CtaBand from '~/components/feature/CtaBand.vue';
const c=useSiteContent();
const pages=computed(()=>c.value?.pages);
const promo=computed(()=>c.value?.promotion);
// Visual allocation is the source campaign's tier split, NOT an occupancy counter.
// Operational fields (filledSeats/enrollmentStatus) are kept in the CMS schema.
const campaignSeatAllocation = [true, true, false, false, false] as const;
const campaignSeatLabel = '얼리버드 2석 · 일반 3석 · 총 정원 5명';
const headlineLines = computed(() => {
  const source = promo.value?.headline;
  if (source === undefined) return null;
  const lines = source.split('\n');
  if (lines.length !== 2 || lines.some((line) => line.trim().length === 0)) {
    throw new Error('SMD_CF02_PROMOTION_HEADLINE_FORMAT_UNSUPPORTED');
  }
  return lines as [string, string];
});
const depositPresentation = computed(() => {
  const source = promo.value?.depositTerms;
  if (source === undefined) return null;
  const marker = ' · ';
  const position = source.indexOf(marker);
  if (position < 1 || source.slice(0, position) !== '얼리버드 운영 기준') {
    throw new Error('SMD_CF02_DEPOSIT_TERMS_FORMAT_UNSUPPORTED');
  }
  return { title: source.slice(0, position), suffix: source.slice(position) };
});
useSeoMeta({title:'프로모션 | SMD 아카데미'});
</script>
<template>
  <PageHero eyebrow="Promotion" :lede="promo?.lede">
    <template #title>{{ headlineLines?.[0] }}<br />{{ headlineLines?.[1] }}</template>
    <div class="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-background-200 bg-background-200 lg:grid-cols-4"><div v-for="info in promo?.info" :key="info.k" class="bg-background-50 px-6 py-6"><div class="font-label text-[11px] uppercase tracking-[0.22em] text-foreground-500">{{ info.k }}</div><div class="mt-2 font-heading text-lg font-semibold text-foreground-950">{{ info.v }}</div></div></div>
  </PageHero>
  <section class="border-b border-background-200 py-16 md:py-24"><div class="container-x"><Reveal><span class="eyebrow">{{ pages?.promotion.pricingEyebrow }}</span><h2 class="mt-5 font-heading text-3xl font-semibold tracking-tight text-foreground-950 md:text-4xl">{{ promo?.seatHeadline }}</h2></Reveal>
    <Reveal :delay="80"><div class="mt-8 flex flex-wrap items-center gap-3" role="group" aria-label="얼리버드 2석과 일반 3석의 모집 배분, 현재 등록 인원 아님"><span v-for="(early,index) in campaignSeatAllocation" :key="index" aria-hidden="true" :class="['h-5 w-5 rounded-full border',early?'border-primary-500 bg-primary-500':'border-background-300 bg-background-100']" /><span class="ml-2 text-sm text-foreground-600">{{ campaignSeatLabel }}</span></div></Reveal>
    <div class="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-2"><Reveal v-for="(card,index) in promo?.priceCards" :key="card.tier" :delay="index*100"><div :class="['h-full rounded-lg border p-7 md:p-9',card.highlight?'border-primary-300 bg-primary-50':'border-background-200 bg-background-50']"><span :class="['inline-block rounded-full px-3 py-1 font-label text-[11px] tracking-wide',card.highlight?'bg-primary-500 text-background-50':'bg-secondary-100 text-secondary-800']">{{ card.badge }}</span><div class="mt-5 font-label text-sm text-foreground-600">{{ card.tier }}</div><div class="mt-2 flex items-end gap-1"><span class="font-heading text-4xl font-semibold tracking-tight text-foreground-950 md:text-5xl">{{ card.amount }}</span><span class="pb-1.5 font-heading text-lg text-foreground-700">{{ pages?.promotion.priceUnitLabel }}</span></div><div class="mt-2 text-sm text-foreground-500">{{ card.was }}</div><ul class="mt-6 space-y-3 border-t border-background-200 pt-6"><li v-for="feature in card.features" :key="feature" class="flex items-start gap-3 text-sm text-foreground-700"><i class="ri-check-line mt-0.5 text-primary-600"/><span>{{ feature }}</span></li></ul></div></Reveal></div>
    <Reveal :delay="120"><div class="mt-8 rounded-lg border border-background-200 bg-background-100 p-6 text-sm leading-relaxed text-foreground-600"><strong class="font-semibold text-foreground-900">{{ depositPresentation?.title }}</strong>{{ depositPresentation?.suffix }}</div></Reveal>
  </div></section>
  <section class="py-16 md:py-24"><div class="container-x"><Reveal><span class="eyebrow">{{ pages?.promotion.benefitEyebrow }}</span><h2 class="mt-5 font-heading text-3xl font-semibold tracking-tight text-foreground-950 md:text-4xl">{{ pages?.promotion.benefitHeading }}</h2></Reveal><div class="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"><Reveal v-for="(benefit,index) in promo?.benefits" :key="benefit.title" :delay="index*90"><div class="h-full rounded-lg border border-background-200 bg-background-50 p-6"><span class="inline-block rounded-full bg-accent-100 px-3 py-1 font-label text-[11px] tracking-wide text-accent-900">{{ benefit.tag }}</span><h3 class="mt-5 font-heading text-lg font-semibold text-foreground-950">{{ benefit.title }}</h3><p class="mt-3 text-sm leading-relaxed text-foreground-600">{{ benefit.desc }}</p></div></Reveal></div></div></section>
  <CmsSlot :nodes="c?.pageSlots.promotion.afterBenefits??[]" />
  <CmsSlot :nodes="c?.pageSlots.promotion.beforeCta??[]" />
  <CtaBand :title="promo?.ctaTitle??''" :link-label="pages?.promotion.ctaLinkLabel" external />
</template>
