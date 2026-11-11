<script setup lang="ts">
import { useContentMode } from '~/composables/useContentMode';
import { useSiteContent } from '~/composables/useSiteContent';
import { assertHomeBodyPlan } from '~/data/home-r2-composition';
import { examineHomeLegacySlots } from '~/utils/homeR2Admission';
import HomeBodyStage from '~/components/home/HomeBodyStage.vue';
import HomeIntroStage from '~/components/home/HomeIntroStage.vue';
import CatalogueHomeStage from '~/components/catalogue/CatalogueHomeStage.vue';
import {figmaScene} from '~/data/figma-r2-scene.generated';
import StatementSection from '~/components/home/StatementSection.vue';
import TeachSection from '~/components/home/TeachSection.vue';
import HomeBenefits from '~/components/home/HomeBenefits.vue';
import HomeMethods from '~/components/home/HomeMethods.vue';
import HomeLocation from '~/components/home/HomeLocation.vue';
import HomeFaq from '~/components/home/HomeFaq.vue';
import HomeConsultationCta from '~/components/home/HomeConsultationCta.vue';

assertHomeBodyPlan();
// The second scene arms only after the original Intro finishes normally.
const introCompleted = ref(false);
function onIntroCompleted(): void { introCompleted.value = true; }
const standalone = useContentMode() === 'standalone';
const catalogueEnabled = true;
const content = useSiteContent();
const legacyAdmission = computed(() => content.value ? examineHomeLegacySlots(content.value.pageSlots.home) : null);
// Historical CMS inserts are not silently dropped or assigned to arbitrary Figma sections.
const rejectLegacySlots = (status: typeof legacyAdmission.value) => {
  if (status?.kind !== 'conflict') return;
  const error = createError({ statusCode: 503, statusMessage: status.code, fatal: true });
  if (import.meta.server) throw error;
  showError(error);
};
rejectLegacySlots(legacyAdmission.value);
if (import.meta.client) watch(legacyAdmission, rejectLegacySlots, { flush: 'sync' });
useSeoMeta({ title: 'SMD 아카데미 | 인테리어필름 시공 실무 교육' });
</script>
<template>
  <!-- Exactly one visible paint owner per breakpoint. Desktop uses JSONL scene; tablet/mobile reflow keeps semantic DOM. -->
  <template v-if="standalone || legacyAdmission?.kind === 'empty'">
    <CatalogueHomeStage v-if="catalogueEnabled" />
    <template v-else>
    <div class="smd-home smd-home--figma-scene" data-home-layout-contract="SMD_FIGMA_SCENE_VR1"
      :data-figma-source-digest="figmaScene.sourceSnapshotDigest" data-original-render-qualification="BLOCKED">
      <HomeIntroStage variant="figma" @completed="onIntroCompleted" />
      <HomeBodyStage :intro-completed="introCompleted" />
    </div>
    <div class="smd-home smd-home--semantic-reflow" data-home-layout-contract="SMD_HOME_R2_RESPONSIVE_REFLOW_VR1">
      <HomeIntroStage variant="semantic" />
      <StatementSection />
      <TeachSection />
      <HomeBenefits />
      <HomeMethods />
      <HomeLocation />
      <HomeFaq />
      <HomeConsultationCta />
    </div>
    </template>
  </template>
</template>

<style src="~/assets/css/home-r2.css"></style>
<style src="~/assets/css/home-tablet-spacing.css"></style>
<style src="~/assets/css/figma-r2-scene.css"></style>
<style src="~/assets/css/figma-r2-r4.css"></style>

<style src="~/assets/css/home-r2-interaction.css"></style>
<style src="~/assets/css/home-body-compact.css"></style>
<style src="~/assets/css/home-info-compact.css"></style>

<style src="~/assets/css/home-special-reveal.css"></style>
<style src="~/assets/css/home-training-reveal.css"></style>
<style src="~/assets/css/home-benefits-reveal.css"></style>
<style src="~/assets/css/home-methods-reveal.css"></style>

<style src="~/assets/css/home-faq.css"></style>

<style src="~/assets/css/home-hero-film.css"></style>
