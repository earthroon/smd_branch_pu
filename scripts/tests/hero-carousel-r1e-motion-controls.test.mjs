/** R1E buttons/inputs/animated progression regression, migrated for R2 dissolve. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {nextHeroDissolveIndex,heroDissolveSwipeDirection} from '../../app/utils/homeHeroDissolveState.ts';
const root=resolve(fileURLToPath(new URL('../../',import.meta.url)));
const vue=readFileSync(resolve(root,'app/components/home/HomeHeroCarousel.vue'),'utf8');
const css=readFileSync(resolve(root,'app/assets/css/home-hero-film.css'),'utf8');
const data=readFileSync(resolve(root,'app/data/home-hero-carousel.ts'),'utf8');

test('R1E/R2: 3000ms autoplay, 700ms image fade and 20ms caption delay',()=>{
  assert.match(data,/HERO_CAROUSEL_DELAY_MS = 3000 as const/);
  assert.match(data,/HERO_DISSOLVE_DURATION_MS = 700 as const/);
  assert.match(data,/HERO_CAPTION_START_DELAY_MS = 20 as const/);
  assert.match(vue,/\}, HERO_CAROUSEL_DELAY_MS\)/);
  assert.match(vue,/\}, HERO_DISSOLVE_DURATION_MS \+ 96\)/);
});
test('R1E/R2: dot navigation replaces arrows and remains keyboard accessible',()=>{
  assert.match(vue,/class="smd-hero-carousel__pagination"/);
  assert.match(vue,/v-for="slide in slides"/);
  assert.match(vue,/class="smd-hero-carousel__dot"/);
  assert.match(vue,/:aria-controls="viewportId"/);
  assert.match(vue,/:aria-pressed="slide\.order === selectedIndex"/);
  assert.match(vue,/@click\.stop="requestTransition\(slide\.order, 'manual'\)"/);
  assert.doesNotMatch(vue,/data-hero-carousel-action=/);
  assert.equal((vue.match(/class="smd-hero-carousel__dot"/g)??[]).length,1);
  assert.match(vue,/tabindex="0" @keydown="onKeydown"/);
  assert.match(vue,/event\.key/);
});
test('R1E/R2: no horizontal motion, both manual directions follow the same state machine',()=>{
  assert.match(css,/\.smd-hero-carousel__container \{ position: relative/);
  assert.match(css,/\.smd-hero-carousel__slide\s*\{\s*position: absolute;/);
  assert.match(css,/transition: opacity 700ms/);
  assert.doesNotMatch(vue,/scrollTo\(|scrollPrev|scrollNext/);
  assert.equal(nextHeroDissolveIndex(0,'previous',3),2);
  assert.equal(nextHeroDissolveIndex(2,'next',3),0);
});
test('R1E/R2: hover and keyboard focus pause autoplay without a focus latch',()=>{
  assert.match(vue,/!hovered\.value && !focused\.value/);
  assert.match(vue,/target instanceof HTMLElement && target\.matches\(':focus-visible'\)/);
  assert.match(vue,/function onPointerLeave/);
  assert.match(vue,/function onFocusOut/);
});
test('R1E/R2: mobile touch swipe keeps vertical scrolling',()=>{
  assert.equal(heroDissolveSwipeDirection(-60,0),'next');
  assert.equal(heroDissolveSwipeDirection(60,0),'previous');
  assert.equal(heroDissolveSwipeDirection(60,80),null);
  assert.match(css,/touch-action: pan-y pinch-zoom/);
  assert.match(vue,/@pointerdown="onSwipeStart" @pointerup="onSwipeEnd"/);
});
test('R1E/R2: reduced motion disables both dissolve and autoplay',()=>{
  assert.match(vue,/if \(reducedMotion\.value\) \{[\s\S]*?settleMotion\(\);/);
  assert.match(vue,/!reducedMotion\.value/);
  assert.match(css,/@media \(prefers-reduced-motion: reduce\)/);
});
