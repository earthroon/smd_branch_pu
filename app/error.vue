<script setup lang="ts">
import {useSiteContent} from '~/composables/useSiteContent';
import {useContentMode} from '~/composables/useContentMode';
import type { NuxtError } from '#app';
import { clearError } from '#app';
import type { PublicContentV2 } from '@smd/content-contracts/contracts';
import SiteHeader from '~/components/feature/SiteHeader.vue';
import SiteFooter from '~/components/feature/SiteFooter.vue';

const props = defineProps<{ error: NuxtError }>();
const content = useSiteContent();
const effectiveStatus = ref(Number(props.error.statusCode) || 500);

// Error rendering is independent of NuxtPage. Resolve the SAME canonical public
// endpoint only for a 404 whose shell has not been hydrated by app.vue.
// No seed import and no production fixture fallback.
if (effectiveStatus.value === 404 && !content.value && useContentMode() === 'cms') {
  try {
    content.value = await $fetch<PublicContentV2>('/api/content');
  } catch (failure: unknown) {
    const upstream = Number((failure as { statusCode?: number })?.statusCode);
    effectiveStatus.value = Number.isInteger(upstream) && upstream >= 500 && upstream <= 599
      ? upstream : 503;
  }
}
if (import.meta.server) {
  const event = useRequestEvent();
  if (event) setResponseStatus(event, effectiveStatus.value);
}
const isNotFound = computed(() => effectiveStatus.value === 404);
const errorTitle = computed(() => isNotFound.value ? '페이지를 찾을 수 없습니다.' : '서비스를 불러오지 못했습니다.');
const errorDescription = computed(() => isNotFound.value
  ? '요청하신 페이지가 이동되었거나 주소가 변경되었을 수 있습니다. 홈으로 돌아가 다시 확인해 주세요.'
  : '잠시 후 다시 시도해 주세요. 문제가 계속되면 상담 문의를 이용해 주세요.');
useHead({ title: computed(() => `${errorTitle.value} | SMD 아카데미`) });
</script>

<template>
  <div class="flex min-h-screen flex-col bg-background-50">
    <SiteHeader />
    <main class="flex-1">
      <section class="flex min-h-[70vh] items-center pt-28 md:pt-36">
        <div class="container-x">
          <span class="eyebrow">{{ effectiveStatus }}</span>
          <h1 class="mt-5 font-heading text-3xl font-semibold tracking-tight text-foreground-950 md:text-5xl">{{ errorTitle }}</h1>
          <p class="mt-5 max-w-lg text-sm leading-relaxed text-foreground-600 md:text-base">{{ errorDescription }}</p>
          <div class="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4">
            <NuxtLink to="/" class="link-arrow" @click="clearError()">홈으로 가기 <i class="ri-arrow-right-line"></i></NuxtLink>
            <NuxtLink to="/contact" class="link-arrow" @click="clearError()">상담 문의하기 <i class="ri-arrow-right-line"></i></NuxtLink>
          </div>
        </div>
      </section>
    </main>
    <SiteFooter />
  </div>
</template>
