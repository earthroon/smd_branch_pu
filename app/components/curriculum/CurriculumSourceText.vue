<script setup lang="ts">
import { computed } from 'vue';
import { curriculumSourceText } from '~/data/curriculum-r1-copy.generated';
import { curriculumR1Source } from '~/data/curriculum-r1-manifest';
import { curriculumSection } from '~/utils/curriculumR1LayoutMath';
import type { CurriculumTextId } from '~/data/curriculum-r1-types';
const props=withDefaults(defineProps<{textId:CurriculumTextId;as?:'p'|'h1'|'h2'|'h3'|'span';frame?:readonly number[];paintRole?:'week-title'}>(),{as:'p'});
const text=computed(()=>curriculumSourceText[props.textId]);
const override=computed(()=>{
  switch(props.textId){
    case '19':return {kind:'duration-correction' as const,text:curriculumR1Source.displayOverrides['19'].text};
    case '398':return {kind:'week06-title' as const,text:'복습 · 진로상담'};
    default:return null;
  }
});
const style=computed(()=>{
  const t=text.value,s=curriculumSection(t.sectionId),m=curriculumR1Source.webFontMetrics;
  const offset=(t.lineHeight+t.fontSize*(m.ascent-m.descent)/m.unitsPerEm)/2,f=props.frame;
  return {'--text-x':t.baselineOrigin[0]-(f?.[0]??0),'--text-y':t.baselineOrigin[1]-offset-(f?.[1]??s.top),
    '--text-space-width':f?(f[2]!-f[0]!):curriculumR1Source.sourceWidth,
    '--text-space-height':f?(f[3]!-f[1]!):s.height,'--text-width':t.bbox[2]-t.bbox[0],
    '--text-size':t.fontSize,'--text-leading':t.lineHeight/t.fontSize,'--text-tracking':t.trackingEm+'em'};
});
</script>
<template><component :is="as" :id="'curriculum-text-'+textId" class="smd-curriculum__text" :style="style"
  :data-curriculum-text="textId" :data-source-layer="text.sourceLayerId" :data-source-key="text.sourceKey"
  :data-source-text-digest="text.sourceTextDigest" :data-display-override="override?.kind">
  <span v-if="override" :style="{color:paintRole==='week-title'?'var(--smd-curriculum-week-title-ink)':text.runs[0].cssColor,fontWeight:text.runs[0].fontWeight,opacity:text.runs[0].opacity}">{{ override.text }}</span>
  <template v-else><span v-for="(run,index) in text.runs" :key="index"
    :style="{color:paintRole==='week-title'?'var(--smd-curriculum-week-title-ink)':run.cssColor,fontWeight:run.fontWeight,opacity:run.opacity}">{{ run.text }}</span></template>
</component></template>
