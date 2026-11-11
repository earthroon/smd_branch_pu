<script setup lang="ts">
import { REVIEW_FILTER_V1, type ReviewEntryV1 } from '~/utils/reviews-contract';
import { reviewsCardFigmaSlots } from '~/data/reviews-r1-card-figma';
const props = defineProps<{ entry: ReviewEntryV1; slotIndex: number }>();
const slot = computed(() => reviewsCardFigmaSlots[props.slotIndex] ?? null);
</script>

<template>
  <article class="smd-reviews-card" :data-review-entry-id="entry.id"
    :data-figma-node="slot?.card" data-figma-stroke="blocked">
    <span class="smd-reviews-card__badge" :data-figma-node="slot?.badgeText"
      :data-figma-background-node="slot?.badgePaint">{{ REVIEW_FILTER_V1[entry.category].label }}</span>
    <span class="smd-reviews-card__quote" aria-hidden="true">“</span>
    <h3 class="smd-reviews-card__title" :data-figma-node="slot?.title">{{ entry.title }}</h3>
    <p class="smd-reviews-card__body" :data-figma-node="slot?.body">{{ entry.body }}</p>
    <div class="smd-reviews-card__attribution">
      <span class="smd-reviews-card__avatar" aria-hidden="true"><i class="ri-user-3-line" /></span>
      <div class="smd-reviews-card__identity">
        <strong :data-figma-node="slot?.author">{{ entry.authorDisplayName }}</strong>
        <small :data-figma-node="slot?.course">{{ entry.courseLabel }}</small>
      </div>
    </div>
  </article>
</template>
