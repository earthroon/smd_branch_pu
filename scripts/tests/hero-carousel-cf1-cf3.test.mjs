/** R2 migration of the old CF1-CF3 entrypoint. SOURCE/MODEL checks, not browser frames. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { homeFilmAssets } from '../../app/data/home-film.ts';
import {
  HERO_CAROUSEL_REVISION, HERO_CAROUSEL_DELAY_MS, heroCarouselFocalPoints,
  resolveHeroCarouselSlots, HERO_DISSOLVE_DURATION_MS, HERO_CAPTION_START_DELAY_MS,
  HERO_CAPTION_FADE_MS, HERO_CAPTION_RISE_PX,
} from '../../app/data/home-hero-carousel.ts';
import { heroDissolveLayerPhase, nextHeroDissolveIndex } from '../../app/utils/homeHeroDissolveState.ts';
const project = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const read = path => readFileSync(resolve(project, path), 'utf8');
const local = () => ({kind:'local'});

test('CF1: stable source hero IDs, focal points and 3000ms policy', () => {
  assert.equal(HERO_CAROUSEL_REVISION, 'SMD-HOME-HERO-CAROUSEL-R1-CF1-CF3');
  assert.equal(HERO_CAROUSEL_DELAY_MS, 3000);
  assert.deepEqual(homeFilmAssets.map(s => s.id), ['hero-1','hero-2','hero-3']);
  assert.deepEqual(Object.keys(heroCarouselFocalPoints), homeFilmAssets.map(s => s.id));
  const slides = resolveHeroCarouselSlots(local);
  assert.deepEqual(slides.map(s=>s.slotId),homeFilmAssets.map(s=>s.id));
  for(const slide of slides){
    assert.deepEqual(slide.focalPoint,{xPercent:50,yPercent:50});
    assert.equal(slide.publicationId,null);
    assert.equal(slide.assetId,null);
  }
});

test('CF1: published binding authority and errors stay explicit', () => {
  const slides=resolveHeroCarouselSlots(id=>({
    kind:'published',publicationId:'p1',assetId:`asset-${id}`,
    src:`/published/${id}`,width:4096,height:2160,alt:`Published ${id}`,
  }));
  for(const slide of slides){
    assert.equal(slide.src,`/published/${slide.imageId}`);
    assert.equal(slide.publicationId,'p1');
    assert.equal(slide.assetId,`asset-${slide.imageId}`);
  }
  assert.throws(()=>resolveHeroCarouselSlots(()=>({kind:'unbound'})),/STANDALONE_FILM_IMAGE_NOT_PUBLISHED/);
  assert.throws(()=>resolveHeroCarouselSlots(()=>({kind:'published',publicationId:'',assetId:'x',src:'/bad',width:20,height:20,alt:'a'})),/HERO_CAROUSEL_PUBLICATION_INVALID/);
  assert.throws(()=>resolveHeroCarouselSlots(()=>({kind:'local',width:-1})),/HERO_CAROUSEL_SOURCE_INVALID/);
});

test('CF2: stationary dissolve replaces Embla without losing ownership or media gating', () => {
  const vue=read('app/components/home/HomeHeroCarousel.vue');
  const wrapper=read('app/components/home/HomeHeroFilm.vue');
  assert.match(wrapper, /<HomeHeroCarousel\s+@media-status="emit\('film-media-status', \$event\)"\s*\/>/);
  assert.match(wrapper,/owner: 'HomeHeroFilm'/);
  assert.doesNotMatch(vue,/embla-carousel|useEmblaCarousel|scrollNext|scrollPrev/);
  assert.match(vue,/useState<number>\('smd-hero-carousel-selected-r1'/);
  assert.match(vue,/smd-hero-carousel-autoplay-lease-r1/);
  assert.match(vue,/if \(autoplayLease\.value === instanceId\) autoplayLease\.value = null/);
  assert.match(vue,/matchMedia\('\(min-width: 1100px\)'\)/);
  assert.match(vue,/document\.hidden/);
  assert.match(vue,/reducedMotion\.value/);
  assert.match(vue,/img\.decode\(\)/);
  assert.match(vue,/revision !== sourceRevision\.value/);
  assert.match(vue,/data-hero-caption-phase="captionPhase"/);
  assert.match(vue,/data-hero-layer-state="layerPhase\(slide\.order\)"/);
  assert.match(vue,/data-hero-ready="ready \? 'true' : 'false'"/);
  assert.match(vue,/resolveHomeHeroLocalMedia\(id\)/);
});

test('CF2: 3s, 700ms, 20ms, 420ms and 12px remain explicit', () => {
  assert.equal(HERO_CAROUSEL_DELAY_MS,3000);
  assert.equal(HERO_DISSOLVE_DURATION_MS,700);
  assert.equal(HERO_CAPTION_START_DELAY_MS,20);
  assert.equal(HERO_CAPTION_FADE_MS,420);
  assert.equal(HERO_CAPTION_RISE_PX,12);
  const vue=read('app/components/home/HomeHeroCarousel.vue');
  assert.match(vue,/setTimeout\(\(\) => \{[\s\S]*?\}, HERO_CAPTION_START_DELAY_MS\)/);
  assert.match(vue,/\}, HERO_DISSOLVE_DURATION_MS \+ 96\)/);
  assert.match(vue,/requestAnimationFrame\(\(\) => \{/);
  assert.match(vue,/pendingIndex\.value = target/);
  assert.match(vue,/clearMotionCallbacks\(\)/);
});

test('CF3: all slides cover a fixed full-size layered viewport, never translateX', () => {
  const css=read('app/assets/css/home-hero-film.css');
  assert.match(css,/\.smd-hero-carousel__slide\s*\{[\s\S]*?position: absolute;[\s\S]*?inset: 0;/);
  assert.match(css,/\.smd-hero-carousel__slide\s*> img\s*\{[\s\S]*?object-fit: cover/);
  assert.match(css,/object-position:\s*var\(--hero-focal-x/);
  assert.match(css,/\[data-hero-layer-state="revealing"\][\s\S]*?transition: opacity 700ms/);
  const imageStart = css.indexOf('.smd-hero-carousel__viewport {');
  const imageEnd = css.indexOf('.smd-hero-carousel:focus-visible', imageStart);
  assert.ok(imageStart >= 0 && imageEnd > imageStart, 'HERO_IMAGE_CSS_SCOPE_MISSING');
  const imageCss = css.slice(imageStart, imageEnd);
  assert.doesNotMatch(imageCss,/translateX\(|flex: 0 0 100%|object-fit:\s*contain/);
  assert.match(css,/node-1:5/);
});

test('CF3: typography remains in Figma/semantic source with 20ms delayed reveal', () => {
  const css=read('app/assets/css/home-hero-film.css');
  for(const node of ['node-36:6','node-35:5','node-36:7']) {
    assert.ok(css.includes(`data-figma-text-instance="${node}"`));
  }
  assert.match(css,/:has\(\.smd-hero-carousel\[data-hero-caption-phase="hidden"\]\)/);
  assert.match(css,/opacity 420ms/);
  assert.match(css,/translateY\(12px\)/);
  assert.match(css,/\.smd-home--hero > \.smd-home__container/);
  const vue=read('app/components/home/HomeHeroCarousel.vue');
  assert.doesNotMatch(vue,/activeSlide\.title|activeSlide\.description/);
});

test('CF3: all requested aspect ratios retain source ratio under cover scaling', () => {
  for(const [w,h] of [[390,844],[768,1024],[1440,900],[1920,1080],[2560,1440],[3440,1440],[3840,1600],[5120,1440]]) {
    const src=homeFilmAssets[0];
    const k=Math.max(w/src.width,h/src.height);
    assert.ok(k*src.width>=w-1e-8 && k*src.height>=h-1e-8);
    assert.ok(Math.abs(k*src.width/(k*src.height)-src.width/src.height)<1e-12);
  }
  assert.equal(heroDissolveLayerPhase(1,1,0,false),'incoming');
  assert.equal(heroDissolveLayerPhase(1,1,0,true),'revealing');
  assert.equal(heroDissolveLayerPhase(0,1,0,true),'leaving');
  assert.equal(nextHeroDissolveIndex(2,'next',3),0);
});

test('CF3: old Intro paint geometry and media admission ABI preserved', () => {
  const wrapper=read('app/components/home/HomeHeroFilm.vue');
  assert.match(wrapper,/paintedHeightCss:\s*paintedHeight/);
  assert.match(wrapper,/viewportRectCss/);
  assert.match(wrapper,/layoutRevision/);
  const media=read('app/utils/homeIntroMediaGate.ts');
  assert.match(media,/phase: 'loading' \| 'ready' \| 'failed'/);
  assert.match(media,/INTRO_MEDIA_TIMEOUT_MS/);
});
