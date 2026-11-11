import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { LEGACY_CANONICAL_PATHS, LEGACY_SEO_TITLES } from '@smd/content-contracts/category-page-contracts';
import { LEGACY_PAGE_IDS } from '@smd/content-contracts/cms-kind-registry';
import { validatePageCopyV1 } from '@smd/content-contracts/page-copy-contracts';
import { publicSlots } from '@smd/content-contracts/page-slot-contracts';
import { publicExternalActionsAllowed, STANDALONE_PREVIEW_PUBLICATION_ID } from '../../app/utils/publicExternalActionPolicy.ts';

const read = path => readFileSync(new URL('../../' + path, import.meta.url), 'utf8');
const seed = JSON.parse(readFileSync(new URL('../../node_modules/@smd/content-contracts/dist/seed-content.json', import.meta.url), 'utf8'));
const pageCopy = JSON.parse(read('fixtures/page-copy.source.json'));
const accepted = new Set([...LEGACY_PAGE_IDS.map(id => LEGACY_CANONICAL_PATHS[id]), '/reviews', '/faq']);

// Source-execution harness: actual script logic, mock only Nuxt runtime functions.
// It is NOT an HTTP, hydration, typecheck, or browser substitute.
function compileScript(path) {
  const source = read(path).match(/<script setup lang="ts">([\s\S]*?)<\/script>/)?.[1];
  assert.ok(source, 'MISSING_SETUP_SCRIPT');
  const withoutImports = source.replace(/import[\s\S]*?from\s*['"][^'"]+['"];?/g, '')
    .replaceAll('import.meta.server', 'false').replaceAll('import.meta.client', 'false');
  const result = ts.transpileModule(withoutImports, { fileName: path + '.ts', reportDiagnostics: true,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } });
  const errors = (result.diagnostics ?? []).filter(d => d.category === ts.DiagnosticCategory.Error);
  assert.equal(errors.length, 0, errors.map(d => ts.flattenDiagnosticMessageText(d.messageText, '\n')).join('\n'));
  return result.outputText;
}
function previewModule() {
  const source = read('app/utils/publicStandalonePreview.ts')
    .replace(/import[\s\S]*?from\s*['"][^'"]+['"];?/g, '')
    .replace(/export\s*\{[^}]*\}\s*from\s*['"][^'"]+['"];?/g, '')
    .replace(/export\s+(?=(?:function|const)\b)/g, '');
  const {outputText, diagnostics} = ts.transpileModule(source, {
    fileName: 'publicStandalonePreview.ts', reportDiagnostics: true,
    compilerOptions: {target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None},
  });
  assert.equal((diagnostics??[]).filter(d=>d.category===ts.DiagnosticCategory.Error).length,0);
  return vm.runInNewContext(`(()=>{${outputText};return {standalonePreviewPathAllowed,standalonePreviewContent,standalonePreviewSelected}})()`, {
    seed, pages: pageCopy, validatePageCopyV1, publicSlots, LEGACY_CANONICAL_PATHS, LEGACY_SEO_TITLES,
    LEGACY_PAGE_IDS, STANDALONE_PREVIEW_PUBLICATION_ID, Error,
  });
}
const preview = previewModule();

function rootHarness(mode, initialPath) {
  const route = {path: initialPath};
  const content = {value:null}, selected = {value:null}, published = {value:null};
  const data = {value:null}, error = {value:null};
  let loader, calls = 0, robotsGetter, rootCurrent, rootWatch;
  const sandbox = {
    useRoute: () => route,
    useContentMode: () => mode,
    useSiteContent: () => content,
    useSelectedCategoryPage: () => selected,
    useHomeR2Published: () => published,
    computed: fn => ({get value(){return fn()}}),
    useAsyncData: async (_key, callback) => {loader=callback; return {data,error,pending:{value:false}}},
    watch: (target, cb, opts) => {
      if (Array.isArray(target)) {
        rootWatch = () => cb([data.value, route.path]);
        if (opts?.immediate) rootWatch();
      }
    },
    useSeoMeta: input => {robotsGetter=input.robots},
    resolveHomeScaffoldPath:()=>null,
    standalonePreviewPathAllowed:preview.standalonePreviewPathAllowed,
    standalonePreviewContent:preview.standalonePreviewContent,
    standalonePreviewSelected:preview.standalonePreviewSelected,
    STANDALONE_PREVIEW_PUBLICATION_ID,
    fetch:()=>{calls++;throw new Error('UNEXPECTED_CMS_NETWORK')},
    createError:o=>Object.assign(new Error(o.statusMessage),o),
    showError:()=>{}, navigateTo:()=>{},
    scaffoldAdmissionCurrent:()=>false, homeR2PublishedFromRender:()=>null,
  };
  const js = compileScript('app/app.vue');
  return vm.runInNewContext(`(async()=>{${js}; return ()=>current.value})()`,sandbox).then(getCurrent => ({
    route, content, selected, published,
    get current(){return getCurrent()},
    get robots(){return robotsGetter?.()},
    get calls(){return calls},
    async navigate(path) {
      route.path = path;
      rootWatch(); // stale route authorization must revoke immediately
      const result = await loader(null, {signal:new AbortController().signal});
      data.value=result;
      rootWatch();
      return result;
    },
    async rejected(path,code) {
      route.path=path;rootWatch();
      await assert.rejects(loader(null,{signal:new AbortController().signal}),e=>e.statusCode===code);
    },
  }));
}

