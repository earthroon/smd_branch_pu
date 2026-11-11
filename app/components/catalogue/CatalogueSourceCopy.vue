<script setup lang="ts">
/** Plain semantic rendering from pinned PSD displayText. Source digests stay immutable. */
import { computed } from 'vue';
import { aboutSourceText } from '~/data/about-r1-copy.generated';
import { curriculumSourceText } from '~/data/curriculum-r1-copy.generated';
import { curriculumR1Source } from '~/data/curriculum-r1-manifest';
const props = withDefaults(defineProps<{
  page: 'about' | 'curriculum';
  textId: string;
  as?: 'span'|'p'|'h1'|'h2'|'h3';
}>(), {as: 'p'});
type Entry = Readonly<{ displayText: string; sourceTextDigest: string }>;
const text = computed<Entry>(() => {
  const table = (props.page === 'about' ? aboutSourceText : curriculumSourceText) as unknown as Record<string, Entry>;
  const entry = table[props.textId];
  if (!entry) throw new Error(`R7_SOURCE_TEXT_UNAVAILABLE:${props.page}:${props.textId}`);
  return entry;
});
const shown = computed(() => {
  if (props.page === 'curriculum') {
    switch (props.textId) {
      case '19': return curriculumR1Source.displayOverrides['19'].text;
      case '398': return '복습 · 진로상담'; // existing approved CurriculumSourceText display override
      default: break;
    }
  }
  return text.value.displayText;
});
</script>
<template>
  <component :is="as" class="smd-r7-source-copy" :data-r7-text-id="textId"
    :data-r7-text-page="page" :data-source-text-digest="text.sourceTextDigest">{{ shown }}</component>
</template>
