<script setup lang="ts">
import HomeFigmaText from './HomeFigmaText.vue';
import { homeCopyRefs } from '~/data/home-r2-composition';
const copy=homeCopyRefs.location;
</script>
<template>
  <section data-home-section="location" data-figma-node="node-1:46" class="smd-home-section smd-home--location">
    <div class="smd-home__container text-center">
      <h2 class="font-heading text-3xl font-semibold md:text-5xl"><HomeFigmaText :text-key="copy.title" /></h2>
      <p class="smd-home__location-intro mx-auto mt-8 max-w-2xl whitespace-pre-line text-base leading-relaxed text-foreground-700 md:text-lg"><HomeFigmaText :text-key="copy.description" /></p>
      <p class="smd-home__location-note mx-auto mt-8 max-w-2xl whitespace-pre-line text-sm leading-relaxed text-foreground-600"><HomeFigmaText :text-key="copy.note" /></p>
      <!-- The Figma section does not supply a verified location/map asset. CF2 adds none. -->
    </div>
  </section>
</template>
