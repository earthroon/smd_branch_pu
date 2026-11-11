<script setup lang="ts">
import { REVIEW_FILTER_ORDER, REVIEW_FILTER_V1, type ReviewFilterId } from '~/utils/reviews-contract';
import { reviewKeyboardTabIntent, reviewTabAccessibility } from '~/utils/reviews-view';
import { reviewsFigmaFilterBindings } from '~/data/reviews-r1-figma';
const props = defineProps<{ active: ReviewFilterId }>();
const emit = defineEmits<{ change: [filter: ReviewFilterId] }>();
function onKeydown(event: KeyboardEvent): void {
  const requested = reviewKeyboardTabIntent(props.active, event.key);
  if (requested === null) return;
  event.preventDefault();
  emit('change', requested);
  if (import.meta.client) {
    nextTick(() => document.getElementById(`reviews-tab-${requested}`)?.focus());
  }
}
</script>

<template>
  <div class="smd-reviews-tabs" role="tablist" aria-label="수강후기 분야" @keydown="onKeydown">
    <button v-for="filter in REVIEW_FILTER_ORDER" :id="`reviews-tab-${filter}`" :key="filter"
      type="button" class="smd-reviews-tabs__tab"
      :class="{ 'smd-reviews-tabs__tab--active': filter === active }"
      :data-figma-node="reviewsFigmaFilterBindings[filter].textNode"
      :data-figma-background-node="reviewsFigmaFilterBindings[filter].backgroundNode"
      :data-source-paint-status="filter === 'all' ? 'candidate' : 'blocked'"
      v-bind="reviewTabAccessibility(filter, active)"
      @click="emit('change', filter)">{{ REVIEW_FILTER_V1[filter].label }}</button>
  </div>
</template>
