/** Retired compact-reveal regression. Keep the test path for package tooling parity. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {HOME_INTRO_TIMING,HOME_INTRO_REVEAL_COMPLETE_MS,HOME_INTRO_MIN_RELEASE_MS,
 iconStartMs,iconProgress,barProgress} from '../../app/utils/homeIntroTimeline.ts';
import {figmaScene} from '../../app/data/figma-r2-scene.generated.ts';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const text=path=>readFileSync(resolve(root,path),'utf8');
const controller=text('app/composables/useHomeIntroReveal.ts');
const css=text('app/assets/css/home-r2-interaction.css');
const windCss=text('app/assets/css/home-hero-film.css');
const host=text('app/components/home/HomeIntroStage.vue');
const film=text('app/components/home/HomeHeroFilm.vue');

test('R3: vue-overlay is the only product Intro route and paints in one frame',()=>{
 assert.match(host,/introRoute='vue-overlay'/);
 assert.match(host,/:data-intro-route="introRoute"/);
 assert.match(host,/data-intro-contract="SMD_HOME_INTERACTION_R1"/);
 assert.match(host,/data-intro-paint-owner="base"/);
 assert.match(host,/data-intro-paint-owner="overlay"/);
 assert.doesNotMatch(host,/compact-reveal|viewport-scroll/);
 assert.match(css,/\.smd-home-intro__overlay\s*\{[^}]*position:absolute/s);
 assert.doesNotMatch(css,/position:sticky|--smd-intro-bar-height/);
});

test('R3: SSR starts hidden without height animation or scrolling the document',()=>{
 assert.match(host,/:data-intro-visual="visualState"/);
 assert.match(controller,/ref<IntroVisualState>\('pending'\)/);
 assert.match(css,/opacity:0; \/\* SSR/);
 for(let i=0;i<4;i++)
  assert.match(css,new RegExp(`data-intro-icon-index="${i}"\\] \\{\\s*opacity:var\\(--smd-intro-icon-${i}-opacity,0\\)`));
 assert.doesNotMatch(css,/height:var\(--smd-intro-bar-height/);
 assert.doesNotMatch(controller,/smd-intro-bar-height|window\.scrollTo/);
});

test('R2: source Figma section identities and immutable coordinate authority',()=>{
 const expected=[['header',0,125],['hero',125,815],['info-bar',940,310],['special-start',1250,1067]];
 for(const [id,y,h] of expected){
  const source=figmaScene.sections.find(s=>s.id===id);
  assert.ok(source,`missing ${id}`);
  assert.equal(source.top,y);
  assert.equal(source.height,h);
 }
 assert.equal(figmaScene.sections.find(s=>s.id==='hero')?.nodeKey,'node-1:4');
 assert.equal(figmaScene.sections.find(s=>s.id==='info-bar')?.nodeKey,'node-1:134');
});

test('R2: Wind does not publish any parent Hero height or replace Figma SVG placement',()=>{
 assert.doesNotMatch(windCss,/--film-painted-height|height:var\(--film-painted-height|\.smd-home-intro\s*>/);
 assert.doesNotMatch(windCss,/smd-figma-scene-section--hero:has\(> \.smd-hero-film\)\s*\{/);
 assert.match(windCss,/\.smd-figma-scene-section--hero > \.smd-figma-scene-svg \{ position:relative/);
 assert.doesNotMatch(film,/parentElement;[\s\S]{0,120}style\.setProperty\('--film-painted-height'/);
 assert.doesNotMatch(film,/:style="filmFrameStyle"/);
 assert.match(film,/\.smd-hero-film \{[^}]*height:100%/s);
});

test('R3: Vue presentation controls opacity and item staggering, no scrollTo()',()=>{
 assert.match(controller,/presentation=ref<IntroPresentation>/);
 assert.match(controller,/const draw=/);
 assert.match(host,/overlayStyle/);
 assert.match(host,/itemStyle/);
 assert.match(controller,/removeWheel\(\)/);
 assert.doesNotMatch(controller,/window\.scrollTo|ownScrollBehavior/);
});

test('R2: source Fade Up/stagger time remains byte-semantic',()=>{
 assert.equal(HOME_INTRO_TIMING.barDurationMs,430);
 assert.deepEqual([0,1,2,3].map(iconStartMs),[460,520,580,640]);
 assert.equal(HOME_INTRO_REVEAL_COMPLETE_MS,990);
 assert.equal(HOME_INTRO_MIN_RELEASE_MS,1110);
 for(const t of [0,10,95,230,300,429,430,460,530,650,989,990,1110]){
  const b=barProgress(t);assert(b>=0&&b<=1);
  for(let i=0;i<4;i++)assert(iconProgress(t,i)>=0&&iconProgress(t,i)<=1);
 }
});

test('R3: short wide and touch-capable fine pointer are eligible by visible ownership',()=>{
 assert.doesNotMatch(controller,/navigator\.maxTouchPoints\s*>\s*0/);
 assert.match(controller,/start\(performance\.now\(\),'keyboard'\)/);
 assert.match(controller,/getClientRects\(\)/);
 assert.match(controller,/releaseReason\.value='restored-scroll'/);
});
