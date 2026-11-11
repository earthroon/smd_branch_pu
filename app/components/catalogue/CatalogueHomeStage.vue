<script setup lang="ts">
/** R7 Home visual owner. Existing Home sections/media/content remain canonical;
 * the old Figma and Semantic render paths are preserved behind the R7 route switch.
 */
import { computed, ref } from 'vue';
import HomeFigmaText from '~/components/home/HomeFigmaText.vue';
import HomeHeroFilm from '~/components/home/HomeHeroFilm.vue';
import CatalogueSheet from './CatalogueSheet.vue';
import CatalogueHomeMedia from './CatalogueHomeMedia.vue';
import { homeBodySections, homeMediaSlots, homeR2Source } from '~/data/home-r2-manifest';
import { homeCopyRefs } from '~/data/home-r2-composition';
import { assertCatalogueR7HomePlan } from '~/data/catalogue-r7-sheet-plan';
import { resolveHomeFaqRows } from '~/data/homeFaqApprovedCopy';
import { useHomeR2Published } from '~/composables/useHomeR2Published';
import { useSiteContent } from '~/composables/useSiteContent';
import { usePublicConsultationHref } from '~/composables/usePublicConsultationHref';
import { useContentMode } from '~/composables/useContentMode';
import { homeHeaderNavigationV2 } from '~/data/home-r2-navigation';
import type { HeroMediaStatus } from '~/utils/homeIntroMediaGate';

assertCatalogueR7HomePlan(homeR2Source.sourceSnapshotDigest, homeBodySections, Object.keys(homeMediaSlots));

const copy = homeCopyRefs;
const navigation = homeHeaderNavigationV2.items.slice(0, 4);
const standalone = useContentMode() === 'standalone';
const consultationHref = usePublicConsultationHref();
const content = useSiteContent();
const published = useHomeR2Published();
const mediaState = ref<HeroMediaStatus | null>(null);
const onHeroMedia = (status: HeroMediaStatus): void => { mediaState.value = status; };
const qa = computed(() => {
  const projection = published.value;
  switch (projection) {
    case null: return resolveHomeFaqRows([]);
    default: {
      const owner = content.value?.publication;
      switch (owner?.id === projection.publicationId && owner.digest === projection.publicationDigest) {
        case true: return resolveHomeFaqRows(projection.faq);
        default: throw new Error('R7_HOME_FAQ_PUBLICATION_STALE');
      }
    }
  }
});
</script>

