<script setup lang="ts">
import type { CardGridNode } from '@smd/content-contracts/page-slot-contracts';
import ImageCardBlock from './ImageCardBlock.vue';
const props=defineProps<{node:CardGridNode}>();
const grids={two:'md:grid-cols-2',three:'md:grid-cols-3'} as const;
const gridClass=computed(()=>grids[props.node.props.columns]);
</script>
<template><section class="py-10 md:py-16" :aria-labelledby="`cms-heading-${node.id}`">
  <div class="container-x"><h2 :id="`cms-heading-${node.id}`" class="font-heading text-2xl font-semibold text-foreground-950 md:text-3xl">{{ node.props.heading }}</h2>
    <div :class="['mt-8 grid grid-cols-1 gap-6',gridClass]"><ImageCardBlock v-for="item in node.slots.items" :key="item.id" :node="item" /></div>
  </div>
</section></template>
