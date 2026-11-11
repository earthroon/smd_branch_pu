import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const read=p=>readFileSync(resolve(root,p),'utf8');
test('CF2 Hero and InfoBar consume frozen Figma text, not old PageCopy fields',()=>{
  const hero=read('app/components/home/HeroSection.vue');
  const info=read('app/components/home/HomeInfoBar.vue');
  assert.match(hero,/:text-key="copy\.heading"/);
  assert.match(info,/:text-key="item\.value"/);
  assert.doesNotMatch(hero,/pages\.home|home\.facts|usePublishedSiteMedia|<img/);
});
test('CF2 four-card strip resolves exact Figma texts through source keys',()=>{
  const code=read('app/data/home-r2-composition.ts');
  for(const id of ['node-1:156','node-1:155','node-1:402','node-1:401','node-1:406','node-1:405','node-18:60','node-18:59'])
    assert.ok(code.includes(`textRef('${id}')`));
});
test('historical PageCopy remains byte-equivalent and is not rewritten to Figma copy',()=>{
  const original=JSON.parse(read('fixtures/page-copy.source.json'));
  assert.equal(original.home.facts.length,3);
  assert.equal(original.home.facts[0].k,'소수정예');
});
