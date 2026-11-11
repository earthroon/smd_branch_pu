import vm from 'node:vm';
import ts from 'typescript';
import { readFileSync } from 'node:fs';
import * as motion from '../../app/utils/homeFilmMotion.ts';
import * as wind from '../../app/utils/homeFilmWind.ts';
import * as selection from '../../app/utils/homeFilmSelection.ts';
import * as input from '../../app/utils/homeFilmInput.ts';
import * as layout from '../../app/utils/homeFilmLayout.ts';
import * as focus from '../../app/utils/homeFilmFocusAdmission.ts';
import { homeFilmAssets, homeFilmEditorialAdmissions, homeFilmEditorialReady } from '../../app/data/home-film.ts';
import { webcrypto } from 'node:crypto';

const read = path => readFileSync(new URL('../../'+path,import.meta.url),'utf8');
const component = read('app/components/home/HomeHeroFilm.vue');
const script = component.split('<script setup lang="ts">')[1].split('</script>')[0]
 .replace(/^import[\s\S]*?from ['"][^'"]+['"];?$/gm,'')
 .replaceAll('import.meta.url', '"file:///synthetic/HomeHeroFilm.vue"');
const output = ts.transpileModule(script + '\n globalThis.h={root,track,rail,transport,copies,selection,layoutPlan,focusDecision,resize,enter,leave,move,down,up,scroll,cancelTouch,commit,release,key,freeze,sample,request,install,presentMobileFocus,qualifyRateCandidate,getCandidateAdmitted:()=>candidateAdmitted,getRateBin:()=>rateBin,getFocusGeneration:()=>focusGeneration,getPlan:()=>plan,getWindReady:()=>windReady.value,getRateRequestedKey:()=>rateRequestedKey,getRateEpoch:()=>rateEpoch,desktopAllowed};',{
 compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None},
 reportDiagnostics:true,
});
const errors=(output.diagnostics??[]).filter(x=>x.category===ts.DiagnosticCategory.Error);
if(errors.length)throw new Error(`FILM_COMPONENT_TRANSPILE_FAILED ${errors.map(x=>x.messageText).join(',')}`);

export async function createFilmRuntime(options={}){
 let mount,unmount,animationCreated=0,animationCancelled=0,rateUpdates=0,frames=[],timing=null;
 const emittedGeometry=[];
 const focusTimings=[];
 const watchers=[];
 const store={_value:selection.initialFilmSelection(),get value(){return this._value},
  set value(next){const prev=this._value;this._value=next;watchers.forEach(fn=>fn(next,prev));}};
 const animation={currentTime:0,playbackRate:1,playState:'running',ready:Promise.resolve(),onfinish:null,
  pause(){this.playState='paused'},cancel(){this.playState='idle';animationCancelled++;},
  play(){this.playState='running'},updatePlaybackRate(next){rateUpdates++;this.playbackRate=next},
  effect:{setKeyframes(v){frames=v},updateTiming(v){timing=v}},
 };
 const width=options.width??1920;
 const height=options.paintHeight??815;
 const root={clientWidth:width,clientHeight:height,getClientRects:()=>[{}],dataset:{},
  getBoundingClientRect:()=>({left:0,right:root.clientWidth,top:0,bottom:root.clientHeight,width:root.clientWidth,height:root.clientHeight}),
  parentElement:{style:{setProperty(){}}},contains:()=>false,
  querySelectorAll:selector=>selector.includes('semantic')?[]:[],
 };
 const track={scrollLeft:0,scrollWidth:3600,clientWidth:width,
  getBoundingClientRect:()=>({left:0,right:root.clientWidth,top:0,bottom:root.clientHeight,width:root.clientWidth,height:root.clientHeight}),
 };
 const focusElement=()=>({animate:(_frames,config)=>{focusTimings.push(config);return {cancel(){},onfinish:null}}});
 const slotElement=i=>({dataset:{filmImageId:homeFilmAssets[i%3].id},style:{},
  getBoundingClientRect(){return {left:i*400-track.scrollLeft,right:(i+1)*400-track.scrollLeft,top:0,bottom:815,width:400,height:815}},
  querySelector:selector=>selector==='img'||selector==='.smd-hero-film__focus-layer'?focusElement():null,
 });
 const slots=Array.from({length:24},(_,i)=>slotElement(i));
 const rail={style:{},get children(){return slots.slice(0,h.copies.value*3)},
  querySelectorAll:()=>slots.slice(0,h.copies.value*3),
  animate(nextFrames,nextTiming){animationCreated++;frames=nextFrames;timing=nextTiming;
   animation.currentTime=0;animation.playbackRate=1;animation.playState='running';return animation;
  },
 };
 const mm=readMatches=>({get matches(){return readMatches()},addEventListener(){},removeEventListener(){}});
 const ctx={...motion,...wind,...selection,...input,...layout,...focus,
  homeFilmAssets,homeFilmEditorialAdmissions,homeFilmEditorialReady,
  legacyFocusManifest:JSON.parse(read('app/data/home-film-focus.json')),
  curve:JSON.parse(read('app/data/home-film-speed.json')),
  rateLut:JSON.parse(read('app/data/home-film-rate-lut.json')),
  windLutSource:JSON.parse(read('app/data/home-film-wind-lut.json')),
  ref:v=>({value:v}),computed:f=>({get value(){return f()}}),
  useState:()=>store,defineProps:()=>({motionProfile:options.motionProfile??'speed-r3-compat',paintHeightCssPx:options.paintHeight??null}),
  defineEmits:()=>((event,geometry)=>{if(event==='film-paint-geometry')emittedGeometry.push(geometry)}),
  watch:(source,callback)=>{ if(source===store)watchers.push(callback); },nextTick:()=>Promise.resolve(),
  onMounted:f=>mount=f,onBeforeUnmount:f=>unmount=f,
  matchMedia:query=>mm(()=>query.includes('reduced-motion')?!!options.reduced:
    query.includes('pointer:fine')?(options.fine??root.clientWidth>=1100):root.clientWidth<=1099),
  ResizeObserver:class{observe(){}disconnect(){}},
  window:{innerWidth:width,devicePixelRatio:options.dpr??1,location:{origin:'http://localhost'}},
  document:{hidden:false,activeElement:null,addEventListener(){},removeEventListener(){}},
  performance:{now:()=>500},crypto:webcrypto,TextEncoder,console,
  setTimeout,clearTimeout,
 };
 vm.runInNewContext(output.outputText,ctx);
 const h=ctx.h;
 h.root.value=root;h.track.value=track;h.rail.value=rail;
 mount();await new Promise(resolve=>setTimeout(resolve,20));
 return {h,ctx,root,track,rail,animation,store,
  stats:()=>({animationCreated,animationCancelled,rateUpdates,frames,timing,focusTimings,emittedGeometry}),
  updateGeometry:async nextWidth=>{root.clientWidth=nextWidth;track.clientWidth=nextWidth;ctx.window.innerWidth=nextWidth;await h.resize();},
  updateDpr:async dpr=>{ctx.window.devicePixelRatio=dpr;await h.resize();},
  unmount,
 };
}
