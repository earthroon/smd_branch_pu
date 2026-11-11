import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HOME_INTRO_TIMING } from '../../app/utils/homeIntroTimeline.ts';
import { HOME_SPECIAL_TIMING, specialSkipIntent } from '../../app/utils/homeSpecialTimeline.ts';
import {
  HOME_TRAINING_TIMING, HOME_TRAINING_TARGETS, HOME_TRAINING_DIAGRAM_NODES,
  HOME_TRAINING_COMPLETE_MS, trainingHandoff, trainingItemIndex, trainingItemStartMs,
  trainingItemProgress, trainingDiagramProgress, trainingEntryProgress,
  trainingEntryTargetY, isTrainingDiagramNode, trainingSkipIntent,
  trainingOutcome, isTrainingTerminal, trainingWheelDeltaPx,
} from '../../app/utils/homeTrainingTimeline.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const source = path => readFileSync(resolve(root, path), 'utf8');
const sceneRaw = source('app/data/figma-r2-scene.generated.ts');
const scene = JSON.parse(sceneRaw.slice(sceneRaw.indexOf('= {') + 2).trim().replace(/;$/, ''));

// These tests only establish SOURCE + pure-logic behavior, not browser frame parity.
test('CF1 Training is the third scene after Special, with no change to Intro ownership', () => {
  const body = source('app/components/home/HomeBodyStage.vue');
  const training = source('app/composables/useHomeTrainingReveal.ts');
  const special = source('app/composables/useHomeSpecialReveal.ts');
  assert.match(body, /useHomeSpecialReveal\(stage, toRef\(props, 'introCompleted'\)\)/);
  assert.match(body, /useHomeTrainingReveal\(stage, phase, skipReason\)/);
  assert.match(training, /watch\(\[specialPhase, specialSkipReason\], onHandoff, \{ flush: 'post' \}\)/);
  assert.match(training, /case 'at-training':/);
  assert.match(training, /beginFromSpecialSkip\(\)/);
  assert.match(special, /targetFor\('training-track'\)/);
  assert.match(body, /data-training-contract="SMD_HOME_TRAINING_REVEAL_R1"/);
  assert.equal((body.match(/<FigmaSceneSection v-else :section-id="row.id"/g)??[]).length,1);
});

test('CF1 exactly 5 motion targets and 14 diagram parts are real distinct Figma nodes', () => {
  assert.deepEqual(HOME_TRAINING_TARGETS, {
    'node-1:103':0, 'node-1:104':1,
    'node-1:313':2, 'node-1:315':3, 'node-1:95':4,
  });
  assert.equal(HOME_TRAINING_DIAGRAM_NODES.length,14);
  assert.equal(new Set(HOME_TRAINING_DIAGRAM_NODES).size,14);
  assert.equal(new Set([...Object.keys(HOME_TRAINING_TARGETS),...HOME_TRAINING_DIAGRAM_NODES]).size,19);
  for (const k of [...Object.keys(HOME_TRAINING_TARGETS), ...HOME_TRAINING_DIAGRAM_NODES]) {
    assert.ok(scene.nodes[k],`missing ${k}`);
    assert.equal(scene.nodes[k].visible,true);
    assert.notEqual(scene.nodes[k].renderStatus,'blocked');
  }
  assert.equal(scene.nodes['node-1:315'].parent,'node-1:314');
  assert.equal(scene.nodes['node-1:501'].parent,'node-1:314');
  assert.equal(scene.nodes['node-1:555'].parent,'node-1:314');
  assert.equal(trainingItemIndex('node-1:314'),null);
  assert.equal(trainingItemIndex('node-1:94'),null);
  assert.equal(isTrainingDiagramNode('node-1:94'),false);
  assert.equal(isTrainingDiagramNode('node-1:501'),true);
  assert.equal(trainingItemIndex('node-1:103'),0);
  assert.equal(trainingItemIndex('node-1:104'),1);
  assert.equal(trainingItemIndex('node-1:315'),3);
});

