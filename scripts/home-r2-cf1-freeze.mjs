import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {buildSourceFreeze, verifyUntouchedFiles, manifestOutputPath} from './lib/home-r2-source.mjs';
import { CF34_AUTHORIZED_DIGESTS } from './lib/home-r2-cf34-authority.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const mode=process.argv[2];
if(!['--write','--verify'].includes(mode))throw new Error('USAGE: node scripts/home-r2-cf1-freeze.mjs --write | --verify');
const frozen=buildSourceFreeze(root);
const untouched=verifyUntouchedFiles(root,CF34_AUTHORIZED_DIGESTS);
for(const [name,contents] of Object.entries(frozen.manifestFiles)){
  const path=manifestOutputPath(root,name);
  if(mode==='--write'){
    mkdirSync(dirname(path),{recursive:true}); writeFileSync(path,contents);
  }else{
    let actual;try{actual=readFileSync(path,'utf8');}catch{throw new Error(`SMD_HOME_R2_DERIVED_MANIFEST_MISSING ${name}`);}
    if(actual!==contents)throw new Error(`SMD_HOME_R2_DERIVED_MANIFEST_DRIFT ${name}`);
  }
}
const receipt={contract:'SMD-HOME-R2-CF1',sourceSnapshotDigest:frozen.sourceIdentity.sourceSnapshotDigest,generatedFrom:frozen.sourceIdentity.sourceFiles,
  sourceStatus:'SOURCE_VALIDATED',staticStatus:'PASS',nodeCount:272,nativeTextCount:76,assetShaPassCount:31,rootSectionCount:frozen.sections.length,
  bodySectionCount:frozen.sections.length-2,unboundMediaSlotCount:frozen.slots.length,blockedRenderCount:frozen.blockers.renderCounts.blocked,
  directClipBlockerCount:frozen.blockers.knownDirectBlockers.length,noTouchFileCount:untouched,
  compile:'NOT_RUN',runtime:'NOT_RUN',physical:'NOT_RUN',performance:'NOT_RUN',productCommitAllowed:false};
const path=manifestOutputPath(root,'receipt.json');const value=`${JSON.stringify(receipt,null,2)}\n`;
if(mode==='--write'){writeFileSync(path,value);}else if(readFileSync(path,'utf8')!==value){throw new Error('SMD_HOME_R2_CF1_RECEIPT_DRIFT');}
console.log('PASS_SMD_HOME_R2_CF1_SOURCE_FREEZE');
