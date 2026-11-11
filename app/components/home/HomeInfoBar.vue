<script setup lang="ts">
import HomeFigmaText from './HomeFigmaText.vue';
import HomeMobileInfoIcon from './HomeMobileInfoIcon.vue';
type HomeMobileInfoIconKind='clock'|'helmet'|'tools'|'file';
import { homeCopyRefs } from '~/data/home-r2-composition';

// Exact order and text identities are frozen by the Figma Home R2 composition.
const iconByLabel:Record<'node-1:156'|'node-1:402'|'node-1:406'|'node-18:60',HomeMobileInfoIconKind>={
  'node-1:156':'clock',
  'node-1:402':'helmet',
  'node-1:406':'tools',
  'node-18:60':'file',
};
const facts=homeCopyRefs.infoBar.map(item=>({...item,icon:iconByLabel[item.label]}));
if (facts.length!==4 || facts.some(fact=>!fact.icon)) {
  throw new Error('SMD_HOME_MOBILE_INFO_ICON_BINDING_INVALID');
}
</script>
<template>
  <section data-home-section="info-bar" data-figma-node="node-1:134" class="smd-home-section smd-home--info-bar">
    <div class="smd-home__container smd-home__facts">
      <div v-for="(item,index) in facts" :key="item.label" class="smd-home__fact smd-home-intro__item" :data-intro-icon-index="index" :data-mobile-fact="item.label">
        <HomeMobileInfoIcon :kind="item.icon" />
        <p class="smd-home__fact-label whitespace-pre-line text-sm font-medium text-foreground-700"><HomeFigmaText :text-key="item.label" /></p>
        <p class="smd-home__fact-value mt-2 whitespace-pre-line font-heading text-lg font-semibold text-foreground-950 md:text-xl"><HomeFigmaText :text-key="item.value" /></p>
      </div>
    </div>
  </section>
</template>
<style scoped>
/* The section exists only in Semantic Reflow; desktop Figma Scene keeps its own SVG owners. */
.smd-home__fact { display: flex; flex-direction: column; align-items: center; min-width: 0; }
.smd-home__fact-label { margin-top: 8px; }
@media (max-width: 699px) {
  .smd-home--info-bar .smd-home__facts {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 18px 12px;
    align-items: start;
  }
  .smd-home--info-bar .smd-home__container { padding-block: 24px 24px; }
  .smd-home__fact { text-align: center; min-width: 0; }
  .smd-home__fact-label { margin: 6px 0 0; }
  .smd-home__fact-value { margin: 5px 0 0; }
  /* Generated HomeFigmaText runs carry inline font sizes, so this view-only override is scoped. */
  .smd-home__fact-label :deep(.smd-home-figma-text > span) {
    font-family: var(--font-ui), Pretendard, sans-serif !important;
    font-size: 13px !important;
    font-weight: 500 !important;
    line-height: 1.35 !important;
    letter-spacing: -0.02em !important;
    white-space: normal !important;
  }
  .smd-home__fact-value :deep(.smd-home-figma-text > span) {
    font-family: var(--font-ui), Pretendard, sans-serif !important;
    font-size: clamp(15px, 4vw, 17px) !important;
    font-weight: 600 !important;
    line-height: 1.38 !important;
    letter-spacing: -0.025em !important;
    white-space: normal !important;
  }
}
</style>
