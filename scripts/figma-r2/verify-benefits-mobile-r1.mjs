/** CF1–CF4 SOURCE/STATIC gate. Does not establish browser fidelity. */
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
const root=resolve(import.meta.dirname,'../..');
const read=p=>readFileSync(join(root,p),'utf8');
const component=read('app/components/home/HomeBenefits.vue');
const css=read('app/assets/css/home-r2.css');
const composition=read('app/data/home-r2-composition.ts');
const originals=read('app/data/home-r2-copy.ts');
const media=read('app/components/home/HomeMediaFrame.vue');
assert.equal((component.match(/v-for="card in copy\.cards"/g)||[]).length,1);
assert.equal((component.match(/:data-benefit-slot="card\.slot"/g)||[]).length,1);
assert.equal((component.match(/smd-home__benefit-card/g)||[]).length,1);
assert.equal((component.match(/<HomeMediaFrame\s+:slot-id="card\.slot"\s*\/>/g)||[]).length,1);
assert.match(component,/<article\b[^>]*v-for="card in copy\.cards"[^>]*>\s*<HomeMediaFrame\s+:slot-id="card\.slot"\s*\/>\s*<div class="smd-home__benefit-body"/);
assert.equal((component.match(/class="smd-home__benefit-body"/g)||[]).length,1);
for(const field of ['card.numeral','card.title','card.description'])assert.ok(component.includes(`:text-key="${field}"`));
for(const id of ['node-1:88','node-1:576','node-1:578','node-18:147','node-18:148','node-18:149','node-18:128','node-18:150','node-18:151','node-18:134','node-18:152','node-18:153']){
 assert.ok(composition.includes(`'${id}'`),id);
 assert.ok(originals.includes(`"${id}"`),id);
}
for(const id of ['home.benefits.01.image','home.benefits.02.image','home.benefits.03.image','home.benefits.04.image']){
 assert.ok(composition.includes(id),id);
}
assert.ok(media.includes('resolveHomeR2PublicImage('));
assert.ok(media.includes('data-media-state'));
assert.ok(media.includes('object-fit:contain'));
assert.ok(originals.includes('SMD 아카데미 필름 학원이'));
assert.ok(originals.includes('제공할 수 있는 4가지'));
assert.equal((css.match(/SMD-HOME-R2-MOBILE-BENEFITS-R1 BEGIN/g)||[]).length,1);
assert.equal((css.match(/SMD-HOME-R2-MOBILE-BENEFITS-R1 END/g)||[]).length,1);
const block=css.slice(css.indexOf('/* SMD-HOME-R2-MOBILE-BENEFITS-R1 BEGIN'),css.indexOf('/* SMD-HOME-R2-MOBILE-BENEFITS-R1 END')+ '/* SMD-HOME-R2-MOBILE-BENEFITS-R1 END */'.length);
for(const fragment of [
 '@media (max-width: 699px)',
 'grid-template-columns: repeat(2, minmax(0, 1fr))',
 '.smd-home__benefit-card > .smd-home__media-frame',
 '[data-figma-text="node-1:92"] > span',
 'word-break: keep-all',
 'white-space: normal !important',
 'overflow-wrap: break-word',
 '[data-media-state="published"]',
])assert.ok(block.includes(fragment),fragment);
assert.ok(!block.includes('line-clamp')&&!block.includes('text-overflow: ellipsis'));
assert.ok(existsSync(join(root,'scripts/figma-r2/verify-benefits-mobile-browser-r1.mjs')));
console.log('PASS_SMD_HOME_R2_MOBILE_BENEFITS_R1_SOURCE_STATIC; 4 card owners; 4 preserved media slots; Figma original intact by source references');
console.log('NUXT_COMPILE, BROWSER_VISUAL, PUBLISHED_MEDIA_OBSERVATION remain separate gates.');
