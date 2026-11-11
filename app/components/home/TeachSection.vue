<script setup lang="ts">
import HomeTrainingFactIcon from './HomeTrainingFactIcon.vue';
import HomeTrainingFlowR4A from './HomeTrainingFlowR4A.vue';
import {mobileTrainingR4A, assertMobileTrainingR4A} from '~/data/home-training-mobile-r4a';
import HomeFigmaText from './HomeFigmaText.vue';
import {homeFigmaText} from '~/data/home-r2-copy';
import HomeFigmaLine from './HomeFigmaLine.vue';
import { homeCopyRefs } from '~/data/home-r2-composition';
const copy=homeCopyRefs.training;
assertMobileTrainingR4A();
const iconByLabel={
  'node-1:102':'duration',
  'node-1:479':'field',
  'node-1:484':'experience',
} as const;
</script>
<template>
  <section data-home-section="training-track" data-figma-node="node-1:93" class="smd-home-section smd-home--training-track">
    <div class="smd-home__container">
      <h2 class="text-center font-heading text-3xl font-semibold md:text-5xl"><HomeFigmaText :text-key="copy.title" /></h2>
      <p class="mx-auto mt-5 max-w-3xl text-center text-base leading-relaxed text-foreground-700 md:text-lg"><HomeFigmaText :text-key="copy.description" /></p>
      <div class="smd-home__training-facts" data-mobile-training-layout="three-facts-r3">
        <div v-for="fact in copy.facts" :key="fact.label" class="smd-home__training-fact smd-training-fact-r2__owner" :data-mobile-training-fact="fact.label">
          <div class="smd-training-fact-r2__optical-group">
            <HomeTrainingFactIcon :kind="iconByLabel[fact.label]" />
            <div class="smd-training-fact-r2__copy">
              <p class="text-sm text-foreground-600 smd-training-fact-r2__label"><HomeFigmaText :text-key="fact.label" /></p>
              <p class="smd-home__training-fact-value mt-2 whitespace-pre-line font-heading text-lg font-semibold smd-training-fact-r2__value">
                <template v-if="fact.label === mobileTrainingR4A.fieldLabelSource">
                  <span class="smd-training-field-mobile-r4a" :data-figma-text="fact.value"
                    :data-text-digest="homeFigmaText[mobileTrainingR4A.fieldValueSource].textDigest"
                    :data-user-display-override="mobileTrainingR4A.authority">{{ mobileTrainingR4A.fieldDisplayFirst }}<wbr /><span class="smd-training-nobreak-r4a">{{ mobileTrainingR4A.fieldDisplaySecond }}</span></span>
                  <span class="smd-training-field-original-r4a"><HomeFigmaText :text-key="fact.value" /></span>
                </template>
                <HomeFigmaText v-else :text-key="fact.value" />
              </p>
            </div>
          </div>
        </div>
</div>
      <div class="smd-home__training-tracks smd-home__training-tracks-original-r2">
        <div v-for="(part,index) in [copy.morning, copy.afternoon]" :key="part.label" class="smd-home__training-track">
          <h3 class="font-heading text-2xl font-semibold"><HomeFigmaText :text-key="part.label" /></h3>
          <HomeFigmaLine :line-key="index === 0 ? 'node-1:488' : 'node-1:496'" class="smd-home__track-line" />
          <p class="text-lg text-foreground-700"><HomeFigmaText :text-key="part.work" /></p>
        </div>
      </div>
      <HomeTrainingFlowR4A data-mobile-training-flow="r4a" />
    </div>
  </section>
</template>

