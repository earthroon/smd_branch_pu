<script setup lang="ts">
import { homeFigmaText, type HomeFigmaTextKey } from '~/data/home-r2-copy';
import { homeR2VisualText } from '~/data/home-r2-visual-text';
import { homeVisibleBrandText } from '~/utils/homeBrandVisibleText';
import { isHomeSpecialEmphasisRun, presentHomeSpecialPointRuns } from '~/utils/homeSpecialPointPresentation';
const props = defineProps<{ textKey: HomeFigmaTextKey }>();
const text = computed(() => presentHomeSpecialPointRuns(props.textKey, homeR2VisualText[props.textKey].runs));
const source = computed(() => homeFigmaText[props.textKey]);
</script>
<template>
  <span class="smd-home-figma-text" :data-figma-text="textKey" :data-text-digest="source.textDigest">
    <span v-for="(run, index) in text" :key="index" :style="run.style"
      :data-special-emphasis="isHomeSpecialEmphasisRun(textKey, index) ? 'true' : undefined">{{ homeVisibleBrandText(textKey, run.characters) }}</span>
  </span>
</template>
