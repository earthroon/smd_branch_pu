<script setup lang="ts">
import { computed,ref,watch } from 'vue';
import {useStandalonePublishedMedia} from '~/composables/useStandalonePublishedMedia';
import { curriculumSourceAssets } from '~/data/curriculum-r1-assets.generated';
import { curriculumMediaCss,curriculumFrameStyle } from '~/utils/curriculumR1LayoutMath';
import type { CurriculumPhotoId } from '~/data/curriculum-r1-types';
const props=defineProps<{slotId:CurriculumPhotoId}>();
const photo=computed(()=>curriculumSourceAssets.photos[props.slotId]);
const publishedMedia=useStandalonePublishedMedia();
const src=computed(()=>{
  const result=publishedMedia.image('curriculum',props.slotId);
  switch(result.kind){
    case 'local':return '/curriculum/'+encodeURIComponent(photo.value.fileName)+'?v='+photo.value.sha256;
    case 'published':return result.src;
    case 'unbound':throw new Error('STANDALONE_CURRICULUM_MEDIA_NOT_PUBLISHED');
  }
});
const geometry=computed(()=>curriculumMediaCss(photo.value));
const state=ref<'pending'|'loaded'|'failed'>('pending');
watch(src,()=>{state.value='pending';});
function settle(event:Event,next:'loaded'|'failed') {
  if((event.currentTarget as HTMLImageElement|null)?.getAttribute('src')===src.value)state.value=next;
}
</script>
<template><figure class="smd-curriculum__media" :style="{...geometry.frameStyle,...curriculumFrameStyle(photo.frame,photo.sectionId)}"
  :data-curriculum-photo="slotId" :data-source-layer="photo.sourceLayerId" :data-source-sha256="photo.sha256" :data-media-state="state">
  <img :key="src" :src="src" :width="photo.sourceWidth" :height="photo.sourceHeight" :alt="photo.alt"
    :style="geometry.imageStyle" :loading="slotId==='curriculum.hero.photo'?'eager':'lazy'"
    :fetchpriority="slotId==='curriculum.hero.photo'?'high':'auto'" decoding="async"
    @load="settle($event,'loaded')" @error="settle($event,'failed')" />
  <figcaption v-if="state==='failed'" role="status">이미지를 불러오지 못했습니다.</figcaption>
</figure></template>