test('CF1 presentation wrappers preserve original scene transform and source ordering', () => {
  const node=source('app/components/figma/FigmaSceneNode.vue');
  assert.match(node, /:transform="translate"/);
  assert.match(node, /v-else-if="trainingItemIndex\(child\) !== null"/);
  assert.match(node, /v-else-if="isTrainingDiagramNode\(child\)"/);
  assert.match(node, /class="smd-home-training__diagram-part"/);
  assert.match(node, /class="smd-home-training__target"/);
  assert.match(node, /:data-training-source-node="child"/);
  assert.match(node, /:data-training-diagram-node="child"/);
  const training=scene.sections.find(x=>x.id==='training-track');
  assert.equal(training.nodeKey,'node-1:93');
  assert.equal(training.height,891);
  assert.equal(training.top,2317);
  assert.match(source('app/components/home/HomeBodyStage.vue'), /homeWideLayout/);
  assert.match(source('app/pages/index.vue'), /home-training-reveal\.css/);
});

test('CF2 next-wheel 420ms eased entry uses DOM geometry and leaves prior timings unchanged', () => {
  assert.equal(HOME_TRAINING_TIMING.entryDurationMs,420);
  assert.equal(trainingEntryProgress(0),0);
  assert.equal(trainingEntryProgress(420),1);
  assert.ok(trainingEntryProgress(210)>0.9);
  assert.equal(trainingEntryTargetY(1200,93.75),1106.25);
  assert.equal(trainingEntryTargetY(20,93.75),0);
  assert.throws(()=>trainingEntryTargetY(NaN,100));
  assert.equal(HOME_SPECIAL_TIMING.entryDurationMs,420);
  assert.equal(HOME_INTRO_TIMING.barDurationMs,430);
  assert.equal(HOME_INTRO_TIMING.barToIconDelayMs,30);
  assert.equal(HOME_INTRO_TIMING.iconStaggerMs,60);
  assert.equal(HOME_INTRO_TIMING.iconDurationMs,350);
  const controller=source('app/composables/useHomeTrainingReveal.ts');
  assert.match(controller,/targetFor\('training-track'\)/);
  assert.match(controller,/window\.scrollY < targetFor\('special-start'\) - 5/);
  assert.match(controller,/window\.scrollTo\(\{ top: y, behavior: 'auto' \}\)/);
  assert.match(controller,/targetFor\('benefits'\)/);
});

test('CF3 title then subtitle then 3 cards follow frozen starts and finish times', () => {
  assert.deepEqual(Array.from({length:5},(_,i)=>trainingItemStartMs(i)),[0,240,580,750,920]);
  assert.equal(HOME_TRAINING_COMPLETE_MS,2260);
  assert.equal(trainingItemProgress(0,0),0);
  assert.equal(trainingItemProgress(440,0),1);
  assert.equal(trainingItemProgress(239,1),0);
  assert.equal(trainingItemProgress(660,1),1);
  assert.equal(trainingItemProgress(579,2),0);
  assert.equal(trainingItemProgress(1020,2),1);
  assert.equal(trainingItemProgress(1190,3),1);
  assert.equal(trainingItemProgress(1360,4),1);
  assert.throws(()=>trainingItemProgress(1,5));
  assert.throws(()=>trainingItemStartMs(-1));
  assert.throws(()=>trainingItemProgress(Infinity,0));
});

