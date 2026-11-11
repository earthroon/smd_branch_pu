<script setup lang="ts">
import {figmaScene} from '~/data/figma-r2-scene.generated';
const svgNodes=['node-1:9','node-1:10'];
const image=(key:string)=>{const o=figmaScene.operationByNode[key];return o?figmaScene.assets[o.sourceRef]:undefined};
</script>
<template>
  <!-- Exact Figma VECTOR bytes/offsets, not a recreated CSS icon. -->
  <svg viewBox="0 0 80 80" width="80" height="80" xmlns="http://www.w3.org/2000/svg"
    class="smd-figma-brand-mark" role="presentation" aria-hidden="true">
    <template v-for="key in svgNodes" :key="key">
      <image v-if="image(key)" :href="image(key)!.src"
        :x="figmaScene.nodes[key]?.rect[0]" :y="figmaScene.nodes[key]?.rect[1]"
        :width="figmaScene.nodes[key]?.rect[2]" :height="figmaScene.nodes[key]?.rect[3]"
        preserveAspectRatio="none" :data-figma-svg-instance="key" :data-original-asset-id="figmaScene.operationByNode[key]?.sourceRef" />
    </template>
  </svg>
</template>
