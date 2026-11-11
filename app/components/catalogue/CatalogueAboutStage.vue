<script setup lang="ts">
/** /about's real R7 catalogue render owner. Pinned PSD copy, media and CMS anchors are preserved. */
import { aboutSourceText } from '~/data/about-r1-copy.generated';
import { aboutR1Source } from '~/data/about-r1-manifest';
import type { AboutOperationalState } from '~/data/about-r1-types';
import CmsSlot from '~/components/cms/CmsSlot.vue';
import CatalogueCover from './CatalogueCover.vue';
import CatalogueSheet from './CatalogueSheet.vue';
import CatalogueSourceCopy from './CatalogueSourceCopy.vue';
import CatalogueSourceMedia from './CatalogueSourceMedia.vue';
const props=defineProps<{operational:AboutOperationalState}>();
const facts=[['19','20'],['26','27'],['29','30'],['31','32']] as const;
const audience=['39','41','43','45'] as const;
const steps=[['153','154','155'],['156','157','158'],['159','160','161'],['162','163','164'],['165','166','167']] as const;
const careers=[['128','127'],['130','129']] as const;
const sections=['hero','facts','audience','field-experience','learn-by-doing','practice-feedback','career','consultation-cta'];
if (aboutR1Source.sections.map(s=>s.id).join('|')!==sections.join('|'))
  throw new Error('R7_ABOUT_SECTION_SOURCE_DRIFT');
