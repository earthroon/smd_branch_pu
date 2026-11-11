import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync,mkdirSync,copyFileSync,readFileSync,writeFileSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSourceFreeze, FROZEN_PARENT_SOURCE } from '../lib/home-r2-source.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const source=resolve(root,FROZEN_PARENT_SOURCE);
function temporarySource(fn){
  const tmp=mkdtempSync(join(tmpdir(),'smd-home-cf1-'));
  const target=resolve(tmp,FROZEN_PARENT_SOURCE);
  mkdirSync(join(target,'assets'),{recursive:true});
  for(const name of ['skin.jsonl','figma-reference.json','export-session.json'])copyFileSync(resolve(source,name),resolve(target,name));
  // Copy the frozen asset inventory without changing original names.
  const rows=readFileSync(resolve(source,'skin.jsonl'),'utf8').trim().split('\n').map(x=>JSON.parse(x));
  for(const a of rows.filter(x=>x.kind==='asset'))copyFileSync(resolve(source,a.path),resolve(target,a.path));
  try{fn(target,tmp);}finally{rmSync(tmp,{recursive:true,force:true});}
}
test('all 11 Figma root sections and 76 text sources remain frozen',()=>{
 const source=buildSourceFreeze(root);
 assert.equal(source.sections.length,11);
 assert.equal(source.sections.filter(x=>x.id!=='header'&&x.id!=='footer').length,9);
 assert.equal(source.texts.length,76);
 assert.equal(source.slots.length,8);
 assert.equal(source.blockers.renderCounts.blocked,32);
 assert.equal(source.sourceIdentity.productCommitAllowed,false);
});
test('mutated original text must not pass the pinned input SHA',()=>{
 temporarySource((dir,tmp)=>{
  const p=join(dir,'skin.jsonl');
  const old=readFileSync(p,'utf8');writeFileSync(p,old.replace('SMD 아카데미','SMD 아카데미 수정'));
  assert.throws(()=>buildSourceFreeze(tmp),/SMD_HOME_R2_SOURCE_DIGEST_MISMATCH/);
 });
});
test('a changed SVG byte is rejected by asset digest even when JSONL stays intact',()=>{
 temporarySource((dir,tmp)=>{
  const asset=readFileSync(resolve(dir,'skin.jsonl'),'utf8').trim().split('\n').map(x=>JSON.parse(x)).find(x=>x.kind==='asset');
  const path=resolve(dir,asset.path);writeFileSync(path,readFileSync(path,'utf8')+' ');
  assert.throws(()=>buildSourceFreeze(tmp),/SMD_HOME_R2_ASSET_HASH_MISMATCH/);
 });
});
