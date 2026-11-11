<script setup lang="ts">
import {figmaScene} from '~/data/figma-r2-scene.generated';
import {r3SvgOverride} from '~/data/figma-r2-visual-r3';
import {resolveR4BHelmetCandidate} from '~/data/figma-r2-visual-r4b';
const props=defineProps<{nodeKey:string;assetId:string;width:number;height:number;line?:boolean}>();
const asset=computed(()=>figmaScene.assets[props.assetId]);
const line=computed(()=>figmaScene.lines[props.nodeKey]);
const x=computed(()=>props.line?(line.value?.conservativeInkBounds?.[0]??0):0);
const y=computed(()=>props.line?(line.value?.conservativeInkBounds?.[1]??0):0);
const inkWidth=computed(()=>props.line?(line.value?.conservativeInkBounds?.[2]??props.width):props.width);
const inkHeight=computed(()=>props.line?(line.value?.conservativeInkBounds?.[3]??2):props.height);
const visual=computed(()=>r3SvgOverride(props.nodeKey,props.assetId));
const r4bHelmet=computed(()=>resolveR4BHelmetCandidate(props.nodeKey,props.assetId,asset.value?.sha256));
</script>
<template>
  <!-- CF8: one methods-only background override fills source node-1:52's 10px top gap.
       Node transform stays at y=10. Original image SHA and source rect remain frozen. -->
  <rect v-if="asset && visual?.kind==='methods-seam'" x="0" y="-10" :width="props.width"
    :height="props.height+10" fill="#F2F2F2" :data-figma-svg-instance="nodeKey"
    :data-original-asset-id="assetId" :data-original-svg-sha256="asset.sha256"
    :data-user-visual-override="visual.authority" />
  <!-- CF10: source path remains at (0,0), viewport and placement expanded by ink radius. -->
  <image v-else-if="asset && visual?.kind==='chevron-ink'" :href="visual.href"
    x="-1.5" y="-1.5" width="23.5" height="44"
    preserveAspectRatio="xMidYMid meet" :data-figma-svg-instance="nodeKey"
    :data-original-asset-id="assetId" :data-original-svg-sha256="asset.sha256"
    :data-derived-svg-sha256="visual.derivedSha256" :data-user-visual-override="visual.authority" />
  <!-- CF9: isolated filled-path inset, NOT a canonical stroke-width rewrite. -->
  <image v-else-if="asset && visual?.kind==='helmet-weight' && r4bHelmet" :href="asset.src"
    :x="x" :y="y" :width="inkWidth" :height="inkHeight"
    preserveAspectRatio="xMidYMid meet" :data-figma-svg-instance="nodeKey"
    :data-original-asset-id="assetId" :data-original-svg-sha256="asset.sha256"
    :data-r4b-selected-source-sha256="asset.sha256" :data-user-visual-override="r4bHelmet.authority"
    :data-r4b-candidate="r4bHelmet.renderedCandidateId" :data-visual-qualification="r4bHelmet.qualification" />
  <image v-else-if="asset" :href="asset.src" :x="x" :y="y"
    :width="inkWidth" :height="inkHeight" preserveAspectRatio="none"
    :data-figma-svg-instance="nodeKey" :data-original-asset-id="assetId"
    :data-original-svg-sha256="asset.sha256"
    :data-line-candidate="line ? 'analytic-svg' : undefined" />
</template>
