/** SMD_HOME_MEDIA_SLOT_R2 · source/model tests. Nuxt compile/browser remain separate. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import {homeFilmAssets} from '../../app/data/home-film.ts';
import {homeMediaSlots} from '../../app/data/home-r2-manifest.ts';
import {homeLocalMediaSlots,homeHeroLocalMediaSlots} from '../../app/data/home-local-media.ts';
import {assertHomeLocalMediaRegistry} from '../../app/utils/homeLocalMedia.ts';
import {resolveHomeHeroLocalMedia,assertHomeHeroLocalMediaRegistry} from '../../app/utils/homeHeroLocalMedia.ts';
import {resolveHeroCarouselSlots} from '../../app/data/home-hero-carousel.ts';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const source=p=>readFileSync(resolve(root,p),'utf8');
const ids=homeFilmAssets.map(asset=>asset.id);

test('R2: eight Figma photo slots and three Hero IDs are distinct and complete',()=>{
  assert.equal(Object.keys(homeLocalMediaSlots).length,8);
  assert.equal(Object.keys(homeHeroLocalMediaSlots).length,3);
  assert.deepEqual(Object.keys(homeLocalMediaSlots).sort(),Object.keys(homeMediaSlots).sort());
  assert.deepEqual(Object.keys(homeHeroLocalMediaSlots).sort(),[...ids].sort());
  assert.equal(new Set([...Object.keys(homeLocalMediaSlots),...ids]).size,11);
  assertHomeLocalMediaRegistry();
  assertHomeHeroLocalMediaRegistry();
});
test('R2: original Hero assets remain default LOCAL sources without duplicate copies',()=>{
  for(const asset of homeFilmAssets){
    const local=resolveHomeHeroLocalMedia(asset.id);
    assert.equal(local.src,asset.src);
    assert.equal(local.alt,asset.alt);
    assert.equal(local.width,asset.width);
    assert.equal(local.height,asset.height);
  }
});
test('R2: manually supplied local Hero src/metadata is selected',()=>{
  const overrides={...homeHeroLocalMediaSlots,'hero-2':{
    ...homeHeroLocalMediaSlots['hero-2'],src:'/media/home/변경사진.png',alt:'시공 교육장',title:'교육장 전경',width:1448,height:1086,
  }};
  const hero=resolveHomeHeroLocalMedia('hero-2',overrides);
  const slides=resolveHeroCarouselSlots(id=>({kind:'local',...resolveHomeHeroLocalMedia(id,overrides)}));
  assert.deepEqual(slides.map(s=>s.src),[homeFilmAssets[0].src,'/media/home/변경사진.png',homeFilmAssets[2].src]);
  assert.equal(slides[1].width,1448);
  assert.equal(slides[1].height,1086);
  assert.equal(slides[1].alt,hero.alt);
  assert.equal(slides[1].publicationId,null);
});
test('R2: legacy model call remains equivalent, including stable slot ordering',()=>{
  const slides=resolveHeroCarouselSlots(()=>({kind:'local'}));
  assert.deepEqual(slides.map(x=>x.src),homeFilmAssets.map(x=>x.src));
  assert.deepEqual(slides.map(x=>x.slotId),ids);
});
test('R2: manual Hero paths refuse external, traversal and SVG',()=>{
  for(const bad of ['https://example.com/p.png','/media/home/../bad.png','/media/home/x.svg','/media/hero/new.jpg','//evil/p.png']){
    const drafts={...homeHeroLocalMediaSlots,'hero-1':{...homeHeroLocalMediaSlots['hero-1'],src:bad}};
    assert.throws(()=>resolveHomeHeroLocalMedia('hero-1',drafts),/SMD_HOME_LOCAL_MEDIA_PATH_INVALID/);
  }
});
test('R2: null Hero image and invalid metadata fail explicitly',()=>{
  const nulled={...homeHeroLocalMediaSlots,'hero-1':{...homeHeroLocalMediaSlots['hero-1'],src:null}};
  assert.throws(()=>resolveHomeHeroLocalMedia('hero-1',nulled),/SMD_HOME_HERO_SLOT_UNBOUND/);
  const bad={...homeHeroLocalMediaSlots,'hero-3':{...homeHeroLocalMediaSlots['hero-3'],width:null}};
  assert.throws(()=>resolveHomeHeroLocalMedia('hero-3',bad),/SMD_HOME_HERO_METADATA_INVALID/);
});
test('R2: published binding wins and unbound is not replaced with local photos',()=>{
  const published=resolveHeroCarouselSlots(id=>({kind:'published',publicationId:'pub',assetId:`sm_${id}`,src:`/api/media/standalone/pub/sm_${id}`,alt:`CMS ${id}`,width:2000,height:1200}));
  assert.ok(published.every(x=>x.publicationId==='pub'&&x.src.startsWith('/api/media/standalone/')));
  assert.throws(()=>resolveHeroCarouselSlots(()=>({kind:'unbound'})),/STANDALONE_FILM_IMAGE_NOT_PUBLISHED/);
});
test('R2: Vue Hero reads local registry only from local branch; original R1 SVG slots unchanged',()=>{
  const vue=source('app/components/home/HomeHeroCarousel.vue');
  const section=source('app/components/figma/FigmaSceneNode.vue');
  const r1=source('app/composables/useHomeMediaSlot.ts');
  assert.match(vue,/resolveHomeHeroLocalMedia\(id\)/);
  assert.match(vue,/case 'published':case 'unbound':/);
  assert.match(r1,/useHomeMediaSlot/);
  assert.match(section,/useHomeMediaSlot/);
  assert.doesNotMatch(vue,/getRandom|Math\.random/);
});
test('R2: photo asset text/geometry and generated Figma scene are untouched by this change',()=>{
  const manifest=source('app/data/home-r2-manifest.ts');
  const hero=source('app/data/home-film.ts');
  assert.match(manifest,/"home\.special-start\.photo"/);
  for(const id of ids) assert.match(hero,new RegExp(`"id": "${id}"`));
});
