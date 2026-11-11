import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildHomeCf3Visual } from './lib/home-r2-cf3-visual.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const mode=process.argv[2];
if(!['--write','--verify'].includes(mode))throw new Error('USAGE: node scripts/home-r2-cf3-visual-freeze.mjs --write|--verify');
const {outputs}=buildHomeCf3Visual(root);
for(const [name,value] of Object.entries(outputs)){
  const path=resolve(root,name);
  if(mode==='--write'){mkdirSync(dirname(path),{recursive:true});writeFileSync(path,value);}
  else if(readFileSync(path,'utf8')!==value)throw new Error(`SMD_HOME_R2_CF3_VISUAL_DERIVED_DRIFT ${name}`);
}
console.log('PASS_SMD_HOME_R2_CF3_FIGMA_VISUAL_SOURCE');
