<script setup lang="ts">
/** R7 independent-route fullscreen cover. Content and links are passed from the route owner. */
import { computed } from 'vue';
const props = withDefaults(defineProps<{
  pageId: 'about'|'curriculum'|'archive'|'reviews'|'faq'|'contact';
  eyebrow: string;
  heading: string;
  description?: string;
  imageSrc?: string;
  imageAlt?: string;
  href?: string;
  linkLabel?: string;
}>(),{
  imageSrc: '/media/home/r7-workshop.png',
  imageAlt: 'SMD 인테리어필름 실습 작업실 카탈로그 시안 사진',
  description: '',
  href: undefined,
  linkLabel: undefined,
});
const coverId = computed(() => `r7-${props.pageId}-cover-title`);
</script>
<template>
  <section class="smd-r7-route__cover" :data-r7-page="pageId" :aria-labelledby="coverId" data-r7-cover="fullscreen">
    <img class="smd-r7-route__cover-image" :src="imageSrc" :alt="imageAlt"
      loading="eager" fetchpriority="high" decoding="async" />
    <div class="smd-r7-route__cover-wash" aria-hidden="true" />
    <div class="smd-r7-route__cover-frame">
      <div class="smd-r7-route__cover-copy">
        <p class="smd-r7-route__eyebrow">{{ eyebrow }}</p>
        <h1 :id="coverId">{{ heading }}</h1>
        <p v-if="description" class="smd-r7-route__cover-description">{{ description }}</p>
        <NuxtLink v-if="href && linkLabel" class="smd-r7-route__cover-link" :to="href">
          {{ linkLabel }} <span aria-hidden="true">↗</span>
        </NuxtLink>
      </div>
      <div class="smd-r7-route__cover-foot" aria-hidden="true">
        <span>SMD ACADEMY / INTERIOR FILM</span><span>SCROLL TO EXPLORE ↓</span>
      </div>
    </div>
  </section>
</template>
