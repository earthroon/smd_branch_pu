import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import {planIntroViewportHeight,rectIntersectionArea,titleSafeOverlay} from '../../app/utils/homeIntroViewportGeometry.ts';
import {FILM_FRAME_HEIGHT_CSS_PX,planFullViewportFilmLayout,verifyFullViewportFilmCoverage} from '../../app/utils/homeFilmLayout.ts';
import {homeFilmAssets} from '../../app/data/home-film.ts';
import {figmaScene} from '../../app/data/figma-r2-scene.generated.ts';
import {createFilmRuntime} from './hero-film-runtime-harness.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const read=(p)=>readFileSync(resolve(root,p),'utf8');
const images=homeFilmAssets.map(a=>({imageId:a.id,intrinsicWidthPx:a.width,intrinsicHeightPx:a.height,
 approvedRenditionWidthPx:a.width,approvedRenditionHeightPx:a.height,renditionId:'source-jpeg'}));
const plan=(w,height,dpr=1,mode='desktop-lut')=>planFullViewportFilmLayout({
 frameHeightCssPx:FILM_FRAME_HEIGHT_CSS_PX,containerWidthCssPx:w,
 presentationHeightCssPx:height,devicePixelRatio:dpr,mode,sourceRevision:'immutable-3-photo-set',images,
});
test('R4 viewport layout fills the entire visible Y from below the actual header',()=>{
 for(const [width,viewportHeight,headerHeight] of [[1920,1080,93.75],[3440,1440,93.75],[2048,688,93.75],[390,844,76]]){
  const height=planIntroViewportHeight({viewportHeightCssPx:viewportHeight,
   headerHeightCssPx:headerHeight,frameTopCssPx:headerHeight,scrollYCssPx:0});
  assert.equal(height,viewportHeight-headerHeight);
  const p=plan(width,height,1,width<=1099?'native-swipe':'desktop-lut');
  assert.equal(p.frameHeightCssPx,815); // immutable source, not CSS paint height
  assert.equal(p.presentationHeightCssPx,height);
  assert(verifyFullViewportFilmCoverage(p,height));
  assert.equal(p.sourceCropCount,0);
  for(const s of p.slots){assert.equal(s.heightCssPx,height);assert(Math.abs(s.widthCssPx/s.heightCssPx-1920/1275)<1e-9)}
 }
});
test('R4 phase geometry does not change when document scrollY changes',()=>{
 const first=planIntroViewportHeight({viewportHeightCssPx:1080,headerHeightCssPx:93.75,frameTopCssPx:93.75,scrollYCssPx:0});
 const later=planIntroViewportHeight({viewportHeightCssPx:1080,headerHeightCssPx:93.75,frameTopCssPx:-106.25,scrollYCssPx:200});
 assert.equal(first,later);
});
test('R4 explicit tall DPR upscaling observation instead of silent admission',()=>{
 const tall=plan(3440,1440-93.75,3);
 assert.equal(tall.unapprovedUpscaleCount,3);
 assert.equal(tall.constraintStatus,'LAYOUT_CONSTRAINT_CONFLICT');
 assert(tall.violatedSoftGoals.includes('SOURCE_PIXEL_DENSITY_BELOW_VIEWPORT_REQUEST'));
 assert(verifyFullViewportFilmCoverage(tall,1440-93.75));
});
test('R4 image height does not follow old two/four-full-visible target',()=>{
 const wide=plan(3440,1440-93.75);
 assert.equal(wide.targetFullVisibleCount,4);
 assert(wide.realizedFullVisibleCount<4);
 assert(wide.violatedSoftGoals.includes('TARGET_FULL_VISIBLE_COUNT_SUPERSEDED_BY_VIEWPORT_FILL'));
});
test('R4 title safety rejects overlap and allows disjoint lower overlay',()=>{
 const title={left:220,top:230,width:770,height:340};
 const lower={left:0,top:680,width:1920,height:260};
 const wrong={left:0,top:470,width:1920,height:260};
 assert(titleSafeOverlay(lower,[title]));
 assert(!titleSafeOverlay(wrong,[title]));
 assert(rectIntersectionArea(lower,title)===0);
});
test('R4 Figma source identities and Wind LUT are retained',()=>{
 assert.deepEqual(figmaScene.sections.slice(0,3).map(s=>[s.id,s.top,s.height]),
  [['header',0,125],['hero',125,815],['info-bar',940,310]]);
 const speed=createHash('sha256').update(readFileSync(resolve(root,'app/data/home-film-speed.json'))).digest('hex');
 assert.equal(speed,'d3ce450cabe2f3d959ce2685499d171ded14e4208e56d039805825504e423e33');
 const stage=read('app/components/home/HomeIntroStage.vue');
 const film=read('app/components/home/HomeHeroFilm.vue');
 assert.match(stage,/:style="paintFrameStyle"/);
 assert.match(stage,/:paint-height-css-px="viewportPaintHeight"/);
 assert.match(stage,/titleSafeOverlay/);
 assert.match(film,/planFullViewportFilmLayout/);
 assert.doesNotMatch(stage,/window\.scrollTo/);
});

test('R4 actual HomeHeroFilm VM consumes requested viewport height and publishes matching geometry',async()=>{
 const runtime=await createFilmRuntime({width:1920,paintHeight:986.25,dpr:1});
 try{
  const p=runtime.h.layoutPlan.value;
  assert.equal(p.presentationHeightCssPx,986.25);
  assert.equal(p.frameHeightCssPx,815);
  assert.equal(p.presentationRevision,'FILM-INTRO-VIEWPORT-FILL-R4');
  const observed=runtime.stats().emittedGeometry.at(-1);
  assert(observed);
  assert.equal(observed.paintedHeightCss,986.25);
  assert.equal(observed.viewportRectCss.height,986.25);
 }finally{runtime.unmount();}
});
test('R4 native-swipe remains independently owned at mobile viewport height',async()=>{
 const runtime=await createFilmRuntime({width:390,paintHeight:768,dpr:3,fine:false});
 try{
  assert.equal(runtime.h.transport.value.kind,'native-swipe');
  assert.equal(runtime.h.layoutPlan.value.presentationHeightCssPx,768);
  assert.equal(runtime.stats().animationCreated,0);
 }finally{runtime.unmount();}
});
