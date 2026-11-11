/** CF5A source-only gate. Does not claim Vue compile, SSR, or browser proof. */
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFileSync(resolve(root,p),'utf8');
const vue=read('app/components/media/SiteImage.vue');
const model=read('app/utils/site-media-render.ts');
const policy=read('app/utils/site-media-policy.ts');
const inventory=JSON.parse(read('docs/site-media/image-slot-inventory.v1.json'));
assert.match(vue,/<script setup lang="ts">/);
assert.match(vue,/<template>/);
assert.equal((vue.match(/<img\b/g)??[]).length,1);
assert.match(vue,/:src="renderModel\.src"/);
assert.match(vue,/:width="renderModel\.width"/);
assert.match(vue,/:height="renderModel\.height"/);
assert.match(vue,/:alt="renderModel\.alt"/);
assert.match(vue,/:title="renderModel\.title"/);
assert.match(vue,/:class="renderModel\.imageClass"/);
assert.match(vue,/:loading="renderModel\.loading"/);
assert.match(vue,/\@load="onLoad"/);
assert.match(vue,/\@error="onError"/);
assert.match(vue,/role="status"/);
assert.match(vue,/ref<'pending'\|'loaded'\|'failed'>\('pending'\)/);
assert.doesNotMatch(vue,/\bobject-cover\b|window\.|Date\.now\(|naturalWidth|document\./);
assert.doesNotMatch(vue,/<(?:source|picture)\b/);
assert.match(model,/siteMediaPresentationPolicy\(slotId\)/);
assert.match(model,/V5_BINDING_ADMITTED/);
assert.match(model,/PUBLIC_MEDIA_PATH/);
assert.match(model,/object-contain object-center/);
assert.match(model,/h-auto w-full max-w-full/);
assert.match(model,/SITE_MEDIA_CONTAIN_FRAME_CLASS/);
assert.doesNotMatch(model,/window\.|document\.|Date\.now\(|naturalWidth|fetch\(/);
assert.match(policy,/effectiveOnlyWhen: 'V5_BINDING_ADMITTED'/);
const legacy=[...new Set(inventory.entries.map(v=>v.file))];
const permitted=new Map([
 ['app/components/home/HeroSection.vue',1],
 ['app/components/home/StatementSection.vue',1],
 ['app/components/feature/PracticeBlock.vue',2],
 ['app/pages/about.vue',2],['app/pages/practice.vue',1],
]);
for(const path of legacy){
  const s=read(path),expected=permitted.get(path)??0;
  assert.equal((s.match(/<SiteImage\b/g)??[]).length,expected,'CF5B_SITE_IMAGE_CONSUMER_COUNT');
  assert.equal((s.match(/<template v-else-if=/g)??[]).length,expected,'CF5B_LEGACY_PARITY_BRANCH');
}
assert.equal(inventory.cf5RendererPromotion,false);
assert.equal(inventory.entries.length,12);
console.log('PASS_SMD_SITE_MEDIA_R1_CF5A_STATIC');
