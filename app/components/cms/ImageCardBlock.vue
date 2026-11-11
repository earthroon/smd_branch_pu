<script setup lang="ts">
import type { ImageCardNode } from '@smd/content-contracts/page-slot-contracts';
defineProps<{node:ImageCardNode}>();
</script>
<template><article class="overflow-hidden rounded-lg border border-background-200 bg-background-50">
  <img :src="node.props.image.src" :alt="node.props.image.alt" :title="node.props.image.title" class="aspect-[4/3] w-full object-cover" />
  <div class="p-6"><h3 class="font-heading text-lg font-semibold text-foreground-950">{{ node.props.title }}</h3><p class="mt-3 text-sm leading-relaxed text-foreground-600">{{ node.props.description }}</p></div>
</article></template>
