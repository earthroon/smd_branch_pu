<script setup lang="ts">
import {
  assertCatalogueR7SheetProps,
  type CatalogueR7SheetProps,
} from '~/data/catalogue-r7-sheet-plan';
import CatalogueSheetHeader from './CatalogueSheetHeader.vue';

const props = defineProps<CatalogueR7SheetProps>();
// Evaluated on both SSR and client render, including subsequent prop changes.
const admitted = computed(() => assertCatalogueR7SheetProps(props));
</script>

<template>
  <section v-if="admitted"
    :id="`catalogue-${pageId}-${sectionId}`"
    class="smd-r7-sheet"
    :data-catalogue-sheet="sectionId"
    :data-sheet-page="pageId"
    :data-sheet-ordinal="ordinal"
    :data-sheet-total="total"
    :data-sheet-fit="fit"
    :data-sheet-variant="variant"
    :aria-labelledby="headingId">
    <div class="smd-r7-sheet__frame">
      <header class="smd-r7-sheet__top">
        <slot name="header">
          <CatalogueSheetHeader :ordinal="ordinal" :total="total" :label="label" />
        </slot>
      </header>
      <div class="smd-r7-sheet__core">
        <slot />
      </div>
      <footer class="smd-r7-sheet__bottom" aria-label="카탈로그 지면 번호">
        <slot name="footer">
          <span>SMD ACADEMY</span>
          <span>{{ String(ordinal).padStart(2, '0') }} / {{ String(total).padStart(2, '0') }}</span>
        </slot>
      </footer>
    </div>
  </section>
</template>
