<script setup lang="ts">
import CatalogueCover from '~/components/catalogue/CatalogueCover.vue';
import CatalogueSheet from '~/components/catalogue/CatalogueSheet.vue';
import ReviewsBodyStage from '~/components/reviews/ReviewsBodyStage.vue';
import { standaloneReviewsR1Source } from '~/data/reviews-r1-source';
import { reviewsVisualSourceLock } from '~/data/reviews-r1-manifest';
import { useContentMode } from '~/composables/useContentMode';
import type { ReviewFilterId } from '~/utils/reviews-contract';
import {
  admitReviewCategoryQuery, buildReviewProjectionV1, reviewFilterChangeIntent,
  reviewInitialInteractionState, reviewLoadMore, reviewRebaseInteraction,
  reviewVisibleItems, reviewNavigationCompletionIsCurrent,
  type ReviewInteractionState,
} from '~/utils/reviews-view';

const route = useRoute();
const standalone = useContentMode() === 'standalone';
const queryAdmission = computed(() => admitReviewCategoryQuery(route.query));

// SSR 400 is a real rejected HTTP route. Do not silently normalize an invalid filter.
if (standalone && import.meta.server) {
  const initial = admitReviewCategoryQuery(route.query);
  switch (initial.kind) {
    case 'rejected':
      throw createError({ statusCode: initial.statusCode, statusMessage: initial.code, fatal: true });
    case 'canonicalize':
      await navigateTo('/reviews', { replace: true, redirectCode: 308 });
      break;
    case 'admitted':
      break;
  }
}
if (standalone && import.meta.client) {
  watch(queryAdmission, state => {
    switch (state.kind) {
      case 'rejected':
        showError(createError({ statusCode: state.statusCode, statusMessage: state.code, fatal: true }));
        break;
      case 'canonicalize':
        void (async () => {
          try { await navigateTo('/reviews', { replace: true, redirectCode: 308 }); }
          catch (failure: unknown) {
            showError(createError({ statusCode: 503, statusMessage: 'SMD_REVIEWS_R1_QUERY_CANONICALIZATION_FAILED',
              data: { cause: failure instanceof Error ? failure.message : 'UNKNOWN' } }));
          }
        })();
        break;
      case 'admitted':
        break;
    }
  }, { immediate: true, flush: 'sync' });
}
const activeFilter = computed<ReviewFilterId>(() => {
  const admission = queryAdmission.value;
  switch (admission.kind) {
    case 'admitted': return admission.filter;
    case 'canonicalize': return admission.filter;
    case 'rejected': throw createError({ statusCode: 400, statusMessage: admission.code, fatal: true });
  }
});

const projection = computed(() => buildReviewProjectionV1(standaloneReviewsR1Source));
const interaction = ref<ReviewInteractionState>(reviewInitialInteractionState(projection.value.sourceDigest));
const currentInteraction = computed(() => reviewRebaseInteraction(interaction.value, projection.value.sourceDigest));
watch(() => projection.value.sourceDigest, digest => {
  interaction.value = reviewRebaseInteraction(interaction.value, digest);
}, { flush: 'sync' });
const visible = computed(() => reviewVisibleItems(projection.value, activeFilter.value, currentInteraction.value));

let latestNavigationEpoch = 0;
async function selectFilter(requested: ReviewFilterId): Promise<void> {
  const intent = reviewFilterChangeIntent(activeFilter.value, requested);
  switch (intent.kind) {
    case 'noop': return;
    case 'navigate': {
      const epoch = ++latestNavigationEpoch;
      try {
        await navigateTo({ path: '/reviews', query: intent.query });
        // A settled old intent must never drive local visible state.
        reviewNavigationCompletionIsCurrent(epoch, latestNavigationEpoch, intent.query, route.query);
      } catch (failure: unknown) {
        if (epoch !== latestNavigationEpoch) return;
        showError(createError({ statusCode: 503, statusMessage: 'SMD_REVIEWS_R1_NAVIGATION_FAILED',
          data: { cause: failure instanceof Error ? failure.message : 'UNKNOWN' } }));
      }
      return;
    }
  }
}
async function loadMore(): Promise<void> {
  if (!visible.value.hasMore) return;
  const wasFocused = import.meta.client && document.activeElement?.id === 'reviews-load-more';
  interaction.value = reviewLoadMore(currentInteraction.value, activeFilter.value, visible.value.total);
  if (wasFocused && !reviewVisibleItems(projection.value, activeFilter.value, interaction.value).hasMore) {
    await nextTick();
    document.getElementById('reviews-results')?.focus();
  }
}

useSeoMeta({ title: '수강후기 | SMD 아카데미', robots: 'noindex,follow' });
</script>

<template>
  <div class="smd-r7-route smd-r7-route--reviews" data-r7-route-owner="reviews" data-r7-hero="fullscreen">
    <CatalogueCover page-id="reviews" eyebrow="STORIES / REVIEWS" heading="수강후기"
      description="수강 경험을 담은 기록입니다." />
    <CatalogueSheet page-id="reviews" section-id="content" :ordinal="2" :total="2"
      variant="standard" fit="flow" label="STORIES / REVIEWS" heading-id="r7-reviews-content" >
      <div class="smd-r7-route__listing">
        <h2 id="r7-reviews-content">수강후기</h2>

  <ReviewsBodyStage v-if="standalone" :projection="projection" :active-filter="activeFilter"
    :interaction="currentInteraction" :source-lock-digest="reviewsVisualSourceLock.figmaSnapshotDigest"
    @change-filter="selectFilter" @load-more="loadMore" />
  <section v-else class="smd-scaffold-page" data-scaffold-route="/reviews" data-cms-scaffold-only="true"
    aria-labelledby="reviews-cms-title">
    <div class="smd-scaffold-page__body">
      <h1 id="reviews-cms-title">수강후기</h1>
      <p role="status">수강후기 콘텐츠 준비 중입니다.</p>
    </div>
  </section>

      </div>
    </CatalogueSheet>
  </div>
</template>
