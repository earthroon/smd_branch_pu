<script setup lang="ts">
import type { FaqItemNode } from '@smd/content-contracts/page-slot-contracts';
defineProps<{node:FaqItemNode}>();
</script>
<template><div class="rounded-lg border border-background-200 bg-background-50 p-6">
  <h3 class="font-heading text-base font-semibold text-foreground-950">{{ node.props.question }}</h3>
  <p class="mt-3 whitespace-pre-line text-sm leading-relaxed text-foreground-700">{{ node.props.answer }}</p>
</div></template>
