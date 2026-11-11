/** Reproducible local tests. Does NOT claim Nuxt/SSR browser qualification. */
import {spawnSync} from 'node:child_process';
import {mkdirSync,existsSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const tscCli=resolve(root,'node_modules/typescript/bin/tsc');
const run=(cmd,args)=>{
 const x=spawnSync(cmd,args,{cwd:root,encoding:'utf8',maxBuffer:30*1024*1024});
 console.log(`${cmd} ${args.join(' ')} -> ${x.status}`);
 if(x.status!==0){
  if(x.error) console.error(`${cmd} could not execute: ${x.error.message}`);
  console.error((x.stderr||x.stdout||'').slice(-5000));
  process.exit(1);
 }
};
// The pinned, local 0.7.0 contracts tarball is sufficient for model tests;
// no network or other npm package installation is necessary.
const packageJson=resolve(root,'node_modules/@smd/content-contracts/package.json');
if(!existsSync(packageJson)){
 const dir=resolve(root,'node_modules/@smd/content-contracts');mkdirSync(dir,{recursive:true});
 run('tar',['-xzf','vendor/content-contracts/smd-content-contracts-0.7.0.tgz',
  '-C','node_modules/@smd/content-contracts','--strip-components=1']);
}
// Direct node invocation works in PowerShell without assuming `tsc` is on PATH.
if(!existsSync(tscCli)){
 console.error('PUBLIC_M5_TSC_NOT_INSTALLED: run npm.cmd ci in the Public project root');
 process.exit(1);
}
run(process.execPath,[tscCli,'-p','scripts/home-r2-m5/tsconfig.json']);
for(const p of ['home-r2-cf1-source-static.mjs','home-r2-cf2-composition-static.mjs',
 'home-r2-cf3-static.mjs','home-r2-cf4-static.mjs'])
 run('node',['--experimental-strip-types',`scripts/${p}`]);
run('node',['--experimental-strip-types','--test',
 'scripts/tests/home-r2-cf1-source.test.mjs','scripts/tests/home-r2-cf2-composition.test.mjs',
 'scripts/tests/home-r2-cf3-visual.test.mjs','scripts/tests/home-r2-cf4-scaffold.test.mjs',
 'scripts/tests/home-r2-m5-v6-public.test.mjs','scripts/tests/home-r2-m5-v6-envelope.test.mjs',
 'scripts/tests/home-r2-m5-source.test.mjs','scripts/tests/home-r2-m5-type-guard.test.mjs',
 'scripts/tests/site-media-cf5b-public.test.mjs']);
console.log('PASS_SMD_HOME_R2_M5_PUBLIC_MODEL_STATIC_ONLY');
