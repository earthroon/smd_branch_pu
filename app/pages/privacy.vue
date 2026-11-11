<script setup lang="ts">
import { useContentMode } from '~/composables/useContentMode';
const standalone = useContentMode() === 'standalone';
useSeoMeta({title:'개인정보 처리 안내 | SMD 아카데미',robots:'noindex,nofollow'});
</script>
<template><section class="container-x min-h-[70vh] pt-36 pb-20"><h1 class="font-heading text-3xl">개인정보 처리 안내</h1><p v-if="standalone" class="mt-6 max-w-2xl leading-relaxed text-foreground-700">Standalone 상담 접수 입력 항목은 이름, 연락처, 수강 목적(선택), 교육 희망 일정(선택), 문의 내용(선택)입니다. 상담 신청 확인 및 후속 연락 목적으로 사용합니다.</p><p v-else class="mt-6 max-w-2xl leading-relaxed text-foreground-700">상담 접수에 필요한 항목은 이름, 연락처, 이메일, 관심 과정과 문의 내용입니다. 목적은 상담 신청 확인 및 후속 연락입니다.</p><p class="mt-4 max-w-2xl leading-relaxed text-foreground-700">보유 기간, 관리자 연락처, 삭제 요청 절차와 운영 정책은 실제 서비스 개시 전에 확정·게시해야 합니다. 현재 이 페이지는 운영 승인 전 초안이며 법적 완결성을 주장하지 않습니다.</p><NuxtLink to="/contact" class="btn-ghost mt-8">문의 페이지로 돌아가기</NuxtLink></section></template>
