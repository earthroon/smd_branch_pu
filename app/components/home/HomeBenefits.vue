<script setup lang="ts">
import HomeFigmaText from './HomeFigmaText.vue';
import { homeCopyRefs } from '~/data/home-r2-composition';
import HomeMediaFrame from './HomeMediaFrame.vue';
const copy=homeCopyRefs.benefits;
</script>
<template>
  <section data-home-section="benefits" data-figma-node="node-1:77" class="smd-home-section smd-home--benefits">
    <div class="smd-home__container">
      <h2 class="mx-auto max-w-3xl whitespace-pre-line text-center font-heading text-3xl font-semibold md:text-5xl"><HomeFigmaText :text-key="copy.title" /></h2>
      <div class="smd-home__benefits-grid">
        <article v-for="card in copy.cards" :key="card.slot" class="min-w-0 smd-home__benefit-card" :data-benefit-slot="card.slot">
          <HomeMediaFrame :slot-id="card.slot" />
          <div class="smd-home__benefit-body">
            <span class="font-heading text-xl text-accent-400"><HomeFigmaText :text-key="card.numeral" /></span>
            <div class="smd-home__benefit-copy">
              <h3 class="whitespace-pre-line font-heading text-xl font-semibold"><HomeFigmaText :text-key="card.title" /></h3>
              <p class="smd-home__benefit-description mt-3 whitespace-pre-line text-sm leading-relaxed text-foreground-300 md:text-base"><HomeFigmaText :text-key="card.description" /></p>
            </div>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>
