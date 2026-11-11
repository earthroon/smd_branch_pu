/** R2 pure logic and source guard. Not a Nuxt compile or frame capture. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {heroDissolveLayerPhase,nextHeroDissolveIndex,heroDissolveSwipeDirection} from '../../app/utils/homeHeroDissolveState.ts';
const root=resolve(fileURLToPath(new URL('../../',import.meta.url)));
const read=path=>readFileSync(resolve(root,path),'utf8');
const vue=read('app/components/home/HomeHeroCarousel.vue');
const css=read('app/assets/css/home-hero-film.css');

test('R2 layer state: one departing and one incoming paint owner',()=>{
  assert.deepEqual([0,1,2].map(i=>heroDissolveLayerPhase(i,0,null,true)),['active','hidden','hidden']);
  assert.deepEqual([0,1,2].map(i=>heroDissolveLayerPhase(i,1,0,false)),['leaving','incoming','hidden']);
  assert.deepEqual([0,1,2].map(i=>heroDissolveLayerPhase(i,1,0,true)),['leaving','revealing','hidden']);
  assert.deepEqual([0,1,2].map(i=>heroDissolveLayerPhase(i,1,null,true)),['hidden','active','hidden']);
});
test('R2 index math: wrap in both directions; invalid inputs reject',()=>{
  assert.equal(nextHeroDissolveIndex(2,'next',3),0);
  assert.equal(nextHeroDissolveIndex(0,'previous',3),2);
  assert.equal(nextHeroDissolveIndex(1,'next',3),2);
  assert.throws(()=>nextHeroDissolveIndex(-1,'next',3),/SELECTION_INVALID/);
  assert.throws(()=>nextHeroDissolveIndex(0,'next',0),/SELECTION_INVALID/);
});
test('R2 swipe: horizontal travel only, native vertical gesture preserved',()=>{
  assert.equal(heroDissolveSwipeDirection(-75,10),'next');
  assert.equal(heroDissolveSwipeDirection(75,-10),'previous');
  assert.equal(heroDissolveSwipeDirection(-20,1),null);
  assert.equal(heroDissolveSwipeDirection(70,90),null);
  assert.equal(heroDissolveSwipeDirection(NaN,5),null);
  assert.match(css,/touch-action: pan-y pinch-zoom/);
});
test('R2 transition generation owns RAF/caption/timer and coalesces next input',()=>{
  assert.match(vue,/const epoch = \+\+motionEpoch/);
  assert.match(vue,/motionEpoch !== epoch/g);
  assert.match(vue,/prepareFrame = requestAnimationFrame/);
  assert.match(vue,/revealFrame = requestAnimationFrame/);
  assert.match(vue,/captionTimer = setTimeout/);
  assert.match(vue,/fadeTimer = setTimeout/);
  assert.match(vue,/pendingIndex\.value = target/);
  assert.match(vue,/clearMotionCallbacks\(\)/);
  assert.match(vue,/watch\(sourceRevision, \(\) => \{[\s\S]*?settleMotion\(\)/);
});
test('R2 media gating and lease remain explicit across responsive instances',()=>{
  assert.match(vue,/const ready = computed\(\(\) => slides\.value\.every/);
  assert.match(vue,/!reducedMotion\.value && !hovered\.value && !focused\.value/);
  assert.match(vue,/autoplayLease\.value !== null && autoplayLease\.value !== instanceId/);
  assert.match(vue,/if \(!mounted \|\| !canPlay\.value \|\| slides\.value\.length < 2\)/);
  assert.match(vue,/if \(autoplayLease\.value === instanceId\) autoplayLease\.value = null/);
  assert.match(vue,/revision !== sourceRevision\.value/);
  assert.match(vue,/data-hero-owner="owner \? 'active' : 'inactive'"/);
});
test('R2 image and captions are independently animated without Figma data edits',()=>{
  assert.doesNotMatch(css,/\.smd-hero-carousel__container \{ display: flex/);
  assert.doesNotMatch(vue,/useEmblaCarousel|embla-carousel-autoplay/);
  assert.match(css,/\[data-hero-layer-state="revealing"\][\s\S]*?opacity: 1/);
  assert.match(css,/\.smd-figma-scene-section--hero:has\(\.smd-hero-carousel\[data-hero-caption-phase="hidden"\]\)/);
  assert.match(css,/\.smd-home--hero:has\(\.smd-hero-carousel\[data-hero-caption-phase="hidden"\]\)/);
  assert.match(css,/transform: translateY\(12px\)/);
  assert.match(vue,/HERO_CAPTION_START_DELAY_MS/);
});
