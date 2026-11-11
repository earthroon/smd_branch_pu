<script setup lang="ts">
import {figmaScene} from '~/data/figma-r2-scene.generated';
import {homeMediaSlots, type HomeMediaSlotId} from '~/data/home-r2-manifest';
import {useHomeR2Published} from '~/composables/useHomeR2Published';
import {useSiteContent} from '~/composables/useSiteContent';
import {resolveHomeR2PublicImage} from '~/utils/home-r2-v6-public';
import FigmaSvgAsset from './FigmaSvgAsset.vue';
import FigmaNativeText from './FigmaNativeText.vue';
import {introItemIndex} from '~/utils/homeIntroTimeline';
import {homeInfoLayout} from '~/utils/homeInfoLayout';
import {specialItemIndex} from '~/utils/homeSpecialTimeline';
import {trainingItemIndex, isTrainingDiagramNode} from '~/utils/homeTrainingTimeline';
import {benefitsItemIndex} from '~/utils/homeBenefitsTimeline';
<<<<<<< HEAD
=======
import {isMethodsTitle, methodsCardIndex, methodsTextIndex} from '~/utils/homeMethodsTimeline';
>>>>>>> dec113c (feat(home): add FAQ accordion and stabilize scroll animations)
defineOptions({name:'FigmaSceneNode'});
const props=defineProps<{nodeKey:string;mode?:'full'|'decorative'}>();
const node=computed(()=>figmaScene.nodes[props.nodeKey]);
const op=computed(()=>figmaScene.operationByNode[props.nodeKey]);
const mode=computed(()=>props.mode??'full');
const blocked=computed(()=>node.value?.renderStatus==='blocked');
const displayChildren=computed(()=>node.value?.childKeys??[]);
const infoPlacement=(key:string)=>homeInfoLayout.nodeTransforms[key]??null;
const drawOp=computed(()=>{
 const operation=op.value;
 const sceneNode=node.value;
 if(!operation||!sceneNode||blocked.value)return false;
 switch(mode.value){
  case 'full': return !(operation.kind==='text'&&/^node-1:3[0-3]$/.test(props.nodeKey));
  case 'decorative': return operation.kind==='asset'&&
   (sceneNode.kind==='VECTOR'||sceneNode.kind==='ELLIPSE');
 }
});
const translate=computed(()=>{
 const n=node.value;if(!n)return '';
 const a=n.affine,r=n.rect;
 return `translate(${r[0]} ${r[1]}) matrix(${a[0]} ${a[1]} ${a[2]} ${a[3]} ${a[4]} ${a[5]})`;
});
const shape=computed(()=>{
 const n=node.value;if(!n)return '';
 const w=n.rect[2],h=n.rect[3];
 // The generated Scene ABI fixes four corners in Figma order: TL, TR, BR, BL.
 const [tl,tr,br,bl]=n.radii;
 const clampRadius=(value:number)=>Math.min(Math.max(value,0),w/2,h/2);
 const a=clampRadius(tl),b=clampRadius(tr),c=clampRadius(br),d=clampRadius(bl);
 return `M ${a} 0 H ${w-b} Q ${w} 0 ${w} ${b} V ${h-c} Q ${w} ${h} ${w-c} ${h} H ${d} Q 0 ${h} 0 ${h-d} V ${a} Q 0 0 ${a} 0 Z`;
});
const clipId=computed(()=>`smd-figma-clip-${props.nodeKey.replaceAll(':','-')}`);
const selfPaint=computed(()=>figmaScene.selfPaints[props.nodeKey]);
const solidFill=computed(()=>{
 const fills=selfPaint.value?.fills??[];
 const solid=fills.find(x=>x.paintType==='SOLID'&&x.visible);
 if(!solid?.rgba)return 'none';
 const rgba=solid.rgba;
 return `rgba(${rgba.slice(0,3).map(n=>Math.round(n*255)).join(',')},${rgba[3]*(solid.opacity??1)})`;
});
const imageOwnerMap=Object.fromEntries(Object.entries(homeMediaSlots).map(([id,v])=>[v.sourceNodeKey,id]));
const mediaSlot=computed(()=>imageOwnerMap[props.nodeKey] as HomeMediaSlotId|undefined);
const published=useHomeR2Published();const content=useSiteContent();const route=useRoute();
const image=computed(()=>{
 if(mode.value!=='full'||!mediaSlot.value||route.path!=='/'||!published.value||!content.value)return null;
 return resolveHomeR2PublicImage(published.value,content.value.publication,mediaSlot.value);
});
</script>
<template>
  <g v-if="node && node.visible && !blocked" :transform="translate" :data-figma-node="node.key"
    :data-figma-kind="node.kind" :data-render-status="node.renderStatus">
    <defs v-if="node.clippedChildren || image">
      <clipPath :id="clipId" clipPathUnits="userSpaceOnUse"><path :d="shape" /></clipPath>
    </defs>
    <template v-if="drawOp">
      <FigmaSvgAsset v-if="op?.kind==='asset'" :node-key="node.key" :asset-id="op.sourceRef"
        :width="node.rect[2]" :height="node.rect[3]" :line="node.kind==='LINE'" />
      <FigmaNativeText v-else-if="op?.kind==='text'" :node-key="node.key" :width="node.rect[2]" :height="node.rect[3]" />
      <path v-else-if="op?.kind==='self-paint'" :d="shape" :fill="solidFill"
        :data-figma-self-paint="node.key" :opacity="selfPaint?.opacity??1" />
    </template>
    <image v-if="image" x="0" y="0" :width="node.rect[2]" :height="node.rect[3]"
      :href="image.src" preserveAspectRatio="xMidYMid meet" :clip-path="`url(#${clipId})`"
      :data-home-media-slot="mediaSlot" :data-asset-id="image.assetId" />
    <g v-if="displayChildren.length" :clip-path="node.clippedChildren ? `url(#${clipId})` : undefined">
      <template v-for="child in displayChildren" :key="child">
        <g v-if="introItemIndex(child) !== null" class="smd-home-intro__item"
          :data-intro-icon-index="introItemIndex(child)">
          <g v-if="infoPlacement(child)" class="smd-home-info-layout__item"
            :transform="infoPlacement(child)?.transform"
            :data-home-info-scale="infoPlacement(child)?.scale"
            :data-home-info-kind="infoPlacement(child)?.kind"
            :data-home-info-source="child">
            <FigmaSceneNode :node-key="child" :mode="mode" />
          </g>
          <g v-else-if="specialItemIndex(child) !== null" class="smd-home-special__target"
          :data-special-item-index="specialItemIndex(child)" :data-special-source-node="child">
          <FigmaSceneNode :node-key="child" :mode="mode" />
        </g>
        <FigmaSceneNode v-else :node-key="child" :mode="mode" />
        </g>
        <g v-else-if="specialItemIndex(child) !== null" class="smd-home-special__target"
          :data-special-item-index="specialItemIndex(child)" :data-special-source-node="child">
          <FigmaSceneNode :node-key="child" :mode="mode" />
        </g>
        <g v-else-if="trainingItemIndex(child) !== null" class="smd-home-training__target"
          :data-training-item-index="trainingItemIndex(child)" :data-training-source-node="child">
          <FigmaSceneNode :node-key="child" :mode="mode" />
        </g>
        <g v-else-if="isTrainingDiagramNode(child)" class="smd-home-training__diagram-part"
          :data-training-diagram-node="child">
          <FigmaSceneNode :node-key="child" :mode="mode" />
        </g>
        <g v-else-if="benefitsItemIndex(child) !== null" class="smd-home-benefits__target"
          :data-benefits-item-index="benefitsItemIndex(child)" :data-benefits-source-node="child">
<<<<<<< HEAD
=======
          <FigmaSceneNode :node-key="child" :mode="mode" />
        </g>
        <g v-else-if="isMethodsTitle(child)" class="smd-home-methods__title"
          :data-methods-title-source="child">
          <FigmaSceneNode :node-key="child" :mode="mode" />
        </g>
        <g v-else-if="methodsCardIndex(child) !== null" class="smd-home-methods__card"
          :data-methods-card-index="methodsCardIndex(child)" :data-methods-card-source="child">
          <FigmaSceneNode :node-key="child" :mode="mode" />
        </g>
        <g v-else-if="methodsTextIndex(child) !== null" class="smd-home-methods__text"
          :data-methods-text-index="methodsTextIndex(child)" :data-methods-text-source="child">
>>>>>>> dec113c (feat(home): add FAQ accordion and stabilize scroll animations)
          <FigmaSceneNode :node-key="child" :mode="mode" />
        </g>
        <FigmaSceneNode v-else :node-key="child" :mode="mode" />
      </template>
    </g>
  </g>
</template>
