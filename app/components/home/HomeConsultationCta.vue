<script setup lang="ts">
import HomeFigmaText from './HomeFigmaText.vue';
import { homeCopyRefs } from '~/data/home-r2-composition';
import { usePublicConsultationHref } from '~/composables/usePublicConsultationHref';
const consultationHref = usePublicConsultationHref();
const copy = homeCopyRefs.consultation;
</script>
<template>
  <section data-home-section="consultation-cta" data-figma-node="node-1:20" class="smd-home-section smd-home--consultation-cta">
    <div class="smd-home__container">
      <h2 class="mx-auto max-w-3xl whitespace-pre-line font-heading text-3xl font-semibold leading-snug md:text-5xl"><HomeFigmaText :text-key="copy.headline" /></h2>
      <a v-if="consultationHref" :href="consultationHref" target="_blank" rel="noopener noreferrer" class="smd-home__consultation-link"><HomeFigmaText :text-key="copy.button" /></a>
      <p v-else role="status" class="mt-8 text-sm text-background-300">상담 연결을 사용할 수 없습니다.</p>
    </div>
  </section>
</template>
