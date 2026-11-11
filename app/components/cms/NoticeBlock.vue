<script setup lang="ts">
import type { NoticeNode } from '@smd/content-contracts/page-slot-contracts';
const props=defineProps<{node:NoticeNode}>();
const tones={neutral:'border-background-200 bg-background-50',emphasis:'border-primary-200 bg-primary-50'} as const;
const toneClass=computed(()=>tones[props.node.props.tone]);
</script>
<template>
  <section class="py-8 md:py-12" :aria-labelledby="`cms-heading-${node.id}`">
    <div class="container-x"><div :class="['rounded-lg border p-6 md:p-8',toneClass]">
      <h2 :id="`cms-heading-${node.id}`" class="font-heading text-xl font-semibold text-foreground-950">{{ node.props.heading }}</h2>
      <p class="mt-3 whitespace-pre-line text-sm leading-relaxed text-foreground-700">{{ node.props.body }}</p>
    </div></div>
  </section>
</template>
