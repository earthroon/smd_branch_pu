<script setup lang="ts">
import { reviewsFigmaNodes } from '~/data/reviews-r1-figma';
const props = defineProps<{ hasMore: boolean }>();
const emit = defineEmits<{ request: [] }>();
const label = reviewsFigmaNodes['node-4:341'].text.characters;
</script>

<template>
  <div class="smd-reviews-load-more">
    <button v-if="hasMore" id="reviews-load-more" type="button" class="smd-reviews-load-more__button"
      data-figma-node="node-4:341" data-figma-background-node="node-4:342"
      @click="emit('request')">{{ label }}</button>
  </div>
</template>
