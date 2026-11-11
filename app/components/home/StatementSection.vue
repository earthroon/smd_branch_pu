<script setup lang="ts">
import HomeFigmaText from './HomeFigmaText.vue';
import { homeCopyRefs } from '~/data/home-r2-composition';
import HomeMediaFrame from './HomeMediaFrame.vue';
const copy=homeCopyRefs.specialStart;
</script>
<template>
  <section data-home-section="special-start" data-figma-node="node-1:123" class="smd-home-section smd-home--special-start">
    <div class="smd-home__container smd-home__special-layout">
      <div class="smd-home__copy-block">
        <h2 class="font-heading text-3xl font-semibold text-foreground-950 md:text-5xl"><HomeFigmaText :text-key="copy.title" /></h2>
        <ol class="smd-home__special-points">
          <li v-for="point in copy.points" :key="point.numeral" class="smd-home__special-point smd-home__special-point-r2">
            <span class="font-heading text-2xl font-semibold text-primary-600"><HomeFigmaText :text-key="point.numeral" /></span>
            <p class="smd-home__special-point-body-r2 max-w-lg whitespace-pre-line text-base leading-relaxed text-foreground-800"><HomeFigmaText :text-key="point.text" /></p>
          </li>
        </ol>
      </div>
      <div class="smd-home__media"><HomeMediaFrame :slot-id="copy.photo" /></div>
    </div>
  </section>
</template>
<style scoped>
/* Mobile-only presentation normalization: preserve the original text nodes, UTF-16 runs and digests. */
@media (max-width: 699px) {
  .smd-home--special-start .smd-home__special-points {
    display: grid;
    gap: 20px;
    margin-top: 26px;
    padding: 0;
    list-style: none;
  }
  .smd-home--special-start .smd-home__special-point-r2 {
    display: grid;
    grid-template-columns: 32px minmax(0, 1fr);
    gap: 12px;
    align-items: start;
    min-width: 0;
  }
  .smd-home__special-point-body-r2 {
    min-width: 0;
    max-width: none;
    margin: 0;
    white-space: normal !important;
    word-break: keep-all;
    overflow-wrap: break-word;
    text-wrap: pretty;
  }
  .smd-home__special-point-body-r2 :deep(.smd-home-figma-text),
  .smd-home__special-point-body-r2 :deep(.smd-home-figma-text > span) {
    white-space: normal !important;
    font-family: var(--font-ui), Pretendard, sans-serif !important;
    font-size: 16px !important;
    font-weight: 400 !important;
    letter-spacing: -0.015em !important;
    line-height: 1.55 !important;
    word-break: keep-all;
    overflow-wrap: break-word;
  }
  .smd-home__special-point-body-r2
    :deep(.smd-home-figma-text > span[data-special-emphasis="true"]) {
    font-weight: 700 !important;
  }
}
</style>
