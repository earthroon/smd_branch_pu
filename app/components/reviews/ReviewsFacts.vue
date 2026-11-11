<script setup lang="ts">
import { reviewsFigmaNodes } from '~/data/reviews-r1-figma';
const text = (node: 'node-4:330' | 'node-4:331' | 'node-4:332' | 'node-4:333' |
  'node-4:334' | 'node-4:335' | 'node-4:336' | 'node-4:337') =>
  reviewsFigmaNodes[node].text.characters.trim();
const metrics = [
  { label: 'node-4:335', value: 'node-4:334' },
  { label: 'node-4:333', value: 'node-4:332' },
  { label: 'node-4:331', value: 'node-4:330' },
] as const;
</script>

<template>
  <section class="smd-reviews-facts" aria-label="교육 정보" data-figma-node="node-4:338"
    data-source-paint-status="blocked" data-operational-qualification="DESIGN_SOURCE_ONLY">
    <div class="smd-reviews-facts__intro">
      <p class="smd-reviews-facts__eyebrow" data-figma-node="node-4:337">{{ text('node-4:337') }}</p>
      <p class="smd-reviews-facts__tagline" data-figma-node="node-4:336">{{ text('node-4:336') }}</p>
    </div>
    <div class="smd-reviews-facts__metrics">
      <div v-for="metric in metrics" :key="metric.value" class="smd-reviews-facts__metric">
        <span class="smd-reviews-facts__label" :data-figma-node="metric.label">{{ text(metric.label) }}</span>
        <strong class="smd-reviews-facts__value" :data-figma-node="metric.value">{{ text(metric.value) }}</strong>
      </div>
    </div>
  </section>
</template>
