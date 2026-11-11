import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HOME_INTRO_TIMING } from '../../app/utils/homeIntroTimeline.ts';
import { HOME_SPECIAL_TIMING, specialSkipIntent } from '../../app/utils/homeSpecialTimeline.ts';
import { HOME_TRAINING_TIMING, trainingHandoff } from '../../app/utils/homeTrainingTimeline.ts';
import {
  HOME_BENEFITS_COMPLETE_MS, HOME_BENEFITS_TARGETS, HOME_BENEFITS_TIMING,
  benefitsItemIndex, benefitsItemStartMs, benefitsItemProgress,
  benefitsEntryTargetY, benefitsEntryProgress, benefitsHandoff,
  benefitsSkipIntent, benefitsWheelDeltaPx, benefitsOutcome, isBenefitsTerminal,
} from '../../app/utils/homeBenefitsTimeline.ts';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const read=path=>readFileSync(resolve(root,path),'utf8');
const sceneRaw=read('app/data/figma-r2-scene.generated.ts');
const scene=JSON.parse(sceneRaw.slice(sceneRaw.indexOf('= {')+2).trim().replace(/;$/,''));

test('CF1 Benefits root, heading, 4 card source identities and paint order stay unchanged', () => {
  assert.deepEqual(HOME_BENEFITS_TARGETS,{
    'node-1:92':0,'node-1:85':1,'node-18:144':2,
    'node-18:86':3,'node-18:131':4,
  });
  const benefits=scene.sections.find(x=>x.id==='benefits');
  assert.equal(benefits.nodeKey,'node-1:77');
  assert.equal(benefits.top,3208);
  assert.equal(benefits.height,1422);
  assert.deepEqual(scene.nodes['node-1:77'].childKeys, [
    'node-1:78','node-1:85','node-18:144','node-18:86','node-18:131','node-1:92',
  ]);
  const nodes=Object.keys(HOME_BENEFITS_TARGETS);
  assert.equal(nodes.length,5);
  assert.equal(new Set(nodes).size,5);
  for (const key of nodes) {
    assert.ok(scene.nodes[key],key);
    assert.equal(scene.nodes[key].parent,'node-1:77');
    assert.equal(scene.nodes[key].visible,true);
    assert.notEqual(scene.nodes[key].renderStatus,'blocked');
  }
  assert.equal(benefitsItemIndex('node-1:77'),null);
  assert.equal(benefitsItemIndex('node-1:78'),null);
  assert.equal(benefitsItemIndex('node-18:125'),null);
  assert.equal(benefitsItemIndex('node-18:86'),3);
});

test('CF1 Training terminal results pass a one-shot, reason-specific Benefits handoff', () => {
  assert.equal(benefitsHandoff('unarmed',null),'none');
  assert.equal(benefitsHandoff('ready',null),'none');
  assert.equal(benefitsHandoff('revealing',null),'none');
  assert.equal(benefitsHandoff('completed',null),'wheel-ready');
  assert.equal(benefitsHandoff('skipped','WHEEL_DOWN'),'at-benefits');
  assert.equal(benefitsHandoff('skipped','WHEEL_UP'),'none');
  assert.equal(benefitsHandoff('skipped','EXTERNAL_ENTRY_SCROLL'),'none');
  assert.equal(trainingHandoff('completed',null),'wheel-ready');
  const body=read('app/components/home/HomeBodyStage.vue');
  assert.match(body,/useHomeTrainingReveal\(stage, phase, skipReason\)/);
  assert.match(body,/useHomeBenefitsReveal\(stage, trainingPhase, trainingSkipReason\)/);
  assert.match(body,/data-benefits-contract="SMD_HOME_BENEFITS_REVEAL_R1"/);
  assert.equal((body.match(/<FigmaSceneSection v-else :section-id="row.id"/g)??[]).length,1);
});

