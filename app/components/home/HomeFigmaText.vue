<script setup lang="ts">
import { homeFigmaText, type HomeFigmaTextKey } from '~/data/home-r2-copy';
import { homeR2VisualText } from '~/data/home-r2-visual-text';
import { homeVisibleBrandText } from '~/utils/homeBrandVisibleText';
import { HOME_FILM_INFO_NODE, homeVisibleFilmText } from '~/utils/homeFilmCopyPresentation';
import { isHomeSpecialEmphasisRun, presentHomeSpecialPointRuns } from '~/utils/homeSpecialPointPresentation';
import {homeBenefitsVisibleText} from '~/utils/homeBenefitsCopyPresentation';
const props = defineProps<{ textKey: HomeFigmaTextKey }>();
const text = computed(() => presentHomeSpecialPointRuns(props.textKey, homeR2VisualText[props.textKey].runs));
const source = computed(() => homeFigmaText[props.textKey]);
</script>
<template>
  <span class="smd-home-figma-text" :data-figma-text="textKey" :data-text-digest="source.textDigest">
    <span v-for="(run, index) in text" :key="index"
      :style="[run.style, textKey === HOME_FILM_INFO_NODE ? { whiteSpace: 'nowrap !important' } : undefined]"
      :data-special-emphasis="isHomeSpecialEmphasisRun(textKey, index) ? 'true' : undefined">
{{
  homeBenefitsVisibleText(
    textKey,
    homeVisibleFilmText(
      textKey,
      homeVisibleBrandText(textKey, run.characters)
    )
  )
}}
</span>
  </span>
</template>
