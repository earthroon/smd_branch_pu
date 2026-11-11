<script setup lang="ts">
import { reviewsFigmaNodes } from '~/data/reviews-r1-figma';
const eyebrow = reviewsFigmaNodes['node-4:351'].text.characters;
const lines = reviewsFigmaNodes['node-4:353'].text.characters.split('\n');
const description = reviewsFigmaNodes['node-4:352'].text.characters.trimEnd();
</script>

<template>
  <header class="smd-reviews-hero" data-figma-node="node-4:203">
    <p class="smd-reviews-hero__eyebrow" data-figma-node="node-4:351">{{ eyebrow }}</p>
    <h1 id="reviews-title" class="smd-reviews-hero__title" data-figma-node="node-4:353"
      data-source-paint-status="blocked">
      <span v-for="(line, index) in lines" :key="index"
        :class="{ 'smd-reviews-hero__title-emphasis': index > 0 }">{{ line }}</span>
    </h1>
    <p class="smd-reviews-hero__description" data-figma-node="node-4:352">{{ description }}</p>
  </header>
</template>
