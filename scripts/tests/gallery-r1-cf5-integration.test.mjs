import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root=new URL('../../',import.meta.url);
const read=p=>readFileSync(new URL(p,root),'utf8');
const sha=p=>createHash('sha256').update(readFileSync(new URL(p,root))).digest('hex');
const baseline=JSON.parse(read('scripts/gallery-r1/untouched-parent-sha.json'));

test('CF5: non-Reviews No-Touch parent files remain byte-identical',()=>{
 const intentionalReviewsChanges = new Set(['app/app.vue','app/layouts/default.vue']);
 for(const [path,expected] of Object.entries(baseline.files)){
  if(intentionalReviewsChanges.has(path))continue; // Replaced by checks below, not silently accepted.
  assert.ok(existsSync(new URL(path,root)),`MISSING ${path}`);
  assert.equal(sha(path),expected,`NO_TOUCH_DRIFT ${path}`);
 }
});
test('CF5: /archive has V3 FRAME2 and historic original renderer, without extra Header/Footer',()=>{
 const page=read('app/pages/archive.vue');
 const layout=read('app/layouts/default.vue');
 assert.match(page,/schemaVersion === 3/);
 assert.match(page,/<GalleryFrame2\s+v-if="galleryV3 && c"/);
 assert.match(page,/<PageHero/);
 assert.match(page,/<ArchiveGallery mode="full"/);
 assert.match(layout,/<SiteHeader\s*\/>/);
 assert.match(layout,/<SiteFooter\s*\/>/);
 assert.doesNotMatch(page,/<SiteHeader|<SiteFooter/);
});
test('CF5: Gallery CMS insertion and CTA order survives exactly',()=>{
 const page=read('app/pages/archive.vue');
 const wanted=[
  '<GalleryFrame2', '<CmsSlot :nodes="c?.pageSlots.archive.afterGallery',
  '<CmsSlot :nodes="c?.pageSlots.archive.beforeCta', '<GalleryCtaFrame3', '<CtaBand',
 ];
 const positions=wanted.map(s=>page.indexOf(s));
 assert.ok(positions.every(x=>x>=0),JSON.stringify(positions));
 assert.deepEqual(positions,[...positions].sort((a,b)=>a-b));
 assert.match(read('app/components/gallery/GalleryCtaFrame3.vue'),/usePublicConsultationHref\(\)/);
 assert.match(read('app/components/feature/CtaBand.vue'),/usePublicConsultationHref\(\)/);
 assert.match(read('app/components/feature/CtaBand.vue'),/rel="noopener noreferrer"/);
});
test('CF5: the independent /videos page and home preview stay old owned components',()=>{
 assert.match(read('app/pages/videos.vue'),/pageId==='videos'/);
 assert.match(read('app/pages/videos.vue'),/<ArchiveGallery mode="full" lane="video"\s*\/>/);
 assert.match(read('app/components/feature/ArchiveGallery.vue'),/components\/archive\/ArchiveGallery/);
 assert.match(read('app/components/archive/ArchiveGallery.vue'),/Reveal/);
 assert.match(read('app/components/archive/ArchiveGallery.vue'),/mode==='preview'\?items\.value\.slice\(0,3\)/);
});
test('CF5: /api/render authority and media proxy remain original and explicit',()=>{
 const app=read('app/app.vue');
 const render=read('server/api/render.get.ts');
 const media=read('server/api/archive/media/[file].get.ts');
 assert.match(app,/\/api\/render\?path=/);
 assert.match(app,/r\.shared\.publication\.digest === r\.publication\.digest/);
 assert.match(media,/\/v4\/archive\/media\/\$\{file\}/);
 assert.match(media,/sendWebResponse/);
 assert.match(render,/SMD_DEV_FIXTURE_ONLY|mock/i);
});

test('CF5: intentionally revised shared owners preserve Gallery and CMS branches',()=>{
 const root=read('app/app.vue');
 const layout=read('app/layouts/default.vue');
 assert.match(root,/resolveHomeScaffoldPath\(path\)/);
 assert.match(root,/admitHomeScaffold\(path, payload\)/);
 assert.match(root,/standalonePreviewSelected\(path, local\)/);
 assert.match(root,/case '\/reviews':/);
 assert.match(root,/kind: 'reviews'/);
 assert.match(layout,/<SiteHeader\s*\/>/);
 assert.match(layout,/<SiteFooter\s*\/>/);
 assert.match(layout,/data-page-skin/);
});
