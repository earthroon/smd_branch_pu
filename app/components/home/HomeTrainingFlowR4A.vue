<script setup lang="ts">
import {homeFigmaText} from '~/data/home-r2-copy';
import {mobileTrainingR4A, assertMobileTrainingR4A} from '~/data/home-training-mobile-r4a';
assertMobileTrainingR4A();
const t=mobileTrainingR4A.timeline;
const src=(key: keyof typeof homeFigmaText) => homeFigmaText[key].characters;
</script>
<template>
  <section class="smd-training-flow-r4a" data-mobile-training-timeline="R4A"
    aria-label="정규 교육 시간표">
    <div class="smd-training-flow-r4a__grid">
      <div class="smd-training-flow-r4a__badge smd-training-flow-r4a__morning"
        data-mobile-r4a-step="morning" :data-source-node="t.morningLabel">
        {{ src(t.morningLabel) }}
      </div>
      <img class="smd-training-flow-r4a__arrow smd-training-flow-r4a__arrow-first"
        :src="mobileTrainingR4A.arrow.src" alt="" aria-hidden="true"
        data-mobile-r4a-arrow="first" data-source-node="node-1:501"
        width="24" height="44" decoding="async" />
      <div class="smd-training-flow-r4a__step" data-mobile-r4a-step="center"
        :data-source-node="t.centerWork">{{ src(t.centerWork) }}</div>
      <img class="smd-training-flow-r4a__arrow smd-training-flow-r4a__arrow-second"
        :src="mobileTrainingR4A.arrow.src" alt="" aria-hidden="true"
        data-mobile-r4a-arrow="second" data-source-node="node-1:555"
        width="24" height="44" decoding="async" />
      <div class="smd-training-flow-r4a__badge smd-training-flow-r4a__afternoon"
        data-mobile-r4a-step="afternoon" :data-source-node="t.afternoonLabel">
        {{ src(t.afternoonLabel) }}
      </div>
      <div class="smd-training-flow-r4a__bottom smd-training-flow-r4a__bottom-morning"
        data-mobile-r4a-step="morning-bottom" :data-source-node="t.morningBottom">
        {{ src(t.morningBottom) }}
      </div>
      <div class="smd-training-flow-r4a__bottom smd-training-flow-r4a__bottom-afternoon"
        data-mobile-r4a-step="afternoon-bottom" :data-source-node="t.afternoonBottom"
        :data-user-display-override="mobileTrainingR4A.authority"
        :data-source-text-digest="homeFigmaText[t.afternoonBottom].textDigest">
        <span class="smd-training-flow-r4a__afternoon-mobile-text">{{ t.afternoonDisplayText }}</span>
        <span class="smd-training-flow-r4a__afternoon-source-text">{{ src(t.afternoonBottom) }}</span>
      </div>
    </div>
  </section>
</template>
<style scoped>
.smd-training-flow-r4a {
  display: none;
  color: #fff;
  font-family: var(--font-ui), Pretendard, sans-serif;
}
/* Desktop source text is rendered only by the tablet owner; mobile approved override stays. */
.smd-training-flow-r4a__afternoon-source-text { display: none; }
@media (max-width: 699px) {
  .smd-training-flow-r4a {
    display: block;
    width: min(100%, 320px);
    max-width: 100%;
    margin: 28px auto 0;
  }
  .smd-training-flow-r4a__grid {
    display: grid;
    grid-template-columns: 58px minmax(0, 1fr) 66px minmax(0, 1fr) 58px;
    grid-template-rows: 58px 35px;
    column-gap: clamp(2px, 1.3vw, 6px);
    row-gap: 28px;
    place-items: center;
    min-width: 0;
  }
  .smd-training-flow-r4a__badge {
    position: relative;
    display: grid;
    place-items: center;
    width: 58px;
    height: 58px;
    background: #d95e22;
    border-radius: 999px;
    color: white;
    font-weight: 600;
    font-size: 18px;
    line-height: 1;
    white-space: nowrap;
  }
  .smd-training-flow-r4a__badge::after {
    content: '';
    position: absolute;
    left: 50%;
    top: 100%;
    width: 2px;
    height: 28px;
    transform: translateX(-50%);
    background: rgba(255,255,255,.9);
  }
  .smd-training-flow-r4a__morning { grid-column: 1; grid-row: 1; }
  .smd-training-flow-r4a__afternoon { grid-column: 5; grid-row: 1; }
  .smd-training-flow-r4a__arrow {
    display: block;
    width: 17px;
    height: 30px;
    max-width: 100%;
    object-fit: contain;
  }
  .smd-training-flow-r4a__arrow-first { grid-column: 2; grid-row: 1; }
  .smd-training-flow-r4a__arrow-second { grid-column: 4; grid-row: 1; }
  .smd-training-flow-r4a__step,
  .smd-training-flow-r4a__bottom {
    display: grid;
    place-items: center;
    min-width: 0;
    padding: 5px 4px;
    background: transparent;
    border: 2px solid #fff;
    border-radius: 6px;
    font-size: 12px;
    line-height: 1.3;
    font-weight: 600;
    color: #fff;
    white-space: nowrap;
  }
  .smd-training-flow-r4a__step { grid-column: 3; grid-row: 1; width: 64px; }
  .smd-training-flow-r4a__bottom { width: max-content; max-width: 82px; }
  .smd-training-flow-r4a__bottom-morning { grid-column: 1; grid-row: 2; }
  .smd-training-flow-r4a__bottom-afternoon { grid-column: 5; grid-row: 2; }
}
</style>
