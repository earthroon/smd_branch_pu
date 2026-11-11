<script setup lang="ts">
/** Real /curriculum page owner. Source text/slots and CMS insertion positions stay canonical. */
import { curriculumSourceText } from '~/data/curriculum-r1-copy.generated';
import { curriculumR1Source } from '~/data/curriculum-r1-manifest';
import type { CurriculumOperationalState } from '~/data/curriculum-r1-types';
import CmsSlot from '~/components/cms/CmsSlot.vue';
import CatalogueCover from './CatalogueCover.vue';
import CatalogueSheet from './CatalogueSheet.vue';
import CatalogueSourceCopy from './CatalogueSourceCopy.vue';
import CatalogueSourceMedia from './CatalogueSourceMedia.vue';
import CatalogueWeekProgram from './CatalogueWeekProgram.vue';
const props=defineProps<{operational:CurriculumOperationalState}>();
const sections=['hero','facts','introduction','daily-flow','practical-training','six-week-program','course-information','consultation-cta'];
if (curriculumR1Source.sections.map(s=>s.id).join('|')!==sections.join('|'))
  throw new Error('R7_CURRICULUM_SECTION_SOURCE_DRIFT');
const facts=[['20','19','336'],['338','337','339'],['341','340','342'],['344','343','345']] as const;
const periods=[['352','354','355'],['358','357','356']] as const;
const practical=[
 {slot:'curriculum.practice.foundation',label:'363',title:'364',body:'365'},
 {slot:'curriculum.practice.finishing',label:'375',title:'376',body:'374'},
 {slot:'curriculum.practice.field',label:'379',title:'380',body:'378'},
 {slot:'curriculum.practice.next-step',label:'383',title:'384',body:'382'},
] as const;
const information=[['426','427',null],['428','429','452'],['453','454','455'],['443','444',null],['446','447',null],['449','450',null]] as const;
</script>
<template>
  <div class="smd-r7-route smd-r7-route--curriculum" data-r7-route-owner="curriculum"
    data-r7-hero="fullscreen" data-r7-catalogue="8-sheets"
    :data-operational-publication="props.operational.publicationKey">
    <CatalogueCover page-id="curriculum" :eyebrow="curriculumSourceText['13'].displayText"
      :heading="curriculumSourceText['11'].displayText" :description="curriculumSourceText['14'].displayText"
      href="/contact" link-label="상담신청" />

    <CatalogueSheet page-id="curriculum" section-id="facts" :ordinal="2" :total="8"
      variant="technical" fit="viewport" label="COURSE / AT A GLANCE" heading-id="r7-curriculum-facts">
      <div class="smd-r7-route__spread">
        <div class="smd-r7-route__copy">
          <p class="smd-r7-route__eyebrow">EDUCATION / AT A GLANCE</p>
          <h2 id="r7-curriculum-facts">교육과정 안내</h2>
          <div class="smd-r7-route__mini-facts">
            <div v-for="(item,i) in facts" :key="item[0]" class="smd-r7-route__mini-fact">
              <span>{{String(i+1).padStart(2,'0')}}</span><div>
                <CatalogueSourceCopy page="curriculum" :text-id="item[0]" as="h3" />
                <CatalogueSourceCopy page="curriculum" :text-id="item[1]" />
                <CatalogueSourceCopy page="curriculum" :text-id="item[2] ?? ''" /></div>
            </div>
          </div>
        </div>
        <CatalogueSourceMedia page="curriculum" slot-id="curriculum.hero.photo" />
      </div>
    </CatalogueSheet>

    <CatalogueSheet page-id="curriculum" section-id="introduction" :ordinal="3" :total="8"
      variant="standard" fit="viewport" label="COURSE / INTRODUCTION" heading-id="r7-curriculum-introduction">
      <div class="smd-r7-route__editorial">
        <CatalogueSourceCopy page="curriculum" text-id="33" as="h2" id="r7-curriculum-introduction" />
        <div class="smd-r7-route__editorial-text">
          <CatalogueSourceCopy page="curriculum" text-id="34" />
          <CatalogueSourceCopy page="curriculum" text-id="347" />
          <CatalogueSourceCopy page="curriculum" text-id="348" />
        </div>
      </div>
    </CatalogueSheet>

    <CatalogueSheet page-id="curriculum" section-id="daily-flow" :ordinal="4" :total="8"
      variant="technical" fit="viewport" label="COURSE / DAILY FLOW" heading-id="r7-curriculum-daily">
      <div class="smd-r7-route__editorial">
        <CatalogueSourceCopy page="curriculum" text-id="349" as="h2" id="r7-curriculum-daily" />
        <div class="smd-r7-route__rows">
          <div v-for="(item,i) in periods" :key="item[0]">
            <span class="smd-r7-route__index">{{i === 0 ? 'AM' : 'PM'}}</span><div>
              <CatalogueSourceCopy page="curriculum" :text-id="item[0]" as="h3" />
              <CatalogueSourceCopy page="curriculum" :text-id="item[1]" as="h3" />
              <CatalogueSourceCopy page="curriculum" :text-id="item[2] ?? ''" /></div>
          </div>
        </div>
      </div>
    </CatalogueSheet>

    <CatalogueSheet page-id="curriculum" section-id="practical-training" :ordinal="5" :total="8"
      variant="quartet" fit="viewport" label="COURSE / FIELD PRACTICE" heading-id="r7-curriculum-practice">
      <div class="smd-r7-route__practice">
        <CatalogueSourceCopy page="curriculum" text-id="46" as="h2" id="r7-curriculum-practice" />
        <div class="smd-r7-route__practice-grid">
          <article v-for="card in practical" :key="card.slot">
            <CatalogueSourceMedia page="curriculum" :slot-id="card.slot" />
            <CatalogueSourceCopy page="curriculum" :text-id="card.label" as="span" />
            <CatalogueSourceCopy page="curriculum" :text-id="card.title" as="h3" />
            <CatalogueSourceCopy page="curriculum" :text-id="card.body" />
          </article>
        </div>
      </div>
    </CatalogueSheet>
    <div v-if="props.operational.afterTeach.length" class="smd-r7-route__cms-insert" data-curriculum-cms-anchor="afterTeach">
      <CmsSlot :nodes="props.operational.afterTeach" />
    </div>

    <CatalogueSheet page-id="curriculum" section-id="six-week-program" :ordinal="6" :total="8"
      variant="technical" fit="viewport" label="COURSE / SIX WEEKS" heading-id="r7-curriculum-weeks">
      <div class="smd-r7-route__week-layout">
        <CatalogueSourceCopy page="curriculum" text-id="386" as="h2" id="r7-curriculum-weeks" />
        <CatalogueWeekProgram :program="props.operational.weekProgram" />
      </div>
    </CatalogueSheet>
    <div v-if="props.operational.afterLearningPath.length" class="smd-r7-route__cms-insert" data-curriculum-cms-anchor="afterLearningPath">
      <CmsSlot :nodes="props.operational.afterLearningPath" />
    </div>

    <CatalogueSheet page-id="curriculum" section-id="course-information" :ordinal="7" :total="8"
      variant="technical" fit="flow" label="COURSE / INFORMATION" heading-id="r7-curriculum-info">
      <div class="smd-r7-route__chapter-heading">
        <div><CatalogueSourceCopy page="curriculum" text-id="415" as="h2" id="r7-curriculum-info" />
          <CatalogueSourceCopy page="curriculum" text-id="418" />
          <CatalogueSourceCopy page="curriculum" text-id="423" /></div>
        <div class="smd-r7-route__rows">
          <div v-for="item in information" :key="item[0]">
            <CatalogueSourceCopy page="curriculum" :text-id="item[0]" as="span" />
            <div><CatalogueSourceCopy page="curriculum" :text-id="item[1]" as="h3" />
            <CatalogueSourceCopy v-if="item[2]" page="curriculum" :text-id="item[2] ?? ''" /></div>
          </div>
        </div>
      </div>
    </CatalogueSheet>
    <div v-if="props.operational.beforeCta.length" class="smd-r7-route__cms-insert" data-curriculum-cms-anchor="beforeCta">
      <CmsSlot :nodes="props.operational.beforeCta" />
    </div>
    <CatalogueSheet page-id="curriculum" section-id="consultation-cta" :ordinal="8" :total="8"
      variant="closing" fit="viewport" label="COURSE / NEXT" heading-id="r7-curriculum-cta">
      <div class="smd-r7-route__close"><div>
        <CatalogueSourceCopy page="curriculum" text-id="132" as="h2" id="r7-curriculum-cta" />
        <CatalogueSourceCopy page="curriculum" text-id="134" /></div>
        <a v-if="props.operational.consultationUrl" :href="props.operational.consultationUrl" target="_blank"
          rel="noopener noreferrer" class="smd-r7-route__cta-link"><CatalogueSourceCopy page="curriculum" text-id="137" as="span" /> ↗</a>
        <span v-else role="status">상담 연결 불가</span>
      </div>
    </CatalogueSheet>
  </div>
</template>
