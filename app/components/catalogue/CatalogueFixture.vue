<script setup lang="ts">
/** Deliberately NOT imported by any production page. Browser harness mounts this
 * component only inside a temporary, restored dev-only Home page.
 */
import { homeBodySections, homeMediaSlots, homeR2Source } from '~/data/home-r2-manifest';
import { homeCopyRefs, HOME_BODY_EXPECTED_IDS } from '~/data/home-r2-composition';
import { assertCatalogueR7HomePlan } from '~/data/catalogue-r7-sheet-plan';
import HomeFigmaText from '~/components/home/HomeFigmaText.vue';
import CatalogueSheet from './CatalogueSheet.vue';
import CatalogueHomeMedia from './CatalogueHomeMedia.vue';

assertCatalogueR7HomePlan(homeR2Source.sourceSnapshotDigest, homeBodySections, Object.keys(homeMediaSlots));
if (HOME_BODY_EXPECTED_IDS.length !== 9 ||
    HOME_BODY_EXPECTED_IDS.some((id, index) => id !== homeBodySections[index]?.id)) {
  throw new Error('R7_CF3_SHEET_PLAN_INVALID: Home composition');
}
const special = homeCopyRefs.specialStart;
const benefits = homeCopyRefs.benefits;
if (special.points.length !== 3 || benefits.cards.length !== 4 ||
    special.photo !== homeBodySections[2]?.mediaSlotRefs[0] ||
    benefits.cards.some((card, index) => card.slot !== homeBodySections[4]?.mediaSlotRefs[index])) {
  throw new Error('R7_CF3_SOURCE_SLOT_DRIFT: fixture copy/slot');
}
</script>

<template>
  <div class="smd-r7-proof" data-catalogue-proof="DEV_PREVIEW_ONLY">
    <h1 class="sr-only">SMD R7 카탈로그 지면 검증</h1>
    <CatalogueSheet page-id="home" section-id="special-start" :ordinal="3" :total="9"
      variant="spread" fit="viewport" label="SPECIAL START" heading-id="r7-special-heading">
      <div class="smd-r7-sheet__spread">
        <div class="smd-r7-spread__copy">
          <p class="smd-r7-proof__source-note">기존 Home / SPECIAL START</p>
          <h2 id="r7-special-heading" class="smd-r7-proof__heading smd-r7-type-section">
            <HomeFigmaText :text-key="special.title" />
          </h2>
          <ol class="smd-r7-spread__points">
            <li v-for="point in special.points" :key="point.numeral" class="smd-r7-spread__point">
              <span class="smd-r7-spread__number"><HomeFigmaText :text-key="point.numeral" /></span>
              <p class="smd-r7-proof__body"><HomeFigmaText :text-key="point.text" /></p>
            </li>
          </ol>
        </div>
        <div class="smd-r7-spread__photo">
          <CatalogueHomeMedia :slot-id="special.photo" />
        </div>
      </div>
    </CatalogueSheet>

    <CatalogueSheet page-id="home" section-id="benefits" :ordinal="5" :total="9"
      variant="quartet" fit="viewport" label="BENEFITS" heading-id="r7-benefits-heading">
      <div class="smd-r7-sheet__quartet">
        <div class="smd-r7-quartet__intro">
          <p class="smd-r7-proof__source-note">기존 Home / BENEFITS</p>
          <h2 id="r7-benefits-heading" class="smd-r7-proof__heading smd-r7-type-section">
            <HomeFigmaText :text-key="benefits.title" />
          </h2>
        </div>
        <div class="smd-r7-quartet__grid">
          <article v-for="card in benefits.cards" :key="card.slot" class="smd-r7-quartet__item"
            :data-catalogue-card-slot="card.slot">
            <CatalogueHomeMedia :slot-id="card.slot" />
            <div class="smd-r7-quartet__copy">
              <p class="smd-r7-quartet__number"><HomeFigmaText :text-key="card.numeral" /></p>
              <h3 class="smd-r7-quartet__title"><HomeFigmaText :text-key="card.title" /></h3>
              <p class="smd-r7-proof__body smd-r7-quartet__description">
                <HomeFigmaText :text-key="card.description" />
              </p>
            </div>
          </article>
        </div>
      </div>
    </CatalogueSheet>
  </div>
</template>
