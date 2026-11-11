<script setup lang="ts">
import AboutSourceText from './AboutSourceText.vue';
defineProps<{ href: string | null }>();
</script>
<template>
  <AboutSourceText text-id="132" as="h2" class="smd-about__title" />
  <AboutSourceText text-id="134" class="smd-about__cta-description" />
  <a v-if="href" class="smd-about__cta-button" :href="href" target="_blank" rel="noopener noreferrer">
    <AboutSourceText text-id="137" as="span" />
  </a>
  <span v-else class="smd-about__cta-button smd-about__cta-button--unavailable" role="status">
    <AboutSourceText text-id="137" as="span" /><span class="smd-about__cta-unavailable-label">상담 연결 불가</span>
  </span>
</template>
