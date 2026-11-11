<script setup lang="ts">
import {figmaScene} from '~/data/figma-r2-scene.generated';
import {r3MethodsTextOverride} from '~/data/figma-r2-visual-r3';
import {homeVisibleBrandText} from '~/utils/homeBrandVisibleText';
import {isHomeSpecialEmphasisRun, presentHomeSpecialPointRuns} from '~/utils/homeSpecialPointPresentation';
import {
  deriveFigmaTextPaintWindow, ZERO_FIGMA_TEXT_GROWTH,
  type FigmaTextPaintGrowth,
} from '~/utils/figma-native-text-paint';

const props = defineProps<{nodeKey:string; width:number;height:number}>();
const original = computed(() => figmaScene.texts[props.nodeKey]);
const visual = computed(() => r3MethodsTextOverride(props.nodeKey));
// Explicit presentation layer; original UTF-16 runs, digests and Scene geometry stay immutable.
const visibleRuns = computed(() => presentHomeSpecialPointRuns(props.nodeKey,
  (original.value?.runs ?? []).map(run => {
    const sized = visual.value ? {...run,style:{...run.style,
      fontSize:`${visual.value.fontSize}px`,letterSpacing:`${visual.value.letterSpacing}px`}} : run;
    const displayed = homeVisibleBrandText(props.nodeKey, run.characters);
    return displayed === run.characters ? sized : {...sized, characters: displayed};
  }),
));
const growth = ref<FigmaTextPaintGrowth>(ZERO_FIGMA_TEXT_GROWTH);
const paint = computed(() => deriveFigmaTextPaintWindow(
  props.width, props.height, visibleRuns.value, growth.value,
));
const foreign = ref<SVGForeignObjectElement | null>(null);
const runsRoot = ref<HTMLDivElement | null>(null);
const inkGate = ref<'UNMEASURED' | 'PASS' | 'WINDOW_EXCEEDED'>('UNMEASURED');
const fontGate = ref<'UNMEASURED' | 'PRETENDARD_LOADED' | 'PRETENDARD_MISSING'>('UNMEASURED');
const paintStyle = computed(() => ({
  width: `${props.width}px`, height: `${props.height}px`, margin: 0, padding: 0,
  position: 'relative' as const, left: `${paint.value.contentX}px`, top: `${paint.value.contentY}px`,
  display: 'flex', flexDirection: 'column' as const,
  alignItems: original.value?.layout.alignHorizontal === 'CENTER' ? 'center' :
    original.value?.layout.alignHorizontal === 'RIGHT' ? 'flex-end' : 'stretch',
  justifyContent: original.value?.layout.alignVertical === 'CENTER' ? 'center' :
    original.value?.layout.alignVertical === 'BOTTOM' ? 'flex-end' : 'flex-start',
  textAlign: (original.value?.layout.alignHorizontal === 'CENTER' ? 'center' :
    original.value?.layout.alignHorizontal === 'RIGHT' ? 'right' : 'left') as 'center'|'right'|'left',
  whiteSpace: 'pre-wrap' as const, wordBreak: 'keep-all' as const,
  overflowWrap: 'normal' as const, overflow: 'visible' as const,
  fontFamily: '"Pretendard Variable", Pretendard, sans-serif',
  opacity: original.value?.properties.opacity ?? 1,
}));

let nextFrame = 0;
function auditInk(): void {
  const fo = foreign.value;
  const root = runsRoot.value;
  if (!fo || !root || !original.value) return;
  const bounds = fo.getBoundingClientRect();
  const scaleX = bounds.width / paint.value.width;
  const scaleY = bounds.height / paint.value.height;
  if (scaleX <= 0 || scaleY <= 0) return;
  const textRects: DOMRect[] = [];
  root.querySelectorAll('span').forEach(span => {
    const range = document.createRange();
    range.selectNodeContents(span);
    textRects.push(...Array.from(range.getClientRects()));
    range.detach();
  });
  if (!textRects.length) return;
  const ink = {
    left: Math.min(...textRects.map(r => r.left)),
    right: Math.max(...textRects.map(r => r.right)),
    top: Math.min(...textRects.map(r => r.top)),
    bottom: Math.max(...textRects.map(r => r.bottom)),
  };
  const gap = 2;
  const delta = {
    left: Math.max(0, Math.ceil((bounds.left - ink.left + gap) / scaleX)),
    right: Math.max(0, Math.ceil((ink.right - bounds.right + gap) / scaleX)),
    top: Math.max(0, Math.ceil((bounds.top - ink.top + gap) / scaleY)),
    bottom: Math.max(0, Math.ceil((ink.bottom - bounds.bottom + gap) / scaleY)),
  };
  if (Object.values(delta).some(v => v > 0)) {
    const proposed = {
      left: growth.value.left + delta.left,
      right: growth.value.right + delta.right,
      top: growth.value.top + delta.top,
      bottom: growth.value.bottom + delta.bottom,
    };
    if (Object.values(proposed).some(v => v > 512)) {
      inkGate.value = 'WINDOW_EXCEEDED';
      return;
    }
    growth.value = proposed;
    nextTick(() => requestInkAudit());
    return;
  }
  inkGate.value = 'PASS';
}
function requestInkAudit(): void {
  if (!import.meta.client) return;
  cancelAnimationFrame(nextFrame);
  nextFrame = requestAnimationFrame(auditInk);
}
function checkPretendard(): void {
  fontGate.value = Array.from(document.fonts).some(font =>
    /Pretendard/i.test(font.family) && font.status === 'loaded') ?
    'PRETENDARD_LOADED' : 'PRETENDARD_MISSING';
}
onMounted(() => {
  requestInkAudit();
  void document.fonts.ready.then(() => {
    checkPretendard();
    requestInkAudit();
  });
  window.addEventListener('resize', requestInkAudit, {passive: true});
});
onUnmounted(() => {
  cancelAnimationFrame(nextFrame);
  window.removeEventListener('resize', requestInkAudit);
});
</script>
<template>
  <foreignObject v-if="original" ref="foreign" class="smd-figma-native-text-foreign"
    :x="paint.x" :y="paint.y" :width="paint.width" :height="paint.height"
    :data-figma-text-instance="nodeKey" :data-source-text-digest="original.digest"
    :data-source-rect="`${props.width}x${props.height}`"
    :data-paint-window="`${paint.x},${paint.y},${paint.width},${paint.height}`"
    :data-ink-gate="inkGate" :data-font-gate="fontGate"
    :data-user-visual-override="visual ? 'USER_REQUESTED_METHODS_TEXT_SCALE_R3' : undefined"
    :data-display-font-size="visual?.fontSize">
    <div xmlns="http://www.w3.org/1999/xhtml" :style="paintStyle" class="smd-figma-native-text">
      <div ref="runsRoot" class="smd-figma-native-text__runs"><span v-for="(run,i) in visibleRuns" :key="i"
        :data-utf16-start="run.start" :data-utf16-end="run.end" :style="run.style"
        :data-special-emphasis="isHomeSpecialEmphasisRun(nodeKey, i) ? 'true' : undefined">{{run.characters}}</span></div>
    </div>
  </foreignObject>
</template>
