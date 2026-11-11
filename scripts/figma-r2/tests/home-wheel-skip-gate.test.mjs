import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHomeWheelSkipGate, HOME_WHEEL_SKIP_GATE} from '../../../app/utils/homeWheelSkipGate.ts';

const begin = () => createHomeWheelSkipGate();
test('50ms jitter rule stays explicit', () => {
  assert.equal(HOME_WHEEL_SKIP_GATE.confirmDurationMs, 50);
  assert.equal(HOME_WHEEL_SKIP_GATE.minimumEvents, 2);
});
test('isolated reverse spike does not retire animation', () => {
  const g=begin();
  assert.equal(g.observe(300,-120,'skip-up'),'ignore');
});
test('a burst ending before 50ms is ignored despite high travel', () => {
  const g=begin();
  assert.equal(g.observe(200,-80,'skip-up'),'ignore');
  assert.equal(g.observe(225,-100,'skip-up'),'ignore');
  assert.equal(g.observe(249,-90,'skip-up'),'ignore');
});
test('sustained upward wheel is confirmed only after 50ms', () => {
  const g=begin();
  assert.equal(g.observe(200,-30,'skip-up'),'ignore');
  assert.equal(g.observe(240,-30,'skip-up'),'ignore');
  assert.equal(g.observe(251,-15,'skip-up'),'skip-up');
});
test('sustained downward wheel is confirmed only after 50ms', () => {
  const g=begin();
  assert.equal(g.observe(200,120,'skip-down'),'ignore');
  assert.equal(g.observe(255,50,'skip-down'),'skip-down');
});
test('opposite-direction bounce resets candidate', () => {
  const g=begin();
  assert.equal(g.observe(200,-100,'skip-up'),'ignore');
  assert.equal(g.observe(215,10,'ignore'),'ignore');
  assert.equal(g.observe(270,-50,'skip-up'),'ignore');
});
test('two tiny same-direction events cannot skip', () => {
  const g=begin();
  assert.equal(g.observe(200,-5,'skip-up'),'ignore');
  assert.equal(g.observe(270,-9,'skip-up'),'ignore');
});
test('a gap longer than gesture-quiet window starts a new candidate', () => {
  const g=begin();
  assert.equal(g.observe(200,-100,'skip-up'),'ignore');
  assert.equal(g.observe(370,-100,'skip-up'),'ignore');
});
test('classifier ignore cannot start candidate', () => {
  const g=begin();
  assert.equal(g.observe(200,200,'ignore'),'ignore');
  assert.equal(g.observe(255,100,'skip-down'),'ignore');
});
test('classifier ignore in an existing candidate does not by itself skip', () => {
  const g=begin();
  assert.equal(g.observe(200,100,'skip-down'),'ignore');
  assert.equal(g.observe(230,50,'ignore'),'ignore');
  assert.equal(g.observe(260,50,'skip-down'),'skip-down');
});
test('reset discards unconfirmed travel', () => {
  const g=begin();
  assert.equal(g.observe(200,100,'skip-down'),'ignore');
  g.reset();
  assert.equal(g.observe(260,100,'skip-down'),'ignore');
});
test('invalid inputs and direction conflicts are not suppressed', () => {
  const g=begin();
  assert.throws(()=>g.observe(Number.NaN,10,'skip-down'),/INPUT_INVALID/);
  assert.throws(()=>g.observe(200,-10,'skip-down'),/DIRECTION_CONFLICT/);
});
test('all four controllers consume the same wheel gate', () => {
  const root=resolve(import.meta.dirname,'../../..');
  for(const name of ['Special','Training','Benefits','Methods']){
    const src=readFileSync(resolve(root,`app/composables/useHome${name}Reveal.ts`),'utf8');
    assert.match(src,/createHomeWheelSkipGate\(\)/);
    assert.match(src,/wheelSkipGate\.observe\(now, deltaPx, requestedIntent\)/);
    assert.match(src,/case 'skip-up':/);
    assert.match(src,/case 'skip-down':/);
  }
});

test('browser skip witnesses use a confirmed 70ms second wheel rather than a one-event pulse', () => {
  const root=resolve(import.meta.dirname,'../../..');
  for(const name of ['special','training','benefits','methods']){
    const src=readFileSync(resolve(root,`scripts/figma-r2/verify-home-${name}-browser.mjs`),'utf8');
    assert.match(src,/await wheel\(w,h\);await sleep\(70\);await wheel\(w,h\)/);
  }
  const methods=readFileSync(resolve(root,'scripts/figma-r2/verify-home-methods-browser.mjs'),'utf8');
  assert.match(methods,/await wheel\(w,h,-700\);await sleep\(70\);await wheel\(w,h,-700\)/);
});
