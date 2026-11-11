<script setup lang="ts">
import { computed } from 'vue';
import { aboutSourceShapes } from '~/data/about-r1-shapes.generated';
import { aboutR1Source } from '~/data/about-r1-manifest';
import type { AboutSectionId } from '~/data/about-r1-types';
const props = defineProps<{ sectionId: AboutSectionId }>();
const shapes = computed(() => Object.values(aboutSourceShapes).filter(s => s.sectionId === props.sectionId));
function style(shape: typeof aboutSourceShapes[keyof typeof aboutSourceShapes]) {
  const section = aboutR1Source.sections.find(s => s.id === props.sectionId)!;
  return { '--shape-x': shape.frame[0], '--shape-y': shape.frame[1] - section.top,
    '--shape-width': shape.frame[2] - shape.frame[0], '--shape-height': shape.frame[3] - shape.frame[1],
    '--shape-radius': shape.radius };
}
</script>
<template>
  <div v-for="shape in shapes" :key="shape.sourceLayerId" class="smd-about__source-shape"
    :data-source-shape="shape.sourceLayerId" :style="style(shape)" aria-hidden="true" />
</template>
