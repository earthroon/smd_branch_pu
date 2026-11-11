<script setup lang="ts">
import AboutSectionHeading from './AboutSectionHeading.vue';
import AboutSourceText from './AboutSourceText.vue';
import AboutMediaFrame from './AboutMediaFrame.vue';

</script>
<template>
  <div class="smd-about__hero-content">
    <AboutSectionHeading label="13" title="11" hero />
    <AboutSourceText text-id="14" class="smd-about__lede" />
    <AboutMediaFrame slot-id="about.hero.photo" />
  </div>
</template>
