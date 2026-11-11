/** R1G source-contract + real function VM checks. Not a Nuxt/physical browser test. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
const root = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const carousel = readFileSync(resolve(root, 'app/components/home/HomeHeroCarousel.vue'), 'utf8');
const intro = readFileSync(resolve(root, 'app/composables/useHomeIntroReveal.ts'), 'utf8');
function between(source, start, end) {
  const a = source.indexOf(start), b = source.indexOf(end, a + start.length);
  assert.ok(a >= 0 && b > a, `R1G_SOURCE_FUNCTION_NOT_FOUND:${start}`);
  return source.slice(a, b);
}
const imagePredicate = between(carousel, 'function eventIsCurrent(', 'function decodeImage(')
  .replace('node: EventTarget | null, slot: HeroCarouselSlot): node is HTMLImageElement', 'node, slot)');
const start = between(intro, 'function start(', 'function tick(')
  .replace('now:number,source:IntroIntent):boolean', 'now,source)');
const request = between(intro, 'function requestBufferedIntent(', 'function onWheel(')
  .replace('source:IntroIntent):boolean', 'source)');

test('R1G no manufactured Event or unsafe casts in decode completion', () => {
  assert.doesNotMatch(carousel, /\{\s*currentTarget:\s*img\s*\}\s+as\s+(?:unknown\s+as\s+)?Event/);
  assert.match(carousel, /function eventIsCurrent\(node: EventTarget \| null, slot: HeroCarouselSlot\): node is HTMLImageElement/);
  assert.match(carousel, /revision !== sourceRevision\.value \|\| !img\.isConnected \|\| !eventIsCurrent\(img, slot\)\) return/);
  assert.match(carousel, /else if \(eventIsCurrent\(img, slot\)\) reportImageLoadFailure\(slot\)/);
});
test('R1G current-element check requires image element, matching src and active publication', () => {
  class MockImage {
    constructor(src) { this.src = src; }
    getAttribute(key) { return key === 'src' ? this.src : null; }
  }
  const slides = {value:[{imageId:'hero-1',src:'/a.jpg'}]};
  const env = { HTMLImageElement:MockImage, slides };
  const valid = vm.runInNewContext(`${imagePredicate}\neventIsCurrent`, env);
  assert.equal(valid(new MockImage('/a.jpg'), {imageId:'hero-1',src:'/a.jpg'}), true);
  assert.equal(valid(new MockImage('/old.jpg'), {imageId:'hero-1',src:'/a.jpg'}), false);
  assert.equal(valid({}, {imageId:'hero-1',src:'/a.jpg'}), false);
  assert.equal(valid(null, {imageId:'hero-1',src:'/a.jpg'}), false);
  slides.value=[{imageId:'hero-1',src:'/new.jpg'}];
  assert.equal(valid(new MockImage('/a.jpg'), {imageId:'hero-1',src:'/a.jpg'}), false);
});
test('R1G start returns boolean reflecting actual phase admission, not a TS-narrowed read', () => {
  assert.match(intro, /function start\(now:number,source:IntroIntent\):boolean/);
  assert.match(intro, /if \(phase\.value!=='idle'\|\|!geometryReady\.value\|\|!isVisible\(\)\) return false/);
  assert.match(intro, /rafId=requestAnimationFrame\(tick\);\s*return true/);
  assert.match(intro, /return start\(performance\.now\(\),source\)/);
  assert.doesNotMatch(intro, /return phase\.value==='revealing'/);
});
test('R1G buffered real intent triggers once, respects wheel and idle guard', () => {
  const env = {
    mounted:true, phase:{value:'idle'}, geometryReady:{value:true},
    headerScrollIntent:{value:false},
    isVisible:()=>true, window:{scrollY:0}, finePointer:{matches:true},
    performance:{now:()=>123}, startedAt:0,lastWheelAt:0,
    animationStarts:{value:0},firstIntent:{value:null},visualState:{value:'pending'},
    draw:()=>{}, requestAnimationFrame:()=>10, rafId:null,tick:()=>{},
  };
  const api = vm.runInNewContext(`${start}\n${request}\n({start,requestBufferedIntent})`,env);
  assert.equal(api.requestBufferedIntent('wheel'),true);
  assert.equal(env.phase.value,'revealing');
  assert.equal(env.animationStarts.value,1);
  assert.equal(api.requestBufferedIntent('wheel'),false);
  assert.equal(env.animationStarts.value,1);
  env.phase.value='idle';env.finePointer.matches=false;
  assert.equal(api.requestBufferedIntent('wheel'),false);
  env.finePointer.matches=true;env.geometryReady.value=false;
  assert.equal(api.requestBufferedIntent('wheel'),false);
});
test('R1G media gate and carousel control policies preserved', () => {
  assert.match(carousel, /const decoded = typeof img\.decode === 'function' \? img\.decode\(\)/);
  assert.match(carousel, /\}, HERO_CAROUSEL_DELAY_MS\)/);
  assert.match(carousel, /\}, HERO_DISSOLVE_DURATION_MS \+ 96\)/);
  assert.match(carousel, /autoplayLease\.value === instanceId/);
  assert.match(carousel, /v-for="slide in slides"/);
  assert.match(carousel, /@click\.stop="requestTransition\(slide\.order, 'manual'\)"/);
  assert.doesNotMatch(carousel, /data-hero-carousel-action=/);
});
