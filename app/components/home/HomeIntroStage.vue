<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue';
import FigmaSceneSection from '~/components/figma/FigmaSceneSection.vue';
import HeroSection from '~/components/home/HeroSection.vue';
import HomeInfoBar from '~/components/home/HomeInfoBar.vue';
import { useHomeIntroReveal } from '~/composables/useHomeIntroReveal';
import { figmaScene } from '~/data/figma-r2-scene.generated';
import { homeInfoLayout } from '~/utils/homeInfoLayout';
import { planIntroViewportHeight, titleSafeOverlay, type TitleSafetyRect } from '~/utils/homeIntroViewportGeometry';
import { planIntroTitleSafeMinimumHeight } from '~/utils/homeIntroTitleSafeHeight';
import { canPresentIntro, INTRO_MEDIA_TIMEOUT_MS, type HeroMediaStatus } from '~/utils/homeIntroMediaGate';
import {
  planIntroOverlay, type FilmPaintGeometry, type IntroOverlayPlacement, type IntroVariant,
} from '~/utils/homeIntroOverlayGeometry';

const props = withDefaults(defineProps<{variant?:IntroVariant}>(),{variant:'figma'});
const emit = defineEmits<{completed: []}>();
const root=ref<HTMLElement|null>(null);
const paintFrame=ref<HTMLElement|null>(null);
const overlay=ref<HTMLElement|null>(null);
const filmGeometry=ref<FilmPaintGeometry|null>(null);
const placement=ref<IntroOverlayPlacement|null>(null);
const viewportPaintHeight=ref<number|null>(null);
// The viewport is a minimum. A short viewport may need extra vertical space
// for the original title and the bottom-anchored Intro Info Bar to coexist.
const titleSafeMinimumHeight=ref(0);
const effectivePaintHeight=computed<number|null>(()=>viewportPaintHeight.value===null?null:
 Math.max(viewportPaintHeight.value,titleSafeMinimumHeight.value));

const paintFrameStyle = computed<Record<string, string>>(() => ({
  height: effectivePaintHeight.value === null
    ? '100svh'
    : `${effectivePaintHeight.value}px`,
}));

const titleSafetyOverlap=ref(0);
const viewportFault=ref<string|null>(null);
const placementReady=computed(()=>placement.value?.kind==='admitted');
const heroMedia=ref<HeroMediaStatus|null>(null);
const fontsReady=ref(false);
const introLoadState=ref<'loading'|'ready'|'failed'>('loading');
const introLoadFault=ref<string|null>(null);
const introInteractionReady=computed(()=>introLoadState.value==='ready'&&placementReady.value);
const introGateOwnerId=useId();
const introRoute='vue-overlay' as const;
const {phase,admitted,admissionReason,releaseReason,ignoredWheelEvents,animationStarts,
 visualState,firstIntent,presentation,requestBufferedIntent}=useHomeIntroReveal(root,introRoute,introInteractionReady);
let mounted=false,resizeObserver:ResizeObserver|null=null;
let geometryEpoch=0, scheduled=false, lastGeneration=-1;
let titleSafeGrowAttempts=0;
let completionEmitted=false;
let introLoadRaf:number|null=null, introLoadWatchdog:number|null=null;
let introGateLocked=false, bufferedIntent:'wheel'|'keyboard'|'native-scroll'|null=null;
let fingerY:number|null=null, stableFrameCount=0, lastLayoutStamp='';

