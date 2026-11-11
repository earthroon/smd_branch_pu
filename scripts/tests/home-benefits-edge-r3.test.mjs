/** SMD_HOME_LAYOUT_R1_BENEFITS_EDGE_R3: source-only seam attribution and local repair. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root=resolve(import.meta.dirname,'../..');
const read=(path)=>readFileSync(resolve(root,path),'utf8');
const css=read('app/assets/css/home-body-compact.css');
const scene=JSON.parse('{'+read('app/data/figma-r2-scene.generated.ts').split('= {',2)[1].replace(/;\s*$/,''));

test('R3 benefits root is dark-under-white at the SVG artboard edge',()=>{
  assert.equal(scene.nodes['node-1:77'].rect[2],1920);
  assert.equal(scene.nodes['node-1:77'].kind,'FRAME');
  assert.equal(scene.operationByNode['node-1:77'].kind,'self-paint');
  const bg=scene.nodes['node-1:78'];
  assert.equal(bg.parent,'node-1:77');
  assert.equal(bg.rect[0],-31);
  assert.equal(bg.rect[2],1972);
});

test('R3 right-only clip is retired by the stronger R4 underpaint remedy',()=>{
  assert.doesNotMatch(css,/clip-path:\s*inset\(0 4px 0 0\)/);
  assert.match(css,/data-figma-self-paint="node-1:77"/);
});

test('R3 75% wide geometry and CTA gap paint remain unchanged',()=>{
  assert.match(css,/\.smd-home-body-stage \.smd-figma-scene-svg\s*\{\s*width:75%;\s*max-width:1440px;/);
  assert.match(css,/data-wide-section="consultation-cta"\]::before/);
  const timing=read('app/utils/homeIntroTimeline.ts');
  for(const v of ['barDurationMs: 430','barToIconDelayMs: 30','iconStaggerMs: 60','iconDurationMs: 350','postRevealSettleMs: 120','wheelQuietMs: 220']) assert.ok(timing.includes(v));
});
