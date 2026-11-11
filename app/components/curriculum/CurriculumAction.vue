<script setup lang="ts">
import CurriculumSourceText from './CurriculumSourceText.vue';
import { curriculumSourceShapes } from '~/data/curriculum-r1-shapes.generated';
import { curriculumFrameStyle } from '~/utils/curriculumR1LayoutMath';
import type { CurriculumShapeId,CurriculumTextId } from '~/data/curriculum-r1-types';
withDefaults(defineProps<{shapeId:CurriculumShapeId;textId:CurriculumTextId;href:string|null;external?:boolean}>(),{external:false});
</script>
<template><a v-if="href" class="smd-curriculum__action" :href="href" :target="external?'_blank':undefined"
  :rel="external?'noopener noreferrer':undefined" :data-curriculum-action="shapeId"
  :style="curriculumFrameStyle(curriculumSourceShapes[shapeId].frame,curriculumSourceShapes[shapeId].sectionId)">
  <CurriculumSourceText :text-id="textId" as="span" :frame="curriculumSourceShapes[shapeId].frame" />
</a><span v-else class="smd-curriculum__action smd-curriculum__action--unavailable" role="status"
  :style="curriculumFrameStyle(curriculumSourceShapes[shapeId].frame,curriculumSourceShapes[shapeId].sectionId)">
  <CurriculumSourceText :text-id="textId" as="span" :frame="curriculumSourceShapes[shapeId].frame" />
  <span class="smd-curriculum__unavailable-label">상담 연결 불가</span>
</span></template>
