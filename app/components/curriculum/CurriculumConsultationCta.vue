<script setup lang="ts">
import CurriculumSourceText from './CurriculumSourceText.vue';
import CurriculumAction from './CurriculumAction.vue';
defineProps<{href:string|null}>();
</script>
<template><CurriculumSourceText text-id="134" class="smd-curriculum__cta-lede" />
  <CurriculumSourceText text-id="132" as="h2" class="smd-curriculum__title" />
  <CurriculumAction shape-id="136" text-id="137" :href="href" external class="smd-curriculum__action--pill" />
</template>