// Ensure the local source is actually schema-valid; do not silently accept a fake site.
test('local preview uses the real pinned page copy; provenance is non-CMS',()=>{
 const c=preview.standalonePreviewContent();
 assert.equal(c.publication.id,STANDALONE_PREVIEW_PUBLICATION_ID);
 assert.equal(c.publication.digest,'STANDALONE_PREVIEW_NO_CMS_DIGEST');
 assert.equal(c.publication.revision,0);
 assert.ok(c.pages.about.hero.titleLines.length>0);
 assert.ok(c.pages.curriculum.hero.titleLines.length>0);
 assert.equal(publicExternalActionsAllowed(c),false);
});

test('exact allowlist rejects admin, API, CMS-only and unknown paths',()=>{
 for(const path of accepted) assert.equal(preview.standalonePreviewPathAllowed(path),true,path);
 for(const path of ['/about/extra','/about/','/videos','/api','/api/render','/admin','/admin/a','/unknown','/CONTACT'])
  assert.equal(preview.standalonePreviewPathAllowed(path),false,path);
});

test('standalone root admits all local pages with matching identity and no CMS network',async()=>{
 const h=await rootHarness('standalone','/');
 for(const path of ['/about','/curriculum','/practice','/archive','/promotion','/contact']){
  const r=await h.navigate(path);
  assert.equal(r.mode,'standalone');assert.equal(r.kind,'legacy');
  assert.equal(h.current,true,path);
  assert.equal(h.selected.value.path,path);
  assert.equal(h.selected.value.selected.mode,'legacy');
  assert.equal(h.content.value.publication.id,STANDALONE_PREVIEW_PUBLICATION_ID);
  assert.equal(h.selected.value.selected.seo.noindex,true);
  assert.equal(h.robots,'noindex,follow');
  assert.equal(h.published.value,null);
 }
 assert.equal(h.calls,0);
});

test('home and FAQ still scaffold; Standalone reviews admits unpublished shared Footer only',async()=>{
 const h=await rootHarness('standalone','/about');
 await h.navigate('/about');
 for(const path of ['/','/faq']){
  const r=await h.navigate(path);
  assert.equal(h.current,true); assert.equal(h.selected.value,null);
  assert.equal(h.content.value,null); assert.equal(h.published.value,null);
  assert.equal(h.robots,undefined);
  assert.equal(r.kind,path==='/'?'home':'scaffold');
 }
 const r=await h.navigate('/reviews');
 assert.equal(r.mode,'standalone'); assert.equal(r.kind,'reviews');
 assert.equal(r.path,'/reviews'); assert.equal(h.current,true);
 assert.equal(h.selected.value,null); assert.equal(h.published.value,null);
 assert.equal(h.content.value.publication.id,STANDALONE_PREVIEW_PUBLICATION_ID);
 assert.equal(h.content.value.publication.digest,r.local.publication.digest);
 assert.equal(h.robots,'noindex,follow');
 assert.equal(publicExternalActionsAllowed(h.content.value),false);
 assert.equal(h.calls,0);
});

test('stale route never admits previous content while new route pending',async()=>{
 const h=await rootHarness('standalone','/about');
 await h.navigate('/about');
 assert.equal(h.current,true);
 h.route.path='/curriculum';
 // The render guard must reject old root data, even before any watcher updates.
 assert.equal(h.current,false);
 await h.navigate('/curriculum');
 assert.equal(h.current,true);
 assert.equal(h.selected.value.selected.pageId,'curriculum');
});

test('unsupported routes have 404 errors, revoke prior owner and no CMS request',async()=>{
 const h=await rootHarness('standalone','/');
 await h.navigate('/about');
 for(const path of ['/admin','/api/render','/videos','/about/extra']){
  await h.rejected(path,404);
  assert.equal(h.current,false);assert.equal(h.content.value,null);assert.equal(h.selected.value,null);
 }
 assert.equal(h.calls,0);
});

test('CMS path still requests the original /api/render; public preview never activates outside standalone',async()=>{
 const h=await rootHarness('cms','/');
 await assert.rejects(h.navigate('/'),/UNEXPECTED_CMS_NETWORK/);
 assert.equal(h.calls,1);
 assert.equal(h.current,false);
});

test('unpublished preview blocks CMS form/other outgoing actions; pinned Kakao is independently admitted',()=>{
 assert.equal(publicExternalActionsAllowed(null),false);
 assert.equal(publicExternalActionsAllowed({publication:{id:STANDALONE_PREVIEW_PUBLICATION_ID}}),false);
 assert.equal(publicExternalActionsAllowed({publication:{id:'pub-live'}}),true);
 assert.match(read('app/components/contact/ContactForm.vue'),/publicExternalActionsAllowed/);
 assert.match(read('app/pages/contact.vue'),/publicExternalActionsAllowed/); // non-Kakao channels
 assert.match(read('app/components/feature/SiteFooter.vue'),/publicExternalActionsAllowed/); // Instagram/YouTube
 for(const p of [
  'app/components/feature/SiteHeader.vue','app/components/feature/SiteFooter.vue',
  'app/components/feature/CtaBand.vue','app/components/feature/PracticeBlock.vue',
  'app/components/home/HomeConsultationCta.vue','app/components/figma/FigmaSceneSection.vue',
  'app/pages/contact.vue',
 ])assert.match(read(p),/usePublicConsultationHref/,p);
 for(const p of ['app/utils/aboutR1Operational.ts','app/utils/curriculumR1Operational.ts'])
  assert.match(read(p),/resolvePublicConsultationKakaoUrl/,p);
});

test('Nuxt error page keeps standalone 404 independent of /api/content CMS fallback',()=>{
 assert.match(read('app/error.vue'), /useContentMode\(\) === 'cms'/);
});
