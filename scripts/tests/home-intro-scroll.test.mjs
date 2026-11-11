import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import {
  HOME_INTRO_TIMING, HOME_INTRO_REVEAL_COMPLETE_MS, HOME_INTRO_MIN_RELEASE_MS,
  HOME_INTRO_ITEM_NODES, introItemIndex, iconStartMs, iconProgress, barProgress,
  dampedEaseOut, canReleaseIntro, introTargetScrollY,
} from '../../app/utils/homeIntroTimeline.ts';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const source = relative => readFileSync(resolve(root, relative), 'utf8');

test('CF1 source scene is unchanged and home has exactly one hero/info owner', () => {
  const index = source('app/pages/index.vue');
  assert.match(index, /<HomeIntroStage variant="figma"[^>]*\/>/);
  assert.match(index, /<HomeIntroStage variant="semantic"[^>]*\/>/);
  assert.match(index, /<HomeBodyStage\b[^>]*\/>/);
  const layout=source('app/utils/homeWideLayout.ts');
  assert.match(layout, /id !== 'hero' && id !== 'info-bar'/);
  const intro = source('app/components/home/HomeIntroStage.vue');
  assert.equal((intro.match(/section-id="hero"/g)??[]).length, 1);
  assert.equal((intro.match(/section-id="info-bar"/g)??[]).length, 1);
});

test('CF1 new vue-overlay is a Vue paint stack, not a scroll/sticky layout', () => {
  const css=source('app/assets/css/home-r2-interaction.css');
  const host=source('app/components/home/HomeIntroStage.vue');
  const controller=source('app/composables/useHomeIntroReveal.ts');
  assert.match(host,/introRoute='vue-overlay'/);
  assert.match(host,/data-intro-paint-owner="overlay"/);
  assert.match(css,/\.smd-home-intro__overlay\s*\{[^}]*position:absolute/s);
  assert.doesNotMatch(css,/position:sticky|--smd-intro-bar-height/);
  assert.doesNotMatch(controller,/window\.scrollTo|introTargetScrollY/);
});

test('CF2 wheel belongs to one Vue controller and cannot replay or alter document scroll',()=>{
  const controller=source('app/composables/useHomeIntroReveal.ts');
  assert.match(controller,/passive:false/);
  assert.match(controller,/removeEventListener\('wheel',onWheel,true\)/);
  assert.match(controller,/case 'revealing':case 'settling':/);
  assert.match(controller,/lastWheelAt=performance\.now\(\)/);
  assert.doesNotMatch(controller,/window\.scrollTo|setTimeout\(/);
});

test('CF3 cubic Bezier is monotonic, bounded and strongly eased out', () => {
  assert.equal(dampedEaseOut(0),0);
  assert.equal(dampedEaseOut(1),1);
  let prev = 0;
  for (let i=1;i<=100;i++){
    const now=dampedEaseOut(i/100);
    assert.ok(now>=prev && now<=1);
    prev=now;
  }
  assert.ok(dampedEaseOut(.5)>.9);
  assert.equal(barProgress(0),0);
  assert.equal(barProgress(430),1);
});

test('CF4 bar completes before first icon 30ms; four starts have exact 60ms gaps', () => {
  assert.equal(HOME_INTRO_TIMING.barDurationMs,430);
  assert.deepEqual([0,1,2,3].map(iconStartMs),[460,520,580,640]);
  assert.equal(HOME_INTRO_REVEAL_COMPLETE_MS,990);
  assert.equal(iconProgress(459,0),0);
  assert.equal(iconProgress(460,0),0);
  assert.ok(iconProgress(500,0)>0);
  assert.equal(iconProgress(810,0),1);
  assert.equal(iconProgress(990,3),1);
});

test('CF4 real figma item mapping has four icon/text pairs, no blocked file subtree', () => {
  assert.equal(Object.keys(HOME_INTRO_ITEM_NODES).length,7);
  const sets=[['node-1:320','node-1:154'],['node-1:395','node-1:400'],['node-1:411','node-1:404']];
  for(const [i,items] of sets.entries())for(const item of items)assert.equal(introItemIndex(item),i);
  assert.equal(introItemIndex('node-18:58'),3);
  assert.equal(introItemIndex('node-18:26'),null);
  const section=source('app/components/figma/FigmaSceneSection.vue');
  assert.match(section,/data-intro-icon-index="3"/);
  assert.match(section,/<FigmaR4UserFileIcon\s*\/>/);
});

test('CF5 release is gated by animation, settle and the last wheel quiet interval', () => {
  assert.equal(HOME_INTRO_MIN_RELEASE_MS,1110);
  assert.equal(canReleaseIntro(990,300),false);
  assert.equal(canReleaseIntro(1110,219),false);
  assert.equal(canReleaseIntro(1109,400),false);
  assert.equal(canReleaseIntro(1110,220),true);
  assert.equal(canReleaseIntro(2220,220),true);
});

test('CF6 coarse/mobile and reduced motion remain static, but fine-pointer touch laptops can admit', () => {
  const controller=source('app/composables/useHomeIntroReveal.ts');
  assert.doesNotMatch(controller,/navigator\.maxTouchPoints\s*>\s*0/);
  assert.doesNotMatch(controller,/case 'compact-reveal'/);
  assert.match(controller,/start\(performance\.now\(\),'keyboard'\)/);
  assert.match(controller,/prefers-reduced-motion: reduce/);
  assert.match(source('app/assets/css/home-r2-interaction.css'),/smd-home-intro__paint-stack/);
  assert.match(controller,/window\.scrollY>2/);
});
