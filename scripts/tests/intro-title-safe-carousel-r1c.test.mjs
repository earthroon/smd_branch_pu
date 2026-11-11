import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planIntroTitleSafeMinimumHeight } from '../../app/utils/homeIntroTitleSafeHeight.ts';
import { titleSafeOverlay } from '../../app/utils/homeIntroViewportGeometry.ts';

const title = { left: 261, top: 494, width: 767, height: 66 };
const bar = (heroHeight, barHeight = 253.8) => ({ left: 0, top: heroHeight - barHeight, width: 1920, height: barHeight });

test('1920px Figma source: 815px Hero + 253.8px InfoBar requires a bounded extension', () => {
  const h = 815;
  assert.equal(titleSafeOverlay(bar(h), [title]), false);
  const required = planIntroTitleSafeMinimumHeight(h, bar(h), [title]);
  assert.equal(required, 827);
  assert.equal(titleSafeOverlay(bar(required), [title]), true);
});

test('A tall viewport remains untouched when it is title-safe', () => {
  const h = 986;
  assert.equal(titleSafeOverlay(bar(h), [title]), true);
  assert.equal(planIntroTitleSafeMinimumHeight(h, bar(h), [title]), null);
});

test('Mobile short viewport grows enough to keep title visible', () => {
  const titleMobile = { left: 20, top: 150, width: 320, height: 220 };
  const h = 361;
  const mobileBar = (height) => ({ left: 0, top: height - 185, width: 390, height: 185 });
  const requested = planIntroTitleSafeMinimumHeight(h, mobileBar(h), [titleMobile]);
  assert.equal(requested, 568);
  assert.equal(titleSafeOverlay(mobileBar(requested), [titleMobile]), true);
});

test('No horizontal intersection does not expand Hero', () => {
  const outside = { left: 2000, top: 494, width: 60, height: 60 };
  assert.equal(planIntroTitleSafeMinimumHeight(815, bar(815), [outside]), null);
});

test('Never approves invalid inputs or a no-op extension', () => {
  assert.throws(() => planIntroTitleSafeMinimumHeight(0, bar(815), [title]), /INPUT_INVALID/);
  assert.throws(() => planIntroTitleSafeMinimumHeight(815, bar(815), [], 12), /INPUT_INVALID/);
  assert.throws(() => planIntroTitleSafeMinimumHeight(815, bar(815), [title], Number.NaN), /INPUT_INVALID/);
});
