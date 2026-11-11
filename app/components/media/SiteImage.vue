<script setup lang="ts">
/** CF5A: presentation foundation only. No product V5 binding or Core fetch. */
import {computed,ref,watch} from 'vue';
import {resolveSiteImageRender,type SiteImageRenderInput} from '~/utils/site-media-render';

const props=defineProps<{image:SiteImageRenderInput}>();
const renderModel=computed(()=>resolveSiteImageRender(props.image));
const loadState=ref<'pending'|'loaded'|'failed'>('pending');
watch(()=>renderModel.value.src,()=>{loadState.value='pending';});
function eventBelongsToCurrentSource(event:Event):boolean {
  const target=event.currentTarget as HTMLImageElement | null;
  return target?.getAttribute('src')===renderModel.value.src;
}
function onLoad(event:Event){
  if(eventBelongsToCurrentSource(event))loadState.value='loaded';
}
function onError(event:Event){
  if(eventBelongsToCurrentSource(event))loadState.value='failed';
}
</script>
<template>
  <figure :class="renderModel.frameClass"
    :data-site-media-slot="renderModel.slotId"
    :data-site-media-display="renderModel.displayMode"
    :data-site-media-load="loadState">
    <img :key="renderModel.src" :src="renderModel.src"
      :width="renderModel.width" :height="renderModel.height"
      :alt="renderModel.alt" :title="renderModel.title"
      :class="renderModel.imageClass"
      :loading="renderModel.loading"
      :fetchpriority="renderModel.fetchPriority"
      decoding="async"
      @load="onLoad" @error="onError" />
    <figcaption v-if="loadState==='failed'" role="status"
      class="absolute inset-x-0 bottom-0 bg-background-50/90 p-2 text-sm text-foreground-700">
      이미지를 불러오지 못했습니다.
    </figcaption>
  </figure>
</template>
