<script setup lang="ts">
import { computed } from 'vue';
import { aboutSourceText } from '~/data/about-r1-copy.generated';
import { aboutR1Source } from '~/data/about-r1-manifest';
import type { AboutTextId } from '~/data/about-r1-types';
const props = withDefaults(defineProps<{ textId: AboutTextId; as?: 'p' | 'h1' | 'h2' | 'h3' | 'span' }>(), { as: 'p' });
const text = computed(() => aboutSourceText[props.textId]);
const style = computed(() => {
  const t = text.value, section = aboutR1Source.sections.find(s => s.id === t.sectionId)!;
  const m = aboutR1Source.webFontMetrics;
  const baselineOffset = (t.lineHeight + t.fontSize * (m.ascent - m.descent) / m.unitsPerEm) / 2;
  return { '--text-x': t.baselineOrigin[0], '--text-y': t.baselineOrigin[1] - baselineOffset - section.top, '--text-width': t.bbox[2] - t.bbox[0],
    '--text-size': t.fontSize, '--text-leading': t.lineHeight / t.fontSize,
    '--text-tracking': (t.letterSpacing / t.fontSize) + 'em' };
});
</script>
<template>
  <component :is="as" class="smd-about__text" :style="style" :data-about-text="textId"
    :data-source-layer="text.sourceLayerId" :data-source-text-digest="text.sourceTextDigest">
    <span v-for="(run, index) in text.runs" :key="index"
      :style="{ color: aboutR1Source.paintTokens[run.paintToken], fontWeight: run.fontWeight, opacity: run.opacity }">{{ run.text }}</span>
  </component>
</template>