test('CF1 SVG motion wrappers own only Benefits leaves, keep source affine and paint', () => {
  const node=read('app/components/figma/FigmaSceneNode.vue');
  assert.match(node,/:transform="translate"/);
  assert.match(node,/v-else-if="benefitsItemIndex\(child\) !== null"/);
  assert.match(node,/class="smd-home-benefits__target"/);
  assert.match(node,/:data-benefits-source-node="child"/);
  assert.match(node,/<FigmaSceneNode :node-key="child" :mode="mode" \/>/);
  assert.match(read('app/pages/index.vue'),/home-benefits-reveal\.css/);
  assert.doesNotMatch(node,/v-if="benefitsItemIndex\(props.nodeKey\)/);
});

test('CF2 entry matches prior 420ms damped bezier, DOM + measured header', () => {
  assert.equal(HOME_BENEFITS_TIMING.entryDurationMs,420);
  assert.equal(benefitsEntryProgress(0),0);
  assert.ok(benefitsEntryProgress(210)>0.90);
  assert.equal(benefitsEntryProgress(420),1);
  assert.equal(benefitsEntryTargetY(1450,93.75),1356.25);
  assert.equal(benefitsEntryTargetY(10,93.75),0);
  assert.throws(()=>benefitsEntryTargetY(NaN,94));
  assert.throws(()=>benefitsEntryProgress(NaN));
  assert.equal(HOME_TRAINING_TIMING.entryDurationMs,420);
  const code=read('app/composables/useHomeBenefitsReveal.ts');
  assert.match(code,/targetFor\('benefits'\)/);
  assert.match(code,/targetFor\('training-track'\)/);
  assert.match(code,/window\.scrollTo\(\{ top: y, behavior: 'auto' \}\)/);
  assert.match(code,/watch\(\[trainingPhase, trainingSkipReason\], onHandoff, \{ flush: 'post' \}\)/);
});

test('CF3 title fades DOWN, cards fade UP in row-major 01-02-03-04 order', () => {
  assert.deepEqual(Array.from({length:5},(_,i)=>benefitsItemStartMs(i)),[0,520,690,860,1030]);
  assert.equal(HOME_BENEFITS_TIMING.titleDurationMs,500);
  assert.equal(HOME_BENEFITS_TIMING.cardDurationMs,460);
  assert.equal(HOME_BENEFITS_TIMING.titleEntryOffsetPx,-26);
  assert.equal(HOME_BENEFITS_TIMING.cardEntryOffsetPx,30);
  assert.equal(HOME_BENEFITS_COMPLETE_MS,1490);
  assert.equal(benefitsItemProgress(0,0),0);
  assert.equal(benefitsItemProgress(500,0),1);
  assert.equal(benefitsItemProgress(519,1),0);
  assert.equal(benefitsItemProgress(980,1),1);
  assert.equal(benefitsItemProgress(689,2),0);
  assert.equal(benefitsItemProgress(1150,2),1);
  assert.equal(benefitsItemProgress(1320,3),1);
  assert.equal(benefitsItemProgress(1490,4),1);
  assert.throws(()=>benefitsItemStartMs(5));
  assert.throws(()=>benefitsItemProgress(Infinity,0));
});

test('CF3 CSS targets only five groups; Benefits background and previous sections untouched', () => {
  const css=read('app/assets/css/home-benefits-reveal.css');
  assert.match(css,/min-width:1380px/);
  assert.match(css,/prefers-reduced-motion:no-preference/);
  assert.match(css,/data-benefits-prepared="true"/);
  assert.match(css,/data-benefits-phase="revealing"/);
  for(let i=0;i<5;i++)assert.match(css,new RegExp(`--smd-benefits-${i}-opacity`));
  assert.match(css,/translateY\(-26px\)/);
  assert.match(css,/translateY\(30px\)/);
  assert.doesNotMatch(css,/node-1:77|node-1:78|data-figma-self-paint/);
  assert.doesNotMatch(css,/position:\s*(sticky|fixed)/);
  assert.doesNotMatch(css,/\.smd-home-training|\.smd-home-special|\.smd-home-intro/);
  const oldCss=read('app/assets/css/home-body-compact.css');
  assert.match(oldCss,/data-figma-self-paint="node-1:77"/);
});

test('CF4 skip classifier is shared, no new gesture threshold or replay queue', () => {
  assert.strictEqual(benefitsSkipIntent,specialSkipIntent);
  assert.equal(benefitsSkipIntent({deltaPx:70,elapsedSinceEntryMs:80,silenceSinceLastWheelMs:10,cumulativeFollowUpDownPx:70}),'ignore');
  assert.equal(benefitsSkipIntent({deltaPx:70,elapsedSinceEntryMs:220,silenceSinceLastWheelMs:170,cumulativeFollowUpDownPx:70}),'skip-down');
  assert.equal(benefitsSkipIntent({deltaPx:75,elapsedSinceEntryMs:220,silenceSinceLastWheelMs:20,cumulativeFollowUpDownPx:145}),'skip-down');
  assert.equal(benefitsSkipIntent({deltaPx:-35,elapsedSinceEntryMs:30,silenceSinceLastWheelMs:0,cumulativeFollowUpDownPx:0}),'skip-up');
  assert.equal(benefitsWheelDeltaPx(3,1,1080),48);
  const code=read('app/composables/useHomeBenefitsReveal.ts');
  assert.match(code,/finish\('skipped', 'WHEEL_DOWN', true\)/);
  assert.match(code,/finish\('skipped', 'WHEEL_UP'\)/);
  assert.match(code,/targetFor\('methods'\)/);
  assert.match(code,/event\.preventDefault\(\)/);
  assert.doesNotMatch(code,/setTimeout\(|sessionStorage|localStorage/);
});

test('CF4 terminal outcomes do not replay and fully materialize visual state', () => {
  assert.equal(isBenefitsTerminal('completed'),true);
  assert.equal(isBenefitsTerminal('skipped'),true);
  assert.equal(isBenefitsTerminal('disabled'),true);
  assert.equal(isBenefitsTerminal('revealing'),false);
  assert.equal(benefitsOutcome('completed'),'completed');
  assert.equal(benefitsOutcome('skipped'),'skipped');
  assert.equal(benefitsOutcome('ready'),'not-started');
  const code=read('app/composables/useHomeBenefitsReveal.ts');
  assert.match(code,/if \(isBenefitsTerminal\(phase\.value\)\) return/);
  assert.match(code,/if \(phase\.value !== 'unarmed'\) return/);
  assert.match(code,/presentFinal\(\)/);
  assert.match(code,/prepared\.value = false/);
  assert.match(code,/removeActiveListeners\(\)/);
  assert.match(code,/restoreScrollBehavior\(\)/);
});

test('CF4 external navigation and mobile do not conceal targets or gain Wheel ownership', () => {
  const code=read('app/composables/useHomeBenefitsReveal.ts');
  assert.match(code,/navigator\.maxTouchPoints > 0/);
  assert.match(code,/HOME_INTRO_DESKTOP_MEDIA/);
  assert.match(code,/if \(window\.scrollY >= targetFor\('benefits'\) - 2\)/);
  assert.match(code,/finish\('skipped', 'EXTERNAL_EARLY_SCROLL'\)/);
  assert.match(code,/onBeforeUnmount/);
  assert.match(code,/window\.removeEventListener\('scroll', onScroll\)/);
  assert.match(code,/document\.visibilityState !== 'hidden'/);
  assert.match(code,/element\.style\.removeProperty\('scroll-behavior'\)/);
});

test('previous Intro / Special / Training timeline values remain unchanged', () => {
  assert.equal(HOME_INTRO_TIMING.barDurationMs,430);
  assert.equal(HOME_INTRO_TIMING.barToIconDelayMs,30);
  assert.equal(HOME_INTRO_TIMING.iconStaggerMs,60);
  assert.equal(HOME_INTRO_TIMING.iconDurationMs,350);
  assert.equal(HOME_SPECIAL_TIMING.entryDurationMs,420);
  assert.equal(HOME_SPECIAL_TIMING.cardDurationMs,440);
  assert.equal(HOME_TRAINING_TIMING.entryDurationMs,420);
  assert.equal(HOME_TRAINING_TIMING.diagramStartMs,1360);
  assert.equal(HOME_TRAINING_TIMING.diagramDurationMs,900);
});
