<script setup lang="ts">
import CurriculumSectionHeading from './CurriculumSectionHeading.vue';
import CurriculumSourceText from './CurriculumSourceText.vue';
import CurriculumMediaFrame from './CurriculumMediaFrame.vue';
import CurriculumAction from './CurriculumAction.vue';
</script>
<template><div class="smd-curriculum__hero-copy">
  <CurriculumSectionHeading label="13" title="11" hero />
  <CurriculumSourceText text-id="14" class="smd-curriculum__subtitle" />
  <CurriculumSourceText text-id="333" class="smd-curriculum__paragraph" />
  <CurriculumAction shape-id="334" text-id="335" href="#curriculum-six-week-program" />
  <CurriculumSourceText text-id="346" class="smd-curriculum__hero-note" />
</div><CurriculumMediaFrame slot-id="curriculum.hero.photo" /></template>
