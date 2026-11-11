/** SMD_HOME_LAYOUT_R1_HEADER_GRAY_R2: exact source contracts; not a browser pixel qualification. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const source = (path) => readFileSync(resolve(root, path), 'utf8');
const header = source('app/assets/css/home-r2-header.css');
const home = source('app/assets/css/home-r2.css');
const body = source('app/assets/css/home-body-compact.css');

// Verify source ownership rather than treating an offscreen image as proof of correct DOM geometry.
test('H1 desktop Header is exactly 75% and shares one height authority with Home', () => {
  assert.match(header, /:root\s*\{\s*--smd-desktop-header-height:\s*93\.75px\s*;/);
  assert.match(header, /height:\s*var\(--smd-desktop-header-height\)/);
  assert.match(header, /--smd-header-v2-brand-symbol-size:\s*60px/);
  assert.match(header, /max-width:\s*1228\.5px/);
  assert.match(header, /width:\s*78\.75px/);
  assert.match(header, /height:\s*33\.75px/);
  assert.match(header, /font-size:\s*22\.5px/);
  assert.match(header, /font-size:\s*15px/);
  assert.equal((home.match(/--home-header-offset:var\(--smd-desktop-header-height\)/g) ?? []).length, 2);
  assert.doesNotMatch(home, /--home-header-offset:125px/);
});

test('H2 original mobile Header stays on its own unmodified geometry', () => {
  assert.match(header, /\.smd-site-header\s*\{[^}]*height:\s*80px/);
  assert.match(header, /@media \(max-width: 599px\)\s*\{[^}]*\.smd-site-header\s*\{height:\s*76px/);
  assert.match(header, /@media \(max-width: 1379px\)/);
  assert.match(header, /max-height:\s*min\(530px, calc\(100dvh - 80px\)\)/);
});

test('H2 category page clearance tracks Header SSOT rather than old 125px', () => {
  assert.match(header, /padding-top:\s*calc\(var\(--smd-desktop-header-height\) \+ 64px\)/);
  assert.match(header, /padding-top:\s*calc\(var\(--smd-desktop-header-height\) \+ 80px\)/);
  assert.doesNotMatch(header, /padding-top:\s*(?:189|205)px/);
});

test('H3 FAQ to Consultation CTA keeps its 11.25px Y-space but paints it gray', () => {
  const fragment = body.match(/\.smd-home-body-stage__row\[data-wide-section="consultation-cta"\]::before\s*\{([^}]+)\}/)?.[1];
  assert.ok(fragment, 'CTA pseudo-element background paint missing');
  assert.match(fragment, /top:\s*calc\(-1 \* var\(--smd-wide-section-gap, 0px\)\)/);
  assert.match(fragment, /height:\s*var\(--smd-wide-section-gap, 0px\)/);
  assert.match(fragment, /background:\s*#d9d9d9/);
  assert.match(fragment, /pointer-events:\s*none/);
  assert.match(body, /margin-block-start:\s*var\(--smd-wide-section-gap, 0px\)/);
  assert.match(source('app/assets/css/figma-r2-scene.css'), /\.smd-figma-scene-section--consultation-cta\{background:#d9d9d9\}/);
});

test('H4 no global zoom or unrequested Intro/Icon CSS animation change', () => {
  for (const css of [header, home, body]) {
    assert.doesNotMatch(css, /zoom\s*:\s*0\.75|transform\s*:\s*scale\(0\.75\)/);
  }
  assert.match(body, /\.smd-home-body-stage \.smd-figma-scene-svg\s*\{\s*width:75%;\s*max-width:1440px/);
  const timing = source('app/utils/homeIntroTimeline.ts');
  for (const value of ['barDurationMs: 430', 'barToIconDelayMs: 30',
    'iconStaggerMs: 60', 'iconDurationMs: 350',
    'postRevealSettleMs: 120', 'wheelQuietMs: 220']) {
    assert.ok(timing.includes(value), `Intro timer changed: ${value}`);
  }
});