<template>
  <div class="smd-r7-home" data-r7-home-owner="CATALOGUE_ACTIVE"
    :data-r7-hero-media="mediaState?.phase ?? 'loading'">
    <!-- 00: real reused HomeHeroCarousel, not a CSS background copy -->
    <section id="catalogue-home-hero" class="smd-r7-home__cover smd-home--hero"
      data-catalogue-hero="r7" data-home-section="hero" aria-labelledby="r7-cover-heading">
      <HomeHeroFilm @film-media-status="onHeroMedia" />
      <p v-if="mediaState?.phase === 'failed'" class="smd-r7-home__hero-fault" role="alert">
        메인 이미지를 불러오지 못했습니다.
      </p>
      <div class="smd-r7-home__cover-wash" aria-hidden="true" />
      <div class="smd-r7-home__frame smd-r7-home__cover-content">
        <div class="smd-r7-home__cover-copy">
          <p class="smd-r7-home__kicker">INTERIOR FILM / SMD ACADEMY</p>
          <h1 id="r7-cover-heading"><HomeFigmaText :text-key="copy.hero.heading" /></h1>
          <p class="smd-r7-home__cover-desc"><HomeFigmaText :text-key="copy.hero.introduction" /></p>
          <NuxtLink to="/curriculum" class="smd-r7-home__text-link">교육과정 보기 <span aria-hidden="true">↗</span></NuxtLink>
        </div>
        <div class="smd-r7-home__cover-foot" aria-hidden="true">
          <span>SMD ACADEMY / FIELD JOURNAL</span><span>SCROLL TO EXPLORE ↓</span>
        </div>
      </div>
    </section>

    <!-- 01: R6 INDEX composition + all four original Info Bar facts. -->
    <CatalogueSheet page-id="home" section-id="info-bar" :ordinal="2" :total="9"
      variant="technical" fit="viewport" label="INDEX / EDUCATION FACTS" heading-id="r7-home-index">
      <div class="smd-r7-home__index-grid">
        <div class="smd-r7-home__index-left">
          <p class="smd-r7-home__kicker">A CATALOGUE OF LEARNING</p>
          <h2 id="r7-home-index">교육의 흐름을<br /><span class="smd-r7-home__light">한 장씩.</span></h2>
          <div class="smd-r7-home__facts">
            <div v-for="(fact, i) in copy.infoBar" :key="fact.label" class="smd-r7-home__fact">
              <span class="smd-r7-home__fact-num">{{ String(i + 1).padStart(2, '0') }}</span>
              <p class="smd-r7-home__fact-label"><HomeFigmaText :text-key="fact.label" /></p>
              <strong><HomeFigmaText :text-key="fact.value" /></strong>
            </div>
          </div>
        </div>
        <nav class="smd-r7-home__index-links" aria-label="카테고리별 독립 페이지">
          <NuxtLink v-for="(item, i) in navigation" :key="item.id" :to="item.to">
            <span>{{ String(i + 1).padStart(2, '0') }}</span>
            <strong>{{ item.label }}</strong>
            <span aria-hidden="true">↗</span>
          </NuxtLink>
        </nav>
      </div>
    </CatalogueSheet>

    <!-- 02: CF3 verified spread, promoted into actual Home view. -->
    <CatalogueSheet page-id="home" section-id="special-start" :ordinal="3" :total="9"
      variant="spread" fit="viewport" label="SPECIAL START" heading-id="r7-home-special">
      <div class="smd-r7-sheet__spread">
        <div class="smd-r7-spread__copy">
          <p class="smd-r7-home__kicker">MATERIAL & PRACTICE</p>
          <h2 id="r7-home-special" class="smd-r7-proof__heading"><HomeFigmaText :text-key="copy.specialStart.title" /></h2>
          <ol class="smd-r7-spread__points">
            <li v-for="point in copy.specialStart.points" :key="point.numeral" class="smd-r7-spread__point">
              <span class="smd-r7-spread__number"><HomeFigmaText :text-key="point.numeral" /></span>
              <p class="smd-r7-proof__body"><HomeFigmaText :text-key="point.text" /></p>
            </li>
          </ol>
          <NuxtLink to="/about" class="smd-r7-home__text-link">아카데미 소개 <span aria-hidden="true">↗</span></NuxtLink>
        </div>
        <div class="smd-r7-spread__photo"><CatalogueHomeMedia :slot-id="copy.specialStart.photo" /></div>
      </div>
    </CatalogueSheet>

    <!-- 03: technical chapter, original 3 facts + 2 daily periods -->
    <CatalogueSheet page-id="home" section-id="training-track" :ordinal="4" :total="9"
      variant="technical" fit="viewport" label="TRAINING / PROCESS" heading-id="r7-home-training">
      <div class="smd-r7-home__training-grid">
        <div>
          <p class="smd-r7-home__kicker">THE PRACTICE SEQUENCE</p>
          <h2 id="r7-home-training"><HomeFigmaText :text-key="copy.training.title" /></h2>
          <p class="smd-r7-home__body"><HomeFigmaText :text-key="copy.training.description" /></p>
          <NuxtLink to="/curriculum" class="smd-r7-home__text-link">교육과정 보기 <span aria-hidden="true">↗</span></NuxtLink>
        </div>
        <div class="smd-r7-home__training-facts">
          <div v-for="(item, i) in copy.training.facts" :key="item.label" class="smd-r7-home__training-fact">
            <span>{{ String(i + 1).padStart(2, '0') }}</span>
            <div><p><HomeFigmaText :text-key="item.label" /></p><strong><HomeFigmaText :text-key="item.value" /></strong></div>
          </div>
          <div v-for="(part, i) in [copy.training.morning, copy.training.afternoon]" :key="part.label" class="smd-r7-home__training-fact smd-r7-home__training-period">
            <span>{{ i === 0 ? 'AM' : 'PM' }}</span>
            <div><strong><HomeFigmaText :text-key="part.label" /></strong><p><HomeFigmaText :text-key="part.work" /></p></div>
          </div>
        </div>
      </div>
    </CatalogueSheet>

    <!-- 04: CF3 quartet; no shadow CMS data or duplicate image owner. -->
    <CatalogueSheet page-id="home" section-id="benefits" :ordinal="5" :total="9"
      variant="quartet" fit="viewport" label="BENEFITS / FIELD NOTES" heading-id="r7-home-benefits">
      <div class="smd-r7-sheet__quartet">
        <div class="smd-r7-quartet__intro">
          <div><p class="smd-r7-home__kicker">FIELD NOTES</p>
            <h2 id="r7-home-benefits" class="smd-r7-proof__heading"><HomeFigmaText :text-key="copy.benefits.title" /></h2></div>
        </div>
        <div class="smd-r7-quartet__grid">
          <article v-for="card in copy.benefits.cards" :key="card.slot" class="smd-r7-quartet__item" :data-catalogue-card-slot="card.slot">
            <CatalogueHomeMedia :slot-id="card.slot" />
            <div class="smd-r7-quartet__copy">
              <span class="smd-r7-quartet__number"><HomeFigmaText :text-key="card.numeral" /></span>
              <h3 class="smd-r7-quartet__title"><HomeFigmaText :text-key="card.title" /></h3>
              <p class="smd-r7-quartet__description"><HomeFigmaText :text-key="card.description" /></p>
            </div>
          </article>
        </div>
      </div>
    </CatalogueSheet>

    <!-- 05: original Methods 3 slots, R6 photo+caption presentation -->
    <CatalogueSheet page-id="home" section-id="methods" :ordinal="6" :total="9"
      variant="triptych" fit="viewport" label="METHOD / LEARNING NOTES" heading-id="r7-home-methods">
      <div class="smd-r7-home__methods">
        <div><p class="smd-r7-home__kicker">THE PRACTICE METHOD</p>
          <h2 id="r7-home-methods"><HomeFigmaText :text-key="copy.methods.title" /></h2></div>
        <div class="smd-r7-home__method-grid">
          <article v-for="(card, i) in copy.methods.cards" :key="card.slot" class="smd-r7-home__method">
            <CatalogueHomeMedia :slot-id="card.slot" />
            <div class="smd-r7-home__method-info"><span>{{ String(i + 1).padStart(2, '0') }} / PRACTICE</span>
              <h3><HomeFigmaText :text-key="card.title" /></h3>
              <p><HomeFigmaText :text-key="card.description" /></p>
            </div>
          </article>
        </div>
      </div>
    </CatalogueSheet>

    <!-- 06: original Location facts. No invented map/address/photo. -->
    <CatalogueSheet page-id="home" section-id="location" :ordinal="7" :total="9"
      variant="spread" fit="viewport" label="SPACE / LOCATION" heading-id="r7-home-location">
      <div class="smd-r7-home__location">
        <div><p class="smd-r7-home__kicker">LEARNING SPACE</p>
          <h2 id="r7-home-location"><HomeFigmaText :text-key="copy.location.title" /></h2></div>
        <div class="smd-r7-home__location-detail">
          <p><HomeFigmaText :text-key="copy.location.description" /></p>
          <p><HomeFigmaText :text-key="copy.location.note" /></p>
          <NuxtLink class="smd-r7-home__text-link" to="/about">아카데미 소개 <span aria-hidden="true">↗</span></NuxtLink>
        </div>
      </div>
    </CatalogueSheet>

    <!-- 07: FAQ source authority stays CMS > approved local copy. -->
    <CatalogueSheet page-id="home" section-id="faq" :ordinal="8" :total="9"
      variant="faq" fit="viewport" label="FAQ / INFORMATION" heading-id="r7-home-faq">
      <div class="smd-r7-home__faq">
        <div><p class="smd-r7-home__kicker">QUESTIONS & ANSWERS</p>
          <h2 id="r7-home-faq"><HomeFigmaText :text-key="copy.faq.title" /></h2></div>
        <div class="smd-r7-home__faq-list">
          <details v-for="row in qa" :key="row.id" :data-qa-authority="row.authority">
            <summary><span>{{ row.question }}</span><span aria-hidden="true">＋</span></summary>
            <div class="smd-r7-home__faq-answer"><p v-for="(paragraph, i) in row.paragraphs" :key="i">{{ paragraph }}</p></div>
          </details>
        </div>
      </div>
    </CatalogueSheet>

    <!-- 08: closing page; CMS Kakao URL vs standalone /contact stays explicit. -->
    <CatalogueSheet page-id="home" section-id="consultation-cta" :ordinal="9" :total="9"
      variant="closing" fit="viewport" label="END / CONTACT" heading-id="r7-home-contact">
      <div class="smd-r7-home__closing">
        <div><p class="smd-r7-home__kicker">NEXT CHAPTER</p>
          <h2 id="r7-home-contact"><HomeFigmaText :text-key="copy.consultation.headline" /></h2></div>
        <div class="smd-r7-home__closing-actions">
          <NuxtLink v-if="standalone" to="/contact" class="smd-r7-home__text-link">
            <HomeFigmaText :text-key="copy.consultation.button" /><span aria-hidden="true">↗</span>
          </NuxtLink>
          <a v-else-if="consultationHref" :href="consultationHref" target="_blank" rel="noopener noreferrer" class="smd-r7-home__text-link">
            <HomeFigmaText :text-key="copy.consultation.button" /><span aria-hidden="true">↗</span>
          </a>
          <p v-else role="status">상담 연결을 사용할 수 없습니다.</p>
          <NuxtLink to="/curriculum">교육과정 확인 ↗</NuxtLink>
        </div>
      </div>
    </CatalogueSheet>
  </div>
</template>

<style src="~/assets/css/catalogue-r7-home.css"></style>
