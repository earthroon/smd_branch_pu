<script setup lang="ts">
import HomeFigmaText from './HomeFigmaText.vue';
import { homeCopyRefs } from '~/data/home-r2-composition';
import { homeFigmaText } from '~/data/home-r2-copy';
const copy=homeCopyRefs.hero;

// MOBILE_R1 is a display-only copy override. The frozen Figma text and digest stay intact.
const frozenHeading=homeFigmaText[copy.heading];
if (copy.heading!=='node-35:5' ||
    frozenHeading.characters!=='업계 최초 인테리어 · 유리필름\n실무자 양성 프로그램 운영') {
  throw new Error('SMD_HOME_MOBILE_HERO_SOURCE_DRIFT');
}
</script>
<template>
  <section data-home-section="hero" data-figma-node="node-1:4" class="smd-home-section smd-home--hero">
    <div class="smd-home__container">
      <p class="font-label text-xs font-medium tracking-[0.16em] text-foreground-700"><HomeFigmaText :text-key="copy.eyebrow" /></p>
      <h1 class="smd-home__hero-heading mt-6 max-w-4xl whitespace-pre-line font-heading text-4xl font-semibold leading-tight text-foreground-950 md:text-6xl">
        <span class="smd-home__hero-heading-source"><HomeFigmaText :text-key="copy.heading" /></span>
        <span class="smd-home__hero-heading-mobile" data-mobile-heading="MOBILE_HERO_COPY_R1"
          :data-source-text-digest="frozenHeading.textDigest">
          <span class="smd-home__hero-mobile-line">업계최초 인테리어 유리필름</span>
          <span class="smd-home__hero-mobile-line">실무자 양성 프로그램 운영</span>
        </span>
      </h1>
      <p class="smd-home__hero-intro mt-7 max-w-2xl whitespace-pre-line text-base leading-relaxed text-foreground-800 md:text-xl"><HomeFigmaText :text-key="copy.introduction" /></p>
    </div>
  </section>
</template>
<style scoped>
.smd-home__hero-heading-source { display: block; }
.smd-home__hero-heading-mobile { display: none; }
@media (max-width: 699px) {
  .smd-home__hero-heading-source { display: none; }
  .smd-home__hero-heading-mobile {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 3px;
    width: 100%;
    color: #fff;
    font-family: var(--font-ui), Pretendard, sans-serif;
    font-weight: 600;
    font-size: clamp(23px, 6.2vw, 29px);
    line-height: 1.25;
    letter-spacing: -0.035em;
  }
  .smd-home__hero-mobile-line { display: block; max-width: 100%; white-space: nowrap; }
}
</style>
