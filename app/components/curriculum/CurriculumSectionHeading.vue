<script setup lang="ts">
import CurriculumSourceText from './CurriculumSourceText.vue';
import type { CurriculumTextId } from '~/data/curriculum-r1-types';
withDefaults(defineProps<{label:CurriculumTextId;title:CurriculumTextId;hero?:boolean}>(),{hero:false});
</script>
<template><div class="smd-curriculum__heading"><CurriculumSourceText :text-id="label" class="smd-curriculum__eyebrow" />
  <CurriculumSourceText :text-id="title" :as="hero?'h1':'h2'" class="smd-curriculum__title" /></div></template>
