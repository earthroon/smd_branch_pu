/** SMD_HOME_METHODS_REVEAL_R1: exact target ABI and pure timeline contract. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  HOME_METHODS_TARGETS, HOME_METHODS_TIMING, HOME_METHODS_COMPLETE_MS,
  isMethodsTitle, methodsCardIndex, methodsTextIndex,
  methodsCardStartMs, methodsTextStartMs,
  methodsTitleProgress, methodsCardProgress, methodsTextProgress,
  methodsEntryProgress, methodsEntryTargetY,
  methodsHandoff, methodsSkipIntent, methodsWheelDeltaPx,
  methodsOutcome, isMethodsTerminal,
} from '../../../app/utils/homeMethodsTimeline.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const read = path => readFileSync(resolve(root, path), 'utf8');

const keys = [HOME_METHODS_TARGETS.title, ...HOME_METHODS_TARGETS.cards, ...HOME_METHODS_TARGETS.text.flat()];

test('exact 1 title + 3 frames + 6 text owners; unique source identities', () => {
  assert.equal(HOME_METHODS_TARGETS.title, 'node-1:60');
  assert.deepEqual([...HOME_METHODS_TARGETS.cards], ['node-1:54','node-1:56','node-1:58']);
  assert.deepEqual(HOME_METHODS_TARGETS.text.map(x=>[...x]), [
    ['node-18:114','node-18:115'],
    ['node-1:61','node-1:62'],
    ['node-18:116','node-18:117'],
  ]);
  assert.equal(keys.length, 10);
  assert.equal(new Set(keys).size, keys.length);
  assert.ok(Object.isFrozen(HOME_METHODS_TARGETS.cards));
  assert.ok(Object.isFrozen(HOME_METHODS_TARGETS.text));
  assert.ok(HOME_METHODS_TARGETS.text.every(Object.isFrozen));
  assert.ok(Object.isFrozen(HOME_METHODS_TIMING.cardStartMs));
  assert.ok(Object.isFrozen(HOME_METHODS_TIMING.textStartMs));
});

test('motion node dispatch is isolated from all other sections', () => {
  assert.ok(isMethodsTitle('node-1:60'));
  assert.ok(!isMethodsTitle('node-1:92'));
  for (let i=0;i<3;i++) {
    assert.equal(methodsCardIndex(HOME_METHODS_TARGETS.cards[i]),i);
    for (const key of HOME_METHODS_TARGETS.text[i]) assert.equal(methodsTextIndex(key),i);
  }
  assert.equal(methodsCardIndex('node-1:51'),null);
  assert.equal(methodsTextIndex('node-1:54'),null);
  assert.equal(methodsTextIndex('toString'),null);
});

test('title fade-down finishes before first card begins; 180ms gap', () => {
  assert.equal(methodsTitleProgress(0),0);
  assert.equal(methodsTitleProgress(500),1);
  assert.equal(methodsCardProgress(500,0),0);
  assert.equal(methodsCardStartMs(0),HOME_METHODS_TIMING.titleDurationMs+HOME_METHODS_TIMING.postTitleGapMs);
  assert.equal(HOME_METHODS_TIMING.titleEntryOffsetPx,-26);
  assert.equal(HOME_METHODS_TIMING.cardEntryOffsetPx,30);
});

test('frame starts are strictly left-to-right; each text starts after its frame completes', () => {
  for (let i=0;i<3;i++) {
    const start=methodsCardStartMs(i), textStart=methodsTextStartMs(i);
    assert.ok(textStart>=start+HOME_METHODS_TIMING.cardDurationMs);
    assert.equal(methodsCardProgress(start,i),0);
    assert.equal(methodsCardProgress(start+HOME_METHODS_TIMING.cardDurationMs,i),1);
    assert.equal(methodsTextProgress(textStart,i),0);
    assert.equal(methodsTextProgress(textStart+HOME_METHODS_TIMING.textDurationMs,i),1);
    if (i>0) {
      assert.ok(start>methodsCardStartMs(i-1));
      assert.ok(textStart>methodsTextStartMs(i-1));
    }
  }
  assert.equal(HOME_METHODS_COMPLETE_MS,1900);
});

test('all progress is bounded and monotonic including negative time', () => {
  for(const fn of [methodsTitleProgress, t=>methodsCardProgress(t,0), t=>methodsCardProgress(t,1),
    t=>methodsCardProgress(t,2), t=>methodsTextProgress(t,0),t=>methodsTextProgress(t,1),t=>methodsTextProgress(t,2), methodsEntryProgress]) {
    let last=0;
    for (const t of [-100,0,100,250,500,680,880,1100,1300,1500,1700,1900,2000]) {
      const value=fn(t);
      assert.ok(value>=last && value>=0 && value<=1,`progress monotone at ${t}: ${value}`);
      last=value;
    }
    assert.equal(fn(2000),1);
  }
});

test('invalid indices, finite time and geometry are explicitly rejected', () => {
  for(const idx of [-1,3,NaN]) {
    assert.throws(()=>methodsCardStartMs(idx),/SMD_METHODS_CARD_INDEX_INVALID/);
    assert.throws(()=>methodsTextStartMs(idx),/SMD_METHODS_TEXT_INDEX_INVALID/);
  }
  for(const value of [NaN,Infinity,-Infinity]) {
    assert.throws(()=>methodsTitleProgress(value),/SMD_METHODS_TIME_INVALID/);
    assert.throws(()=>methodsEntryProgress(value),/SMD_METHODS_TIME_INVALID/);
  }
  assert.equal(methodsEntryTargetY(1000,90),910);
  assert.equal(methodsEntryTargetY(50,90),0);
  assert.throws(()=>methodsEntryTargetY(NaN,90),/SMD_METHODS_ENTRY_GEOMETRY_INVALID/);
  assert.throws(()=>methodsEntryTargetY(1000,-1),/SMD_METHODS_ENTRY_GEOMETRY_INVALID/);
});

test('Benefits completion arms the next wheel, only explicit down-skip hands off immediately', () => {
  assert.equal(methodsHandoff('completed',null),'wheel-ready');
  assert.equal(methodsHandoff('skipped','WHEEL_DOWN'),'at-methods');
  for(const reason of ['WHEEL_UP','EXTERNAL_REVEAL_SCROLL',null])
    assert.equal(methodsHandoff('skipped',reason),'none');
  assert.equal(methodsHandoff('disabled','NON_DESKTOP'),'none');
  assert.equal(methodsHandoff('revealing',null),'none');
});

test('Methods reuses original wheel classifier and terminal phase semantics', () => {
  assert.equal(methodsWheelDeltaPx(5,1,900),80);
  assert.equal(methodsWheelDeltaPx(1,2,900),900);
  assert.equal(methodsSkipIntent({deltaPx:-20,elapsedSinceEntryMs:20,silenceSinceLastWheelMs:0,cumulativeFollowUpDownPx:0}), 'skip-up');
  assert.equal(methodsSkipIntent({deltaPx:10,elapsedSinceEntryMs:40,silenceSinceLastWheelMs:0,cumulativeFollowUpDownPx:10}), 'ignore');
  assert.equal(methodsSkipIntent({deltaPx:140,elapsedSinceEntryMs:200,silenceSinceLastWheelMs:10,cumulativeFollowUpDownPx:160}), 'skip-down');
  for(const phase of ['completed','skipped','disabled']) assert.ok(isMethodsTerminal(phase));
  for(const phase of ['unarmed','ready','entering','revealing']) assert.equal(isMethodsTerminal(phase),false);
  assert.equal(methodsOutcome('completed'),'completed');
  assert.equal(methodsOutcome('skipped'),'skipped');
});

test('new scene reuses prior 4 controllers rather than changing them', () => {
  const stage=read('app/components/home/HomeBodyStage.vue');
  assert.match(stage,/useHomeSpecialReveal\(stage,/);
  assert.match(stage,/useHomeTrainingReveal\(stage,/);
  assert.match(stage,/useHomeBenefitsReveal\(stage,/);
  assert.match(stage,/useHomeMethodsReveal\(stage, benefitsPhase, benefitsSkipReason\)/);
  assert.match(stage,/data-methods-contract="SMD_HOME_METHODS_REVEAL_R1"/);
  assert.match(stage,/:data-methods-prepared=/);
  assert.match(read('app/pages/index.vue'),/home-methods-reveal\.css/);
});

test('Methods SVG text and cards stay independent paint owners', () => {
  const node=read('app/components/figma/FigmaSceneNode.vue');
  assert.match(node,/methodsCardIndex\(child\) !== null/);
  assert.match(node,/methodsTextIndex\(child\) !== null/);
  assert.match(node,/smd-home-methods__title/);
  assert.match(node,/smd-home-methods__card/);
  assert.match(node,/smd-home-methods__text/);
  assert.match(node,/FigmaSceneNode v-else :node-key="child"/);
  assert.doesNotMatch(node,/MediaSlice|visualTransform/);
});

test('Methods CSS only touches motion wrappers inside its scene; next section is not animated', () => {
  const css=read('app/assets/css/home-methods-reveal.css');
  assert.match(css,/@media \(min-width:1380px\)/);
  assert.match(css,/prefers-reduced-motion:no-preference/);
  assert.match(css,/\[data-wide-section="methods"\]/);
  for(let i=0;i<3;i++) {
    assert.match(css,new RegExp(`data-methods-card-index="${i}"`));
    assert.match(css,new RegExp(`data-methods-text-index="${i}"`));
  }
  assert.doesNotMatch(css,/\[data-wide-section="(?:benefits|training-track|location)"\]/);
  assert.doesNotMatch(css,/position\s*:\s*(?:fixed|sticky)/);
});

test('controller has one terminal path, one RAF, bounded input and cleanup', () => {
  const controller=read('app/composables/useHomeMethodsReveal.ts');
  assert.match(controller,/if \(isMethodsTerminal\(phase\.value\)\) return/);
  assert.match(controller,/finish\('skipped', 'WHEEL_DOWN', true\)/);
  assert.match(controller,/finish\('skipped', 'WHEEL_UP'\)/);
  assert.match(controller,/watch\(\[benefitsPhase, benefitsSkipReason\], onHandoff, \{flush: 'post'\}\)/);
  assert.match(controller,/window\.cancelAnimationFrame/);
  assert.match(controller,/removeActiveListeners\(\)/);
  assert.match(controller,/restoreScrollBehavior\(\)/);
  assert.doesNotMatch(controller,/setTimeout\s*\(/);
});
