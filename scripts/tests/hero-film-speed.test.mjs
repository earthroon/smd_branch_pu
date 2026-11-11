import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const curve=JSON.parse(readFileSync(new URL('../../app/data/home-film-speed.json',import.meta.url)));
test('cruise reduced by 60 percent; pointer target zero',()=>{assert.equal(curve.base,193.2);assert.equal(curve.samples.length,97);for(const r of curve.hoverRates)assert.equal(r,0);});
test('baked velocity blend anchors and zero endpoint acceleration/jerk',()=>{
 assert.equal(curve.samples[0].blend,0);assert.equal(curve.samples.at(-1).blend,1);assert.equal(curve.samples.at(-1).integral,.5);
 for(const t of [0,1]){assert.equal(30*t*t*(t-1)**2,0);assert.equal(120*t**3-180*t**2+60*t,0);}
});
test('all transitions move forward; no intermediate overspeed or reversal',()=>{
 for(const from of [0,193.2])for(const to of [0,193.2]){
 let previous=-1;for(const s of curve.samples){const v=from+(to-from)*s.blend;const x=1.4*(from*s.t+(to-from)*s.integral);assert(v>=Math.min(from,to)-1e-8&&v<=Math.max(from,to)+1e-8);assert(x>=previous);previous=x;}
 }
});
test('retain SPEED-R3 WAAPI curve while restoring R13 selection without per-frame motion tick or GPU',()=>{
 const source=readFileSync(new URL('../../app/components/home/HomeHeroFilm.vue',import.meta.url),'utf8');
 assert.doesNotMatch(source,/requestAnimationFrame|setInterval/);
 assert.match(source,/decideFilmFocus/);assert.match(source,/<canvas/);
 assert.match(source,/reduceFilmSelection/);assert.match(source,/@keydown="key"/);
 assert.match(source,/setKeyframes/);assert.match(source,/iterations:loop\?Infinity:1/);
});
import {createFilmRuntime} from './hero-film-runtime-harness.mjs';
test('actual component reuses WAAPI with nonlinear wind loop and phase matched SPEED-R3 durations',async()=>{
 const runtime=await createFilmRuntime({width:1920});
 try{
  const {h,animation,stats}=runtime;
  assert.equal(h.transport.value.kind,'desktop-lut');
  assert.equal(stats().animationCreated,1);
  assert.equal(stats().frames.length,97); // initial 1100ms wind acceleration bridge
  animation.currentTime=1100;animation.onfinish();
  assert.equal(stats().animationCreated,1);
  assert(stats().frames.length>500,'periodic animation must own the dense wind keyframes');
  animation.currentTime=500;
  h.enter({pointerType:'mouse',pointerId:1,clientX:300,clientY:200,timeStamp:100});
  assert.equal(stats().frames.length,97); // 600ms slowdown bridge
  animation.currentTime=600;animation.onfinish();
  assert.equal(animation.playState,'idle');
  const stopped=stats().animationCancelled;
  h.enter({pointerType:'mouse',pointerId:1,clientX:300,clientY:200,timeStamp:1000});
  assert.equal(stats().animationCancelled,stopped);
  h.leave({pointerType:'mouse'});
  assert.equal(animation.playState,'running');
  assert.equal(stats().animationCreated,1);
  assert.equal(stats().rateUpdates,0);
 }finally{runtime.unmount();}
});
