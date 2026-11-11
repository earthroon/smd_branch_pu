<script setup lang="ts">
import { reviewsFigmaNodes } from '~/data/reviews-r1-figma';
const eyebrow = reviewsFigmaNodes['node-4:346'].text.characters;
const headline = reviewsFigmaNodes['node-4:347'].text.characters;
const description = reviewsFigmaNodes['node-4:348'].text.characters;
const action = reviewsFigmaNodes['node-4:339'].text.characters.replace(/\s+/gu, ' ').trim();
</script>

<template>
  <section class="smd-reviews-cta" data-figma-node="node-4:375" data-source-paint-status="blocked"
    aria-labelledby="reviews-cta-heading">
    <div class="smd-reviews-cta__copy">
      <p class="smd-reviews-cta__eyebrow" data-figma-node="node-4:346">{{ eyebrow }}</p>
      <h2 id="reviews-cta-heading" class="smd-reviews-cta__heading" data-figma-node="node-4:347">{{ headline }}</h2>
      <p class="smd-reviews-cta__description" data-figma-node="node-4:348">{{ description }}</p>
    </div>
    <NuxtLink class="smd-reviews-cta__action" to="/curriculum" data-figma-node="node-4:339"
      data-figma-background-node="node-4:340">{{ action }}</NuxtLink>
  </section>
</template>
