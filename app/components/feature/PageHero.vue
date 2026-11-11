<script setup lang="ts">
defineProps<{eyebrow:string;lede?:string}>();
</script>
<template>
  <section class="smd-page-hero border-b border-background-200 bg-background-50 pt-28 md:pt-36">
    <div class="container-x pb-12 md:pb-16">
      <span class="eyebrow">{{ eyebrow }}</span>
      <h1 class="mt-5 max-w-4xl font-heading text-3xl font-semibold leading-[1.2] tracking-tight text-foreground-950 md:text-5xl"><slot name="title" /></h1>
      <p v-if="lede" class="mt-6 max-w-2xl text-sm leading-relaxed text-foreground-600 md:text-base">{{ lede }}</p>
      <div v-if="$slots.default" class="mt-10"><slot /></div>
    </div>
  </section>
</template>
