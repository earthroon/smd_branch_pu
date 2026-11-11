<script setup lang="ts">
import {mobileTrainingR2, type HomeTrainingIconKindR2} from '~/data/home-training-mobile-r2';
const props=defineProps<{kind: HomeTrainingIconKindR2}>();
const source=computed(()=>props.kind==='timeline'?null:mobileTrainingR2.icons[props.kind]);
</script>
<template>
  <span class="smd-training-icon-r2" :class="`smd-training-icon-r2--${props.kind}`"
    :data-training-icon="props.kind" :data-icon-source-node="source?.sourceNode"
    :data-icon-source-sha256="source?.sha256" aria-hidden="true">
    <span v-if="props.kind==='timeline'" class="smd-training-icon-r2__time-composite"
      data-home-derived-icon="timeline-summary-r2" data-source-nodes="node-1:492,node-1:498,node-1:501">
      <span class="smd-training-icon-r2__badge"></span>
      <img :src="mobileTrainingR2.arrow.src" alt="" width="12" height="22" decoding="async" />
      <span class="smd-training-icon-r2__badge"></span>
    </span>
    <img v-else-if="source" :src="source.src" alt=""
      :width="props.kind==='duration'?85:props.kind==='field'?92:104"
      :height="props.kind==='experience'?64:props.kind==='duration'?85:92"
      decoding="async" />
  </span>
</template>
<style scoped>
.smd-training-icon-r2 {
  display: none;
  flex: 0 0 auto;
  place-items: center;
  width: 74px;
  height: 68px;
  max-width: 100%;
  margin-inline: auto;
}
.smd-training-icon-r2 > img { display: block; object-fit: contain; max-height: 100%; max-width: 100%; }
.smd-training-icon-r2--duration > img { width: 61px; height: 61px; }
.smd-training-icon-r2--field > img { width: 62px; height: 62px; }
/* Helmet source is a filled 104:64 contour. Do not reintroduce the R3 erosion. */
.smd-training-icon-r2--experience > img { width: 72px; height: auto; }
.smd-training-icon-r2__time-composite {
  display: flex;
  width: 74px;
  height: 60px;
  gap: 5px;
  align-items: center;
  justify-content: center;
}
.smd-training-icon-r2__badge { width: 24px; height: 24px; border-radius: 50%; background: #d95e22; flex: 0 0 auto; }
.smd-training-icon-r2__time-composite img { width: 9px; height: 18px; filter: brightness(0); }
/* Original Figma-derived pictograms remain available to tablet semantic layout. */
@media (max-width: 1099px) { .smd-training-icon-r2 { display: grid; } }
</style>
