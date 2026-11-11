<script setup lang="ts">
import HomeFigmaText from './HomeFigmaText.vue';
import { homeCopyRefs } from '~/data/home-r2-composition';
import HomeMediaFrame from './HomeMediaFrame.vue';
const copy=homeCopyRefs.methods;
</script>
<template>
  <section data-home-section="methods" data-figma-node="node-1:51" class="smd-home-section smd-home--methods">
    <div class="smd-home__container">
      <h2 class="text-center font-heading text-3xl font-semibold text-foreground-950 md:text-5xl"><HomeFigmaText :text-key="copy.title" /></h2>
      <div class="smd-home__methods-grid">
        <article v-for="card in copy.cards" :key="card.slot" class="smd-home__method">
          <HomeMediaFrame :slot-id="card.slot" />
          <h3 class="smd-home__method-title mt-6 whitespace-pre-line font-heading text-lg font-semibold md:text-xl"><HomeFigmaText :text-key="card.title" /></h3>
          <p class="smd-home__method-description mt-3 whitespace-pre-line text-sm leading-relaxed text-foreground-700"><HomeFigmaText :text-key="card.description" /></p>
        </article>
      </div>
    </div>
  </section>
</template>
