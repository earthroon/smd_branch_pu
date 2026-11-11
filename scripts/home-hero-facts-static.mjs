// Current Home SSOT is Figma CF1/CF2. Historical CMS facts remain in frozen PageCopy.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..');
const hero=readFileSync(resolve(root,'app/components/home/HeroSection.vue'),'utf8');
const info=readFileSync(resolve(root,'app/components/home/HomeInfoBar.vue'),'utf8');
const copy=readFileSync(resolve(root,'app/data/home-r2-composition.ts'),'utf8');
assert.match(hero,/homeText\(copy\.heading\)/);
assert.doesNotMatch(hero,/home\.hero\.image|home\.facts|usePublishedSiteMedia/);
assert.match(info,/data-home-section="info-bar"/);
assert.match(copy,/textRef\('node-1:155'\)/);
assert.match(copy,/textRef\('node-1:156'\)/);
const legacy=JSON.parse(readFileSync(resolve(root,'fixtures/page-copy.source.json'),'utf8'));
assert.equal(legacy.home.facts.length,3);
console.log('PASS_SMD_HOME_HERO_FACTS_FIGMA_CF2_STATIC');
