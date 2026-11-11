<script setup lang="ts">
import {useSiteContent} from '~/composables/useSiteContent';
import Reveal from './Reveal.vue';
const c=useSiteContent();
</script>
<template>
  <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
    <Reveal v-for="(item,index) in c?.training.teachItems" :key="item.num" :delay="index*90">
      <article class="group h-full overflow-hidden rounded-lg border border-background-200 bg-background-50 transition-colors duration-300 hover:border-primary-300">
        <div class="relative aspect-[4/3] w-full overflow-hidden bg-background-100"><img :src="item.image" :alt="item.alt" :title="`${item.title} 인테리어필름 시공 실습`" class="h-full w-full object-cover object-top transition-transform duration-700 group-hover:scale-[1.04]" /><span class="absolute left-3 top-3 rounded-md bg-background-50/90 px-2 py-1 font-label text-[11px] tracking-wide text-foreground-800">{{ item.num }}</span></div>
        <div class="p-5"><h3 class="font-heading text-lg font-semibold tracking-tight text-foreground-950">{{ item.title }}</h3><ul class="mt-3 space-y-1.5"><li v-for="point in item.points" :key="point" class="flex items-center gap-2 text-sm text-foreground-600"><span class="h-1 w-1 rounded-full bg-primary-500" />{{ point }}</li></ul></div>
      </article>
    </Reveal>
  </div>
</template>
