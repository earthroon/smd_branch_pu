<script setup lang="ts">
import { ref, toRef } from 'vue';
import FigmaSceneSection from '~/components/figma/FigmaSceneSection.vue';
import HomeFaq from '~/components/home/HomeFaq.vue';
import { homeFaqSceneMinimums } from '~/utils/homeFaqLayout';
import { homeWideLayout } from '~/utils/homeWideLayout';
import { useHomeSpecialReveal } from '~/composables/useHomeSpecialReveal';
import { useHomeTrainingReveal } from '~/composables/useHomeTrainingReveal';
import { useHomeBenefitsReveal } from '~/composables/useHomeBenefitsReveal';
import { useHomeMethodsReveal } from '~/composables/useHomeMethodsReveal';
const props = defineProps<{ introCompleted: boolean }>();
const stage = ref<HTMLElement | null>(null);
const { phase, outcome, starts, skips, skipReason } = useHomeSpecialReveal(stage, toRef(props, 'introCompleted'));
const { phase: trainingPhase, outcome: trainingOutcome, prepared: trainingPrepared,
  starts: trainingStarts, skips: trainingSkips, skipReason: trainingSkipReason } =
  useHomeTrainingReveal(stage, phase, skipReason);
const { phase: benefitsPhase, outcome: benefitsOutcome, prepared: benefitsPrepared,
  starts: benefitsStarts, skips: benefitsSkips, skipReason: benefitsSkipReason } =
  useHomeBenefitsReveal(stage, trainingPhase, trainingSkipReason);
const { phase: methodsPhase, outcome: methodsOutcome, prepared: methodsPrepared,
  starts: methodsStarts, skips: methodsSkips, skipReason: methodsSkipReason } =
  useHomeMethodsReveal(stage, benefitsPhase, benefitsSkipReason);
</script>

<template>
  <!-- Body rows alone consume derived wide Y geometry. Intro, Header, Footer remain outside. -->
  <div ref="stage" class="smd-home-body-stage" data-home-body-layout="SMD_HOME_LAYOUT_R1_WIDE_Y"
    data-special-contract="SMD_HOME_SPECIAL_REVEAL_R1"
    :data-special-phase="phase" :data-special-outcome="outcome"
    :data-special-animation-starts="starts" :data-special-skips="skips"
    :data-special-skip-reason="skipReason || undefined"
    data-training-contract="SMD_HOME_TRAINING_REVEAL_R1"
    :data-training-phase="trainingPhase" :data-training-outcome="trainingOutcome"
    :data-training-prepared="trainingPrepared ? 'true' : 'false'"
    :data-training-animation-starts="trainingStarts" :data-training-skips="trainingSkips"
    :data-training-skip-reason="trainingSkipReason || undefined"
    data-benefits-contract="SMD_HOME_BENEFITS_REVEAL_R1"
    :data-benefits-phase="benefitsPhase" :data-benefits-outcome="benefitsOutcome"
    :data-benefits-prepared="benefitsPrepared ? 'true' : 'false'"
    :data-benefits-animation-starts="benefitsStarts" :data-benefits-skips="benefitsSkips"
    :data-benefits-skip-reason="benefitsSkipReason || undefined"
    data-methods-contract="SMD_HOME_METHODS_REVEAL_R1"
    :data-methods-phase="methodsPhase" :data-methods-outcome="methodsOutcome"
    :data-methods-prepared="methodsPrepared ? 'true' : 'false'"
    :data-methods-animation-starts="methodsStarts" :data-methods-skips="methodsSkips"
    :data-methods-skip-reason="methodsSkipReason || undefined">
    <div v-for="row in homeWideLayout" :key="row.id" class="smd-home-body-stage__row"
      :data-wide-section="row.id" :data-source-node="row.sourceNodeKey"
      :data-source-top="row.sourceTopY" :data-source-height="row.sourceHeight"
      :data-source-gap="row.sourceGapBefore" :data-wide-top="row.targetTopY"
      :data-wide-height="row.targetHeight" :data-wide-gap="row.targetGapBefore"
      :style="{ '--smd-wide-section-gap': row.gapCss, ...(row.id === 'faq' ? homeFaqSceneMinimums(row) : {}) }">
      <HomeFaq v-if="row.id === 'faq'" wide />
      <FigmaSceneSection v-else :section-id="row.id" />
    </div>
  </div>
</template>
