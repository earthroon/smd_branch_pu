import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const ts=require('typescript');
const code=readFileSync(new URL('../app/utils/standalone-media-public.ts',import.meta.url),'utf8');
const out=ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}});
if(out.diagnostics?.some(d=>d.category===ts.DiagnosticCategory.Error))throw Error('PUBLIC_CONTRACT_TRANSPILE_FAILED');
const mod={exports:{}};
vm.runInNewContext(out.outputText,{module:mod,exports:mod.exports,require:(path)=>{
  if(path.includes('home-r2-manifest'))return {homeMediaSlots:{'home.special-start.photo':{},'home.methods.01.image':{}}};
  if(path.includes('home-film'))return {homeFilmAssets:[{id:'hero-1'},{id:'hero-2'},{id:'hero-3'}]};
  if(path.includes('about-r1-assets'))return {aboutSourceAssets:{photos:{'about.hero.photo':{}}}};
  if(path.includes('curriculum-r1-assets'))return {curriculumSourceAssets:{photos:{'curriculum.hero.photo':{}}}};
  throw Error('UNEXPECTED_PUBLIC_CONTRACT_DEPENDENCY '+path);
},console},{filename:'standalone-media-public.cjs'});
const {validateStandaloneMediaManifest,resolveStandaloneMedia}=mod.exports;
const uuid='11111111-1111-4111-8111-111111111111',digest='a'.repeat(64),id='sm_'+'b'.repeat(64);
const fixture=()=>({schema:'SMD_STANDALONE_MEDIA_MANIFEST_V1',publicGitTreeSha:'c'.repeat(40),
  sourceLockDigest:digest,publication:{id:uuid,sequence:1,digest:'d'.repeat(64)},bindings:[
    {pageId:'about',slotId:'about.hero.photo',kind:'site-raster',assetId:id,alt:'about',title:'about',
      width:640,height:480,mimeType:'image/png'},
    {pageId:'home',slotId:'hero-1',kind:'site-raster',assetId:id,alt:'film',title:'film',
      width:640,height:480,mimeType:'image/png'},
  ]});
test('CF8 manifest validates pinned source, known slots and stable source URL',()=>{
  const obj=validateStandaloneMediaManifest(fixture(),digest);
  assert.equal(obj.bindings.length,2);
  const img=resolveStandaloneMedia('published',obj,'home','hero-1');
  assert.equal(img.kind,'published');
  assert.equal(img.src,`/api/media/standalone/${uuid}/${id}`);
});
test('CF8 local mode preserves original Source authority',()=>{
  assert.equal(resolveStandaloneMedia('local',null,'about','about.hero.photo').kind,'local');
});
test('CF8 rejects missing publication rather than guessing asset URL',()=>{
  assert.throws(()=>resolveStandaloneMedia('published',null,'about','about.hero.photo'),
    /STANDALONE_MEDIA_MANIFEST_UNAVAILABLE/);
});
test('CF8 rejects unknown, duplicate and out-of-order slots',()=>{
  const unknown=fixture();unknown.bindings[0].slotId='about.missing';
  assert.throws(()=>validateStandaloneMediaManifest(unknown,digest),/STANDALONE_MEDIA_BINDING_INVALID/);
  const duplicate=fixture();duplicate.bindings.push({...duplicate.bindings[1]});
  assert.throws(()=>validateStandaloneMediaManifest(duplicate,digest),/DUPLICATE_OR_ORDER_DRIFT/);
  const reversed=fixture();reversed.bindings.reverse();
  assert.throws(()=>validateStandaloneMediaManifest(reversed,digest),/DUPLICATE_OR_ORDER_DRIFT/);
});
test('CF8 rejects mismatching source lock and malformed publication id',()=>{
  assert.throws(()=>validateStandaloneMediaManifest(fixture(),'f'.repeat(64)),/STANDALONE_MEDIA_MANIFEST_INVALID/);
  const bad=fixture();bad.publication.id='other';
  assert.throws(()=>validateStandaloneMediaManifest(bad,digest),/STANDALONE_MEDIA_MANIFEST_INVALID/);
});
