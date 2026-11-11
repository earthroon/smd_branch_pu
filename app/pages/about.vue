<script setup lang="ts">
import CatalogueAboutStage from '~/components/catalogue/CatalogueAboutStage.vue';
import { useAboutR1 } from '~/composables/useAboutR1';
const operational = useAboutR1();
useSeoMeta({ title: '아카데미 소개 | SMD 아카데미' });
</script>
<template>
  <CatalogueAboutStage v-if="operational" :key="operational.publicationKey" :operational="operational" />
  <section v-else class="container-x min-h-screen pt-40 pb-20" role="status">
    <h1 class="font-heading text-2xl">소개 페이지의 발행 상태를 확인하고 있습니다.</h1>
  </section>
</template>
