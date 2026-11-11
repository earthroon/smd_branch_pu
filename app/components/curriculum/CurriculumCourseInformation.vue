<script setup lang="ts">
import CurriculumSectionHeading from './CurriculumSectionHeading.vue';
import CurriculumSourceText from './CurriculumSourceText.vue';
import CurriculumAction from './CurriculumAction.vue';
defineProps<{href:string|null}>();
const facts=[{label:'426',value:'427',detail:null},{label:'428',value:'429',detail:'452'},
  {label:'453',value:'454',detail:'455'},{label:'443',value:'444',detail:null},
  {label:'446',value:'447',detail:null},{label:'449',value:'450',detail:null}] as const;
</script>
<template><div class="smd-curriculum__information-copy"><CurriculumSectionHeading label="419" title="415" />
  <CurriculumSourceText text-id="418" />
  <CurriculumSourceText text-id="423" class="smd-curriculum__information-note" />
</div><div class="smd-curriculum__information-details"><dl>
  <div v-for="fact in facts" :key="fact.label"><dt><CurriculumSourceText :text-id="fact.label" as="span" /></dt>
    <dd><CurriculumSourceText :text-id="fact.value" as="span" />
      <CurriculumSourceText v-if="fact.detail" :text-id="fact.detail" class="smd-curriculum__information-detail" /></dd></div>
</dl><CurriculumAction shape-id="456" text-id="457" :href="href" external /></div></template>
