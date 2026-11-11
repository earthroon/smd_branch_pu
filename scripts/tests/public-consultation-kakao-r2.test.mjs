import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { validPublishedKakaoUrl } from '../../app/data/home-r2-navigation.ts';
import { publicExternalActionsAllowed, STANDALONE_PREVIEW_PUBLICATION_ID } from '../../app/utils/publicExternalActionPolicy.ts';
import { resolvePublicConsultationKakaoUrl as runtimeResolver } from '../../app/utils/publicConsultationKakaoUrl.ts';
import { resolveAboutOperationalState } from '../../app/utils/aboutR1Operational.ts';
import { resolveCurriculumOperationalState } from '../../app/utils/curriculumR1Operational.ts';

const read = path => readFileSync(new URL('../../' + path, import.meta.url), 'utf8');
const seed = JSON.parse(readFileSync(new URL('../../node_modules/@smd/content-contracts/dist/seed-content.json', import.meta.url), 'utf8'));
const baseline = JSON.parse(read('docs/migration/cf00/content-baseline.json'));

/** Execute the actual TS function body with the pinned seed and imported validators. */
function loadResolver(selectedSeed = seed) {
  const source = read('app/utils/publicConsultationKakaoUrl.ts')
    .replace(/^import .*;\s*$/gm, '').replace('export function ', 'function ');
  const compiled = ts.transpileModule(source, {fileName:'publicConsultationKakaoUrl.ts',reportDiagnostics:true,
    compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}});
  const errors = (compiled.diagnostics??[]).filter(d => d.category === ts.DiagnosticCategory.Error);
  assert.equal(errors.length,0,errors.map(d=>ts.flattenDiagnosticMessageText(d.messageText,'\n')).join('\n'));
  return vm.runInNewContext(`(()=>{${compiled.outputText};return resolvePublicConsultationKakaoUrl})()`,
    {seed:selectedSeed,validPublishedKakaoUrl,publicExternalActionsAllowed});
}

const resolve = loadResolver();
const kakao = seed.navigation.kakaoUrl;

test('standalone official Kakao URL is pinned to source and independently available on home',()=>{
 assert.equal(kakao, baseline.original.KAKAO_URL);
 assert.equal(resolve(null,'standalone'),kakao);
 assert.equal(resolve({publication:{id:STANDALONE_PREVIEW_PUBLICATION_ID},navigation:{kakaoUrl:kakao}},'standalone'),kakao);
 assert.equal(publicExternalActionsAllowed({publication:{id:STANDALONE_PREVIEW_PUBLICATION_ID}}),false);
});

test('standalone never consumes an arbitrary CMS-provided URL',()=>{
 const malicious = {publication:{id:'pub-live'},navigation:{kakaoUrl:'https://open.kakao.com/o/OTHER'}};
 assert.equal(resolve(malicious,'standalone'),kakao);
});

test('invalid pinned Kakao URL fails closed, with no fallback or redirect',()=>{
 for(const url of ['', 'https://evil.example/o/x', 'http://open.kakao.com/o/abc',
   'https://open.kakao.com/o/abc?next=1', 'javascript:alert(1)', 'https://open.kakao.com/o/a#hash']){
  const fn=loadResolver({navigation:{kakaoUrl:url}});
  assert.equal(fn(null,'standalone'),null,url);
 }
});

test('CMS requires published content and validates the Kakao host and path',()=>{
 assert.equal(resolve(null,'cms'),null);
 assert.equal(resolve({publication:{id:STANDALONE_PREVIEW_PUBLICATION_ID},navigation:{kakaoUrl:kakao}},'cms'),null);
 assert.equal(resolve({publication:{id:'pub-live'},navigation:{kakaoUrl:'https://open.kakao.com/o/abc123'}},'cms'),'https://open.kakao.com/o/abc123');
 assert.equal(resolve({publication:{id:'pub-live'},navigation:{kakaoUrl:'https://example.com/o/abc123'}},'cms'),null);
});

test('composable binds URL to mode and content, no CMS network fallback',()=>{
 const code=read('app/composables/usePublicConsultationHref.ts');
 assert.match(code,/useContentMode\(\)/);
 assert.match(code,/useSiteContent\(\)/);
 assert.match(code,/resolvePublicConsultationKakaoUrl\(content\.value, mode\)/);
 assert.doesNotMatch(code,/fetch\(|\$fetch|navigateTo/);
});

test('PSD operational states consume the same consultation owner and route identity',()=>{
 for(const [p,fn] of [
  ['app/composables/useAboutR1.ts','resolveAboutOperationalState'],
  ['app/composables/useCurriculumR1.ts','resolveCurriculumOperationalState'],
 ]){
  const source=read(p);
  assert.match(source,/useContentMode\(\)/,p);
  assert.match(source,new RegExp(fn+'\\(content\\.value'),p);
 }
});

test('CMS inquiries stay blocked for unpublished standalone content',()=>{
 const source=read('app/components/contact/ContactForm.vue');
 assert.match(source,/publicExternalActionsAllowed\(c\.value\)/);
 assert.match(source,/!submissionAllowed\.value/);
 assert.match(source,/!submissionAllowed/);
});

test('all consultation UI locations use one resolver without changing Figma hitbox geometry',()=>{
 for(const p of [
  'app/components/feature/SiteHeader.vue','app/components/feature/CtaBand.vue',
  'app/components/feature/PracticeBlock.vue','app/components/feature/SiteFooter.vue',
  'app/components/figma/FigmaSceneSection.vue','app/components/home/HomeConsultationCta.vue',
  'app/pages/contact.vue',
 ]) assert.match(read(p),/usePublicConsultationHref/,p);
 const figma=read('app/components/figma/FigmaSceneSection.vue');
 assert.match(figma,/x="785" y="579" width="340" height="88"/);
 assert.match(figma,/foreignObject v-if="sectionId==='consultation-cta' && ctaHref/);
 assert.match(read('app/components/feature/SiteFooter.vue'),/v-if="externalAllowed"\s+\:href="content\?\.navigation\.instagramUrl"/);
 assert.match(read('app/pages/contact.vue'),/ch\.target==='kakao'\?consultationHref\.value/);
});

test('direct Node ESM execution confirms pinned seed and CMS isolation',()=>{
 assert.equal(runtimeResolver(null,'standalone'),kakao);
 assert.equal(runtimeResolver(null,'cms'),null);
 assert.equal(runtimeResolver({publication:{id:'pub-live'},navigation:{kakaoUrl:'https://evil.example'}},'cms'),null);
});

test('actual PSD operational states receive standalone Kakao without weakening selected-page identity',()=>{
 const content={publication:{id:STANDALONE_PREVIEW_PUBLICATION_ID,digest:'STANDALONE_PREVIEW_NO_CMS_DIGEST'},
  navigation:{kakaoUrl:kakao},pageSlots:{about:{},curriculum:{}}};
 for(const [path,id,resolve] of [
   ['/about','about',resolveAboutOperationalState],
   ['/curriculum','curriculum',resolveCurriculumOperationalState],
 ]){
  const selected={path,publicationId:content.publication.id,publicationDigest:content.publication.digest,
    selected:{mode:'legacy',pageId:id}};
  assert.equal(resolve(content,selected,path,'standalone').consultationUrl,kakao,path);
  assert.equal(resolve(content,selected,path,'cms').consultationUrl,null,path);
  assert.equal(resolve(content,{...selected,publicationDigest:'wrong'},path,'standalone'),null,path);
 }
});
