#!/usr/bin/env node
/** Executes with the real local repo. Does not fabricate Nuxt build/browser receipts. */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
const root = process.cwd();
const file = name => readFileSync(resolve(root,name),'utf8');
const pinned = '5e877e46cc1bad3e7985a553163120c59c9b9d0f731a66d575e781fa5c60146f';
const ids = ['hero','info-bar','special-start','training-track','benefits','methods','location','faq','consultation-cta'];
const checked = [
  'app/components/catalogue/CatalogueSheet.vue',
  'app/components/catalogue/CatalogueSheetHeader.vue',
  'app/components/catalogue/CatalogueMedia.vue',
  'app/components/catalogue/CatalogueHomeMedia.vue',
  'app/components/catalogue/CatalogueFixture.vue',
  'app/data/catalogue-r7-sheet-plan.ts',
  'app/assets/css/catalogue-r7.css',
];
for (const path of checked) {
  if (!existsSync(resolve(root,path))) throw new Error('R7_CF3_SOURCE_MISSING: '+path);
}
const source = file('app/data/home-r2-manifest.ts');
const composition = file('app/data/home-r2-composition.ts');
const plan = file('app/data/catalogue-r7-sheet-plan.ts');
const css = file('app/assets/css/catalogue-r7.css');
const block = css.split('/* SMD_R7_CF3_SHEET_V1:')[1];
if (!source.includes(pinned) || !composition.includes('HOME_BODY_EXPECTED_IDS') ||
    !plan.includes(pinned) || !block) throw new Error('R7_CF3_SOURCE_AUTHORITY_DRIFT');
for (const id of ids) if (!plan.includes(`'${id}'`)) throw new Error('R7_CF3_SHEET_PLAN_INVALID: '+id);
if (/#(?:[\da-f]{3,8})\b/i.test(block)) throw new Error('R7_CF3_COLOR_OUT_OF_SSOT');
if (/scroll-snap-type|scrollIntoView|addEventListener\(\s*['"]wheel/.test(block)) throw new Error('R7_CF3_MOTION_SCOPE_DRIFT');
for (const path of checked.filter(x=>x.endsWith('.vue'))) {
  const content = file(path);
  if (/\$fetch\(|fetch\(|scrollIntoView\(|addEventListener\(/.test(content))
    throw new Error('R7_CF3_UNAPPROVED_OWNER: '+path);
}
const receipt={
  contract:'SMD_R7_CF3_STATIC_RECEIPT_V1',
  result:'STATIC_PASS',
  sourceDigest:pinned,
  homeSectionCount:ids.length,
  inspectedFiles:checked.map(path=>({path,sha256:createHash('sha256').update(file(path)).digest('hex')})),
  nuxtCompile:'NOT_RUN_BY_THIS_CHECK',
  browser:'NOT_RUN_BY_THIS_CHECK',
};
const idx=process.argv.indexOf('--out');
if(idx>=0){
  if(!process.argv[idx+1])throw new Error('R7_CF3_RECEIPT_PATH_MISSING');
  writeFileSync(resolve(process.argv[idx+1]),JSON.stringify(receipt,null,2)+'\n');
}
console.log('R7_CF3_STATIC_PASS');
