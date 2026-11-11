import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import {verifyHomeComposition} from './lib/home-r2-cf2.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const receipt=verifyHomeComposition(root);
const file=resolve(root,'docs/migration/smd-home-r2/cf2/receipt.json');
if(process.argv[2]==='--write'){
  mkdirSync(dirname(file),{recursive:true});writeFileSync(file,JSON.stringify(receipt,null,2)+'\n');
}else{
  if(readFileSync(file,'utf8')!==JSON.stringify(receipt,null,2)+'\n')throw new Error('SMD_HOME_R2_CF2_RECEIPT_DRIFT');
}
console.log('PASS_SMD_HOME_R2_CF2_HOME_COMPOSITION_STATIC');
