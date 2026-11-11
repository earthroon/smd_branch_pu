import { filmHorizontal } from '~/utils/homeFilmInput';
import { onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue';
import {
  HOME_INTRO_REVEAL_COMPLETE_MS,
  HOME_INTRO_TIMING, barProgress, canReleaseIntro, iconProgress,
} from '~/utils/homeIntroTimeline';

export type HomeIntroPhase = 'disabled' | 'idle' | 'revealing' | 'settling' | 'released' | 'blocked';
export type HomeIntroRoute = 'vue-overlay';
export type IntroVisualState = 'pending' | 'managed' | 'static';
type ReleaseReason = 'completed' | 'restored-scroll' | 'media-changed' | 'page-hidden'
  | 'cancelled' | 'unmounted';
type IntroIntent = 'wheel' | 'keyboard' | 'native-scroll';
export type IntroPresentation = Readonly<{
  barOpacity: number;
  barOffsetY: number;
  iconOpacity: readonly number[];
  iconOffsetY: readonly number[];
}>;
const at = (ms:number):IntroPresentation => {
  const bar = barProgress(ms);
  const iconOpacity = Array.from({length: HOME_INTRO_TIMING.iconCount}, (_,i)=>iconProgress(ms,i));
  return {
    barOpacity:bar, barOffsetY:HOME_INTRO_TIMING.barEntryOffsetPx*(1-bar),
    iconOpacity, iconOffsetY:iconOpacity.map(p=>HOME_INTRO_TIMING.iconEntryOffsetPx*(1-p)),
  };
};

/** One visible Vue Paint Stack owns the gesture and timing. No document-scroll animation. */
export function useHomeIntroReveal(
  stageRef: Ref<HTMLElement|null>,
  route: HomeIntroRoute,
  geometryReady: Readonly<Ref<boolean>>,
) {
  const phase=ref<HomeIntroPhase>('disabled');

const headerScrollIntent = useState<boolean>(
  'smd-home-header-scroll-intent-r1',
  () => false
);

  const admitted=ref(false);
  const admissionReason=ref('NOT_MOUNTED');
  const releaseReason=ref<ReleaseReason|null>(null);
  const ignoredWheelEvents=ref(0), animationStarts=ref(0);
  const visualState=ref<IntroVisualState>('pending');
  const firstIntent=ref<IntroIntent|null>(null);
  const presentation=ref<IntroPresentation>(at(0));
  let mounted=false, rafId:number|null=null, startedAt=0, lastWheelAt=0, wheelInstalled=false;
  let finePointer:MediaQueryList|null=null, reduced:MediaQueryList|null=null;
  const draw=(elapsed:number)=>{presentation.value=at(elapsed);};

  function isVisible():boolean {
    const stage=stageRef.value;
    if (!stage || !stage.isConnected || document.hidden || !stage.getClientRects().length) return false;
    const rect=stage.getBoundingClientRect();
    return rect.width>0 && rect.height>0 && getComputedStyle(stage).display!=='none';
  }
  function stopFrame():void {if(rafId!==null)cancelAnimationFrame(rafId);rafId=null;}
  function removeWheel():void {
    if(!wheelInstalled)return;
    window.removeEventListener('wheel',onWheel,true);
    wheelInstalled=false;
  }
  function release(reason:ReleaseReason,finish:boolean):void {
    stopFrame();
    if(finish)draw(HOME_INTRO_REVEAL_COMPLETE_MS);
    removeWheel();
    releaseReason.value=reason;
    phase.value='released';
    admitted.value=false;
    visualState.value=finish?'managed':'pending';
  }

function start(now:number,source:IntroIntent):boolean {
  if (phase.value!=='idle'||!geometryReady.value||!isVisible()) return false;

  // 첫 스크롤이 Intro 애니메이션에 흡수되어도 헤더 전환
  headerScrollIntent.value = true;

  startedAt=now;lastWheelAt=now;
    animationStarts.value+=1;firstIntent.value=source;
    phase.value='revealing';visualState.value='managed';
    draw(0);
    rafId=requestAnimationFrame(tick);
    return true;
  }
  function tick(now:number):void {
    rafId=null;
    if(!mounted||!isVisible()||!geometryReady.value||
       !['revealing','settling'].includes(phase.value))return;
    const elapsed=Math.max(0,now-startedAt);
    draw(elapsed);
    if(elapsed>=HOME_INTRO_REVEAL_COMPLETE_MS&&phase.value==='revealing')phase.value='settling';
    if(canReleaseIntro(elapsed,now-lastWheelAt)){
      release('completed',true);
      return;
    }
    rafId=requestAnimationFrame(tick);
  }
  /** Preserve exactly one genuine loading-time scroll intent after media admission. */
  function requestBufferedIntent(source:IntroIntent):boolean {
    if(!mounted||phase.value!=='idle'||!geometryReady.value||!isVisible()||window.scrollY>2)return false;
    if(source==='wheel'&&!finePointer?.matches)return false;
    return start(performance.now(),source);
  }
  function onWheel(event:WheelEvent):void {
    if(!admitted.value||event.ctrlKey||!isVisible())return;
    if(event.target instanceof Element &&
       event.target.closest('.smd-site-header, input, textarea, select, [contenteditable], button, a'))return;
    if(event.target instanceof Element&&event.target.closest('.smd-hero-film')&&filmHorizontal(event))return;
    if(Math.abs(event.deltaX)>Math.abs(event.deltaY))return;
    switch(phase.value){
      case 'idle': {
        if(event.deltaY<=0||window.scrollY>2||!event.cancelable||!finePointer?.matches)return;
        event.preventDefault();start(performance.now(),'wheel');return;
      }
      case 'revealing':case 'settling': {
        // Fine-pointer wheel burst belongs to Intro; touch scroll stays native.
        if(finePointer?.matches&&event.cancelable)event.preventDefault();
        ignoredWheelEvents.value++;
        lastWheelAt=performance.now();return;
      }
      default:return;
    }
  }
  function onKeydown(event:KeyboardEvent):void {
    if(!admitted.value||!isVisible()||event.altKey||event.ctrlKey||event.metaKey)return;
    if(event.target instanceof Element&&event.target.closest('input,textarea,select,[contenteditable],button,a'))return;
    switch(event.key){
      case 'ArrowDown':case 'PageDown':case ' ': {
        if(phase.value==='idle'&&window.scrollY<=2&&event.cancelable){
          event.preventDefault();start(performance.now(),'keyboard');
        }else if(['revealing','settling'].includes(phase.value)&&event.cancelable){
          event.preventDefault();
        }
        return;
      }
      default:return;
    }
  }
  function onNativeScroll():void {
    if(!admitted.value||!isVisible()||window.scrollY<=2||phase.value!=='idle')return;
    // A touch/scrollbar gesture may move the document normally; it doesn't own film motion.
    start(performance.now(),'native-scroll');
  }
  function attemptAdmission():void {
    if(!mounted)return;
    if(!isVisible()){
      admissionReason.value='INTRO_NOT_CURRENT';
      admitted.value=false;removeWheel();
      if(['revealing','settling'].includes(phase.value)){
        stopFrame();phase.value='disabled';visualState.value='pending';
      }else if(phase.value!=='released'){phase.value='disabled';visualState.value='pending';}
      return;
    }
    if(!geometryReady.value){
      admissionReason.value='INTRO_R3_GEOMETRY_UNAVAILABLE';
      admitted.value=false;removeWheel();
      if(['revealing','settling'].includes(phase.value)){
        stopFrame();phase.value='blocked';visualState.value='pending';
      }else if(phase.value!=='released'){phase.value='disabled';visualState.value='pending';}
      return;
    }
    if(reduced?.matches){
      stopFrame();removeWheel();draw(HOME_INTRO_REVEAL_COMPLETE_MS);
      visualState.value='static';admitted.value=false;
      admissionReason.value='REDUCED_MOTION';
      phase.value='released';releaseReason.value='media-changed';
      return;
    }
    if(phase.value==='released')return;
    if(window.scrollY>2 && !['revealing','settling'].includes(phase.value)){
      stopFrame();draw(HOME_INTRO_REVEAL_COMPLETE_MS);
      phase.value='released';visualState.value='static';
      admitted.value=false;admissionReason.value='RESTORED_SCROLL_POSITION';
      releaseReason.value='restored-scroll';removeWheel();return;
    }
    admitted.value=true;admissionReason.value='ADMITTED';
    if(!['revealing','settling'].includes(phase.value)){
      phase.value='idle';visualState.value='managed';draw(0);
    }
    if(!wheelInstalled){
      window.addEventListener('wheel',onWheel,{capture:true,passive:false});
      wheelInstalled=true;
    }
  }
  function onEnvironment():void {attemptAdmission();}
  function onVisibility():void {
    if(!mounted)return;
    if(document.hidden&&['revealing','settling'].includes(phase.value)){
      stopFrame();removeWheel();phase.value='disabled';admitted.value=false;
      visualState.value='pending';releaseReason.value='page-hidden';
    } else attemptAdmission();
  }
  const stopWatch=watch(geometryReady,()=>attemptAdmission(),{flush:'post'});
  onMounted(()=>{
    mounted=true;
    finePointer=matchMedia('(hover:hover) and (pointer:fine)');
    reduced=matchMedia('(prefers-reduced-motion: reduce)');
    window.addEventListener('resize',onEnvironment);
    window.addEventListener('scroll',onNativeScroll,{passive:true});
    window.addEventListener('keydown',onKeydown,true);
    document.addEventListener('visibilitychange',onVisibility);
    finePointer.addEventListener('change',onEnvironment);
    reduced.addEventListener('change',onEnvironment);
    attemptAdmission();
  });
  onBeforeUnmount(()=>{
    mounted=false;stopFrame();removeWheel();stopWatch();
    window.removeEventListener('resize',onEnvironment);
    window.removeEventListener('scroll',onNativeScroll);
    window.removeEventListener('keydown',onKeydown,true);
    document.removeEventListener('visibilitychange',onVisibility);
    finePointer?.removeEventListener('change',onEnvironment);
    reduced?.removeEventListener('change',onEnvironment);
  });
  return {phase,admitted,admissionReason,releaseReason,ignoredWheelEvents,animationStarts,
    visualState,firstIntent,presentation,route,requestBufferedIntent};
}
