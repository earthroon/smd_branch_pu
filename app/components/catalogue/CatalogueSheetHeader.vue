<script setup lang="ts">
const props = defineProps<{
  ordinal: number;
  total: number;
  label: string;
}>();
const pageNumber = computed(() => `${String(props.ordinal).padStart(2, '0')} / ${String(props.total).padStart(2, '0')}`);
</script>
<template>
  <div class="smd-r7-sheet-header" data-content-authority="PRESENTATION_ONLY">
    <div class="smd-r7-sheet-header__chapter">
      <span class="smd-r7-sheet-header__index">{{ pageNumber }}</span>
      <span class="smd-r7-sheet-header__label">{{ label }}</span>
    </div>
    <span class="smd-r7-sheet-header__issue">SMD ACADEMY / CATALOGUE</span>
  </div>
</template>