test('CF3 Diagram begins only at 1360ms, fades in place over 900ms, one shared opacity', () => {
  assert.equal(trainingDiagramProgress(0),0);
  assert.equal(trainingDiagramProgress(1359),0);
  assert.equal(trainingDiagramProgress(1360),0);
  assert.ok(trainingDiagramProgress(1810)>0.5);
  assert.equal(trainingDiagramProgress(2260),1);
  assert.equal(trainingDiagramProgress(4000),1);
  assert.throws(()=>trainingDiagramProgress(NaN));
  const css=source('app/assets/css/home-training-reveal.css');
  assert.match(css,/data-training-phase="revealing"/);
  assert.match(css,/--smd-training-diagram-opacity/);
  const diagramRule=css.match(/\.smd-home-training__diagram-part \{[\s\S]*?\}/g)?.at(-1)??'';
  assert.doesNotMatch(diagramRule,/transform:|translateY\(|scale\(/);
  assert.doesNotMatch(css,/node-1:94|node-1:314/);
  assert.doesNotMatch(css,/position:\s*(sticky|fixed)/);
});

test('CF4 skip reuses Special gesture model but not Special event listener ownership', () => {
  assert.strictEqual(trainingSkipIntent,specialSkipIntent);
  assert.equal(trainingSkipIntent({deltaPx:80,elapsedSinceEntryMs:40,silenceSinceLastWheelMs:20,cumulativeFollowUpDownPx:80}),'ignore');
  assert.equal(trainingSkipIntent({deltaPx:80,elapsedSinceEntryMs:200,silenceSinceLastWheelMs:170,cumulativeFollowUpDownPx:80}),'skip-down');
  assert.equal(trainingSkipIntent({deltaPx:80,elapsedSinceEntryMs:200,silenceSinceLastWheelMs:40,cumulativeFollowUpDownPx:160}),'skip-down');
  assert.equal(trainingSkipIntent({deltaPx:-40,elapsedSinceEntryMs:40,silenceSinceLastWheelMs:20,cumulativeFollowUpDownPx:0}),'skip-up');
  assert.equal(trainingWheelDeltaPx(3,1,1080),48);
  assert.equal(trainingWheelDeltaPx(2,2,1080),2160);
  const controller=source('app/composables/useHomeTrainingReveal.ts');
  assert.match(controller,/finish\('skipped', 'WHEEL_DOWN', true\)/);
  assert.match(controller,/finish\('skipped', 'WHEEL_UP'\)/);
  assert.match(controller,/event\.preventDefault\(\)/);
  assert.match(controller,/installActiveListeners\(\)/);
  assert.match(controller,/removeActiveListeners\(\)/);
});

test('CF4 Special handoff never doubles wheel ownership, completion/skip cannot replay', () => {
  assert.equal(trainingHandoff('unarmed',null),'none');
  assert.equal(trainingHandoff('revealing',null),'none');
  assert.equal(trainingHandoff('completed',null),'wheel-ready');
  assert.equal(trainingHandoff('skipped','WHEEL_DOWN'),'at-training');
  assert.equal(trainingHandoff('skipped','WHEEL_UP'),'none');
  assert.equal(trainingHandoff('skipped','EXTERNAL_SCROLL'),'none');
  assert.equal(isTrainingTerminal('completed'),true);
  assert.equal(isTrainingTerminal('skipped'),true);
  assert.equal(isTrainingTerminal('disabled'),true);
  assert.equal(isTrainingTerminal('revealing'),false);
  assert.equal(trainingOutcome('completed'),'completed');
  assert.equal(trainingOutcome('skipped'),'skipped');
  assert.equal(trainingOutcome('ready'),'not-started');
  const controller=source('app/composables/useHomeTrainingReveal.ts');
  assert.match(controller,/if \(isTrainingTerminal\(phase\.value\)\) return/);
  assert.match(controller,/phase\.value !== 'unarmed'/);
  assert.match(controller,/prepared\.value = false/);
  assert.match(controller,/presentFinal\(\)/);
  assert.doesNotMatch(controller,/sessionStorage|localStorage|setTimeout\(/);
});

test('CF4 desktop-only animation: no mobile input interception or permanent sticky', () => {
  const css=source('app/assets/css/home-training-reveal.css');
  assert.match(css,/min-width:1380px/);
  assert.match(css,/prefers-reduced-motion:no-preference/);
  const controller=source('app/composables/useHomeTrainingReveal.ts');
  assert.match(controller,/HOME_INTRO_DESKTOP_MEDIA/);
  assert.match(controller,/navigator\.maxTouchPoints > 0/);
  assert.match(controller,/phase\.value = 'disabled'/);
  assert.match(controller,/restoreScrollBehavior\(\)/);
  assert.match(controller,/onBeforeUnmount/);
  assert.match(controller,/document\.visibilityState !== 'hidden'/);
  assert.doesNotMatch(css,/\.smd-home-intro|\.smd-home-special|\.smd-site-header/);
});
