<script setup lang="ts">
import {useSiteContent} from '~/composables/useSiteContent';
import { publicExternalActionsAllowed } from '~/utils/publicExternalActionPolicy';
import { usePublicConsultationHref } from '~/composables/usePublicConsultationHref';
import { galleryNavigationPresentation } from '~/utils/gallery-presentation';
const c=useSiteContent();
const pages=computed(()=>c.value?.pages);
const content = useSiteContent();
const externalAllowed = computed(() => publicExternalActionsAllowed(content.value));
const consultationHref = usePublicConsultationHref();
const nav = computed(() => [
  ...(content.value?.navigation.leftNav ?? []),
  ...(content.value?.navigation.rightNav ?? []),
].map(galleryNavigationPresentation));
</script>

<template>
  <footer class="smd-site-footer border-t border-background-200 bg-background-100">
    <div v-if="content" class="container-x py-12 md:py-16">
      <div class="grid grid-cols-1 gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div class="flex items-center gap-2.5">
            <span class="grid h-9 w-9 place-items-center rounded-md bg-foreground-950 font-heading text-sm font-semibold text-background-50">S</span>
            <div class="leading-tight">
              <div class="font-heading text-base font-semibold text-foreground-950">{{ pages?.shared.footer.brandLabel }}</div>
              <div class="text-[11px] uppercase tracking-[0.22em] text-foreground-500">{{ pages?.shared.footer.brandSubline }}</div>
            </div>
          </div>
          <p class="mt-5 max-w-sm text-sm leading-relaxed text-foreground-600">
            {{ pages?.shared.footer.description }}
          </p>
        </div>

        <div>
          <div class="font-label text-[11px] uppercase tracking-[0.24em] text-foreground-500">{{ pages?.shared.footer.menuHeading }}</div>
          <ul class="mt-4 space-y-2.5">
            <li v-for="item in nav" :key="item.to">
              <NuxtLink :to="item.to" class="text-sm text-foreground-700 transition-colors hover:text-primary-600">{{ item.label }}</NuxtLink>
            </li>
          </ul>
        </div>

        <div>
          <div class="font-label text-[11px] uppercase tracking-[0.24em] text-foreground-500">{{ pages?.shared.footer.contactHeading }}</div>
          <div class="mt-4 font-heading text-xl font-semibold tracking-tight text-foreground-950">{{ content?.navigation.contactPhone }}</div>
          <div v-if="consultationHref || externalAllowed" class="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
            <a v-if="consultationHref"
              :href="consultationHref"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-1.5 text-foreground-700 transition-colors hover:text-primary-600"
            ><i class="ri-kakao-talk-fill text-base"></i>카카오톡 채널</a>
            <span v-if="consultationHref && externalAllowed" class="text-background-400">|</span>
            <a v-if="externalAllowed"
              :href="content?.navigation.instagramUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-1.5 text-foreground-700 transition-colors hover:text-primary-600"
            ><i class="ri-instagram-line text-base"></i>인스타그램</a>
            <span v-if="externalAllowed" class="text-background-400">|</span>
            <a v-if="externalAllowed"
              :href="content?.navigation.youtubeUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-1.5 text-foreground-700 transition-colors hover:text-primary-600"
            ><i class="ri-youtube-line text-base"></i>유튜브</a>
          </div>
          <p v-else class="mt-4 text-sm text-foreground-500" role="status">외부 채널 연결 준비 중입니다.</p>
          <NuxtLink to="/contact" class="btn-ghost mt-6">상담 문의 남기기</NuxtLink>
        </div>
      </div>

      <div class="mt-12 flex flex-col gap-3 border-t border-background-200 pt-6 text-xs text-foreground-500 sm:flex-row sm:items-center sm:justify-between">
        <span>{{ pages?.shared.footer.copyrightText }}</span>
        <span>{{ pages?.shared.footer.locationTagline }}</span>
      </div>
    </div>
    <div v-else class="container-x py-8"><p role="status">연락처 및 외부 채널 연결 준비 중입니다.</p></div>
  </footer>
</template>
