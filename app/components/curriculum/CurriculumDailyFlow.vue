<script setup lang="ts">
import CurriculumSectionHeading from './CurriculumSectionHeading.vue';
import CurriculumSourceText from './CurriculumSourceText.vue';
import { curriculumSourceAssets } from '~/data/curriculum-r1-assets.generated';
import { curriculumFrameStyle } from '~/utils/curriculumR1LayoutMath';
const arrow=curriculumSourceAssets.arrow;
const periods=[['352','354','355'],['358','357','356']] as const;
</script>
<template><CurriculumSectionHeading label="350" title="349" />
  <ol class="smd-curriculum__daily-flow"><li v-for="[period,title,body] in periods" :key="period">
    <CurriculumSourceText :text-id="period" class="smd-curriculum__period" />
    <div><CurriculumSourceText :text-id="title" as="h3" class="smd-curriculum__card-title" />
      <CurriculumSourceText :text-id="body" /></div>
  </li></ol>
  <img class="smd-curriculum__flow-arrow" :src="'/curriculum/'+arrow.fileName+'?v='+arrow.sha256"
    :style="curriculumFrameStyle(arrow.frame,'daily-flow')" alt="" aria-hidden="true" decoding="async" />
</template>
