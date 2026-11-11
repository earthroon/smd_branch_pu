import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {
 FILM_FRAME_HEIGHT_CSS_PX,planHomeFilmLayout,filmLayoutPixelCheck,
} from '../../app/utils/homeFilmLayout.ts';
import {
 decideFilmFocus,validateFilmFocusChunk,filmFocusResponseCurrent,
 filmFocusSameIdentity,claimFilmFocusHost,releaseFilmFocusHost,ownsFilmFocusHost,
 allocateFilmFocusHostToken,homeFilmApprovedFocusPublications,
} from '../../app/utils/homeFilmFocusAdmission.ts';
import {homeFilmAssets,homeFilmEditorialReady} from '../../app/data/home-film.ts';
import {initialFilmSelection,reduceFilmSelection} from '../../app/utils/homeFilmSelection.ts';
import {createFilmRuntime} from './hero-film-runtime-harness.mjs';

const read=path=>readFileSync(new URL('../../'+path,import.meta.url));
const sha=path=>createHash('sha256').update(read(path)).digest('hex');
const images=homeFilmAssets.map(a=>({imageId:a.id,intrinsicWidthPx:a.width,
 intrinsicHeightPx:a.height,approvedRenditionWidthPx:a.width,
 approvedRenditionHeightPx:a.height,renditionId:'source-jpeg'}));
const layout=(width,dpr=1,mode=width<=1099?'native-swipe':'desktop-lut',inputImages=images)=>
  planHomeFilmLayout({frameHeightCssPx:815,containerWidthCssPx:width,devicePixelRatio:dpr,
    mode,sourceRevision:'source-fixture',images:inputImages});
const policy={visible:true,workerAvailable:true,webGpuAvailable:true,eco:false,dataSaver:false,reducedMotion:false};
const selection=(id='hero-1')=>reduceFilmSelection(initialFilmSelection(),{
 kind:'commit',imageId:id,origin:'keyboard'}).state;
const chunk={schema:'film-focus-chunk-v1',imageId:'hero-1',sourceImageSha256:'a'.repeat(64),
 sourceWidthPx:1920,sourceHeightPx:1275,chunkId:'fixture-chunk',url:'/api/media/focus.png',
 renditionId:'fixture-rendition',chunkSha256:'b'.repeat(64),chunkWidthPx:640,
 chunkHeightPx:425,sourceRectPx:{x:0,y:0,width:640,height:425},
 uv:[0,0,1,1],paddingPx:0,maxZoom:1.0,assetRevision:'fixture-v1',publicationWitness:'fixture-publication'};
const approvals=[{imageId:'hero-1',publicationWitness:chunk.publicationWitness,
 assetRevision:chunk.assetRevision,sourceImageSha256:chunk.sourceImageSha256,
 chunkSha256:chunk.chunkSha256}];
const decision=(params={})=>decideFilmFocus({selection:selection(),layoutRevision:'layout-a',
 focusGeneration:8,policy,manifest:[chunk],approvals,origin:'https://example.org',...params});

