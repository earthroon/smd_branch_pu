<script setup lang="ts">
import CurriculumHero from './CurriculumHero.vue';
import CurriculumFacts from './CurriculumFacts.vue';
import CurriculumIntroduction from './CurriculumIntroduction.vue';
import CurriculumDailyFlow from './CurriculumDailyFlow.vue';
import CurriculumPracticalTraining from './CurriculumPracticalTraining.vue';
import CurriculumWeekProgram from './CurriculumWeekProgram.vue';
import CurriculumCourseInformation from './CurriculumCourseInformation.vue';
import CurriculumConsultationCta from './CurriculumConsultationCta.vue';
import CurriculumSourceShapes from './CurriculumSourceShapes.vue';
import CmsSlot from '~/components/cms/CmsSlot.vue';
import { curriculumR1Source } from '~/data/curriculum-r1-manifest';
import { curriculumWideTokens } from '~/utils/curriculumR1LayoutMath';
import { assertCurriculumR1Source } from '~/utils/curriculumR1Admission';
import type { CurriculumOperationalState } from '~/data/curriculum-r1-types';
defineProps<{operational:CurriculumOperationalState}>();
assertCurriculumR1Source();
const components={hero:CurriculumHero,facts:CurriculumFacts,introduction:CurriculumIntroduction,
  'daily-flow':CurriculumDailyFlow,'practical-training':CurriculumPracticalTraining,
  'six-week-program':CurriculumWeekProgram} as const;
</script>
<template><div class="smd-curriculum" :style="curriculumWideTokens"
  data-curriculum-contract="SMD_CURRICULUM_BUILD_SOURCE_V1" data-content-authority="PSD_BUILD_SOURCE_V1"
  :data-psd-sha256="curriculumR1Source.psdSha256" :data-operational-publication="operational.publicationKey"
  :data-week-program-source="operational.weekProgram?'PUBLIC_PROJECTION_V1':'PSD_SOURCE_ONLY'">
  <template v-for="section in curriculumR1Source.sections" :key="section.id">
    <div v-if="section.id==='consultation-cta'&&operational.beforeCta.length" class="smd-curriculum__cms-insert" data-curriculum-cms-anchor="beforeCta"><CmsSlot :nodes="operational.beforeCta" /></div>
    <section :id="'curriculum-'+section.id" class="smd-curriculum-section" :data-curriculum-section="section.id"
      :style="{'--section-height':section.height}" :tabindex="section.id==='six-week-program'?-1:undefined">
      <div class="smd-curriculum__artboard"><CurriculumSourceShapes :section-id="section.id" />
        <CurriculumCourseInformation v-if="section.id==='course-information'" :href="operational.consultationUrl" />
        <CurriculumConsultationCta v-else-if="section.id==='consultation-cta'" :href="operational.consultationUrl" />
        <CurriculumWeekProgram v-else-if="section.id==='six-week-program'" :program="operational.weekProgram" />
        <component :is="components[section.id]" v-else />
      </div>
    </section>
    <div v-if="section.id==='practical-training'&&operational.afterTeach.length" class="smd-curriculum__cms-insert" data-curriculum-cms-anchor="afterTeach"><CmsSlot :nodes="operational.afterTeach" /></div>
    <div v-if="section.id==='six-week-program'&&operational.afterLearningPath.length" class="smd-curriculum__cms-insert" data-curriculum-cms-anchor="afterLearningPath"><CmsSlot :nodes="operational.afterLearningPath" /></div>
  </template>
</div></template>
<style src="~/assets/css/curriculum-r1.css"></style>