<style scoped>
/* Group wrappers are paint/layout-transparent for existing Mobile and Desktop. */
.smd-training-fact-r2__optical-group,
.smd-training-fact-r2__copy { display: contents; }
/* Preserve the existing 768/1024px semantic flow; avoid black stroke on dark background. */
@media (min-width: 700px) and (max-width: 1099px) {
  .smd-home__training-tracks-original-r2 :deep(line) { stroke: #fff; }
}
@media (max-width: 699px) {
  .smd-home--training-track .smd-home__training-facts {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: clamp(6px, 1.8vw, 10px);
    align-items: stretch;
    margin-top: 18px;
  }
  .smd-home--training-track .smd-home__training-fact {
    display: flex; flex-direction: column; align-items: center; justify-content: flex-start;
    gap: 0; min-width: 0; min-height: 174px;
    padding: 14px 8px 16px; border-radius: 16px; background: #fff;
    color: #142b57; text-align: center;
  }
  .smd-home--training-track .smd-home__training-tracks-original-r2 { display: none; }
  .smd-training-fact-r2__label { margin: 9px 0 0; min-width: 0; }
  .smd-training-fact-r2__value { margin: 5px 0 0; min-width: 0; }
  .smd-training-fact-r2__label :deep(.smd-home-figma-text > span) {
    font-family: var(--font-ui), Pretendard, sans-serif !important;
    font-size: 13px !important; font-weight: 500 !important;
    line-height: 1.35 !important; letter-spacing: -0.02em !important;
    color: #142b57 !important; white-space: normal !important;
  }
  .smd-training-fact-r2__value :deep(.smd-home-figma-text > span) {
    font-family: var(--font-ui), Pretendard, sans-serif !important;
    font-size: clamp(14px, 3.8vw, 16px) !important; font-weight: 600 !important;
    line-height: 1.42 !important; letter-spacing: -0.03em !important;
    color: #142b57 !important; white-space: normal !important;
  }
}

/* R3: exactly three original factual cards; no derived fourth cell or mobile timeline. */
@media (max-width: 699px) {
  .smd-home--training-track .smd-home__training-fact {
    min-height: 0; padding: 12px 5px 14px; border-radius: 14px;
    display: flex; flex-direction: column; align-items: center; justify-content: flex-start;
    text-align: center; min-width: 0; height: 100%;
  }
  .smd-home--training-track .smd-training-fact-r2__label,
  .smd-home--training-track .smd-training-fact-r2__value {
    width: 100%; min-width: 0; white-space: normal; word-break: keep-all;
    overflow-wrap: anywhere; text-align: center;
  }
  .smd-home--training-track .smd-training-fact-r2__label :deep(.smd-home-figma-text > span) {
    font-size: 12px !important; line-height: 1.5 !important;
    white-space: normal !important; word-break: keep-all !important; overflow-wrap: anywhere !important;
  }
  .smd-home--training-track .smd-training-fact-r2__value :deep(.smd-home-figma-text > span) {
    font-size: clamp(13px, 3.45vw, 15px) !important;
    font-weight: 600 !important; line-height: 1.5 !important;
    white-space: normal !important; word-break: keep-all !important; overflow-wrap: anywhere !important;
  }
  .smd-home--training-track .smd-home__training-tracks-original-r2 { display: none; }
}
.smd-training-field-mobile-r4a { display: none; }
.smd-training-field-original-r4a { display: inline; }

/* R4A: user-approved mobile display changes. R3 3-col and tablet owner retained. */
@media (max-width: 699px) {
  .smd-training-field-mobile-r4a {
    display: inline; font-family: var(--font-ui), Pretendard, sans-serif;
    font-size: clamp(12px, 3.45vw, 15px); font-weight: 600; line-height: 1.35;
    letter-spacing: -0.035em; color: #142b57; white-space: normal;
    word-break: keep-all; overflow-wrap: normal;
  }
  .smd-training-field-mobile-r4a .smd-training-nobreak-r4a {
    display: inline-block; white-space: nowrap; word-break: normal;
  }
  .smd-training-field-original-r4a { display: none; }
  /* R4B_CARD_LABEL_VALUE_GAP_1_5X */
  /* R4C_CARD_LABEL_VALUE_COMPACT */
  /* TRAINING_CARD_PARENT_LINEBOX_R2: mobile parent P line-box matches existing approved Figma runs. */
  .smd-home--training-track .smd-home__training-fact .smd-training-fact-r2__label {
    font-size: 12px;
    line-height: 1.5;
  }
  .smd-home--training-track .smd-home__training-fact .smd-training-fact-r2__value {
    margin-top: 0;
    font-size: clamp(13px, 3.45vw, 15px);
    line-height: 1.5;
  }
  /* Optical sizes are node-specific; preserve asset path, color, and proportions. */
  .smd-home--training-track .smd-home__training-fact :deep(.smd-training-icon-r2) {
    width: 36px; height: 32.4px; min-width: 0;
  }
  .smd-home--training-track .smd-home__training-fact :deep(.smd-training-icon-r2--duration > img) {
    width: 27.6px; height: 27.6px;
  }
  .smd-home--training-track .smd-home__training-fact :deep(.smd-training-icon-r2--field > img) {
    width: 29.4px; height: 29.4px;
  }
  .smd-home--training-track .smd-home__training-fact :deep(.smd-training-icon-r2--experience > img) {
    width: 33px; height: auto;
  }
}
</style>


