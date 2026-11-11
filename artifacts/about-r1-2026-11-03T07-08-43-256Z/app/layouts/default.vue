<script setup lang="ts">
import SiteHeader from '~/components/feature/SiteHeader.vue';
import SiteFooter from '~/components/feature/SiteFooter.vue';
</script>

<template>
  <div class="flex min-h-screen flex-col bg-background-50">
    <SiteHeader />
    <main class="flex-1">
      <slot />
    </main>
    <SiteFooter />
  </div>
</template>