</script>
<template>
  <div class="smd-r7-route smd-r7-route--about" data-r7-route-owner="about"
    data-r7-hero="fullscreen" data-r7-catalogue="8-sheets"
    :data-operational-publication="props.operational.publicationKey">
    <CatalogueCover page-id="about" :eyebrow="aboutSourceText['13'].displayText"
      :heading="aboutSourceText['11'].displayText" :description="aboutSourceText['14'].displayText"
      href="/curriculum" link-label="교육과정 보기" />

    <CatalogueSheet page-id="about" section-id="facts" :ordinal="2" :total="8" variant="spread"
      fit="viewport" label="ABOUT / THE ACADEMY" heading-id="r7-about-facts">
      <div class="smd-r7-route__spread">
        <div class="smd-r7-route__copy">
          <p class="smd-r7-route__eyebrow">ABOUT / FIELD NOTES</p>
          <h2 id="r7-about-facts">SMD 아카데미</h2>
          <div class="smd-r7-route__mini-facts">
            <div v-for="(item,i) in facts" :key="item[0]" class="smd-r7-route__mini-fact">
              <span>{{String(i+1).padStart(2,'0')}}</span>
              <div><CatalogueSourceCopy page="about" :text-id="item[0]" as="h3" />
                <CatalogueSourceCopy page="about" :text-id="item[1]" /></div>
            </div>
          </div>
        </div>
        <CatalogueSourceMedia page="about" slot-id="about.hero.photo" />
      </div>
    </CatalogueSheet>

    <CatalogueSheet page-id="about" section-id="audience" :ordinal="3" :total="8" variant="spread"
      fit="viewport" label="ABOUT / AUDIENCE" heading-id="r7-about-audience">
      <div class="smd-r7-route__spread smd-r7-route__spread--flip">
        <CatalogueSourceMedia page="about" slot-id="about.audience.photo" />
        <div class="smd-r7-route__copy">
          <CatalogueSourceCopy page="about" text-id="35" as="span" class="smd-r7-route__eyebrow" />
          <CatalogueSourceCopy page="about" text-id="33" as="h2" id="r7-about-audience" />
          <CatalogueSourceCopy page="about" text-id="34" />
          <CatalogueSourceCopy page="about" text-id="36" />
          <div class="smd-r7-route__tags"><CatalogueSourceCopy v-for="id in audience" :key="id" page="about" :text-id="id" as="span" /></div>
        </div>
      </div>
    </CatalogueSheet>
    <div v-if="props.operational.afterAudience.length" class="smd-r7-route__cms-insert" data-about-cms-anchor="afterPillars">
      <CmsSlot :nodes="props.operational.afterAudience" />
    </div>

    <CatalogueSheet page-id="about" section-id="field-experience" :ordinal="4" :total="8"
      variant="spread" fit="viewport" label="ABOUT / FIELD EXPERIENCE" heading-id="r7-about-field">
      <div class="smd-r7-route__spread">
        <div class="smd-r7-route__copy">
          <CatalogueSourceCopy page="about" text-id="47" as="span" class="smd-r7-route__eyebrow" />
          <CatalogueSourceCopy page="about" text-id="46" as="h2" id="r7-about-field" />
          <CatalogueSourceCopy page="about" text-id="49" /><CatalogueSourceCopy page="about" text-id="50" />
        </div>
        <div class="smd-r7-route__media-pair">
          <CatalogueSourceMedia page="about" slot-id="about.field.01.photo" />
          <CatalogueSourceMedia page="about" slot-id="about.field.02.photo" />
        </div>
      </div>
    </CatalogueSheet>

    <CatalogueSheet page-id="about" section-id="learn-by-doing" :ordinal="5" :total="8"
      variant="spread" fit="viewport" label="ABOUT / LEARN BY DOING" heading-id="r7-about-learn">
      <div class="smd-r7-route__spread smd-r7-route__spread--flip">
        <div class="smd-r7-route__media-pair">
          <CatalogueSourceMedia page="about" slot-id="about.learn.01.photo" />
          <CatalogueSourceMedia page="about" slot-id="about.learn.02.photo" />
        </div>
        <div class="smd-r7-route__copy">
          <CatalogueSourceCopy page="about" text-id="57" as="span" class="smd-r7-route__eyebrow" />
          <CatalogueSourceCopy page="about" text-id="56" as="h2" id="r7-about-learn" />
          <CatalogueSourceCopy page="about" text-id="54" /><CatalogueSourceCopy page="about" text-id="55" />
          <div class="smd-r7-route__annotation"><CatalogueSourceCopy page="about" text-id="61" />
            <CatalogueSourceCopy page="about" text-id="62" /></div>
        </div>
      </div>
    </CatalogueSheet>

    <CatalogueSheet page-id="about" section-id="practice-feedback" :ordinal="6" :total="8"
      variant="standard" fit="flow" label="ABOUT / PRACTICE FEEDBACK" heading-id="r7-about-feedback">
      <div class="smd-r7-route__chapter-heading">
        <div><CatalogueSourceCopy page="about" text-id="71" as="span" class="smd-r7-route__eyebrow" />
          <CatalogueSourceCopy page="about" text-id="70" as="h2" id="r7-about-feedback" /></div>
        <div><CatalogueSourceCopy page="about" text-id="68" />
          <CatalogueSourceCopy page="about" text-id="69" /></div>
      </div>
      <ol class="smd-r7-route__steps">
        <li v-for="step in steps" :key="step[0]"><CatalogueSourceCopy page="about" :text-id="step[0]" as="span" />
          <CatalogueSourceCopy page="about" :text-id="step[1]" as="h3" />
          <CatalogueSourceCopy page="about" :text-id="step[2]" /></li>
      </ol>
      <div class="smd-r7-route__media-pair smd-r7-route__media-pair--horizontal">
        <CatalogueSourceMedia page="about" slot-id="about.practice.01.photo" />
        <CatalogueSourceMedia page="about" slot-id="about.practice.02.photo" />
      </div>
    </CatalogueSheet>

    <CatalogueSheet page-id="about" section-id="career" :ordinal="7" :total="8"
      variant="technical" fit="viewport" label="ABOUT / CAREER" heading-id="r7-about-career">
      <div class="smd-r7-route__chapter-heading">
        <div><CatalogueSourceCopy page="about" text-id="124" as="span" class="smd-r7-route__eyebrow" />
          <CatalogueSourceCopy page="about" text-id="123" as="h2" id="r7-about-career" />
          <CatalogueSourceCopy page="about" text-id="121" /><CatalogueSourceCopy page="about" text-id="122" /></div>
        <div class="smd-r7-route__rows"><div v-for="c in careers" :key="c[0]">
          <CatalogueSourceCopy page="about" :text-id="c[0]" as="h3" />
          <CatalogueSourceCopy page="about" :text-id="c[1]" /></div></div>
      </div>
    </CatalogueSheet>
    <div v-if="props.operational.beforeCta.length" class="smd-r7-route__cms-insert" data-about-cms-anchor="beforeCta">
      <CmsSlot :nodes="props.operational.beforeCta" />
    </div>
    <CatalogueSheet page-id="about" section-id="consultation-cta" :ordinal="8" :total="8"
      variant="closing" fit="viewport" label="ABOUT / NEXT" heading-id="r7-about-cta">
      <div class="smd-r7-route__close">
        <div><CatalogueSourceCopy page="about" text-id="132" as="h2" id="r7-about-cta" />
          <CatalogueSourceCopy page="about" text-id="134" /></div>
        <a v-if="props.operational.consultationUrl" :href="props.operational.consultationUrl" target="_blank"
          rel="noopener noreferrer" class="smd-r7-route__cta-link"><CatalogueSourceCopy page="about" text-id="137" as="span" /> ↗</a>
        <span v-else role="status">상담 연결 불가</span>
      </div>
    </CatalogueSheet>
  </div>
</template>
