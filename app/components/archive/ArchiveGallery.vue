<script setup lang="ts">
import {useSiteContent} from '~/composables/useSiteContent';
import Reveal from '~/components/feature/Reveal.vue';
import ArchiveCard from './ArchiveCard.vue';
import {archiveView} from '~/utils/archive-view';
const props=withDefaults(defineProps<{mode?:'preview'|'full';lane?:'photo'|'video'}>(),{mode:'full',lane:'photo'});
const c=useSiteContent();
const pages=computed(()=>c.value?.pages);
const items=computed(()=>c.value?archiveView(c.value.archive,
  ('schemaVersion' in c.value.archive&&c.value.archive.schemaVersion===3)?props.lane:undefined):[]);
const heading=computed(()=>props.lane==='video'?'영상':pages.value?.archive.sectionHeading);
const eyebrow=computed(()=>props.lane==='video'?'VIDEO':pages.value?.archive.sectionEyebrow);
const count=ref(12);
const displayed=computed(()=>props.mode==='preview'?items.value.slice(0,3):items.value.slice(0,count.value));
watch(()=>c.value?.publication.digest,()=>{count.value=12;});
</script>
<template>
  <section class="bg-foreground-950 py-16 md:py-24">
    <div class="container-x">
      <div class="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <Reveal>
          <span class="inline-block text-[11px] font-label uppercase tracking-[0.18em] text-primary-400">{{eyebrow}}</span>
          <h2 class="mt-4 font-heading text-3xl font-bold tracking-tight text-background-50 md:text-5xl">{{heading}}</h2>
        </Reveal>
        <NuxtLink v-if="mode==='preview'&&lane==='photo'" to="/archive"
          class="inline-flex items-center gap-2 self-start border-b border-foreground-400 pb-1 text-sm font-semibold text-background-50 transition-colors hover:border-primary-400 hover:text-primary-400 !border-b-0 !pb-0">
          <span class="smd-archive-more-label inline-flex flex-col items-center whitespace-nowrap leading-5">더보기<span aria-hidden="true" class="mt-1 block h-px w-8 bg-current"></span></span> <i class="ri-arrow-up-right-line" aria-hidden="true" />
        </NuxtLink>
      </div>
      <div class="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Reveal v-for="(item,index) in displayed" :key="item.id" :delay="Math.min(index,8)*70">
          <ArchiveCard :entry="item" />
        </Reveal>
      </div>
      <p v-if="!items.length" class="mt-10 text-sm text-foreground-500">{{lane==='video'?'등록된 영상이 없습니다.':pages?.archive.emptyStateText}}</p>
      <button v-if="mode==='full' && count<items.length" type="button"
        class="btn-ghost mt-10 !border-foreground-600 !text-background-50 hover:!bg-foreground-800"
        @click="count+=12">{{lane==='video'?'영상 더 불러오기':'사진 더 불러오기'}}</button>
    </div>
  </section>
</template>
