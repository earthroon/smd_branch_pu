<script setup lang="ts">
import type { FaqGroupNode } from '@smd/content-contracts/page-slot-contracts';
import FaqItemBlock from './FaqItemBlock.vue';
defineProps<{node:FaqGroupNode}>();
</script>
<template><section class="py-10 md:py-16" :aria-labelledby="`cms-heading-${node.id}`"><div class="container-x">
  <h2 :id="`cms-heading-${node.id}`" class="font-heading text-2xl font-semibold text-foreground-950 md:text-3xl">{{ node.props.heading }}</h2>
  <div class="mt-8 space-y-3"><FaqItemBlock v-for="item in node.slots.items" :key="item.id" :node="item" /></div>
</div></section></template>
