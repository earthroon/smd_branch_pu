import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash, webcrypto } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
 admitFilmRateLut,captureFilmViewportAnchor,endNativeFilmGesture,filmMotionMode,
 idleFilmPointer,moveNativeFilmGesture,nativeFilmGestureScrolled,
 observeFilmPointer,positionFilmAnchor,rateForFilmPointer,
 startFilmPointerObservation,startNativeFilmGesture,verifyFilmRateLutDigest,
} from '../../app/utils/homeFilmMotion.ts';
import { createFilmRuntime } from './hero-film-runtime-harness.mjs';

const read=path=>readFileSync(new URL('../../'+path,import.meta.url));
const curve=JSON.parse(read('app/data/home-film-speed.json'));
const lut=JSON.parse(read('app/data/home-film-rate-lut.json'));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const ev=(pointerId,x,y,timeStamp)=>({pointerId,clientX:x,clientY:y,timeStamp});
const slot=(imageId,left,right)=>({imageId,left,right,top:0,bottom:815});

// Original SPEED-R3 bytes, Figma/Editorial assets, Worker remain the parent SSOT.
test('CF3: original SPEED-R3 SHA and authored durations are byte-frozen',()=>{
 assert.equal(sha(read('app/data/home-film-speed.json')),'d3ce450cabe2f3d959ce2685499d171ded14e4208e56d039805825504e423e33');
 assert.deepEqual([curve.base,curve.enterMs,curve.leaveMs,curve.startMs,curve.samples.length],[193.2,600,1400,1100,97]);
 assert.equal(lut.parentSpeedSha256,sha(read('app/data/home-film-speed.json')));
});
test('CF3: both source verifiers pass and rate LUT stays byte-identical on check',()=>{
 const cwd=fileURLToPath(new URL('../..',import.meta.url));
 for(const [path,args] of [
  ['scripts/film/verify-speed-source.mjs',[]],
  ['scripts/film/bake-motion-lut.mjs',['--check']],
 ]) {
  const run=spawnSync(process.execPath,[path,...args],{cwd,encoding:'utf8'});
  assert.equal(run.status,0,`${path} status=${run.status} signal=${run.signal??'none'} error=${run.error?.message??'none'}\n${run.stderr||run.stdout}`);
 }
});
test('CF3: timestamp EMA observes CSS px/s without DPR multiplication',()=>{
 const first=startFilmPointerObservation(ev(4,120,100,100),1,1);
 assert.equal(first.emaX,0);
 const second=observeFilmPointer(first,ev(4,220,100,140),lut.policy,1,1);
 assert.equal(second.kind,'accepted');
 const expected=(1-Math.exp(-40/lut.policy.emaTauMs))*2500;
 assert(Math.abs(second.sample.emaX-expected)<1e-8);
 assert.equal(second.sample.emaY,0);
 const replay=observeFilmPointer(first,ev(4,220,100,140),lut.policy,1,1);
 assert.deepEqual(replay,second);
});
test('CF3: invalid timestamps, stale pointer, short delta and discontinuous gap are classified',()=>{
 const first=startFilmPointerObservation(ev(4,120,100,100),1,1);
 for(const [event,gen,layout,reason] of [
  [ev(4,120,100,100),1,1,'FILM_MOTION_POINTER_TIME_INVALID'],
  [ev(4,130,100,90),1,1,'FILM_MOTION_POINTER_TIME_INVALID'],
  [ev(4,130,100,101),1,1,'FILM_MOTION_POINTER_COALESCED'],
  [ev(5,130,100,140),1,1,'FILM_MOTION_GENERATION_STALE'],
  [ev(4,130,100,140),2,1,'FILM_MOTION_GENERATION_STALE'],
  [ev(4,Infinity,100,140),1,1,'FILM_MOTION_POINTER_NONFINITE'],
 ]) {
  const result=observeFilmPointer(first,event,lut.policy,gen,layout);
  assert.equal(result.kind,'ignored');assert.equal(result.reason,reason);
 }
 assert.equal(observeFilmPointer(first,ev(4,130,100,800),lut.policy,1,1).kind,'reset');
 assert.throws(()=>startFilmPointerObservation(ev(4,NaN,0,10),1,1),/FILM_MOTION_POINTER_NONFINITE/);
});
test('CF3: one armed idle reset converges to zero, no frame loop',()=>{
 const p=startFilmPointerObservation(ev(1,0,0,0),1,1);
 const q=observeFilmPointer(p,ev(1,400,0,100),lut.policy,1,1).sample;
 assert(q.emaX>0);
 const settled=idleFilmPointer(q,q.atMs+lut.policy.idleResetMs,lut.policy);
 assert.equal(settled.emaX,0);assert.equal(settled.emaY,0);
 assert.throws(()=>idleFilmPointer(q,q.atMs-1,lut.policy),/FILM_MOTION_POINTER_TIME_INVALID/);
});
test('CF3: offline LUT admits exact parent and cryptographic digest; forged table fails',async()=>{
 const admitted=admitFilmRateLut(structuredClone(lut));
 assert.equal(admitted.status,'CANDIDATE_NOT_PHYSICALLY_ADMITTED');
 assert.equal(await verifyFilmRateLutDigest(admitted),true);
 const forged=structuredClone(lut);forged.bins[2].rate=0;
 assert.throws(()=>admitFilmRateLut(forged),/FILM_MOTION_LUT_BINS_INVALID/);
 const altered=structuredClone(lut);altered.bins[2].rate=1.4;
 assert.equal(await verifyFilmRateLutDigest(altered),false);
 const drift=structuredClone(lut);drift.parentSpeedSha256='f'.repeat(64);
 assert.throws(()=>admitFilmRateLut(drift),/FILM_MOTION_LUT_REVISION_MISMATCH/);
});
test('CF3: signed log bins and hysteresis are deterministic, no negative playbackRate',()=>{
 const p=startFilmPointerObservation(ev(1,100,100,0),1,1);
 const pos={...p,emaX:60,emaY:80},neg={...p,emaX:-60,emaY:80};
 const first=rateForFilmPointer(lut,pos,null);
 assert.equal(first.direction,1);assert(first.rate>0);
 assert.deepEqual(rateForFilmPointer(lut,pos,first),first);
 const reverse=rateForFilmPointer(lut,neg,first);assert.equal(reverse.direction,-1);
 assert(reverse.rate>0);
 const quiet=rateForFilmPointer(lut,{...p,emaX:0,emaY:0},reverse);
 assert.equal(quiet.direction,0);assert.equal(quiet.rate,1);
});
test('CF3: viewport anchor is logical ID + local fraction, not center-image snap',()=>{
 const rects=[slot('hero-1',0,300),slot('hero-2',300,600),slot('hero-3',600,900)];
 const anchor=captureFilmViewportAnchor(rects,450,400);
 assert.deepEqual(anchor,{imageId:'hero-2',fraction:0.5,viewportCssX:450});
 assert.equal(positionFilmAnchor(anchor,rects,0,0,null,2000),0);
 const shifted=[slot('hero-1',0,500),slot('hero-2',500,1000),slot('hero-3',1000,1500)];
 assert.equal(positionFilmAnchor(anchor,shifted,0,0,null,2000),300);
 assert.throws(()=>positionFilmAnchor(anchor,[],0,0,null,2000),/FILM_MOTION_ANCHOR_UNRESOLVED/);
});
test('CF4/R1: input transport is independent of 1099px breakpoint, native touch remains scrollable',()=>{
 assert.equal(filmMotionMode(926,true,false,{fineHover:true,actualPointerType:null}),'desktop-lut');
 assert.equal(filmMotionMode(926,true,false,{fineHover:false,actualPointerType:'mouse'}),'desktop-lut');
 assert.equal(filmMotionMode(926,true,false,{fineHover:true,actualPointerType:'touch'}),'native-swipe');
 assert.equal(filmMotionMode(1920,true,false,{fineHover:false,actualPointerType:'touch'}),'native-swipe');
 assert.equal(filmMotionMode(1100,true,false,{fineHover:true,actualPointerType:null}),'desktop-lut');
 assert.equal(filmMotionMode(390,true,true,{fineHover:false,actualPointerType:null}),'native-swipe');
 assert.equal(filmMotionMode(1920,true,true,{fineHover:true,actualPointerType:null}),'static');
 assert.equal(filmMotionMode(1920,false,false,{fineHover:true,actualPointerType:null}),'static');
});
test('CF4: mobile tap classification requires unchanged image, gesture, scroll and generation',()=>{
 const initial=startNativeFilmGesture(9,4,'hero-1',200,200,100,0);
 const slight=moveNativeFilmGesture(initial,9,4,203,202);
 assert.equal(slight.kind,'candidate');
 assert.deepEqual(endNativeFilmGesture(slight,9,4,203,202,200,0,'hero-1'),{kind:'tap',imageId:'hero-1'});
 assert.equal(endNativeFilmGesture(slight,8,4,203,202,200,0,'hero-1').kind,'not-tap');
 assert.equal(endNativeFilmGesture(slight,9,5,203,202,200,0,'hero-1').kind,'not-tap');
 assert.equal(endNativeFilmGesture(slight,9,4,203,202,200,0,'hero-2').reason,'FILM_TOUCH_GESTURE_IDENTITY_DRIFT');
 assert.equal(endNativeFilmGesture(slight,9,4,203,202,800,0,'hero-1').kind,'not-tap');
 const scrolled=nativeFilmGestureScrolled(initial,4);
 assert.equal(endNativeFilmGesture(scrolled,9,4,200,200,150,0,'hero-1').kind,'not-tap');
 assert.equal(moveNativeFilmGesture(initial,9,4,250,202).kind,'scrolling');
 assert.equal(moveNativeFilmGesture(initial,9,4,200,240).axis,'vertical');
});
test('CF4: mobile runtime never starts rail WAAPI and native scroll is not reset',async()=>{
 const runtime=await createFilmRuntime({width:390});
 try{
  const {h,track,stats,store}=runtime;
  assert.equal(h.transport.value.kind,'native-swipe');
  assert.equal(h.copies.value,1);
  assert.equal(stats().animationCreated,0);
  h.down({...ev(7,100,200,10),pointerType:'touch',target:{closest:()=>null}});
  h.move({...ev(7,180,200,80),pointerType:'touch'});
  track.scrollLeft=155;h.scroll();
  h.up({...ev(7,180,200,110),pointerType:'touch'});
  assert.equal(store.value.kind,'idle');
  assert.equal(track.scrollLeft,155);
  assert.equal(stats().animationCreated,0);
 }finally{runtime.unmount();}
});
test('CF4: positive native Tap commits exactly once; focus animates image only',async()=>{
 const runtime=await createFilmRuntime({width:390});
 try{
  const {h,store,stats}=runtime;
  h.down({...ev(5,100,200,50),pointerType:'touch',target:{closest:()=>null}});
  h.up({...ev(5,100,200,100),pointerType:'touch'});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(store.value.kind,'committed');
  assert.equal(store.value.imageId,'hero-1');
  assert.equal(store.value.origin,'touch');
  const generation=store.value.generation;
  h.up({...ev(5,100,200,120),pointerType:'touch'});
  assert.equal(store.value.generation,generation);
  assert.deepEqual(stats().focusTimings.map(x=>x.duration),[260,190]);
  assert.equal(stats().animationCreated,0);
 }finally{runtime.unmount();}
});
test('CF4: pointercancel invalidates Tap, next real Tap still works',async()=>{
 const runtime=await createFilmRuntime({width:390});
 try{
  const {h,store}=runtime;
  h.down({...ev(7,150,200,10),pointerType:'touch',target:{closest:()=>null}});
  h.cancelTouch({...ev(7,150,200,20),pointerType:'touch'});
  h.up({...ev(7,150,200,40),pointerType:'touch'});
  assert.equal(store.value.kind,'idle');
  h.down({...ev(8,150,200,50),pointerType:'touch',target:{closest:()=>null}});
  h.up({...ev(8,150,200,90),pointerType:'touch'});
  assert.equal(store.value.kind,'committed');
 }finally{runtime.unmount();}
});
test('CF4: responsive native -> desktop -> native preserves logical selection and avoids dual transport',async()=>{
 const runtime=await createFilmRuntime({width:390});
 try{
  const {h,store,track,stats,updateGeometry}=runtime;
  h.commit('hero-2','keyboard');
  const id=store.value.imageId;
  await updateGeometry(1920);
  assert.equal(h.transport.value.kind,'desktop-lut');
  assert.equal(h.copies.value,8);
  assert.equal(store.value.imageId,id);
  assert.equal(stats().animationCreated,0); // committed => transport stays stopped
  await updateGeometry(390);
  assert.equal(h.transport.value.kind,'native-swipe');
  assert.equal(h.copies.value,1);
  assert.equal(store.value.imageId,id);
  const last=track.scrollLeft;
  h.scroll();assert.equal(track.scrollLeft,last);
 }finally{runtime.unmount();}
});
test('CF3/R1: pointer-rate candidate never modifies an active hover bridge, redundant events remain no-op',async()=>{
 const runtime=await createFilmRuntime({width:1920,motionProfile:'pointer-rate-candidate'});
 try{
  const {h,stats,animation}=runtime;
  await new Promise(r=>setTimeout(r,40));
  animation.currentTime=1100;animation.onfinish(); // non-linear periodic loop
  animation.currentTime=450;
  h.enter({...ev(4,100,200,100),pointerType:'mouse'});
  h.move({...ev(4,340,200,180),pointerType:'mouse'});
  assert.equal(h.getPlan()?.loop,false);
  const before=stats().rateUpdates;
  for(let i=0;i<100;i++)h.move({...ev(4,340,200,180),pointerType:'mouse'});
  assert.equal(stats().rateUpdates,before);
  assert.equal(stats().animationCreated,1);
 }finally{runtime.unmount();}
});
test('CF3/CF4: no legacy touch settle/restart or frame JS integrator in component',()=>{
 const source=read('app/components/home/HomeHeroFilm.vue').toString();
 assert.doesNotMatch(source,/requestAnimationFrame|setInterval/);
 assert.match(source,/decideFilmFocus/);
 assert.doesNotMatch(source,/clearTimeout\(settle\)|setTimeout\(\(\)\s*=>\s*\{\s*phase=mod\(track/);
 assert.match(source,/data-film-mode="transport.kind"/);
 assert.match(source,/overscroll-behavior-x:contain;touch-action:auto/);
 assert.match(source,/animation\.updatePlaybackRate\(decision.rate\)|ownedAnimation\.updatePlaybackRate\(decision.rate\)/);
 assert.match(source,/animation\.ready|ownedAnimation\.ready/);
 assert.match(source,/pointerType==='touch'/);
 assert.match(source,/case 'desktop-lut'|case 'native-swipe'/);
});

test('CF4: reduced-motion retains native tap/keyboard Commit but starts no Focus animation',async()=>{
 const mobile=await createFilmRuntime({width:390,reduced:true});
 try{
  const {h,store,stats}=mobile;
  h.down({...ev(3,100,200,40),pointerType:'touch',target:{closest:()=>null}});
  h.up({...ev(3,100,200,80),pointerType:'touch'});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(store.value.kind,'committed');
  assert.equal(store.value.imageId,'hero-1');
  assert.equal(stats().focusTimings.length,0);
  assert.equal(stats().animationCreated,0);
 }finally{mobile.unmount();}
 const desktop=await createFilmRuntime({width:1920,reduced:true});
 try{
  assert.equal(desktop.h.transport.value.kind,'static');
  assert.equal(desktop.stats().animationCreated,0);
  desktop.h.commit('hero-2','keyboard');
  assert.equal(desktop.store.value.imageId,'hero-2');
 }finally{desktop.unmount();}
});

test('CF4: hidden responsive branch never starts AutoFlow, then admits motion after becoming visible',async()=>{
 const runtime=await createFilmRuntime({width:1920});
 try{
  const {h,root,stats}=runtime;
  const original=stats().animationCreated;
  root.clientWidth=0;await h.resize();
  assert.equal(h.transport.value.kind,'static');
  assert(stats().animationCancelled>=1);
  const count=stats().animationCreated;
  await h.resize();assert.equal(stats().animationCreated,count);
  root.clientWidth=1920;await h.resize();
  assert.equal(h.transport.value.kind,'desktop-lut');
  assert.equal(stats().animationCreated,original); // reuses its one rail Animation
 }finally{runtime.unmount();}
});
