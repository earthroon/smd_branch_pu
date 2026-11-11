import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import {planIntroOverlay} from '../../app/utils/homeIntroOverlayGeometry.ts';
import {createFilmRuntime} from './hero-film-runtime-harness.mjs';
import {figmaScene} from '../../app/data/figma-r2-scene.generated.ts';
import {HOME_INTRO_TIMING,iconStartMs, HOME_INTRO_REVEAL_COMPLETE_MS} from '../../app/utils/homeIntroTimeline.ts';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const text=p=>readFileSync(resolve(root,p),'utf8');
const digest=figmaScene.sourceSnapshotDigest;
const base={
 frameRectCss:{left:30,top:125,width:1920,height:815},
 film:{owner:'HomeHeroFilm',viewportRectCss:{left:30,top:125,width:1920,height:815},
   paintedTopCss:0,paintedHeightCss:637.5,layoutRevision:'layoutA',generation:5},
 overlayHeightCssPx:253.8,overlayWidthCssPx:1920,
 sourceRevision:digest,expectedSourceRevision:digest,minimumFilmGeneration:5,hostRevision:'hostA',
};

test('R3 geometry places Info Bar INSIDE actual photo pixels, not below Hero',()=>{
 const plan=planIntroOverlay(base);
 assert.equal(plan.kind,'admitted');
 assert.equal(plan.topCssPx,383.7);
 assert.equal(plan.leftCssPx,0);
 assert.equal(plan.widthCssPx,1920);
 assert.equal(plan.heightCssPx,253.8);
 assert.ok(plan.paintedIntersectionAreaCssPx2>400_000);
 assert.equal(plan.sourceSectionKey,'node-1:134');
});
test('R3 viewport origin translates once without changing Figma Y',()=>{
 const shifted={...base,frameRectCss:{left:110,top:500,width:1920,height:815},
   film:{...base.film,viewportRectCss:{left:110,top:500,width:1920,height:815}}};
 const result=planIntroOverlay(shifted);
 assert.equal(result.kind,'admitted');
 assert.ok(Math.abs(result.topCssPx-383.7)<1e-9);
 assert.equal(result.leftCssPx,0);
});
test('R3 source, stale generation, nonfinite and tall-bar admission fail closed',()=>{
 const cases=[
  [{...base,sourceRevision:'unverified'},'INTRO_R3_SOURCE_IDENTITY_DRIFT'],
  [{...base,minimumFilmGeneration:6},'INTRO_R3_GEOMETRY_STALE'],
  [{...base,overlayHeightCssPx:700},'INTRO_R3_BAR_EXCEEDS_PAINTED_FILM'],
  [{...base,overlayHeightCssPx:Infinity},'INTRO_R3_GEOMETRY_UNAVAILABLE'],
  [{...base,film:{...base.film,paintedHeightCss:0}},'INTRO_R3_GEOMETRY_UNAVAILABLE'],
  [{...base,film:{...base.film,viewportRectCss:{left:NaN,top:125,width:1920,height:815}}},'INTRO_R3_GEOMETRY_UNAVAILABLE'],
 ];
 for(const [input,reason] of cases){
  const result=planIntroOverlay(input);
  assert.equal(result.kind,'blocked');assert.equal(result.reason,reason);
 }
});
test('R3 does not guess a placement when the photo is outside its measured frame',()=>{
 const result=planIntroOverlay({...base,film:{...base.film,viewportRectCss:{left:30,top:900,width:1920,height:815}}});
 assert.equal(result.kind,'blocked');assert.equal(result.reason,'INTRO_R3_GEOMETRY_UNAVAILABLE');
});
test('R3 Vue mounts one base + overlay per variant, and a semantic stage replaces two flow siblings',()=>{
 const host=text('app/components/home/HomeIntroStage.vue');
 const index=text('app/pages/index.vue');
 assert.match(host,/data-intro-paint-contract="SMD_HOME_INTRO_VUE_PAINT_STACK_R3"/);
 assert.match(host,/class="smd-home-intro__paint-stack"/);
 assert.match(host,/data-intro-paint-owner="base"/);
 assert.match(host,/data-intro-paint-owner="overlay"/);
 assert.match(host,/:style="overlayStyle"/);
 assert.match(host,/<FigmaSceneSection v-if="props.variant==='figma'" section-id="info-bar"/);
 assert.match(host,/<HomeInfoBar v-else\s*\/>/);
 assert.match(index,/<HomeIntroStage variant="figma" @completed="onIntroCompleted"\s*\/>/);
 assert.match(index,/<HomeIntroStage variant="semantic"\s*\/>/);
 assert.doesNotMatch(index,/<HeroSection\s*\/>\s*<HomeInfoBar\s*\/>/);
});
test('R3 film read-only geometry is forwarded without modifying Wind engine or generated scene',()=>{
 const film=text('app/components/home/HomeHeroFilm.vue');
 const figma=text('app/components/figma/FigmaSceneSection.vue');
 const hero=text('app/components/home/HeroSection.vue');
 assert.match(film,/const emit = defineEmits<\{ 'film-paint-geometry'/);
 assert.match(film,/const paintedHeight = Math.max\(0,visibleBottom-visibleTop\)/);
 assert.match(film,/paintedHeightCss:paintedHeight/);
 assert.match(film,/emitPaintGeometry\(\)/);
 assert.match(figma,/@film-paint-geometry="emit\('film-paint-geometry', \$event\)"/);
 assert.match(hero,/@film-paint-geometry="emit\('film-paint-geometry', \$event\)"/);
 const sourceHero=figmaScene.sections.find(s=>s.id==='hero');
 const sourceInfo=figmaScene.sections.find(s=>s.id==='info-bar');
 assert.deepEqual([sourceHero?.top,sourceHero?.height,sourceHero?.nodeKey],[125,815,'node-1:4']);
 assert.deepEqual([sourceInfo?.top,sourceInfo?.height,sourceInfo?.nodeKey],[940,310,'node-1:134']);
});
test('R3 Controller does not scrollTo, resize a bar, or synthesize a separate icon painter',()=>{
 const controller=text('app/composables/useHomeIntroReveal.ts');
 const css=text('app/assets/css/home-r2-interaction.css');
 const host=text('app/components/home/HomeIntroStage.vue');
 assert.doesNotMatch(controller,/window\.scrollTo|targetScrollY|introTargetScrollY|scroll-behavior/);
 assert.doesNotMatch(controller,/--smd-intro-bar-height|measureCompactBar/);
 assert.match(controller,/start\(performance\.now\(\),'wheel'\)/);
 assert.match(controller,/start\(performance\.now\(\),'native-scroll'\)/);
 assert.match(css,/\.smd-home-intro__overlay\s*\{[^}]*position:absolute/s);
 assert.doesNotMatch(css,/position:sticky|margin-top:-|top:-\d+px/);
 assert.doesNotMatch(host,/style\.setProperty\('--film-painted-height'|window\.scrollTo/);
});
test('R3 SSR begins with opacity 0, and retains original 430ms and stagger schedule',()=>{
 const css=text('app/assets/css/home-r2-interaction.css');
 assert.match(css,/opacity:0; \/\* SSR/);
 assert.deepEqual([0,1,2,3].map(iconStartMs),[460,520,580,640]);
 assert.equal(HOME_INTRO_TIMING.barDurationMs,430);
 assert.equal(HOME_INTRO_REVEAL_COMPLETE_MS,990);
 const semantic=text('app/components/home/HomeInfoBar.vue');
 assert.match(semantic,/class="smd-home__fact smd-home-intro__item"/);
});

test('R3 actual HomeHeroFilm VM emits read-only paint geometry after layout admission',async()=>{
 const runtime=await createFilmRuntime({width:1920,dpr:1});
 const samples=runtime.stats().emittedGeometry;
 assert.ok(samples.length>=1);
 const first=samples.at(-1);
 assert.equal(first.owner,'HomeHeroFilm');
 assert.equal(first.viewportRectCss.width,1920);
 assert.ok(first.paintedHeightCss>0 && first.paintedHeightCss<=815);
 assert.ok(typeof first.layoutRevision==='string' && first.layoutRevision.length>0);
 runtime.unmount();
});
