/** CF1 inventory + CF5A additive renderer admission.
 * Legacy 12 Vue images are still audited verbatim; only the explicitly named
 * SiteImage.vue is excluded from the legacy tag count and audited separately.
 * Never allow a new unregistered <img> in another source file.
 */
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {resolve,relative,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const inventory=JSON.parse(readFileSync(resolve(root,'docs/site-media/image-slot-inventory.v1.json'),'utf8'));
const scope=resolve(root,'app');
const renderer='app/components/media/SiteImage.vue';
function vueFiles(dir){
  return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?vueFiles(resolve(dir,e.name)):
    e.isFile()&&e.name.endsWith('.vue')?[resolve(dir,e.name)]:[]);
}
const observed=[];
for(const abs of vueFiles(scope)){
  const file=relative(root,abs).replaceAll('\\','/');
  const text=readFileSync(abs,'utf8');
  const tags=[...text.matchAll(/<img\b[^>]*>/g)].map(x=>x[0]);
  if(file==='app/components/feature/SiteHeader.vue'){
    assert.equal(tags.length,1,'HEADER_BRAND_SVG_TAG_COUNT');
    assert.match(tags[0],/:src="brandSymbol.src"/,'HEADER_BRAND_SVG_SRC');
    assert.match(tags[0],/object-contain/,'HEADER_BRAND_SVG_CONTAIN');
    assert.match(text,/brandSymbol.kind==='legacy'/,'HEADER_LEGACY_S_PRESERVED');
    continue;
  }

  if(file===renderer){
    assert.equal(tags.length,1,'CF5A_SITE_IMAGE_TAG_COUNT_DRIFT');
    assert.match(tags[0],/:src="renderModel\.src"/,'CF5A_SITE_IMAGE_SRC_DRIFT');
    assert.match(tags[0],/:width="renderModel\.width"/,'CF5A_SITE_IMAGE_WIDTH_DRIFT');
    assert.match(tags[0],/:height="renderModel\.height"/,'CF5A_SITE_IMAGE_HEIGHT_DRIFT');
    assert.match(tags[0],/:class="renderModel\.imageClass"/,'CF5A_SITE_IMAGE_FIT_DRIFT');
    assert.doesNotMatch(text,/\bobject-cover\b/,'CF5A_NO_COVER');
    continue;
  }
  for(let ordinal=0;ordinal<tags.length;ordinal++){
    const tag=tags[ordinal];
    const src=tag.match(/:src="([^"]+)"/);
    assert.ok(src,`CF1_IMG_SRC_NOT_BOUND ${file}#${ordinal}`);
    assert.match(tag,/\bobject-cover\b/,`CF1_LEGACY_FIT_DRIFT ${file}#${ordinal}`);
    observed.push({file,ordinal,sourceExpression:src[1]});
  }
}
const expected=inventory.entries.map(({file,ordinal,sourceExpression})=>({file,ordinal,sourceExpression}));
const order=(x,y)=>`${x.file}#${x.ordinal}`.localeCompare(`${y.file}#${y.ordinal}`,'en');
assert.deepEqual(observed.sort(order),expected.sort(order),'CF1_IMAGE_INVENTORY_SOURCE_DRIFT');
const fixed=inventory.entries.filter(x=>x.bindingEligibility==='fixed');
const deferred=inventory.entries.filter(x=>x.bindingEligibility!=='fixed');
assert.equal(fixed.length,7,'CF1_FIXED_SLOT_COUNT_DRIFT');
assert.equal(deferred.length,5,'CF1_DEFERRED_SLOT_COUNT_DRIFT');
assert.equal(new Set(inventory.entries.map(x=>x.slotId)).size,inventory.entries.length,'CF1_SLOT_DUPLICATE');
assert.equal(inventory.legacyRenderingPreserved,true);
assert.equal(inventory.cf5RendererPromotion,false);
for(const entry of fixed)assert.equal(entry.v5DefaultDisplay,'natural',`CF1_V5_NATURAL ${entry.slotId}`);
// CF5B explicitly admits only the seven fixed-slot conditional consumers.
const consumers=new Map([
  ['app/components/home/HeroSection.vue',['home.hero.image']],
  ['app/components/home/StatementSection.vue',['home.statement.image']],
  ['app/components/feature/PracticeBlock.vue',['home.practiceTeaser.mainImage','home.practiceTeaser.secondaryImage']],
  ['app/pages/about.vue',['about.heroImage','about.instructor.image']],
  ['app/pages/practice.vue',['practice.image']],
]);
for(const file of inventory.entries.map(x=>x.file).filter((v,i,a)=>a.indexOf(v)===i)){
  const text=readFileSync(resolve(root,file),'utf8');
  const slots=consumers.get(file)??[];
  assert.equal((text.match(/<SiteImage\b/g)??[]).length,slots.length,`CF5B_CONSUMER_COUNT ${file}`);
  assert.equal((text.match(/<template v-else-if="siteImage_\d+\?\.kind==='legacy'"/g)??[]).length,
    slots.length,`CF5B_LEGACY_BRANCH_COUNT ${file}`);
  for(const slot of slots)assert.ok(text.includes(`usePublishedSiteMedia('${slot}')`),`CF5B_SLOT_MISSING ${slot}`);
}
const present=existsSync(resolve(root,renderer));
assert.ok(present,'CF5A_SITE_IMAGE_RENDERER_MISSING');
console.log('PASS_SMD_SITE_MEDIA_R1_CF1_IMAGE_INVENTORY',JSON.stringify({
  legacyTags:observed.length,fixed:fixed.length,deferred:deferred.length,
  siteImageRenderer:present?1:0,unregisteredTags:0,
}));
