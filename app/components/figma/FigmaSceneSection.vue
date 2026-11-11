<script setup lang="ts">
import HomeHeroFilm from '~/components/home/HomeHeroFilm.vue';
import FigmaR4UserFileIcon from './FigmaR4UserFileIcon.vue';
import {figmaScene} from '~/data/figma-r2-scene.generated';
import {useSiteContent} from '~/composables/useSiteContent';
import { usePublicConsultationHref } from '~/composables/usePublicConsultationHref';
import {useHomeR2Published} from '~/composables/useHomeR2Published';
import FigmaSceneNode from './FigmaSceneNode.vue';
import { homeInfoLayout } from '~/utils/homeInfoLayout';
import type { FilmPaintGeometry } from '~/utils/homeIntroOverlayGeometry';
import type { HeroMediaStatus } from '~/utils/homeIntroMediaGate';
const emit = defineEmits<{
  'film-paint-geometry': [geometry: FilmPaintGeometry];
  'film-media-status': [status: HeroMediaStatus];
}>();
const props=defineProps<{sectionId:string; mode?:'full'|'decorative'; paintHeightCssPx?:number|null}>();
const section=computed(()=>figmaScene.sections.find(s=>s.id===props.sectionId));
const root=computed(()=>section.value?.nodeKey??'');
const sceneHeight=computed(()=>props.sectionId==='info-bar'?homeInfoLayout.barHeight:section.value?.height??1);
const viewBox=computed(()=>`0 0 1920 ${sceneHeight.value}`);
const content=useSiteContent(); const published=useHomeR2Published();
const ctaHref = usePublicConsultationHref();
const faq=computed(()=>{
 if(!published.value||!content.value||published.value.publicationId!==content.value.publication.id||
   published.value.publicationDigest!==content.value.publication.digest)return [];
 return published.value.faq;
});
const faqs=['node-1:30','node-1:31','node-1:32','node-1:33'];
const faqAt=(index:number)=>faq.value.find(v=>v.id===`home.faq.0${index+1}`);
const nodeRect=(k:string)=>figmaScene.nodes[k]?.rect??[0,0,0,0];
</script>
<template>
  <section v-if="section" class="smd-figma-scene-section" :class="`smd-figma-scene-section--${sectionId}`"
    :data-home-section="sectionId" :data-figma-section="root" :data-scene-mode="mode??'full'"
    :style="sectionId==='hero' && paintHeightCssPx!=null ? {height:`${paintHeightCssPx}px`} : undefined">
    <HomeHeroFilm v-if="sectionId === 'hero' && mode !== 'decorative'" :paint-height-css-px="paintHeightCssPx"
      @film-paint-geometry="emit('film-paint-geometry', $event)"
      @film-media-status="emit('film-media-status', $event)" />
    <svg xmlns="http://www.w3.org/2000/svg" class="smd-figma-scene-svg" :viewBox="viewBox"
      preserveAspectRatio="xMidYMin meet" role="group" :aria-label="`Figma 원본 ${sectionId} 섹션 시각 레이어`">
      <g :transform="`translate(0 ${-section.top})`">
        <FigmaSceneNode :node-key="root" :mode="mode??'full'" />
      </g>
      <!-- Clickable semantic overlay, NOT another visual text/paint owner. -->
      <foreignObject v-if="sectionId==='consultation-cta' && ctaHref && mode!=='decorative'"
        x="785" y="579" width="340" height="88">
        <a xmlns="http://www.w3.org/1999/xhtml" :href="ctaHref" target="_blank"
          rel="noopener noreferrer" class="smd-scene-cta-hitbox" aria-label="상담 신청하기" />
      </foreignObject>
      <!-- Figma ==== placeholders intentionally never enter DOM. CMS text is the only authority. -->
      <template v-if="sectionId==='faq'&&mode!=='decorative'">
        <foreignObject v-for="(key,index) in faqs" :key="key" :x="nodeRect(key)[0]"
          :y="nodeRect(key)[1]" :width="nodeRect(key)[2]" :height="nodeRect(key)[3]+95">
          <details v-if="faqAt(index)" xmlns="http://www.w3.org/1999/xhtml"
            class="smd-scene-faq" :data-faq-id="faqAt(index)?.id">
            <summary>{{faqAt(index)?.question}}</summary><p>{{faqAt(index)?.answer}}</p>
          </details>
        </foreignObject>
      </template>
      <g v-if="sectionId === 'info-bar'" class="smd-home-intro__item" data-intro-icon-index="3">
        <g class="smd-home-info-layout__item" :transform="homeInfoLayout.fileIcon.transform"
          :data-home-info-scale="homeInfoLayout.fileIcon.scale" data-home-info-kind="icon"
          data-home-info-source="node-18:26">
          <FigmaR4UserFileIcon />
        </g>
      </g>
  </svg>
  </section>
</template>
