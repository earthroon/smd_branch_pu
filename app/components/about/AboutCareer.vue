<script setup lang="ts">
import AboutSectionHeading from './AboutSectionHeading.vue';
import AboutSourceText from './AboutSourceText.vue';
const cards = [['128','127'],['130','129']] as const;
</script>
<template>
  <AboutSectionHeading label="124" title="123" />
  <div class="smd-about__paragraphs"><AboutSourceText text-id="121" /><AboutSourceText text-id="122" /></div>
  <ul class="smd-about__career-cards"><li v-for="card in cards" :key="card[0]">
    <AboutSourceText :text-id="card[0]" as="h3" class="smd-about__card-title" />
    <AboutSourceText :text-id="card[1]" class="smd-about__card-body" />
  </li></ul>
</template>
