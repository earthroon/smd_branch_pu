<script setup lang="ts">
import AboutHero from './AboutHero.vue';
import AboutFacts from './AboutFacts.vue';
import AboutAudience from './AboutAudience.vue';
import AboutFieldExperience from './AboutFieldExperience.vue';
import AboutLearnByDoing from './AboutLearnByDoing.vue';
import AboutPracticeFeedback from './AboutPracticeFeedback.vue';
import AboutCareer from './AboutCareer.vue';
import AboutConsultationCta from './AboutConsultationCta.vue';
import AboutSourceShape from './AboutSourceShape.vue';
import CmsSlot from '~/components/cms/CmsSlot.vue';
import { aboutR1Source } from '~/data/about-r1-manifest';
import { assertAboutR1Source } from '~/utils/aboutR1Admission';
import type { AboutOperationalState } from '~/data/about-r1-types';
defineProps<{ operational: AboutOperationalState }>();
assertAboutR1Source();
const components = { hero: AboutHero, facts: AboutFacts, audience: AboutAudience,
  'field-experience': AboutFieldExperience, 'learn-by-doing': AboutLearnByDoing,
  'practice-feedback': AboutPracticeFeedback, career: AboutCareer } as const;
const tokens = { '--about-navy': 'var(--smd-brand-navy)', '--about-panel': 'var(--smd-surface-panel)',
  '--about-alternate': 'var(--smd-surface-alternate)', '--about-hero': aboutR1Source.tokens.hero,
  '--about-hero-opacity': aboutR1Source.tokens.heroOpacity };
</script>
<template>
  <div class="smd-about" :style="tokens" data-about-contract="SMD_ABOUT_BUILD_SOURCE_V1"
    data-content-authority="PSD_BUILD_SOURCE_V1" :data-psd-sha256="aboutR1Source.psdSha256"
    :data-frame-snapshot="aboutR1Source.frameSnapshotDigest" :data-operational-publication="operational.publicationKey">
    <template v-for="section in aboutR1Source.sections" :key="section.id">
      <div v-if="section.id === 'consultation-cta' && operational.beforeCta.length" class="smd-about__cms-insert" data-about-cms-anchor="beforeCta"><CmsSlot :nodes="operational.beforeCta" /></div>
      <section :id="'about-' + section.id" class="smd-about-section" :data-about-section="section.id" :data-source-node="section.nodeId">
        <div class="smd-about__artboard" :style="{ '--section-height': section.height }">
          <AboutSourceShape :section-id="section.id" />
          <AboutConsultationCta v-if="section.id === 'consultation-cta'" :href="operational.consultationUrl" />
          <component :is="components[section.id]" v-else />
        </div>
      </section>
      <div v-if="section.id === 'audience' && operational.afterAudience.length" class="smd-about__cms-insert" data-about-cms-anchor="afterPillars"><CmsSlot :nodes="operational.afterAudience" /></div>
    </template>
  </div>
</template>
<style src="~/assets/css/about-r1.css"></style>
