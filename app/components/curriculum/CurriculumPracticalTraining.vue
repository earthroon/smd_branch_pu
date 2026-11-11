<script setup lang="ts">
import CurriculumSectionHeading from './CurriculumSectionHeading.vue';
import CurriculumSourceText from './CurriculumSourceText.vue';
import CurriculumMediaFrame from './CurriculumMediaFrame.vue';
const cards=[
  {photo:'curriculum.practice.foundation',label:'363',title:'364',body:'365'},
  {photo:'curriculum.practice.finishing',label:'375',title:'376',body:'374'},
  {photo:'curriculum.practice.field',label:'379',title:'380',body:'378'},
  {photo:'curriculum.practice.next-step',label:'383',title:'384',body:'382'},
] as const;
</script>
<template><CurriculumSectionHeading label="47" title="46" />
  <div class="smd-curriculum__practice-cards"><article v-for="card in cards" :key="card.photo" class="smd-curriculum__practice-card">
    <CurriculumMediaFrame :slot-id="card.photo" /><div class="smd-curriculum__practice-copy">
      <CurriculumSourceText :text-id="card.label" class="smd-curriculum__card-label" />
      <CurriculumSourceText :text-id="card.title" as="h3" class="smd-curriculum__card-title" />
      <CurriculumSourceText :text-id="card.body" /></div>
  </article></div>
</template>
