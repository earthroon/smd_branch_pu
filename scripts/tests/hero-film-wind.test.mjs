import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import lut from '../../app/data/home-film-wind-lut.json' with {type:'json'};
import {
 admitFilmWindLut,verifyFilmWindLutDigest,windPositionAtTime,
 windSlopeAtTime,windTimeAtPosition,planWindLoop,planWindBridge,sampleWindKeyframes,
} from '../../app/utils/homeFilmWind.ts';
import {analyticWind,serializeWindLut} from '../film/bake-nonlinear-loop.mjs';
import {createFilmRuntime} from './hero-film-runtime-harness.mjs';
const read=p=>readFileSync(new URL('../../'+p,import.meta.url));
const sha=x=>createHash('sha256').update(x).digest('hex');
const offsets=Array.from({length:97},(_,i)=>i/96);

test('WIND CF1: source SPEED-R3 SHA frozen, deterministic build --check and identical bytes',()=>{
 assert.equal(sha(read('app/data/home-film-speed.json')),lut.parentSpeedSha256);
 assert.equal(read('app/data/home-film-wind-lut.json').toString(),serializeWindLut());
 const cwd=fileURLToPath(new URL('../..',import.meta.url));
 const run=spawnSync(process.execPath,['scripts/film/bake-nonlinear-loop.mjs','--check'],{cwd,encoding:'utf8'});
 assert.equal(run.status,0,`${run.error?.message??''} ${run.stderr}`);
 assert.equal(serializeWindLut(),serializeWindLut());
});
test('WIND CF1: canonical LUT structural admission and SHA integrity',async()=>{
 const approved=admitFilmWindLut(structuredClone(lut));
 assert.equal(approved.admission,'CANDIDATE');
 assert.equal(await verifyFilmWindLutDigest(approved),true);
 const bad=structuredClone(lut);bad.samples[33].positionFraction=bad.samples[32].positionFraction;
 assert.throws(()=>admitFilmWindLut(bad),/FILM_WIND_LUT_NONMONOTONE/);
 const altered=structuredClone(lut);altered.samples[33].positionFraction+=0.000001;
 assert.equal(await verifyFilmWindLutDigest(altered),false);
 const wrong=structuredClone(lut);wrong.parentSpeedSha256='0'.repeat(64);
 assert.throws(()=>admitFilmWindLut(wrong),/FILM_WIND_LUT_REVISION_MISMATCH/);
});
test('WIND CF1: profile knots and independent witness hash reject forged canonical revision',async()=>{
 const changed=structuredClone(lut);changed.knots[2].q=3.5;
 assert.throws(()=>admitFilmWindLut(changed),/FILM_WIND_LUT_PROFILE_DRIFT/);
 const witness=structuredClone(lut);witness.numericWitness.maxPositionResidual=0;
 const {contentSha256,...payload}=witness;
 witness.contentSha256=createHash('sha256').update(JSON.stringify(payload)).digest('hex');
 assert.equal(await verifyFilmWindLutDigest(witness),false);
});
test('WIND CF1: nonuniform speed, smooth analytic seam, position and velocity agree',()=>{
 assert.equal(lut.samples[0].positionFraction,0);
 assert.equal(lut.samples.at(-1).positionFraction,1);
 assert.equal(lut.samples[0].normalizedVelocity,lut.samples.at(-1).normalizedVelocity);
 assert(lut.numericWitness.maxPositionResidual<0.00005);
 assert(lut.numericWitness.maxVelocitySlopeResidual<0.001);
 const early=analyticWind(0.10).velocity;
 const middle=analyticWind(0.72).velocity;
 const burst=analyticWind(0.90).velocity;
 assert(early<middle&&middle<burst);
 const dy=1e-5;
 assert(Math.abs(analyticWind(1-dy).velocity-analyticWind(dy).velocity)<1e-8);
 for(let i=1;i<lut.samples.length;i++){
  assert(lut.samples[i].positionFraction>lut.samples[i-1].positionFraction);
 }
});
test('WIND CF1: invert encoded phase at boundaries and seeded interior probes',()=>{
 for(const u of [0,0.00001,0.1,0.62,0.6999,0.85,0.90,0.94,0.99999]){
  const x=windPositionAtTime(lut,u);
  const inv=windTimeAtPosition(lut,x);
  assert(Math.abs(u-inv)<1e-10,`${u} inverse ${inv}`);
  assert(windSlopeAtTime(lut,u)>0);
 }
 assert(Math.abs(windPositionAtTime(lut,2.345)-2-windPositionAtTime(lut,0.345))<1e-10);
});
test('WIND CF2: phase-shifted periodic WAAPI frames travel one cycle, never constant slope',()=>{
 for(const phase of [0,10,345.51,1100,1199.99]){
  const cycle=1200,points=planWindLoop(lut,phase,cycle);
  assert(points.length>500);
  assert.equal(points[0].distance,0);
  assert.equal(points.at(-1).distance,cycle);
  const slopes=points.slice(1).map((p,i)=>(p.distance-points[i].distance)/(p.offset-points[i].offset));
  assert(Math.max(...slopes)/Math.min(...slopes)>2);
  const cycleTimeMs=cycle/lut.meanSpeedCssPxS*1000;
  const start=sampleWindKeyframes(points,0,cycleTimeMs).velocityCssPxS;
  const end=sampleWindKeyframes(points,1,cycleTimeMs).velocityCssPxS;
  assert(Math.abs(start-end)<.05,`C1 seam ${start} ${end}`);
 }
});
test('WIND CF3: time warp phase-matched startup, brake and resume with R3 durations',()=>{
 const phase=360,cycle=1200;
 for(const [from,rate,duration] of [[0,1,1100],[0,1,1400],[193.2,0,600],[330,0,600]]){
  const bridge=planWindBridge(lut,phase,cycle,from,rate,duration,offsets);
  assert.equal(bridge.points[0].distance,0);
  assert.equal(bridge.points[0].offset,0);
  assert.equal(bridge.points.at(-1).offset,1);
  const speedStart=sampleWindKeyframes(bridge.points,0,duration).velocityCssPxS;
  const speedEnd=sampleWindKeyframes(bridge.points,1,duration).velocityCssPxS;
  assert(Math.abs(speedStart-from)<2,`start speed ${from} ${speedStart}`);
  if(rate===0)assert(speedEnd<2,`end speed ${speedEnd}`);
  else {
   const terminalPhase=(phase+bridge.points.at(-1).distance)%cycle;
   const terminalTime=windTimeAtPosition(lut,terminalPhase/cycle);
   const target=lut.meanSpeedCssPxS*windSlopeAtTime(lut,terminalTime);
   assert(Math.abs(speedEnd-target)/target<0.015,`terminal speed ${speedEnd} reference ${target}`);
  }
 }
});
test('WIND CF4: 926px mouse automatically starts wind; rail WAAPI displays phase-shaped loop',async()=>{
 const runtime=await createFilmRuntime({width:926,fine:true});
 try{
  const {h,stats,animation,root}=runtime;
  assert.equal(h.transport.value.kind,'desktop-lut');
  assert.equal(h.getWindReady(),true);
  assert.equal(stats().animationCreated,1);
  animation.currentTime=1100;animation.onfinish();
  const {frames,timing}=stats();
  assert.equal(timing.iterations,Infinity);assert(frames.length>500);
  assert.equal(root.dataset.filmWindProfile,'r13-film-wind-v1');
  const values=frames.map(f=>Number(f.transform.match(/translateX\((-?[\d.]+)px\)/)[1]));
  const offsets=frames.map(f=>f.offset);
  const slope=values.slice(1).map((v,i)=>Math.abs((v-values[i])/(offsets[i+1]-offsets[i])));
  assert(Math.max(...slope)/Math.min(...slope)>2);
  assert.equal(stats().animationCreated,1);
 }finally{runtime.unmount();}
});
test('WIND CF4: explicit reclick releases Commit, no Escape required',async()=>{
 const runtime=await createFilmRuntime({width:926,fine:true});
 try{
  const {h,store,animation}=runtime;
  animation.currentTime=1100;animation.onfinish();
  h.commit('hero-2','pointer');
  assert.equal(store.value.kind,'committed');
  h.commit('hero-2','pointer');
  assert.equal(store.value.kind,'idle');
  assert.equal(h.getPlan()?.loop,false); // 1400ms active resume bridge
 }finally{runtime.unmount();}
});
test('WIND CF4: touchscreen still has native scrolling; no moving rail WAAPI',async()=>{
 const runtime=await createFilmRuntime({width:390,fine:false});
 try{
  assert.equal(runtime.h.transport.value.kind,'native-swipe');
  assert.equal(runtime.stats().animationCreated,0);
  assert.equal(runtime.h.copies.value,1);
 }finally{runtime.unmount();}
});
test('WIND R2: nonlinear rail remains, but Figma Intro envelope is never shortened',()=>{
 const root=read('app/assets/css/home-hero-film.css').toString();
 const component=read('app/components/home/HomeHeroFilm.vue').toString();
 assert.doesNotMatch(root,/min-height:0|--film-painted-height|height:var\(--film-painted-height/);
 assert.match(component,/align-items:flex-start/);
 assert.doesNotMatch(component,/align-items:flex-end/);
 assert.match(component,/FILM_FRAME_HEIGHT_CSS_PX/);
 assert.match(component,/height:100%/);
 assert.match(component,/planFullViewportFilmLayout/);
 assert.doesNotMatch(component,/hero\?\.style\.setProperty\('--film-painted-height'/);
 assert.match(component,/data-film-wind-ready/);
});