/** Loading gate only owns the initially visible Intro; the hidden responsive twin stays inert. */
function introGateVisible():boolean {
 const el=root.value;
 if(!el||!el.isConnected||document.hidden||!el.getClientRects().length)return false;
 const bounds=el.getBoundingClientRect();
 return bounds.width>0&&bounds.height>0&&getComputedStyle(el).display!=='none';
}
function captureBufferedIntent(source:'wheel'|'keyboard'|'native-scroll'):void {
 if(bufferedIntent===null)bufferedIntent=source;
}
function onGateWheel(event:WheelEvent):void {
 if(event.ctrlKey)return;
 if(event.cancelable)event.preventDefault();
 event.stopImmediatePropagation();
 if(event.deltaY>0&&Math.abs(event.deltaY)>=Math.abs(event.deltaX)&&
    !(event.target instanceof Element&&event.target.closest('input,textarea,select,[contenteditable],button,a'))){
  captureBufferedIntent('wheel');
 }
}
function onGateKey(event:KeyboardEvent):void {
 if(event.altKey||event.ctrlKey||event.metaKey||
    (event.target instanceof Element&&event.target.closest('input,textarea,select,[contenteditable],button,a')))return;
 switch(event.key){
  case 'ArrowDown':case 'PageDown':case ' ':case 'ArrowUp':case 'PageUp':case 'Home':case 'End':
   if(event.cancelable)event.preventDefault();
   event.stopImmediatePropagation();
   if(['ArrowDown','PageDown',' '].includes(event.key))captureBufferedIntent('keyboard');
   break;
 }
}
function onGateTouchStart(event:TouchEvent):void {
 fingerY=event.touches.length===1?event.touches[0]!.clientY:null;
}
function onGateTouchMove(event:TouchEvent):void {
 if(event.touches.length===1&&fingerY!==null&&fingerY-event.touches[0]!.clientY>10)
  captureBufferedIntent('native-scroll');
 if(event.cancelable)event.preventDefault();
 event.stopImmediatePropagation();
}
function releaseIntroScrollLock():void {
 if(!introGateLocked)return;
 introGateLocked=false;
 window.removeEventListener('wheel',onGateWheel,true);
 window.removeEventListener('keydown',onGateKey,true);
 window.removeEventListener('touchstart',onGateTouchStart,true);
 window.removeEventListener('touchmove',onGateTouchMove,true);
 if(document.documentElement.dataset.smdIntroLoadLockOwner===introGateOwnerId)
  delete document.documentElement.dataset.smdIntroLoadLockOwner;
 fingerY=null;
}
function acquireIntroScrollLock():void {
 if(introGateLocked)return;
 const html=document.documentElement;
 if(html.dataset.smdIntroLoadLockOwner&&html.dataset.smdIntroLoadLockOwner!==introGateOwnerId)return;
 html.dataset.smdIntroLoadLockOwner=introGateOwnerId;
 window.addEventListener('wheel',onGateWheel,{capture:true,passive:false});
 window.addEventListener('keydown',onGateKey,true);
 window.addEventListener('touchstart',onGateTouchStart,{capture:true,passive:true});
 window.addEventListener('touchmove',onGateTouchMove,{capture:true,passive:false});
 introGateLocked=true;
}
function emitIntroCompleted():void {
 if(completionEmitted)return;
 completionEmitted=true;
 emit('completed');
}
function failIntroLoading(reason:string):void {
 if(introLoadState.value==='failed')return;
 introLoadState.value='failed';introLoadFault.value=reason;
 console.error('INTRO_R1F_LOAD_GATE_FAILED',reason);
 releaseIntroScrollLock();
 if(introLoadRaf!==null)cancelAnimationFrame(introLoadRaf);
 introLoadRaf=null;
 if(introLoadWatchdog!==null)clearTimeout(introLoadWatchdog);
 introLoadWatchdog=null;
 // Failure is explicit; downstream body must not remain forever unarmed.
 emitIntroCompleted();
}
function introLayoutStamp():string|null {
 if(!paintFrame.value||!overlay.value||placement.value?.kind!=='admitted'||!filmGeometry.value)return null;
 const frame=paintFrame.value.getBoundingClientRect();
 const film=filmGeometry.value;
 if(Math.abs(film.viewportRectCss.width-frame.width)>1||
    Math.abs(film.viewportRectCss.height-frame.height)>1)return null;
 const plan=placement.value;
 const svg=overlay.value.querySelector<SVGSVGElement>('.smd-figma-scene-section--info-bar > svg');
 const content=props.variant==='figma'?svg:overlay.value.querySelector<HTMLElement>('.smd-home--info-bar');
 if(!content)return null;
 const contentRect=content.getBoundingClientRect();
 const values=[frame.left,frame.top,frame.width,frame.height,
  contentRect.width,contentRect.height,plan.topCssPx,plan.heightCssPx];
 if(!values.every(Number.isFinite))return null;
 return values.map(v=>Math.round(v*4)/4).join('|');
}
function probeIntroStability():void {
 introLoadRaf=null;
 if(!mounted||introLoadState.value!=='loading'||!introGateVisible())return;
 if(!placementReady.value||!fontsReady.value||heroMedia.value?.phase!=='ready'){
  stableFrameCount=0;lastLayoutStamp='';return;
 }
 const sample=introLayoutStamp();
 if(sample===null){stableFrameCount=0;lastLayoutStamp='';return;}
 stableFrameCount=sample===lastLayoutStamp?stableFrameCount+1:1;
 lastLayoutStamp=sample;
 if(canPresentIntro(heroMedia.value,placementReady.value,fontsReady.value,stableFrameCount)){
  introLoadState.value='ready';
  return;
 }
 introLoadRaf=requestAnimationFrame(probeIntroStability);
}
function scheduleIntroStability():void {
 if(introLoadState.value!=='loading'||!mounted||!introGateVisible()||
    !placementReady.value||!fontsReady.value||heroMedia.value?.phase!=='ready')return;
 if(introLoadRaf===null)introLoadRaf=requestAnimationFrame(probeIntroStability);
}
function syncIntroGate():void {
 if(!mounted)return;
 if(!introGateVisible()||window.scrollY>2||introLoadState.value==='failed'){
  releaseIntroScrollLock();
  if(introLoadWatchdog!==null)clearTimeout(introLoadWatchdog);
  introLoadWatchdog=null;return;
 }
 if(introLoadState.value==='loading'){
  acquireIntroScrollLock();
  if(introLoadWatchdog===null){
   introLoadWatchdog=window.setTimeout(()=>failIntroLoading('INTRO_R1F_MEDIA_OR_GEOMETRY_TIMEOUT'),INTRO_MEDIA_TIMEOUT_MS);
  }
  scheduleIntroStability();
  return;
 }
 if(phase.value==='idle'||phase.value==='released'){
  releaseIntroScrollLock();
  if(introLoadWatchdog!==null)clearTimeout(introLoadWatchdog);
  introLoadWatchdog=null;
  if(phase.value==='idle'&&bufferedIntent!==null){
   const intent=bufferedIntent;
   bufferedIntent=null;
   if(!requestBufferedIntent(intent))console.error('INTRO_R1F_BUFFERED_INTENT_NOT_ADMITTED',intent);
  }
 }
}
function onFilmMediaStatus(status:HeroMediaStatus):void {
 heroMedia.value=status;
 if(status.phase==='failed')failIntroLoading(status.reason??'HERO_CAROUSEL_MEDIA_FAILED');
 else scheduleIntroStability();
}
function onIntroGateEnvironment():void {
 if(introLoadRaf!==null){cancelAnimationFrame(introLoadRaf);introLoadRaf=null;}
 stableFrameCount=0;lastLayoutStamp='';
 syncIntroGate();
}
function onFilmGeometry(geometry:FilmPaintGeometry):void {
 if(geometry.generation<lastGeneration)return;
 lastGeneration=geometry.generation;
 filmGeometry.value=geometry;
 scheduleGeometry();
}
function updateViewportGeometry():void {
 if(!mounted||!paintFrame.value)return;
 try {
  const header=document.querySelector<HTMLElement>('.smd-site-header');
  if(!header)throw new Error('INTRO_R4_HEADER_AUTHORITY_MISSING');
  const rect=paintFrame.value.getBoundingClientRect();
  const height=planIntroViewportHeight({
   viewportHeightCssPx:window.innerHeight,
   headerHeightCssPx: 0, // Hero now paints behind the fixed header
   frameTopCssPx:rect.top,scrollYCssPx:window.scrollY,
  });
  viewportFault.value=null;
  if(viewportPaintHeight.value===null||Math.abs(viewportPaintHeight.value-height)>0.25){
   viewportPaintHeight.value=height;
   scheduleGeometry();
  }
 }catch(error){
  viewportFault.value=error instanceof Error?error.message:'INTRO_R4_VIEWPORT_GEOMETRY_UNAVAILABLE';
  console.error(viewportFault.value);
 }
}
function onViewportResize():void {
 // Recalculate the required minimum after a viewport or breakpoint change.
 titleSafeMinimumHeight.value=0;
 titleSafeGrowAttempts=0;
 updateViewportGeometry();
 scheduleGeometry();
}
function protectedTitleRects():TitleSafetyRect[] {
 const frame=paintFrame.value;
 if(!frame)return [];
 const base=frame.querySelector<HTMLElement>('.smd-home-intro__base');
 if(!base)return [];
 const selectors=props.variant==='figma'
  ? '.smd-figma-scene-section--hero [data-figma-kind="TEXT"]'
  : '.smd-home--hero h1, .smd-home--hero .font-label, .smd-home--hero .smd-home__hero-intro';
 return Array.from(base.querySelectorAll<Element>(selectors)).flatMap(node=>{
  const rect=node.getBoundingClientRect();
  if(rect.width<=0||rect.height<=0||getComputedStyle(node).display==='none')return [];
  return [{left:rect.left,top:rect.top,width:rect.width,height:rect.height}];
 });
}
function currentOverlayHeight():number {
 const el=overlay.value;
 if(!el)return 0;
 const content=props.variant==='figma'
   ? el.querySelector<SVGSVGElement>('.smd-figma-scene-section--info-bar > svg')
   : el.querySelector<HTMLElement>('.smd-home--info-bar');
 return content?.getBoundingClientRect().height??0;
}
function measure():void {
 if(!mounted||!paintFrame.value||!overlay.value)return;
 const frame=paintFrame.value.getBoundingClientRect();
 const film=filmGeometry.value;
 if(!film || frame.width<=0||frame.height<=0)return;
 // Do not evaluate title safety using yesterday's painted Hero height.
 if(Math.abs(film.viewportRectCss.width-frame.width)>1 ||
    Math.abs(film.viewportRectCss.height-frame.height)>1)return;
 const height=currentOverlayHeight();
 const section=figmaScene.sections.find(item=>item.id==='info-bar');
 if(!section||section.nodeKey!=='node-1:134'){
  const reason='INTRO_R3_SOURCE_IDENTITY_DRIFT';
  placement.value={kind:'blocked',contract:'SMD_HOME_INTRO_VUE_PAINT_STACK_R3',
    sourceSectionKey:'node-1:134',hostRevision:String(++geometryEpoch),reason};
  console.error(reason);return;
 }
 // Section SVG is width-constrained to the original 1920px artboard.
 if(props.variant==='figma'){
  const expectedHeight=homeInfoLayout.barHeight*Math.min(frame.width,1920)/1920;
  if(Math.abs(height-expectedHeight)>1.5){
   const reason='INTRO_R3_GEOMETRY_UNAVAILABLE';
   placement.value={kind:'blocked',contract:'SMD_HOME_INTRO_VUE_PAINT_STACK_R3',
     sourceSectionKey:'node-1:134',hostRevision:String(++geometryEpoch),reason};
   const svg=overlay.value.querySelector<SVGSVGElement>('.smd-figma-scene-section--info-bar > svg');
   console.error(reason,{
    infoSvgHeight:height,expectedHeight,
    infoSvgWidth:svg?.getBoundingClientRect().width??null,
    frameWidth:frame.width,heroViewportWidth:film.viewportRectCss.width,
    overlayWidth:overlay.value.getBoundingClientRect().width,
   });return;
  }
 }
 const current=planIntroOverlay({
  frameRectCss:{left:frame.left,top:frame.top,width:frame.width,height:frame.height},
  film,overlayHeightCssPx:height,overlayWidthCssPx:film.viewportRectCss.width,
  sourceRevision:figmaScene.sourceSnapshotDigest,
  expectedSourceRevision:figmaScene.sourceSnapshotDigest,
  minimumFilmGeneration:lastGeneration,
  hostRevision:`${props.variant}:${film.layoutRevision}:${++geometryEpoch}`,
 });
 // Don't invalidate the active animation for an unchanged measured layout.
 titleSafetyOverlap.value=0;
 if(current.kind==='admitted') {
  const candidate:TitleSafetyRect={
   left:frame.left+current.leftCssPx,top:frame.top+current.topCssPx,
   width:current.widthCssPx,height:current.heightCssPx,
  };
  const protectedRects=protectedTitleRects();
  if(!protectedRects.length){
   placement.value={kind:'blocked',contract:'SMD_HOME_INTRO_VUE_PAINT_STACK_R3',
    sourceSectionKey:'node-1:134',hostRevision:String(geometryEpoch),reason:'INTRO_R4_TITLE_AUTHORITY_MISSING'};
   console.error('INTRO_R4_TITLE_AUTHORITY_MISSING');return;
  }
  if(!titleSafeOverlay(candidate,protectedRects)){
   titleSafetyOverlap.value=1;
   const required=planIntroTitleSafeMinimumHeight(frame.height,candidate,protectedRects);
   if(required!==null && required>Math.max(frame.height,titleSafeMinimumHeight.value)+0.5 &&
      titleSafeGrowAttempts<2){
    titleSafeGrowAttempts++;
    titleSafeMinimumHeight.value=required;
    placement.value=null; // pending actual updated Hero paint generation
    return;
   }
   // The gate is never silently disabled: an unresolvable geometry stays blocked.
   placement.value={kind:'blocked',contract:'SMD_HOME_INTRO_VUE_PAINT_STACK_R3',
    sourceSectionKey:'node-1:134',hostRevision:String(geometryEpoch),reason:'INTRO_R4_TITLE_SAFE_CONFLICT'};
   console.error('INTRO_R4_TITLE_SAFE_CONFLICT',{
    variant:props.variant,requiredHeight:required,currentHeight:frame.height,
    growAttempts:titleSafeGrowAttempts,protectedCount:protectedRects.length,
   });return;
  }
 }
 const previous=placement.value;
 if(previous?.kind==='admitted'&&current.kind==='admitted'&&
    previous.leftCssPx===current.leftCssPx&&previous.topCssPx===current.topCssPx&&
    previous.widthCssPx===current.widthCssPx&&previous.heightCssPx===current.heightCssPx){return;}
 placement.value=current;
 if(current.kind==='blocked')console.error(current.reason);
}
function scheduleGeometry():void {
 if(scheduled||!mounted)return;
 scheduled=true;
 void nextTick().then(()=>{
  scheduled=false;
  if(mounted)measure();
 });
}
// Derived from the latest Hero paint, not an admitted overlay placement from a previous viewport.
const overlayWidthCss=computed<string>(()=>{
 const width=filmGeometry.value?.viewportRectCss.width;
 return typeof width==='number' && Number.isFinite(width) && width>0?`${width}px`:'100%';
});
const overlayStyle=computed<Record<string,string>>(():Record<string,string>=>{
 const plan=placement.value;
 const visual=presentation.value;
 switch(plan?.kind){
  case 'admitted':return {
   top:`${plan.topCssPx}px`,left:`${plan.leftCssPx}px`,
   width:overlayWidthCss.value,height:`${plan.heightCssPx}px`,
   opacity:String(visualState.value==='static'?1:visual.barOpacity),
   transform:`translate3d(0,${visualState.value==='static'?0:visual.barOffsetY}px,0)`,
  };
  default:return {opacity:'0',pointerEvents:'none',width:overlayWidthCss.value};
 }
});
const itemStyle=computed<Record<string,string>>(()=>{
 const p=presentation.value;
 return Object.fromEntries(p.iconOpacity.flatMap((opacity,index)=>[
  [`--smd-intro-icon-${index}-opacity`,String(visualState.value==='static'?1:opacity)],
  [`--smd-intro-icon-${index}-y`,`${visualState.value==='static'?0:p.iconOffsetY[index]}px`],
 ]));
});
watch([phase,releaseReason],([current,reason])=>{
 if(current==='released'&&(reason==='completed'||reason==='restored-scroll')){
  emitIntroCompleted();
 }
},{flush:'sync'});
watch([heroMedia,placementReady,fontsReady,filmGeometry],()=>scheduleIntroStability(),{flush:'post'});
watch([introLoadState,phase,placementReady],()=>syncIntroGate(),{flush:'post'});
onMounted(()=>{
 mounted=true;
 syncIntroGate();
 const fontSet=document.fonts;
 if(fontSet){
  void fontSet.ready.then(()=>{
   if(!mounted)return;
   fontsReady.value=true;
   scheduleGeometry();
   scheduleIntroStability();
  }).catch(error=>failIntroLoading(`INTRO_R1F_FONT_READY_FAILED:${String(error)}`));
 }else fontsReady.value=true;
 window.addEventListener('resize',onIntroGateEnvironment);
 document.addEventListener('visibilitychange',onIntroGateEnvironment);
 updateViewportGeometry();
 resizeObserver=new ResizeObserver(()=>scheduleGeometry());
 if(paintFrame.value)resizeObserver.observe(paintFrame.value);
 const content=overlay.value?.firstElementChild;
 if(content)resizeObserver.observe(content);
 window.addEventListener('resize',onViewportResize);
 void document.fonts?.ready.then(()=>scheduleGeometry());
 scheduleGeometry();
});
onBeforeUnmount(()=>{
 releaseIntroScrollLock();
 if(introLoadRaf!==null)cancelAnimationFrame(introLoadRaf);
 if(introLoadWatchdog!==null)clearTimeout(introLoadWatchdog);
 introLoadRaf=null;introLoadWatchdog=null;
 window.removeEventListener('resize',onIntroGateEnvironment);
 document.removeEventListener('visibilitychange',onIntroGateEnvironment);
 mounted=false;geometryEpoch++;resizeObserver?.disconnect();resizeObserver=null;
 window.removeEventListener('resize',onViewportResize);
});
</script>
<template>
 <div ref="root" class="smd-home-intro" data-intro-contract="SMD_HOME_INTERACTION_R1"
   data-intro-paint-contract="SMD_HOME_INTRO_VUE_PAINT_STACK_R3"
   :data-intro-variant="props.variant" :data-intro-route="introRoute"
   :data-intro-visual="visualState" :data-intro-phase="phase"
   :data-intro-admitted="admitted?'true':'false'"
   :data-intro-admission-reason="admissionReason"
   data-intro-viewport-contract="SMD_HOME_INTRO_VIEWPORT_FILL_R4"
   :data-intro-paint-height="viewportPaintHeight??'SSR'"
   :data-intro-effective-paint-height="effectivePaintHeight??'SSR'"
   :data-intro-title-safe-min-height="titleSafeMinimumHeight"
   :data-intro-viewport-fault="viewportFault??undefined"
   :data-intro-load-state="introLoadState"
   :data-intro-media-state="heroMedia?.phase??'pending'"
   :data-intro-load-fault="introLoadFault??undefined"
   :data-intro-stable-frames="stableFrameCount"
   :data-intro-title-overlap="titleSafetyOverlap"
   :data-intro-overlay-status="placement?.kind??'pending'"
   :data-intro-overlay-reason="placement?.reason??undefined"
   :data-intro-overlap-area="placement?.kind==='admitted'?placement.paintedIntersectionAreaCssPx2:0"
   :data-intro-release-reason="releaseReason??undefined"
   :data-intro-animation-starts="animationStarts"
   :data-intro-first-intent="firstIntent??undefined"
   :data-intro-ignored-wheel="ignoredWheelEvents" :style="itemStyle">
   <div ref="paintFrame" class="smd-home-intro__paint-stack" data-intro-paint-owner="frame" :style="paintFrameStyle">
    <div class="smd-home-intro__base" data-intro-paint-owner="base">
      <FigmaSceneSection v-if="props.variant==='figma'" section-id="hero" :paint-height-css-px="effectivePaintHeight"
       @film-paint-geometry="onFilmGeometry" @film-media-status="onFilmMediaStatus" />
      <HeroSection v-else :paint-height-css-px="effectivePaintHeight" @film-paint-geometry="onFilmGeometry"
       @film-media-status="onFilmMediaStatus" />
    </div>

<div
  ref="overlay"
  class="smd-home-intro__overlay"
  data-intro-paint-owner="overlay"
  :data-intro-overlay-admitted="placementReady ? 'true' : 'false'"
  :style="[overlayStyle, { visibility: 'hidden' }]"
  aria-hidden="true"
>
  <FigmaSceneSection
    v-if="props.variant === 'figma'"
    section-id="info-bar"
  />
  <HomeInfoBar v-else />
</div>

   </div>
   <div v-if="introLoadFault" class="smd-home-intro__load-fault" role="alert"
     :data-intro-failure="introLoadFault">
     메인 이미지를 표시할 수 없습니다. 페이지를 새로고침한 후 다시 시도해 주세요.
   </div>
 </div>
</template>
