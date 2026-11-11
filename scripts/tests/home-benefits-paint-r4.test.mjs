/** SMD_HOME_LAYOUT_R1_BENEFITS_PAINT_R4: occluded dark underpaint retirement. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const read = (name) => readFileSync(resolve(root, name), 'utf8');
const css = read('app/assets/css/home-body-compact.css');
const sectionCss = read('app/assets/css/figma-r2-scene.css');
const renderer = read('app/components/figma/FigmaSceneNode.vue');
const generated = read('app/data/figma-r2-scene.generated.ts');
const scene = JSON.parse('{' + generated.split('= {', 2)[1].replace(/;\s*$/, ''));
const dark = scene.nodes['node-1:77'];
const white = scene.nodes['node-1:78'];
const backgroundAssetId = scene.operationByNode['node-1:78']?.sourceRef;
const sourceAsset = scene.assets[backgroundAssetId];
const section = scene.sections.find((entry) => entry.id === 'benefits');

// Verify that the exceptional rendering rule is justified by the actual immutable source.
test('R4: one Benefits dark root is fully occluded by the white background asset', () => {
  assert.equal(section?.nodeKey, 'node-1:77');
  assert.deepEqual(dark.rect, [0, 3208, 1920, 1422]);
  assert.equal(dark.clippedChildren, true);
  assert.equal(scene.operationByNode['node-1:77'].kind, 'self-paint');
  const fills = scene.selfPaints['node-1:77'].fills;
  assert.ok(fills.some((paint) => paint.paintType === 'SOLID' && paint.visible && paint.rgba[0] < 0.3));
  assert.equal(white.parent, dark.key);
  const [x, y, w, h] = white.rect;
  assert.ok(x < 0 && y < 0 && x + w > dark.rect[2] && y + h > dark.rect[3]);
  assert.equal(scene.operationByNode['node-1:78'].kind, 'asset');
  assert.match(sourceAsset.src, /asset-aff093ccdac767a714d29c9958b0424ed00ffc1fe30905d7150e52b9e3e6642c\.svg$/);
  const svg = read('public' + sourceAsset.src);
  assert.match(svg, /<rect\s+width="1972"\s+height="1574"\s+fill="white"\s*\/>/);
  assert.doesNotMatch(svg, /stroke=/);
});

test('R4: remove the R3 right-edge crop, hide only the occluded Benefits root underpaint', () => {
  const gate = '@media (min-width:1380px) and (hover:hover) and (pointer:fine)';
  const mediaStart = css.indexOf(gate);
  const selector = '.smd-figma-scene-svg [data-figma-self-paint="node-1:77"]';
  const paintIndex = css.indexOf(selector);
  assert.ok(mediaStart >= 0 && paintIndex > mediaStart);
  assert.ok(css.slice(mediaStart, paintIndex).includes('data-wide-section="benefits"'));
  assert.match(css.slice(paintIndex).match(/\{([^}]*)\}/)?.[1] ?? '', /display:\s*none\s*;/);
  assert.doesNotMatch(css, /clip-path:\s*inset\(0 4px 0 0\)/);
  assert.equal(css.split(selector).length - 1, 1);
  assert.match(renderer, /:data-figma-self-paint="node\.key"/);
  assert.match(sectionCss, /\.smd-figma-scene-section--benefits\s*\{\s*background:\s*#fff\s*\}/);
});

test('R4: wide layout, Intro timing and InfoBar geometry are not modified', () => {
  assert.match(css, /\.smd-home-body-stage \.smd-figma-scene-svg\s*\{\s*width:75%;\s*max-width:1440px;/);
  assert.match(css, /data-wide-section="consultation-cta"\]::before/);
  const timing = read('app/utils/homeIntroTimeline.ts');
  for (const token of [
    'barDurationMs: 430', 'barToIconDelayMs: 30', 'iconStaggerMs: 60',
    'iconDurationMs: 350', 'postRevealSettleMs: 120', 'wheelQuietMs: 220',
  ]) assert.ok(timing.includes(token));
});
