import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const read=p=>readFileSync(resolve(root,p),'utf8');

test('all six independent routes actually render catalogue content',()=>{
 for(const name of ['about','curriculum','archive','reviews','faq','contact']){
  const source=read(`app/pages/${name}.vue`);
  assert.match(source,new RegExp(name==='faq'?'CatalogueFaqStage':
    ['about','curriculum'].includes(name)?`Catalogue${name[0].toUpperCase()+name.slice(1)}Stage`:
      `data-r7-route-owner="${name}"`),name);
 }
});
test('about and curriculum preserve source-owned text and media',()=>{
 for(const p of ['About','Curriculum']){
  const v=read(`app/components/catalogue/Catalogue${p}Stage.vue`);
  assert.match(v,/CatalogueSourceCopy/);
  assert.match(v,/CatalogueSourceMedia/);
  assert.match(v,/CatalogueSheet/);
  assert.match(v,/CmsSlot/);
 }
 assert.match(read('app/components/catalogue/CatalogueCurriculumStage.vue'),/CatalogueWeekProgram/);
});
test('the cover is full-viewport and the palette is exactly the R7 tokens',()=>{
 const css=read('app/assets/css/catalogue-r7-routes.css');
 assert.match(css,/height:100svh/);
 assert.match(css,/object-fit:cover/);
 for(const token of ['--smd-brand-navy','--smd-action-orange','--smd-warm-stone'])assert.ok(css.includes(token));
 const hex=[...css.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map(m=>m[0]);
 assert.deepEqual(hex,[],'new route CSS uses only existing SSOT vars and their alpha channels');
});
test('exact integrated logo is present and used by the real header',()=>{
 const header=read('app/components/feature/SiteHeader.vue');
 assert.match(header,/smd-r7-brand-logo/);
 assert.ok(existsSync(resolve(root,'public/media/catalogue/r7-logo.svg')));
 assert.match(read('nuxt.config.ts'),/catalogue-r7-routes\.css/);
});
test('keep existing real route state owners for media, reviews and contact',()=>{
 const archive=read('app/pages/archive.vue');
 const reviews=read('app/pages/reviews.vue');
 const contact=read('app/pages/contact.vue');
 assert.match(archive,/GalleryFrame2/);assert.match(archive,/GalleryStandalonePreview/);
 assert.match(reviews,/ReviewsBodyStage/);assert.match(reviews,/selectFilter/);
 assert.match(contact,/StandaloneContactPage/);assert.match(contact,/ContactForm/);
});
test('home is a real CatalogueHomeStage, not an isolated CF3 fixture',()=>{
 const index=read('app/pages/index.vue');
 assert.match(index,/<CatalogueHomeStage v-if="catalogueEnabled"/);
 assert.doesNotMatch(read('app/components/catalogue/CatalogueAboutStage.vue'),/AboutBodyStage/);
});

test('CMS insertion anchors retain original semantic order',()=>{
 const about=read('app/components/catalogue/CatalogueAboutStage.vue');
 assert.ok(about.indexOf('section-id="audience"')<about.indexOf('data-about-cms-anchor="afterPillars"'));
 assert.ok(about.indexOf('data-about-cms-anchor="afterPillars"')<about.indexOf('section-id="field-experience"'));
 const curriculum=read('app/components/catalogue/CatalogueCurriculumStage.vue');
 assert.ok(curriculum.indexOf('section-id="practical-training"')<curriculum.indexOf('data-curriculum-cms-anchor="afterTeach"'));
 assert.ok(curriculum.indexOf('data-curriculum-cms-anchor="afterTeach"')<curriculum.indexOf('section-id="six-week-program"'));
 assert.ok(curriculum.indexOf('section-id="six-week-program"')<curriculum.indexOf('data-curriculum-cms-anchor="afterLearningPath"'));
 assert.ok(curriculum.indexOf('data-curriculum-cms-anchor="afterLearningPath"')<curriculum.indexOf('section-id="course-information"'));
});
