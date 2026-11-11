<script setup lang="ts">
import HomeFigmaText from './HomeFigmaText.vue';
import {homeFigmaText} from '~/data/home-r2-copy';
import {mobileTrainingR2} from '~/data/home-training-mobile-r2';
if (homeFigmaText[mobileTrainingR2.timeline.secondWork].characters !== '밑작업') {
  throw new Error('SMD_MOBILE_TRAINING_SECOND_WORK_SOURCE_DRIFT');
}
</script>
<template>
  <section class="smd-training-timeline-r2" data-mobile-training-timeline="R2" aria-label="정규 교육 시간표">
    <ol class="smd-training-timeline-r2__sequence">
      <li class="smd-training-timeline-r2__step" data-mobile-timeline-step="morning"
        data-source-work="node-1:493">
        <span class="smd-training-timeline-r2__badge"><HomeFigmaText :text-key="mobileTrainingR2.timeline.morningLabel" /></span>
        <span class="smd-training-timeline-r2__work"><HomeFigmaText :text-key="mobileTrainingR2.timeline.morningWork" /></span>
      </li>
      <li class="smd-training-timeline-r2__connector" data-source-arrow="node-1:501" aria-hidden="true">
        <img :src="mobileTrainingR2.arrow.src" alt="" width="24" height="44" decoding="async" />
      </li>
      <li class="smd-training-timeline-r2__step" data-mobile-timeline-step="repeat"
        data-source-work="node-1:499">
        <span class="smd-training-timeline-r2__substep-mark" aria-hidden="true"></span>
        <span class="smd-training-timeline-r2__work"><HomeFigmaText :text-key="mobileTrainingR2.timeline.secondWork" /></span>
      </li>
      <li class="smd-training-timeline-r2__connector" data-source-arrow="node-1:555" aria-hidden="true">
        <img :src="mobileTrainingR2.arrow.src" alt="" width="24" height="44" decoding="async" />
      </li>
      <li class="smd-training-timeline-r2__step" data-mobile-timeline-step="afternoon"
        data-source-work="node-1:494">
        <span class="smd-training-timeline-r2__badge"><HomeFigmaText :text-key="mobileTrainingR2.timeline.afternoonLabel" /></span>
        <span class="smd-training-timeline-r2__work"><HomeFigmaText :text-key="mobileTrainingR2.timeline.afternoonWork" /></span>
      </li>
    </ol>
  </section>
</template>
<style scoped>
.smd-training-timeline-r2 { width: min(100%, 320px); margin-inline: auto; color: #fff; font-family: var(--font-ui), Pretendard, sans-serif; }
.smd-training-timeline-r2__sequence { display: flex; flex-direction: column; gap: 0; list-style: none; padding: 0; margin: 0; }
.smd-training-timeline-r2__step { display: grid; grid-template-columns: 64px minmax(0, 1fr); align-items: center; gap: 12px; min-width: 0; }
.smd-training-timeline-r2__badge {
  display: grid; place-items: center; width: 58px; height: 58px; border-radius: 50%;
  font-size: 18px; font-weight: 600; background: #d95e22; color: #fff;
}
.smd-training-timeline-r2__substep-mark { display: block; justify-self: center; width: 10px; height: 10px; border-radius: 50%; background: #fff; }
.smd-training-timeline-r2__work {
  display: grid; place-items: center; min-height: 48px; padding: 10px 12px;
  border: 2px solid #fff; border-radius: 8px; color: #fff; font-size: 16px; font-weight: 500;
  text-align: center; min-width: 0;
}
.smd-training-timeline-r2__connector { display: grid; place-items: center; height: 40px; width: 64px; }
.smd-training-timeline-r2__connector img {
  display: block; width: 23.5px; height: 44px;
  transform: rotate(90deg) scale(.62);
  transform-origin: 50% 50%; object-fit: contain;
}
.smd-training-timeline-r2 :deep(.smd-home-figma-text > span) {
  color: inherit !important; font-family: inherit !important; font-size: inherit !important;
  font-weight: inherit !important; line-height: 1.4 !important;
  letter-spacing: -0.02em !important; white-space: normal !important;
}
</style>
