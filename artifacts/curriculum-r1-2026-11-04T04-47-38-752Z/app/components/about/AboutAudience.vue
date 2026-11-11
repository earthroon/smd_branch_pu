<script setup lang="ts">
import AboutSectionHeading from './AboutSectionHeading.vue';
import AboutSourceText from './AboutSourceText.vue';
import AboutMediaFrame from './AboutMediaFrame.vue';
const tags = ['39','41','43','45'] as const;
</script>
<template>
  <div class="smd-about__audience-copy">
    <AboutSectionHeading label="35" title="33" />
    <div class="smd-about__paragraphs"><AboutSourceText text-id="34" /><AboutSourceText text-id="36" /></div>
    <ul class="smd-about__tags"><li v-for="id in tags" :key="id"><AboutSourceText :text-id="id" as="span" /></li></ul>
  </div>
  <AboutMediaFrame slot-id="about.audience.photo" />
</template>
