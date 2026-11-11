import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  catalogueSpringProgress, CATALOGUE_SPRING_DURATION_MS,
  CATALOGUE_SPRING_DAMPING, CATALOGUE_SPRING_FREQUENCY,
  CATALOGUE_SPRING_MEDIA, CATALOGUE_WHEEL_IDLE_MS, CATALOGUE_WHEEL_THRESHOLD_PX,
} from '../../app/utils/catalogueSpringWheel.ts';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const read = rel => readFileSync(resolve(root, rel), 'utf8');

test('R6 spring coefficients, measurable overshoot and exact settle', () => {
  assert.equal(CATALOGUE_SPRING_DURATION_MS, 940);
  assert.equal(CATALOGUE_SPRING_DAMPING, 0.8);
  assert.equal(CATALOGUE_SPRING_FREQUENCY, 9.8);
  assert.equal(catalogueSpringProgress(0), 0);
  const peak = Math.max(...Array.from({length: 940}, (_, i) => catalogueSpringProgress(i)));
  assert.ok(peak > 1.01 && peak < 1.02, `unexpected overshoot ${peak}`);
  assert.equal(catalogueSpringProgress(940), 1);
  assert.throws(() => catalogueSpringProgress(-1), /R7_SPRING_ELAPSED_INVALID/);
});

test('R6 wheel gesture thresholds, desktop-only flow-safety admission', () => {
  assert.equal(CATALOGUE_WHEEL_IDLE_MS, 180);
  assert.equal(CATALOGUE_WHEEL_THRESHOLD_PX, 26);
  assert.match(CATALOGUE_SPRING_MEDIA, /min-width: 1100px/);
  assert.match(CATALOGUE_SPRING_MEDIA, /min-height: 850px/);
  assert.match(CATALOGUE_SPRING_MEDIA, /prefers-reduced-motion: no-preference/);
  const wheel = read('app/utils/catalogueSpringWheel.ts');
  assert.match(wheel, /nextElementSibling/);
  assert.match(wheel, /previousElementSibling/);
  assert.match(wheel, /data-sheet-fit=\\?"viewport\\?"/);
  assert.match(wheel, /hasNestedNativeScroll/);
  assert.match(wheel, /\[data-native-scroll\]/);
  assert.match(wheel, /\[aria-modal=\\?"true\\?"\]/);
  assert.match(wheel, /addEventListener\('wheel', onWheel, \{passive: false\}\)/);
  assert.match(wheel, /removeEventListener\('wheel', onWheel\)/);
});

test('Nuxt layout mounts exactly one scroll owner and cleans up', () => {
  const layout = read('app/layouts/default.vue');
  assert.equal((layout.match(/useCatalogueSpringScroll\(\);/g) ?? []).length, 1);
  assert.match(layout, /import \{ useCatalogueSpringScroll \}/);
  const hook = read('app/composables/useCatalogueSpringScroll.ts');
  assert.match(hook, /onMounted/);
  assert.match(hook, /onBeforeUnmount/);
  assert.match(hook, /lease\?\.dispose\(\)/);
  assert.match(hook, /route\.fullPath/);
});

test('Shared Header inner container is identical on Home and subroutes, at every breakpoint', () => {
  const home = read('app/assets/css/catalogue-r7-home.css');
  const unified = ':has(:is(.smd-r7-home,.smd-r7-route)) .smd-site-header__inner';
  assert.equal(home.split(unified).length - 1, 4, 'expected desktop, 1599, 1099 and mobile owners');
  for (const expected of ['min(calc(100% - 148px), 1650px)', 'min(calc(100% - 88px),1350px)',
    'min(calc(100% - 52px),920px)', 'calc(100% - 40px)']) assert.ok(home.includes(expected));
  const routes = read('app/assets/css/catalogue-r7-routes.css');
  assert.match(routes, /smd-site-header \.smd-r7-brand-logo\{display:block!important;width:266px/);
  assert.match(routes, /smd-site-header \.smd-r7-brand-logo\{width:190px/);
  assert.match(routes, /smd-site-header__cta\{[^}]*background:transparent!important/);
  assert.match(routes, /smd-site-header__nav-link\{font-weight:580;font-size:15px/);
  assert.match(routes, /smd-site-header\{box-sizing:border-box\}/);
});

test('Only subpage cover H1 is reduced to 60%; home and body H2 keep original authority', () => {
  const routes = read('app/assets/css/catalogue-r7-routes.css');
  assert.match(routes, /\.smd-r7-route__cover h1\{font-size:clamp\(28px,3\.24vw,62\.4px\)/);
  assert.match(routes, /\.smd-r7-route__cover h1\{font-size:clamp\(24px,6vw,34px\)/);
  assert.match(routes, /\.smd-r7-route \.smd-r7-sheet h2/);
  const home = read('app/assets/css/catalogue-r7-home.css');
  assert.match(home, /\.smd-r7-home__cover h1 \{/);
  assert.match(home, /font-size: clamp\(48px, 3\.5vw, 75px\)/);
});

test('Spring is not a global snap or a mandatory capture when content flows', () => {
  const wheel = read('app/utils/catalogueSpringWheel.ts');
  assert.match(wheel, /if \(adjacent === null\) return/);
  assert.match(wheel, /if \(!isViewportSheet\(next, window\.innerHeight\)\) return null/);
  assert.match(wheel, /document\.querySelector\('\[aria-modal/);
  const css = read('app/assets/css/catalogue-r7-routes.css');
  assert.match(css, /html\.smd-r7-wheel-spring-active/);
  assert.doesNotMatch(css, /scroll-snap-type:\s*y\s+mandatory/);
});
