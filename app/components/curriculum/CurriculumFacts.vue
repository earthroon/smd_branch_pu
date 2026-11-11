<script setup lang="ts">
import CurriculumSourceText from './CurriculumSourceText.vue';
const facts=[['20','19','336'],['338','337','339'],['341','340','342'],['344','343','345']] as const;
</script>
<template><dl class="smd-curriculum__facts"><div v-for="[label,value,detail] in facts" :key="label" class="smd-curriculum__fact">
  <dt><CurriculumSourceText :text-id="label" as="span" class="smd-curriculum__fact-label" /></dt>
  <dd><CurriculumSourceText :text-id="value" as="span" class="smd-curriculum__fact-value" />
    <CurriculumSourceText :text-id="detail" class="smd-curriculum__fact-detail" /></dd>
</div></dl></template>
