import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HOME_INTRO_TIMING } from '../../app/utils/homeIntroTimeline.ts';
import {
  HOME_SPECIAL_TIMING, HOME_SPECIAL_TARGETS, HOME_SPECIAL_REVEAL_COMPLETE_MS,
  specialEntryProgress, specialItemStartMs, specialItemProgress,
  specialWheelDeltaPx, specialSkipIntent, specialItemIndex,
  specialEntryTargetY, specialOutcome, isSpecialTerminal,
} from '../../app/utils/homeSpecialTimeline.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const source = path => readFileSync(resolve(root, path), 'utf8');

test('CF1 handoff from completed Intro is read-only; exactly one special stage', () => {
  const index = source('app/pages/index.vue');
  const intro = source('app/components/home/HomeIntroStage.vue');
  const body = source('app/components/home/HomeBodyStage.vue');
  const controller = source('app/composables/useHomeSpecialReveal.ts');
  assert.match(index, /@completed="onIntroCompleted"/);
  assert.match(index, /:intro-completed="introCompleted"/);
  assert.match(intro, /reason\s*===\s*'completed'/);
  assert.match(intro, /completionEmitted/);
  assert.match(body, /useHomeSpecialReveal\(stage, toRef\(props, 'introCompleted'\)\)/);
  assert.match(controller, /phase\.value !== 'unarmed' \|\| !introCompleted\.value/);
  assert.match(controller, /HOME_INTRO_DESKTOP_MEDIA/);
  assert.equal((body.match(/<FigmaSceneSection v-else :section-id="row.id"/g) ?? []).length, 1);
});

test('CF1 only title and exactly three card groups are motion owners; image remains untouched', () => {
  assert.deepEqual(HOME_SPECIAL_TARGETS, {
    'node-1:133': 0, 'node-1:131': 1, 'node-1:129': 2, 'node-1:127': 3,
  });
  assert.equal(specialItemIndex('node-1:126'), null);
  assert.equal(specialItemIndex('node-1:133'), 0);
  const node = source('app/components/figma/FigmaSceneNode.vue');
  assert.match(node, /v-else-if="specialItemIndex\(child\) !== null"/);
  assert.match(node, /class="smd-home-special__target"/);
  assert.match(node, /:data-special-source-node="child"/);
  assert.match(node, /:transform="translate"/); // original Figma transform remains
  const scene = source('app/data/figma-r2-scene.generated.ts');
  for (const nodeKey of ['node-1:127','node-1:129','node-1:131','node-1:133']) {
    assert.ok(scene.includes(`"${nodeKey}"`));
  }
});

test('CF2 same ease-out, 420ms entry and DOM-derived target under existing Header', () => {
  assert.equal(HOME_SPECIAL_TIMING.entryDurationMs, 420);
  assert.equal(specialEntryProgress(0), 0);
  assert.equal(specialEntryProgress(420), 1);
  assert.ok(specialEntryProgress(210) > .9);
  assert.equal(specialEntryTargetY(1120, 93.75), 1026.25);
  assert.equal(specialEntryTargetY(40, 93.75), 0);
  assert.throws(() => specialEntryTargetY(NaN, 94));
  const controller = source('app/composables/useHomeSpecialReveal.ts');
  assert.match(controller, /window\.scrollTo\(\{ top: value, behavior: 'auto' \}\)/);
  assert.match(controller, /targetFor\('special-start'\)/);
  assert.match(controller, /targetFor\('training-track'\)/);
  assert.doesNotMatch(source('app/assets/css/home-special-reveal.css'), /position:\s*(sticky|fixed)/);
});

