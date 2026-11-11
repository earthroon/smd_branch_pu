import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,existsSync,rmSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {applyAboutOverlay} from '../apply-overlay.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex');
function fixture(){
 const base=mkdtempSync(resolve(tmpdir(),'smd-about-apply-')),project=resolve(base,'project'),overlay=resolve(base,'overlay');
 mkdirSync(project);mkdirSync(overlay);
 writeFileSync(resolve(project,'package.json'),'{"name":"smd-public"}\n');
 execFileSync('git',['init','--quiet'],{cwd:project});
 execFileSync('git',['remote','add','origin','https://github.com/earthroon/SMD_PU.git'],{cwd:project});
 mkdirSync(resolve(project,'app'));mkdirSync(resolve(overlay,'app'));
 writeFileSync(resolve(project,'app/a.ts'),'old\n');writeFileSync(resolve(overlay,'app/a.ts'),'new\n');
 writeFileSync(resolve(overlay,'app/b.ts'),'added\n');
 const manifest={schema:'SMD_ABOUT_OVERLAY_V1',repository:'earthroon/SMD_PU',baseCommit:'fixture',
  files:[{path:'app/a.ts',beforeSha256:sha('old\n'),sha256:sha('new\n'),text:true},
   {path:'app/b.ts',beforeSha256:null,sha256:sha('added\n'),text:true}]};
 const save=()=>writeFileSync(resolve(overlay,'SMD-ABOUT-R1_OVERLAY_MANIFEST.json'),JSON.stringify(manifest));
 save();return{base,project,overlay,manifest,save};
}
test('verified overlay backs up original bytes and is idempotent',()=>{
 const f=fixture();try{
  const r=applyAboutOverlay(f.overlay,f.project);
  assert.equal(r.status,'APPLIED');assert.equal(r.files,2);
  assert.equal(readFileSync(resolve(r.backup,'app/a.ts'),'utf8'),'old\n');
  assert.equal(readFileSync(resolve(f.project,'app/a.ts'),'utf8'),'new\n');
  assert.equal(applyAboutOverlay(f.overlay,f.project).status,'ALREADY_APPLIED');
 }finally{rmSync(f.base,{recursive:true,force:true});}
});
test('Windows CRLF is accepted as the same source and original bytes remain in backup',()=>{
 const f=fixture();try{
  writeFileSync(resolve(f.project,'app/a.ts'),'old\r\n');
  const r=applyAboutOverlay(f.overlay,f.project);
  assert.equal(readFileSync(resolve(r.backup,'app/a.ts'),'utf8'),'old\r\n');
 }finally{rmSync(f.base,{recursive:true,force:true});}
});
test('unknown local edit refuses before writing any file',()=>{
 const f=fixture();try{
  writeFileSync(resolve(f.project,'app/a.ts'),'user edit\n');
  assert.throws(()=>applyAboutOverlay(f.overlay,f.project),/LOCAL_FILE_CHANGED/);
  assert.equal(existsSync(resolve(f.project,'app/b.ts')),false);
  assert.equal(existsSync(resolve(f.project,'artifacts')),false);
 }finally{rmSync(f.base,{recursive:true,force:true});}
});
test('corrupted overlay and traversal entries are rejected before writing',()=>{
 const f=fixture();try{
  writeFileSync(resolve(f.overlay,'app/b.ts'),'corrupted');
  assert.throws(()=>applyAboutOverlay(f.overlay,f.project),/BYTES_MISMATCH/);
  assert.equal(readFileSync(resolve(f.project,'app/a.ts'),'utf8'),'old\n');
  f.manifest.files[0].path='../outside';f.save();
  assert.throws(()=>applyAboutOverlay(f.overlay,f.project),/PATH_INVALID/);
 }finally{rmSync(f.base,{recursive:true,force:true});}
});
