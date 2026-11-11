<script setup lang="ts">
import AboutSectionHeading from './AboutSectionHeading.vue';
import AboutSourceText from './AboutSourceText.vue';
import AboutMediaFrame from './AboutMediaFrame.vue';

</script>
<template>
  <div class="smd-about__split-copy">
    <AboutSectionHeading label="47" title="46" />
    <div class="smd-about__paragraphs"><AboutSourceText text-id="49" /><AboutSourceText text-id="50" /></div>
  </div>
  <div class="smd-about__media-pair"><AboutMediaFrame slot-id="about.field.01.photo" /><AboutMediaFrame slot-id="about.field.02.photo" /></div>
  
</template>
