import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import {
  CATALOGUE_R7_HOME_PLAN,
  CATALOGUE_R7_HOME_SECTION_IDS,
  CATALOGUE_R7_HOME_SOURCE_DIGEST,
  assertCatalogueR7HomePlan,
  assertCatalogueR7SheetProps,
  assertCatalogueR7HomeMediaSlot,
} from '../../app/data/catalogue-r7-sheet-plan.ts';
import { homeR2Source, homeBodySections, homeMediaSlots } from '../../app/data/home-r2-manifest.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const read = path => readFileSync(resolve(root, path), 'utf8');
const mediaKeys = Object.keys(homeMediaSlots);
const sourcePlan = homeBodySections.map(section => ({
  id: section.id, visualIndex: section.visualIndex, mediaSlotRefs: section.mediaSlotRefs,
}));

const spread = {
  pageId:'home',sectionId:'special-start',ordinal:3,total:9,
  variant:'spread',fit:'viewport',headingId:'r7-special-heading',label:'SPECIAL START',
};

test('pinned Figma Home digest and exact 9-section ordering', () => {
  assert.equal(homeR2Source.sourceSnapshotDigest,CATALOGUE_R7_HOME_SOURCE_DIGEST);
  assert.deepEqual(homeBodySections.map(x=>x.id), CATALOGUE_R7_HOME_SECTION_IDS);
  assert.deepEqual(CATALOGUE_R7_HOME_PLAN.map(x=>x.ordinal),[1,2,3,4,5,6,7,8,9]);
  assert.equal(assertCatalogueR7HomePlan(homeR2Source.sourceSnapshotDigest,sourcePlan,mediaKeys),true);
});

test('source refs and media slot identity are preserved', () => {
  assert.deepEqual(CATALOGUE_R7_HOME_PLAN[2].mediaSlotIds,['home.special-start.photo']);
  assert.deepEqual(CATALOGUE_R7_HOME_PLAN[4].mediaSlotIds,[
    'home.benefits.01.image','home.benefits.02.image',
    'home.benefits.03.image','home.benefits.04.image',
  ]);
  assert.equal(assertCatalogueR7HomeMediaSlot('home.special-start.photo',mediaKeys),true);
  assert.throws(() => assertCatalogueR7HomeMediaSlot('home.missing.image',mediaKeys),/R7_CF3_SOURCE_SLOT_DRIFT/);
  for (const item of CATALOGUE_R7_HOME_PLAN) {
    assert.equal(item.fit,'flow','product plan is never admitted to forced viewport');
  }
});

test('ordinal and heading ID are validated', () => {
  assert.equal(assertCatalogueR7SheetProps(spread),true);
  const bad = [
    {ordinal:10},{ordinal:0},{total:0},{ordinal:1.2},
    {sectionId:'S P A C E'},{headingId:''},{headingId:'bad id'},
    {variant:'film'},{fit:'clip'},{pageId:'admin'},{label:''},
  ];
  for (const entry of bad) {
    assert.throws(() => assertCatalogueR7SheetProps({...spread,...entry}),/R7_CF3_SHEET_PLAN_INVALID/);
  }
});

test('duplicates, changed source section, or missing media are rejected', () => {
  const wrong = sourcePlan.map(x=>({...x}));
  wrong[4]={...wrong[4],id:'special-start'};
  assert.throws(() => assertCatalogueR7HomePlan(homeR2Source.sourceSnapshotDigest,wrong,mediaKeys),/R7_CF3_SHEET_PLAN_INVALID/);
  const drift = sourcePlan.map(x=>({...x}));
  drift[4]={...drift[4],mediaSlotRefs:['home.special-start.photo']};
  assert.throws(() => assertCatalogueR7HomePlan(homeR2Source.sourceSnapshotDigest,drift,mediaKeys),/R7_CF3_SOURCE_SLOT_DRIFT/);
  assert.throws(() => assertCatalogueR7HomePlan('unapproved-digest',sourcePlan,mediaKeys),/R7_CF3_SHEET_PLAN_INVALID/);
  assert.throws(() => assertCatalogueR7HomePlan(homeR2Source.sourceSnapshotDigest,sourcePlan,mediaKeys.slice(1)),/R7_CF3_SOURCE_SLOT_DRIFT/);
});

test('fixture consumes the actual Home copy refs and approved media owner', () => {
  const fixture = read('app/components/catalogue/CatalogueFixture.vue');
  for (const token of ['homeCopyRefs.specialStart','homeCopyRefs.benefits',
    'HomeFigmaText','CatalogueHomeMedia','DEV_PREVIEW_ONLY',
    'special.points','benefits.cards','assertCatalogueR7HomePlan']) {
    assert.ok(fixture.includes(token),`fixture missing ${token}`);
  }
  const source = read('app/data/home-r2-composition.ts');
  assert.match(source,/specialStart:\s*\{/);
  assert.match(source,/benefits:\s*\{/);
  assert.match(source,/infoBar:\s*\[/);
  assert.match(source,/home\.special-start\.photo/);
});

test('layout CSS is viewport-safe, media-only crop and without CF5 wheel ownership', () => {
  const css = read('app/assets/css/catalogue-r7.css');
  const section = css.split('/* SMD_R7_CF3_SHEET_V1:')[1];
  assert.ok(section,'CF3 CSS owner not found');
  for (const s of ['100svh','1650px','110px','62px','36px','35px','44fr','56fr','75px',
    'repeat(4, minmax(0, 1fr))','repeat(2, minmax(0, 1fr))']) {
    assert.ok(section.includes(s),`geometry missing ${s}`);
  }
  assert.doesNotMatch(section,/scroll-snap-type|overscroll-behavior|addEventListener|window\.scroll/);
  assert.doesNotMatch(section,/#[\da-f]{3,8}\b/i,'new colors not allowed');
  assert.match(section,/\.smd-r7-media__frame\s*\{[^}]*overflow:\s*hidden/s);
  assert.doesNotMatch(section,/\.smd-r7-sheet\s*\{[^}]*overflow:\s*hidden/s);
});
