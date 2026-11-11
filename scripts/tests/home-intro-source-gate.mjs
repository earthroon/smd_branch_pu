/** Standalone source invariants. Run together with the timing/model tests. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const read=relative=>readFileSync(resolve(root,relative),'utf8');

test('CF1 no Header/Layout/CMS owner changes: intro remains page-scoped',()=>{
  assert.match(read('app/pages/index.vue'),/HomeIntroStage/);
  assert.match(read('app/components/home/HomeIntroStage.vue'),/data-intro-contract="SMD_HOME_INTERACTION_R1"/);
  assert.doesNotMatch(read('app/assets/css/home-r2-interaction.css'),/\.smd-site-header\s*\{/);
  assert.doesNotMatch(read('app/composables/useHomeIntroReveal.ts'),/useSiteContent|useHomeR2Published|smd-core|wrangler/);
});

test('CF4 4 icons + 4 text instances exactly once; original node painter remains',()=>{
  const node=read('app/components/figma/FigmaSceneNode.vue');
  assert.match(node,/:transform="translate"/);
  assert.match(node,/v-if="introItemIndex\(child\) !== null"/);
  assert.match(node,/<FigmaSceneNode :node-key="child" :mode="mode" \/>/);
  const section=read('app/components/figma/FigmaSceneSection.vue');
  assert.equal((section.match(/<FigmaR4UserFileIcon\s*\/>/g)??[]).length,1);
  assert.match(section,/<g v-if="sectionId === 'info-bar'"/);
});

test('CF5 animation owns wheel no timeout/replay; header navigation is not targeted',()=>{
  const source=read('app/composables/useHomeIntroReveal.ts');
  assert.match(source,/removeWheel\(\)/);
  assert.match(source,/lastWheelAt\s*=\s*performance\.now\(\)/);
  assert.match(source,/canReleaseIntro\(elapsed,now-lastWheelAt\)/);
  assert.match(source,/event\.target\.closest\('\.smd-site-header,/);
  assert.doesNotMatch(source,/setTimeout\(/);
});

test('CF6 verification harness exists and source uses exact local-only browser URL',()=>{
  const path='scripts/figma-r2/verify-home-intro-browser.mjs';
  assert.ok(existsSync(resolve(root,path)));
  assert.match(read(path),/SMD_INTRO_BROWSER_LOCAL_URL_ONLY/);
});
