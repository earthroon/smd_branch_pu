<script setup lang="ts">
import AboutSectionHeading from './AboutSectionHeading.vue';
import AboutSourceText from './AboutSourceText.vue';
import AboutMediaFrame from './AboutMediaFrame.vue';
import { aboutR1Source } from '~/data/about-r1-manifest';
import { aboutSourceShapes } from '~/data/about-r1-shapes.generated';

const audienceTop = aboutR1Source.sections.find(section => section.id === 'audience')!.top;
const tags = ([
  { shapeId: '38', textId: '39' },
  { shapeId: '40', textId: '41' },
  { shapeId: '42', textId: '43' },
  { shapeId: '44', textId: '45' },
] as const).map(tag => {
  const [left, top, right, bottom] = aboutSourceShapes[tag.shapeId].frame;
  return { ...tag, style: {
    '--shape-x': left,
    '--shape-y': top - audienceTop,
    '--shape-width': right - left,
    '--shape-height': bottom - top,
  } };
});
</script>
<template>
  <div class="smd-about__audience-copy">
    <AboutSectionHeading label="35" title="33" />
    <div class="smd-about__paragraphs"><AboutSourceText text-id="34" /><AboutSourceText text-id="36" /></div>
    <ul class="smd-about__tags">
      <li v-for="tag in tags" :key="tag.textId" :style="tag.style" :data-about-tag-shape="tag.shapeId">
        <AboutSourceText :text-id="tag.textId" as="span" />
      </li>
    </ul>
  </div>
  <AboutMediaFrame slot-id="about.audience.photo" />
</template>
