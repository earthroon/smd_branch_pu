<script setup lang="ts">
import { homeR2LineCandidates, type HomeR2LineNodeKey } from '~/data/home-r2-line-candidates';
import {figmaScene} from '~/data/figma-r2-scene.generated';
const props=defineProps<{ lineKey: HomeR2LineNodeKey }>();
const source=computed(()=>homeR2LineCandidates[props.lineKey]);
const length=computed(()=>source.value.centerlineLocal[2]);
const weight=computed(()=>source.value.stroke.weight);
const asset=computed(()=>figmaScene.assets[source.value.assetId]);
</script>
<template>
  <svg class="smd-home-line-candidate" role="presentation" aria-hidden="true"
    :data-figma-line="lineKey" data-original-node-kind="LINE" data-original-height="0"
    data-visual-qualification="CANDIDATE_NOT_PIXEL_VERIFIED" :data-line-source-digest="source.lineSourceDigest"
    :viewBox="`0 ${-weight / 2} ${length} ${weight}`" :style="{ height: `${weight}px` }" preserveAspectRatio="none">
    <image v-if="asset" :href="asset.src" x="0" :y="-weight/2" :width="length" :height="weight" preserveAspectRatio="none" :data-figma-svg-instance="lineKey" />
  </svg>
</template>
