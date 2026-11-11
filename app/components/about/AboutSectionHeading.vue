<script setup lang="ts">
import AboutSourceText from './AboutSourceText.vue';
import type { AboutTextId } from '~/data/about-r1-types';
withDefaults(defineProps<{ label: AboutTextId; title: AboutTextId; hero?: boolean }>(), { hero: false });
</script>
<template>
  <div class="smd-about__heading">
    <AboutSourceText :text-id="label" class="smd-about__eyebrow" />
    <AboutSourceText :text-id="title" :as="hero ? 'h1' : 'h2'" class="smd-about__title" />
  </div>
</template>
