<script setup lang="ts">
import CurriculumSectionHeading from './CurriculumSectionHeading.vue';
import CurriculumSourceText from './CurriculumSourceText.vue';
</script>
<template><CurriculumSectionHeading label="35" title="33" />
  <div class="smd-curriculum__paragraphs"><CurriculumSourceText v-for="id in ['34','347','348'] as const" :key="id" :text-id="id" /></div>
</template>
