<script setup lang="ts">
import CatalogueCurriculumStage from '~/components/catalogue/CatalogueCurriculumStage.vue';
import { useCurriculumR1 } from '~/composables/useCurriculumR1';
const operational=useCurriculumR1();
useSeoMeta({title:'교육과정 | SMD 아카데미'});
</script>
<template>
  <CatalogueCurriculumStage v-if="operational" :key="operational.publicationKey" :operational="operational" />
  <section v-else class="container-x min-h-screen pt-40 pb-20" role="status">
    <h1 class="font-heading text-2xl">교육과정의 발행 상태를 확인하고 있습니다.</h1>
  </section>
</template>
