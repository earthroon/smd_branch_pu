<script setup lang="ts">
import AboutSectionHeading from './AboutSectionHeading.vue';
import AboutSourceText from './AboutSourceText.vue';
import AboutMediaFrame from './AboutMediaFrame.vue';
const steps = [['153','154','155'],['156','157','158'],['159','160','161'],
  ['162','163','164'],['165','166','167']] as const;
</script>
<template>
  <AboutSectionHeading label="71" title="70" />
  <div class="smd-about__paragraphs"><AboutSourceText text-id="68" /><AboutSourceText text-id="69" /></div>
  <ol class="smd-about__steps">
    <li v-for="step in steps" :key="step[0]">
      <AboutSourceText :text-id="step[0]" class="smd-about__step-number" />
      <AboutSourceText :text-id="step[1]" as="h3" class="smd-about__step-title" />
      <AboutSourceText :text-id="step[2]" class="smd-about__step-detail" />
    </li>
  </ol>
  <div class="smd-about__media-pair">
    <AboutMediaFrame slot-id="about.practice.01.photo" /><AboutMediaFrame slot-id="about.practice.02.photo" />
  </div>
</template>
