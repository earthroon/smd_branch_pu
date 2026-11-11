import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const root=process.cwd();
const source=relative=>readFileSync(join(root,relative),'utf8').replace(/\r\n/g,'\n');
const util=await import(pathToFileURL(join(root,'app/utils/homeIntroMediaGate.ts')).href);
const ready={phase:'ready',sourceRevision:'3-image-revision',reason:null};

test('R1F: media/geometry/font/stable frames all required',()=>{
  assert.equal(util.canPresentIntro(ready,true,true,2),true);
  assert.equal(util.canPresentIntro(ready,false,true,2),false);
  assert.equal(util.canPresentIntro(ready,true,false,2),false);
  assert.equal(util.canPresentIntro(ready,true,true,1),false);
  assert.equal(util.INTRO_GEOMETRY_STABLE_FRAMES,2);
});
test('R1F: absent/failed/stale media never admits Intro',()=>{
  assert.equal(util.introMediaAdmitted(null),false);
  assert.equal(util.introMediaAdmitted({phase:'loading',sourceRevision:'a',reason:null}),false);
  assert.equal(util.introMediaAdmitted({phase:'failed',sourceRevision:'a',reason:'x'}),false);
  assert.equal(util.introMediaAdmitted({phase:'ready',sourceRevision:'',reason:null}),false);
  assert.equal(util.introMediaAdmitted(ready),true);
});
test('R1F: bounded watchdog is finite',()=>{
  assert.ok(util.INTRO_MEDIA_TIMEOUT_MS>=8000);
  assert.ok(util.INTRO_MEDIA_TIMEOUT_MS<=20000);
});
test('R1F: image load uses paint-ready decode, not network load',()=>{
  const c=source('app/components/home/HomeHeroCarousel.vue');
  assert.match(c,/typeof img\.decode === 'function' \? img\.decode\(\)/);
  assert.match(c,/if \(!mounted \|\| !img\.isConnected \|\| !eventIsCurrent/);
  assert.match(c,/decoded\.then\(/);
  assert.match(c,/HERO_CAROUSEL_IMAGE_DECODE_FAILED/);
  assert.match(c,/const ready = computed\(\(\) => slides\.value\.every/);
  assert.match(c,/loading="eager"/);
  assert.doesNotMatch(c,/loading="lazy"/);
});
test('R1F: media state is emitted by the active responsive owner only',()=>{
  const c=source('app/components/home/HomeHeroCarousel.vue');
  assert.match(c,/if \(!owner\.value\) return;\s*emit\('media-status'/);
  assert.match(c,/phase: loadFault\.value \? 'failed' : ready\.value \? 'ready' : 'loading'/);
  for(const f of ['app/components/home/HomeHeroFilm.vue','app/components/home/HeroSection.vue','app/components/figma/FigmaSceneSection.vue']){
    assert.match(source(f),/@film-media-status="emit\('film-media-status', \$event\)"|@media-status="emit\('film-media-status', \$event\)"/);
  }
});
test('R1F: geometry gate and responsive owner are required',()=>{
  const c=source('app/components/home/HomeIntroStage.vue');
  assert.match(c,/function introGateVisible\(\):boolean/);
  assert.match(c,/getComputedStyle\(el\)\.display!=='none'/);
  assert.match(c,/introInteractionReady=computed\(\(\)=>introLoadState\.value==='ready'&&placementReady\.value\)/);
  assert.match(c,/useHomeIntroReveal\(root,introRoute,introInteractionReady\)/);
  assert.match(c,/introLayoutStamp\(\)/);
  assert.match(c,/canPresentIntro\(heroMedia\.value,placementReady\.value,fontsReady\.value,stableFrameCount\)/);
});
test('R1F: lock owns only scroll input, restores on exit and failure',()=>{
  const c=source('app/components/home/HomeIntroStage.vue');
  for(const token of ['releaseIntroScrollLock();','window.removeEventListener(\'wheel\',onGateWheel,true)',
    'INTRO_R1F_MEDIA_OR_GEOMETRY_TIMEOUT','INTRO_R1F_LOAD_GATE_FAILED','emitIntroCompleted();'])assert.ok(c.includes(token),token);
  assert.match(c,/if\(document\.documentElement\.dataset\.smdIntroLoadLockOwner===introGateOwnerId\)/);
  assert.match(c,/onBeforeUnmount\(\(\)=>\{\s*releaseIntroScrollLock\(\)/);
});
test('R1F: input buffered once, explicitly forwarded, no synthetic wheel',()=>{
  const c=source('app/components/home/HomeIntroStage.vue');
  const r=source('app/composables/useHomeIntroReveal.ts');
  assert.match(c,/if\(bufferedIntent===null\)bufferedIntent=source/);
  assert.match(c,/requestBufferedIntent\(intent\)/);
  assert.match(r,/function requestBufferedIntent\(source:IntroIntent\):boolean/);
  assert.match(r,/start\(performance\.now\(\),source\)/);
  assert.doesNotMatch(c,/dispatchEvent\(new WheelEvent/);
});
test('R1F: restored-scroll counts as completion for downstream scene',()=>{
  const c=source('app/components/home/HomeIntroStage.vue');
  assert.match(c,/reason==='completed'\|\|reason==='restored-scroll'/);
  assert.match(c,/emitIntroCompleted\(\)/);
});
test('R1F: layout hidden only with opacity, never display:none',()=>{
  const css=source('app/assets/css/home-r2-interaction.css');
  assert.match(css,/html\[data-smd-intro-load-lock-owner\]/);
  assert.match(css,/scrollbar-gutter:stable/);
  const gate=css.match(/\.smd-home-intro:not\(\[data-intro-load-state="ready"\]\) \.smd-home-intro__paint-stack \{([^}]+)\}/);
  assert.ok(gate);
  assert.match(gate[1],/opacity:0/);
  assert.doesNotMatch(gate[1],/display:none|visibility:hidden/);
});
test('R1F: no change to 3s autoplay',()=>{
  const t=source('app/data/home-hero-carousel.ts');
  assert.match(t,/HERO_CAROUSEL_DELAY_MS = 3000/);
  const c=source('app/components/home/HomeHeroCarousel.vue');
  assert.match(c,/autoplay\.play\(false\)/);
  assert.match(c,/@click\.stop="navigate\('previous'\)"/);
  assert.match(c,/@click\.stop="navigate\('next'\)"/);
});