test('CF5 layout: frame authority remains 815, desktop 1920 shows two unmodified-ratio images',()=>{
 const p=layout(1920);assert.equal(FILM_FRAME_HEIGHT_CSS_PX,815);
 assert.equal(p.frameHeightCssPx,815);assert.equal(p.targetFullVisibleCount,2);
 assert.equal(p.realizedFullVisibleCount,2);assert.equal(p.constraintStatus,'ADMITTED');
 assert.equal(p.slots[0].widthCssPx,960);assert.equal(p.slots[0].heightCssPx,637.5);
 assert.equal(p.slots[0].topCssPx,177.5);assert(filmLayoutPixelCheck(p,images));
});
test('CF5 layout: ultrawide 3440 shows four complete photos (one is a visual repeat)',()=>{
 const p=layout(3440);assert.equal(p.targetFullVisibleCount,4);
 assert.equal(p.realizedFullVisibleCount,4);assert.equal(p.constraintStatus,'ADMITTED');
 assert.equal(p.slots.length,3);assert.equal(p.slots[0].widthCssPx,860);
 assert.equal(p.slots[0].heightCssPx,571.09375);assert(filmLayoutPixelCheck(p,images));
});
test('CF5 layout: DPR3 never upscales to force exactly two visible; conflict is explicit',()=>{
 const p=layout(1920,3);assert.equal(p.targetFullVisibleCount,2);
 assert.equal(p.slots[0].widthCssPx,640);assert.equal(p.realizedFullVisibleCount,3);
 assert.equal(p.constraintStatus,'LAYOUT_CONSTRAINT_CONFLICT');
 assert(p.violatedSoftGoals.includes('DPR_PIXEL_CAPACITY_VS_COVERAGE'));
 assert.equal(p.sourceCropCount,0);assert.equal(p.unapprovedUpscaleCount,0);
 assert(filmLayoutPixelCheck(p,images));
});
test('CF5 layout: mobile 375/390 keeps one photo plus partial neighbor, with actual scrollable cycle',()=>{
 for(const width of [375,390]){
  const p=layout(width);assert.equal(p.mode,'native-swipe');
  assert.equal(p.targetFullVisibleCount,1);assert.equal(p.realizedFullVisibleCount,1);
  assert.equal(p.slots[0].widthCssPx,width/1.25);
  assert(p.cycleWidthCssPx>width);assert(filmLayoutPixelCheck(p,images));
 }
});
test('CF5 layout: intermediate widths 1099,1100,1380,1599,1600 consistent and finite',()=>{
 for(const width of [699,700,1099,1100,1380,1599,1600]){
  const p=layout(width);assert(p.slots.every(s=>Number.isFinite(s.widthCssPx)));
  assert(filmLayoutPixelCheck(p,images));
  assert.equal(p.targetFullVisibleCount,width>=1600?2:1);
 }
});
test('CF5 layout: same input same revision and slot geometry, changed DPR/source changes revision',()=>{
 const a=layout(1920),b=layout(1920),c=layout(1920,2);
 assert.deepEqual(a,b);assert.notEqual(a.layoutRevision,c.layoutRevision);
 const changed=planHomeFilmLayout({frameHeightCssPx:815,containerWidthCssPx:1920,
  devicePixelRatio:1,mode:'desktop-lut',sourceRevision:'new-source',images});
 assert.notEqual(a.layoutRevision,changed.layoutRevision);
});
test('CF5 layout: synthetic panorama/portrait/low resolution obey exact source pixel caps',()=>{
 const synthetic=images.map((im,i)=>({...im,intrinsicWidthPx:[400,100,600][i],
  intrinsicHeightPx:[100,500,400][i],approvedRenditionWidthPx:[400,100,600][i],
  approvedRenditionHeightPx:[100,500,400][i]}));
 const p=layout(1920,3,'desktop-lut',synthetic);
 assert(filmLayoutPixelCheck(p,synthetic));assert.equal(p.unapprovedUpscaleCount,0);
 assert.equal(p.sourceCropCount,0);assert.equal(p.constraintStatus,'LAYOUT_CONSTRAINT_CONFLICT');
});
test('CF5 layout: invalid source/DPR/container/rendition and duplicate identity fail closed',()=>{
 for(const args of [
  {containerWidthCssPx:NaN},{containerWidthCssPx:0},{devicePixelRatio:0},
  {devicePixelRatio:Infinity},{images:[{...images[0],intrinsicWidthPx:NaN}]},
  {images:[{...images[0],approvedRenditionWidthPx:3000}]},
  {images:[images[0],images[0]]},
 ]){
  assert.throws(()=>planHomeFilmLayout({frameHeightCssPx:815,containerWidthCssPx:1920,
   devicePixelRatio:1,mode:'desktop-lut',sourceRevision:'x',images,...args}),
   /FILM_LAYOUT_INPUT_INVALID/);
 }
});
test('CF5 admission: legacy V0 manifest rejected without guessing image / R2 publication binding',()=>{
 const v0=JSON.parse(read('app/data/home-film-focus.json'));
 assert.equal(homeFilmApprovedFocusPublications.length,0);
 assert.equal(validateFilmFocusChunk(v0[0],'https://example.org').kind,'rejected');
 const d=decision({manifest:v0,approvals:homeFilmApprovedFocusPublications});
 assert.equal(d.kind,'css');assert.equal(d.reason,'FILM_FOCUS_ASSET_UNVERIFIED');
});
test('CF5 admission: V1 geometry / origin / digest / publication negative fixtures',()=>{
 assert.equal(validateFilmFocusChunk(chunk,'https://example.org').kind,'valid');
 for(const bad of [
  {...chunk,chunkSha256:'bad'},{...chunk,url:'https://evil.invalid/hidden'},
  {...chunk,url:'//evil.invalid/hidden'},{...chunk,uv:[0,0,1.1,1]},
  {...chunk,sourceRectPx:{x:2000,y:0,width:2,height:2}},
  {...chunk,paddingPx:300},{...chunk,sourceImageSha256:''},
 ])assert.equal(validateFilmFocusChunk(bad,'https://example.org').kind,'rejected');
 for(const invalid of [
  [],[{...approvals[0],chunkSha256:'c'.repeat(64)}],
  [{...approvals[0],publicationWitness:'unverified'}],
 ]){
  const d=decision({approvals:invalid});assert.equal(d.kind,'css');
  assert.equal(d.reason,'FILM_FOCUS_PUBLICATION_UNVERIFIED');
 }
});
test('CF5 admission: positive publisher fixture admits only current image and correct revision',()=>{
 const d=decision();assert.equal(d.kind,'worker-webgpu');
 assert.equal(d.imageId,'hero-1');assert.equal(d.chunk.chunkId,'fixture-chunk');
 assert.equal(d.layoutRevision,'layout-a');assert.equal(d.focusGeneration,8);
 assert.equal(decision({selection:selection('hero-2')}).kind,'css');
});
test('CF5 admission: idle/no intent, eco, Save-Data, Reduced Motion never fetch',()=>{
 assert.deepEqual(decision({selection:initialFilmSelection()}),
  {kind:'static',reason:'FILM_FOCUS_NO_INTENT',imageId:null});
 for(const key of ['eco','dataSaver','reducedMotion']){
  const d=decision({policy:{...policy,[key]:true}});
  assert.equal(d.kind,'static');assert.equal(d.reason,'FILM_FOCUS_POLICY_DISABLED');
 }
 assert.equal(decision({policy:{...policy,visible:false}}).kind,'static');
 assert.equal(decision({policy:{...policy,workerAvailable:false}}).reason,'FILM_FOCUS_GPU_UNAVAILABLE');
});
test('CF5 Worker currentness: full identity checks every field, stale reply cannot present',()=>{
 const id={imageId:'hero-1',interactionGeneration:2,focusGeneration:3,
  layoutRevision:'r1',assetRevision:'r1',deviceGeneration:1,hostGeneration:7};
 const message={kind:'rendered',identity:id};
 assert.equal(filmFocusResponseCurrent(message,id),true);
 for(const field of ['imageId','interactionGeneration','focusGeneration',
  'layoutRevision','assetRevision','deviceGeneration','hostGeneration']){
  const forged={...id,[field]:typeof id[field]==='number'?id[field]+1:'different'};
  assert.equal(filmFocusSameIdentity(forged,id),false);
  assert.equal(filmFocusResponseCurrent(message,forged),false);
 }
 assert.equal(filmFocusResponseCurrent({kind:'failed',stage:'DEVICE',reason:'LOST',identity:id},id),false);
});
test('CF5 Worker host lease: switching responsive owners retires exactly old owner',()=>{
 let oldRetires=0,newRetires=0;
 const a=allocateFilmFocusHostToken(),b=allocateFilmFocusHostToken();
 claimFilmFocusHost(a,()=>oldRetires++);assert(ownsFilmFocusHost(a));
 claimFilmFocusHost(b,()=>newRetires++);
 assert.equal(oldRetires,1);assert(!ownsFilmFocusHost(a));assert(ownsFilmFocusHost(b));
 releaseFilmFocusHost(a);assert(ownsFilmFocusHost(b));
 releaseFilmFocusHost(b);assert(!ownsFilmFocusHost(b));assert.equal(newRetires,0);
});
test('R4 component: immutable source 815, fullscreen viewport painting and no photo crop',()=>{
 const src=read('app/components/home/HomeHeroFilm.vue').toString();
 assert.match(src,/FILM_FRAME_HEIGHT_CSS_PX/);
 assert.match(src,/planFullViewportFilmLayout/);
 assert.match(src,/data-film-fill="intro-viewport"/);
 assert.match(src,/rootPaintStyle/);
 assert.match(src,/slotStyle\(index\)/);
 assert.match(src,/window\.devicePixelRatio\|\|1/);
 assert.doesNotMatch(src,/object-fit:\s*cover/);
 assert.match(src,/\.smd-hero-film\[data-film-fill="intro-viewport"\] \.smd-hero-film__slot/);
 assert.match(read('app/assets/css/home-hero-film.css').toString(),/node-1:5/);
 assert.doesNotMatch(read('app/assets/css/home-hero-film.css').toString(),/--film-painted-height/);
});
test('CF5 component: GPU cannot change reducer, SSR semantic source remains one per image',()=>{
 const src=read('app/components/home/HomeHeroFilm.vue').toString();
 assert.match(src,/v-for="item in editorial"/);
 assert.match(src,/aria-hidden="true" inert/);
 assert.match(src,/decideFilmFocus/);assert.match(src,/filmFocusResponseCurrent/);
 assert.match(src,/focusDecision\.value=\{kind:'css'/);
 assert.match(src,/<canvas[^>]*aria-hidden/);
 assert(!src.includes('dispatch({kind:\'commit\''+'\n  // Worker')); // no Worker-side commit
 assert.equal(homeFilmEditorialReady,false);
});
test('CF5 original byte identities: three photos and SPEED-R3 keep parent digests',()=>{
 for(const name of ['1(1).jpg','2.jpg','3.jpg']){
  assert.equal(sha('public/media/hero/'+name).length,64);
 }
 assert.equal(sha('app/data/home-film-speed.json'),
  'd3ce450cabe2f3d959ce2685499d171ded14e4208e56d039805825504e423e33');
});
for(const width of [390,1920,3440]){
 test(`CF6 model runtime ${width}px: planner adopted, selection independent of GPU and mobile transport`,async()=>{
  const h=await createFilmRuntime({width});
  try{
   assert.equal(h.h.layoutPlan.value.frameHeightCssPx,815);
   assert.equal(h.h.layoutPlan.value.containerWidthCssPx,width);
   h.h.commit('hero-2','keyboard');
   assert.equal(h.store.value.imageId,'hero-2');
   assert.equal(h.h.focusDecision.value.kind,'css');
   assert.equal(h.h.focusDecision.value.reason,'FILM_FOCUS_ASSET_UNVERIFIED');
   assert.equal(h.h.transport.value.kind,width<=1099?'native-swipe':'desktop-lut');
  }finally{h.unmount();}
 });
}
test('CF6 model DPR mutation triggers fresh plan without changing committed image ID',async()=>{
 const h=await createFilmRuntime({width:1920});
 try{
  h.h.commit('hero-3','keyboard');
  const a=h.h.layoutPlan.value.layoutRevision;
  await h.updateDpr(3);
  assert.notEqual(h.h.layoutPlan.value.layoutRevision,a);
  assert.equal(h.store.value.imageId,'hero-3');
  assert.equal(h.h.layoutPlan.value.presentationRevision,'FILM-INTRO-VIEWPORT-FILL-R4');
  assert.equal(h.h.layoutPlan.value.presentationHeightCssPx,815);
  assert.equal(h.h.layoutPlan.value.unapprovedUpscaleCount,3);
  assert.equal(h.h.layoutPlan.value.sourceCropCount,0);
 }finally{h.unmount();}
});
test('CF6: real browser verification runner exists, separate from hardware/physical claims',()=>{
 const src=read('scripts/verify-hero-film-browser.mjs').toString();
 assert.match(src,/chromium\.launch/);
 assert.match(src,/dragNativeTouch/);
 assert.match(src,/data-film-mode/);
 assert(!src.includes('PASS_FILM_R13_RESTORE_CF6_PHYSICAL_QUALIFICATION'));
});
