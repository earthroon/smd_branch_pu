/** SMD Home R2 Mobile Vue3 R1. SOURCE/STATIC only, not a Nuxt or browser gate. */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const root=resolve(import.meta.dirname,'../..');
const read=(rel)=>readFileSync(join(root,rel),'utf8');
const hash=(rel)=>createHash('sha256').update(readFileSync(join(root,rel))).digest('hex');
const source=read('docs/migration/smd-home-r2/cf1/figma-source/skin.jsonl').split(/\r?\n/).filter(Boolean).map(JSON.parse);
const meta=source.find(x=>x.kind==='meta');
assert.equal(meta?.schema,9);
assert.equal(source.find(x=>x.kind==='end')?.digest,'5e877e46cc1bad3e7985a553163120c59c9b9d0f731a66d575e781fa5c60146f');
const heading=source.find(x=>x.kind==='native-text'&&x.target==='node-35:5');
assert.equal(heading?.characters,'업계 최초 인테리어 · 유리필름\n실무자 양성 프로그램 운영');
assert.equal(heading?.textDigest,'021ebf516198167ac62eaf7d0e0d484fac799774dcac0a15c1968c0dedc83ed3');
const compose=read('app/data/home-r2-composition.ts');
assert.match(compose,/heading:\s*textRef\('node-35:5'\)/);
for(const key of ['node-1:156','node-1:402','node-1:406','node-18:60'])assert.ok(compose.includes(`textRef('${key}')`));
const hero=read('app/components/home/HeroSection.vue');
assert.match(hero,/data-mobile-heading="MOBILE_HERO_COPY_R1"/);
assert.match(hero,/업계최초 인테리어 유리필름/);
assert.match(hero,/실무자 양성 프로그램 운영/);
assert.match(hero,/frozenHeading\.textDigest/);
assert.match(hero,/@media \(max-width: 699px\)/);
assert.match(hero,/\.smd-home__hero-mobile-line\s*\{[^}]*white-space:\s*nowrap/);
assert.match(hero,/\.smd-home__hero-heading-source\s*\{ display: none; \}/);
const info=read('app/components/home/HomeInfoBar.vue');
for(const [label,id] of Object.entries({
 'node-1:156':'clock','node-1:402':'helmet','node-1:406':'tools','node-18:60':'file',
}))assert.match(info,new RegExp(`'${label}':'${id}'`));
assert.match(info,/grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
assert.match(info,/<HomeMobileInfoIcon :kind="item\.icon"\s*\/>/);
assert.match(info,/:text-key="item\.label"/);
assert.match(info,/:text-key="item\.value"/);
const icons=read('app/components/home/HomeMobileInfoIcon.vue');
for(const [rel,sha] of [
 ['assets/asset-907f53254a066699927340bf2d76fceb0d84b85c7548ac570e43e56a2900243c.svg','907f53254a066699927340bf2d76fceb0d84b85c7548ac570e43e56a2900243c'],
 ['assets/asset-b7f7017169d802a4cedf1f7f63e8cd9e076df11a6c6b4bf6d1937b95f4d7bef0.svg','b7f7017169d802a4cedf1f7f63e8cd9e076df11a6c6b4bf6d1937b95f4d7bef0'],
 ['assets/asset-2b5c24c7f3ab3aed40d08b1b2d95b2be8b43bdb11bc8dc996e239ed13bf3cc16.svg','2b5c24c7f3ab3aed40d08b1b2d95b2be8b43bdb11bc8dc996e239ed13bf3cc16'],
 ['assets/asset-63c37cd19ad13fd67fb70f63014993699878fcc07cd77f2d82a5019fd73e4ba6.svg','63c37cd19ad13fd67fb70f63014993699878fcc07cd77f2d82a5019fd73e4ba6'],
 ['user/file-01-optical-r4a.svg','64790e5fae1b1182683ed6472cc5e9e115ec3a49000c9e9951ec29890e117f6e'],
]){
 const full=`public/figma-r2/${rel}`;
 assert.ok(existsSync(join(root,full)),`MISSING ${full}`);
 assert.equal(hash(full),sha,full);
 assert.ok(icons.includes('/figma-r2/'+rel),`MISSING SVG VIEW BINDING ${rel}`);
}
assert.match(icons,/x="25\.78125" y="42\.1875" width="35\.15625" height="28\.125"/);
assert.doesNotMatch(hero+info+icons,/CmsDraft|D1_|coreResponse|publishedHome/);
console.log('PASS_SMD_HOME_MOBILE_R1_SOURCE_STATIC; source 272-node JSONL unchanged, 5 SVG SHA bound');
console.log('COMPILE/RUNTIME/VISUAL: NOT ASSERTED');
