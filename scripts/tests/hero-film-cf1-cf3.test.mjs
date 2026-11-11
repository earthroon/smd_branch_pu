import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {LEGACY_PAGE_IDS} from '@smd/content-contracts/cms-kind-registry';
import {LEGACY_CANONICAL_PATHS} from '@smd/content-contracts/category-page-contracts';
const read=p=>readFileSync(new URL('../../'+p,import.meta.url),'utf8');
// Execute the actual root loader with a counted network mock; no fake CMS response.
function rootHarness(mode,path) {
 let calls=0,loader;
 let source=read('app/app.vue').split('<script setup lang="ts">')[1].split('</script>')[0];
 source=source.replace(/import[\s\S]*?from\s*['"][^'"]+['"];?/g,'').replaceAll('import.meta.server','false').replaceAll('import.meta.client','false');
 const state=()=>({value:null});
 const allowed=new Set([...LEGACY_PAGE_IDS.map(page=>LEGACY_CANONICAL_PATHS[page]),'/reviews','/faq']);
 const local=()=>({publication:{id:'STANDALONE_PREVIEW_NOT_PUBLISHED',digest:'STANDALONE_PREVIEW_NO_CMS_DIGEST'}});
 const localSelected=(p,c)=>({path:p,publicationId:c.publication.id,publicationDigest:c.publication.digest,
   selected:{mode:'legacy',pageId:LEGACY_PAGE_IDS.find(page=>LEGACY_CANONICAL_PATHS[page]===p),seo:{noindex:true}}});
 const ctx={useRoute:()=>({path}),useContentMode:()=>mode,useSiteContent:state,useHomeR2Published:state,useSelectedCategoryPage:state,
 computed:f=>({get value(){return f()}}),resolveHomeScaffoldPath:()=>null,useSeoMeta:()=>{},
 STANDALONE_PREVIEW_PUBLICATION_ID:'STANDALONE_PREVIEW_NOT_PUBLISHED',
 standalonePreviewPathAllowed:p=>allowed.has(p),
 standalonePreviewContent:local,standalonePreviewSelected:localSelected,
 useAsyncData:async(k,f)=>{loader=f;return {data:state(),error:state(),pending:{value:false}}},watch:()=>{},fetch:()=>{calls++;throw Error('NETWORK_SENTINEL')},createError:x=>Object.assign(Error(x.statusMessage),x),showError:()=>{},navigateTo:()=>{}};
 const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
 return vm.runInNewContext(`(async()=>{${js}})()`,ctx).then(()=>({run:()=>loader(null,{signal:new AbortController().signal}),calls:()=>calls}));
}
test('standalone root never requests a CMS envelope',async()=>{
 for(const path of ['/','/about','/contact']){
  const h=await rootHarness('standalone',path),result=await h.run();
  assert.equal(result.mode,'standalone');assert.equal(result.path,path);
  assert.equal(result.kind,path==='/'?'home':'legacy');assert.equal(h.calls(),0);
 }
});
test('CMS mode still uses real transport, without automatic local fallback',async()=>{
 const h=await rootHarness('cms','/');await assert.rejects(h.run(),/NETWORK_SENTINEL/);assert.equal(h.calls(),1);
});
test('admin stays rejected even when CMS is disconnected',async()=>{
 const h=await rootHarness('standalone','/admin');await assert.rejects(h.run(),/PUBLIC_ADMIN_ROUTE_NOT_FOUND/);assert.equal(h.calls(),0);
});
test('CF1: useContentMode is explicitly imported in all three consumers',()=>{
 for (const path of ['app/app.vue','app/pages/index.vue','app/components/feature/HeaderBrandSymbol.vue']) {
  const code=read(path);
  assert.match(code,/import\s*\{\s*useContentMode\s*\}\s*from\s*['\"]~\/composables\/useContentMode['\"];?/,`MISSING_USE_CONTENT_MODE_IMPORT ${path}`);
 }
});
test('white replacement is restricted to top hero and frozen background node',()=>{
 const css=read('app/assets/css/home-hero-film.css');assert.match(css,/node-1:5/);assert.doesNotMatch(css,/info-bar|consultation-cta|body-stage/);
 const film=read('app/components/home/HomeHeroFilm.vue');assert.doesNotMatch(film,/object-fit:\s*cover|requestAnimationFrame/);assert.match(film,/data-film-fill="intro-viewport"|height:100%/);assert.match(film,/object-fit:contain/);assert.doesNotMatch(film,/flex-basis:85%/);
});
