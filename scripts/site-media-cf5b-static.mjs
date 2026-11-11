/** CF5B: fixed-slot V5 product path only; legacy tags and branches remain. */
import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=path=>readFileSync(resolve(root,path),'utf8');
const inventory=JSON.parse(read('docs/site-media/image-slot-inventory.v1.json'));
const byFile=new Map([
 ['app/components/home/HeroSection.vue',['home.hero.image']],
 ['app/components/home/StatementSection.vue',['home.statement.image']],
 ['app/components/feature/PracticeBlock.vue',['home.practiceTeaser.mainImage','home.practiceTeaser.secondaryImage']],
 ['app/pages/about.vue',['about.heroImage','about.instructor.image']],
 ['app/pages/practice.vue',['practice.image']],
]);
assert.equal([...byFile.values()].flat().length,7);
const fixed=inventory.entries.filter(v=>v.bindingEligibility==='fixed');
assert.deepEqual([...byFile.values()].flat().sort(),fixed.map(x=>x.slotId).sort());
for(const [path,slots] of byFile){
 const s=read(path);
 assert.equal((s.match(/<SiteImage\b/g)??[]).length,slots.length,`CF5B_SITEIMAGE_COUNT ${path}`);
 assert.equal((s.match(/<template v-else-if="siteImage_\d+\?\.kind==='legacy'"/g)??[]).length,slots.length,`CF5B_LEGACY_GATE ${path}`);
 for(let i=0;i<slots.length;i++){
  assert.ok(s.includes(`usePublishedSiteMedia('${slots[i]}')`),`CF5B_SLOT_BIND_MISSING ${slots[i]}`);
  assert.ok(s.includes(`:key="siteImage_${i}.key" :image="siteImage_${i}.image"`),`CF5B_IDENTITY_KEY_MISSING ${slots[i]}`);
 }
}
for(const entry of inventory.entries.filter(v=>v.bindingEligibility!=='fixed')){
 const source=read(entry.file);assert.doesNotMatch(source,/<SiteImage\b|usePublishedSiteMedia\(/,`CF5B_DYNAMIC_PROMOTION_FORBIDDEN ${entry.file}`);
}
const resolver=read('app/utils/site-media-binding.ts');
for(const token of ['V5_BINDING_ADMITTED','publicationId','publicationDigest',"kind:'legacy'",'SITE_MEDIA_BINDING_INVALID'])assert.ok(resolver.includes(token),`CF5B_RESOLVER_${token}`);
assert.doesNotMatch(resolver,/\bfetch\(|\bwindow\.|localStorage|Date\.now\(/);
const composable=read('app/composables/usePublishedSiteMedia.ts');
assert.ok(composable.includes('useSelectedCategoryPage()')&&composable.includes('useSiteContent()'));
const core=read('server/utils/public-core.ts');assert.ok(core.includes('v5\\/render'));
const endpoint=read('server/api/render.get.ts');assert.ok(endpoint.includes('/v5/render?path=')&&!endpoint.includes('`/v4/render?path='));
assert.ok(read('app/app.vue').includes('RenderResponseV5'));
const pin=JSON.parse(read('vendor/content-contracts/RELEASE.json'));
assert.equal(pin.version,'0.7.0');
const pkg=JSON.parse(read('package.json'));
assert.equal(pkg.dependencies['@smd/content-contracts'],`file:./vendor/content-contracts/${pin.tarball}`);
const lock=JSON.parse(read('package-lock.json'));
assert.equal(lock.packages['node_modules/@smd/content-contracts'].version,'0.7.0');
assert.equal(lock.packages['']['dependencies']['@smd/content-contracts'],pkg.dependencies['@smd/content-contracts']);
assert.ok(existsSync(resolve(root,'server/utils/site-media-v5-render.ts')));
console.log('PASS_SMD_SITE_MEDIA_R1_CF5B_PUBLIC_STATIC');