test('CF3 title and card offsets/timing with exact easing endpoints', () => {
  assert.deepEqual([0,1,2,3].map(specialItemStartMs), [0,120,210,300]);
  assert.equal(HOME_SPECIAL_REVEAL_COMPLETE_MS, 740);
  assert.equal(specialItemProgress(0,0), 0);
  assert.equal(specialItemProgress(520,0), 1);
  assert.equal(specialItemProgress(119,1), 0);
  assert.equal(specialItemProgress(560,1), 1);
  assert.equal(specialItemProgress(650,2), 1);
  assert.equal(specialItemProgress(740,3), 1);
  assert.throws(() => specialItemStartMs(4));
  const css=source('app/assets/css/home-special-reveal.css');
  assert.match(css, /data-special-phase="ready"/);
  assert.match(css, /data-special-phase="entering"/);
  assert.match(css, /data-special-phase="revealing"/);
  assert.doesNotMatch(css, /data-special-phase="skipped"|data-special-phase="completed"/);
  assert.match(css, /prefers-reduced-motion:no-preference/);
});

test('CF4 gesture model ignores first wheel tail, admits separate burst or sustained follow-up', () => {
  assert.equal(HOME_SPECIAL_TIMING.gestureQuietMs, 160);
  assert.equal(HOME_SPECIAL_TIMING.sustainedSkipAfterMs, 180);
  assert.equal(HOME_SPECIAL_TIMING.sustainedSkipDeltaPx, 120);
  assert.equal(specialWheelDeltaPx(3,0,1080),3);
  assert.equal(specialWheelDeltaPx(3,1,1080),48);
  assert.equal(specialWheelDeltaPx(3,2,1080),3240);
  const decide = (deltaPx, elapsedSinceEntryMs, silenceSinceLastWheelMs, cumulativeFollowUpDownPx) =>
    specialSkipIntent({deltaPx,elapsedSinceEntryMs,silenceSinceLastWheelMs,cumulativeFollowUpDownPx});
  assert.equal(decide(100,60,30,100), 'ignore');
  assert.equal(decide(100,120,120,200), 'ignore');
  assert.equal(decide(100,170,170,100), 'skip-down');
  assert.equal(decide(60,200,40,120), 'skip-down');
  assert.equal(decide(-10,10,10,0), 'skip-up');
  assert.equal(decide(0,200,200,0), 'ignore');
  assert.throws(()=>specialWheelDeltaPx(3,3,1080));
});

test('CF4 completed and skipped states are terminal, no replay CSS or re-arm', () => {
  assert.equal(isSpecialTerminal('completed'),true);
  assert.equal(isSpecialTerminal('skipped'),true);
  assert.equal(isSpecialTerminal('disabled'),true);
  assert.equal(isSpecialTerminal('revealing'),false);
  assert.equal(specialOutcome('completed'),'completed');
  assert.equal(specialOutcome('skipped'),'skipped');
  assert.equal(specialOutcome('ready'),'not-started');
  const controller = source('app/composables/useHomeSpecialReveal.ts');
  assert.match(controller, /if \(isSpecialTerminal\(phase\.value\)\) return;/);
  assert.match(controller, /function finish\(status:/);
  assert.match(controller, /materializeFinal\(\);/);
  assert.match(controller, /phase\.value = status/);
  assert.match(controller, /removeActiveListeners\(\)/);
  assert.match(controller, /restoreScrollBehavior\(\)/);
  assert.doesNotMatch(controller, /setTimeout\(|localStorage|sessionStorage/);
});

test('CF4 prior Intro math remains unchanged by second scene contract', () => {
  assert.equal(HOME_INTRO_TIMING.barDurationMs,430);
  assert.equal(HOME_INTRO_TIMING.barToIconDelayMs,30);
  assert.equal(HOME_INTRO_TIMING.iconStaggerMs,60);
  assert.equal(HOME_INTRO_TIMING.iconDurationMs,350);
  const specialCss=source('app/assets/css/home-special-reveal.css');
  assert.doesNotMatch(specialCss,/\.smd-home-intro|\.smd-site-header/);
  assert.doesNotMatch(source('app/composables/useHomeSpecialReveal.ts'), /useSiteContent|useHomeR2Published|SMD_CORE|wrangler/);
});
