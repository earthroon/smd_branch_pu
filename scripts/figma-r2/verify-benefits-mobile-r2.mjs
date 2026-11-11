/** R2 source/static admission. NEVER claims browser/physical parity. */
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
const root=resolve(import.meta.dirname,'../..');
const read=p=>readFileSync(join(root,p),'utf8');
const original=read('app/data/home-r2-copy.ts');
const manifest=read('app/data/home-r2-composition.ts');
const media=read('app/components/home/HomeMediaFrame.vue');
const vue=read('app/components/home/HomeBenefits.vue');
const css=read('app/assets/css/home-r2.css');
const start='/* SMD-HOME-R2-MOBILE-BENEFITS-R1 BEGIN: Vue3 Semantic Reflow only */';
const end='/* SMD-HOME-R2-MOBILE-BENEFITS-R1 END */';
assert.equal(css.split(start).length,2,'R1 block exactly once');
assert.equal(css.split(end).length,2,'R1 end exactly once');
const fragment=css.slice(css.indexOf(start),css.indexOf(end)+end.length).trimEnd().replace(/\r\n/g,'\n');
const expected='2385c157a98302e1dd1957369a58cbb19d2b4b42a83d0430ed90e4abdbec8f45';
assert.equal(createHash('sha256').update(fragment).digest('hex'),expected,'R2 CSS fragment hash');
for(const required of [
 'R2-COMPACT approved supersession',
 'grid-template-columns: repeat(2, minmax(0, 1fr))',
 'align-items: stretch',
 'min-height: 0;',
 'height: auto;',
 'padding: 12px 12px 14px;',
 'margin-top: 8px;',
 'margin: 0 0 6px;',
 'margin-top: 0 !important;',
 'margin-bottom: 0 !important;',
 'clamp(11px, 3vw, 12px)',
 'line-height: 1.5 !important;',
 'word-break: keep-all',
 'overflow-wrap: break-word',
 '[data-media-state="published"]',
])assert.ok(fragment.includes(required),required);
assert.ok(!fragment.includes('min-height: clamp(248px')&&!fragment.includes('margin-top: auto;'),'old spacing removed');
assert.ok(!fragment.includes('line-clamp')&&!fragment.includes('text-overflow: ellipsis'),'no content suppression');
for(const ref of ['card.numeral','card.title','card.description'])assert.ok(vue.includes(`:text-key="${ref}"`),ref);
assert.equal((vue.match(/<HomeMediaFrame\s+:slot-id="card.slot"\s*\/>/g)||[]).length,1);
assert.equal((vue.match(/v-for="card in copy.cards"/g)||[]).length,1);
assert.equal((vue.match(/smd-home__benefit-card/g)||[]).length,1);
for(const slot of ['home.benefits.01.image','home.benefits.02.image','home.benefits.03.image','home.benefits.04.image'])assert.ok(manifest.includes(slot),slot);
for(const node of ['node-1:88','node-1:576','node-1:578','node-18:147','node-18:148','node-18:149','node-18:128','node-18:150','node-18:151','node-18:134','node-18:152','node-18:153']){
 assert.ok(manifest.includes(`'${node}'`),node);
 assert.ok(original.includes(`"${node}"`),node);
}
assert.ok(original.includes('SMD 아카데미 필름 학원이'));
assert.ok(media.includes('resolveHomeR2PublicImage('));
assert.ok(media.includes('object-fit:contain'));
assert.ok(media.includes('data-media-state'));
assert.ok(existsSync(join(root,'scripts/figma-r2/verify-benefits-mobile-browser-r2.mjs')));
console.log('PASS_SMD_HOME_R2_MOBILE_BENEFITS_R2_SOURCE_STATIC: four cards, 4 media slots, layout compact, 1.5 line-height, original Figma text preserved');
console.log('NUXT_COMPILE, LIVE PRETENDARD RUNTIME, ACTUAL PUBLISHED MEDIA, FIGMA PIXEL PARITY = NOT_RUN');
