<script setup lang="ts">
import { homeFigmaText, type HomeFigmaTextKey } from '~/data/home-r2-copy';
import { homeR2VisualText } from '~/data/home-r2-visual-text';
import { homeVisibleBrandText } from '~/utils/homeBrandVisibleText';
<<<<<<< HEAD
=======
import { isHomeSpecialEmphasisRun, presentHomeSpecialPointRuns } from '~/utils/homeSpecialPointPresentation';
>>>>>>> dec113c (feat(home): add FAQ accordion and stabilize scroll animations)
const props = defineProps<{ textKey: HomeFigmaTextKey }>();
const text = computed(() => presentHomeSpecialPointRuns(props.textKey, homeR2VisualText[props.textKey].runs));
const source = computed(() => homeFigmaText[props.textKey]);
</script>
<template>
  <span class="smd-home-figma-text" :data-figma-text="textKey" :data-text-digest="source.textDigest">
<<<<<<< HEAD
    <span v-for="(run, index) in text.runs" :key="index" :style="run.style">{{ homeVisibleBrandText(textKey, run.characters) }}</span>
=======
    <span v-for="(run, index) in text" :key="index" :style="run.style"
      :data-special-emphasis="isHomeSpecialEmphasisRun(textKey, index) ? 'true' : undefined">{{ homeVisibleBrandText(textKey, run.characters) }}</span>
>>>>>>> dec113c (feat(home): add FAQ accordion and stabilize scroll animations)
  </span>
</template>
