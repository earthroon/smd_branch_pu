<script setup lang="ts">
import type { ReviewFilterId } from '~/utils/reviews-contract';
import { reviewVisibleItems, type ReviewInteractionState, type ReviewProjectionV1 } from '~/utils/reviews-view';
import { reviewsFigmaNodes } from '~/data/reviews-r1-figma';
import ReviewsHero from './ReviewsHero.vue';
import ReviewsFacts from './ReviewsFacts.vue';
import ReviewsCategoryTabs from './ReviewsCategoryTabs.vue';
import ReviewsCard from './ReviewsCard.vue';
import ReviewsLoadMore from './ReviewsLoadMore.vue';
import ReviewsCta from './ReviewsCta.vue';

const props = defineProps<{
  projection: ReviewProjectionV1;
  activeFilter: ReviewFilterId;
  interaction: ReviewInteractionState;
  sourceLockDigest: string;
}>();
const emit = defineEmits<{
  changeFilter: [filter: ReviewFilterId];
  loadMore: [];
}>();
const visible = computed(() => reviewVisibleItems(props.projection, props.activeFilter, props.interaction));
const sectionTitle = reviewsFigmaNodes['node-4:350'].text.characters;
</script>

<template>
  <div class="smd-reviews-page" data-reviews-contract="SMD_REVIEWS_R1_CF4_CF6"
    data-reviews-candidate="true" data-review-publication="STANDALONE_PREVIEW_NOT_PUBLISHED"
    :data-review-source-digest="projection.sourceDigest"
    :data-review-figma-source-digest="sourceLockDigest" :data-review-filter="activeFilter">
    <section class="smd-reviews-main" aria-labelledby="reviews-title" data-figma-node="node-4:200">
      <div class="smd-reviews-main__inner">
        <ReviewsHero />
        <ReviewsFacts />
        <h2 class="smd-reviews-section-heading" data-figma-node="node-4:350">{{ sectionTitle }}
          <span class="smd-reviews-section-heading__sub">STUDENT STORIES</span>
        </h2>
        <ReviewsCategoryTabs :active="activeFilter" @change="emit('changeFilter', $event)" />
        <section id="reviews-results" class="smd-reviews-results" role="tabpanel" tabindex="0"
          :aria-labelledby="`reviews-tab-${activeFilter}`">
          <div v-if="!visible.empty" class="smd-reviews-results__grid" aria-live="polite">
            <ReviewsCard v-for="(entry, index) in visible.items" :key="entry.id" :entry="entry" :slot-index="index" />
          </div>
          <p v-else class="smd-reviews-results__empty" role="status">등록된 수강후기가 없습니다.</p>
        </section>
        <ReviewsLoadMore :has-more="visible.hasMore" @request="emit('loadMore')" />
      </div>
    </section>
    <ReviewsCta />
  </div>
</template>

<style src="~/assets/css/reviews-r1.css"></style>
