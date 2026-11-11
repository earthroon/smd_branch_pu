<script setup lang="ts">
import AboutSectionHeading from './AboutSectionHeading.vue';
import AboutSourceText from './AboutSourceText.vue';
import AboutMediaFrame from './AboutMediaFrame.vue';

</script>
<template>
  <div class="smd-about__split-copy">
    <AboutSectionHeading label="57" title="56" />
    <div class="smd-about__paragraphs"><AboutSourceText text-id="54" /><AboutSourceText text-id="55" /></div>
  </div>
  <div class="smd-about__media-pair"><AboutMediaFrame slot-id="about.learn.01.photo" /><AboutMediaFrame slot-id="about.learn.02.photo" /></div>
  <aside class="smd-about__note"><AboutSourceText text-id="61" /><AboutSourceText text-id="62" /></aside>
</template>
