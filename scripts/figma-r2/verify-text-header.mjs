/** Local static/source evidence only. Browser glyph and font audits are a separate gate. */
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
import {existsSync} from 'node:fs';
const root=resolve(import.meta.dirname,'../..');
const cli=resolve(root,'node_modules/typescript/bin/tsc');
const tests=[
  [process.execPath,['scripts/figma-r2/build-render-scene.mjs','--verify']],
  [process.execPath,['--experimental-strip-types','--test','scripts/figma-r2/tests/text-clip-header.test.mjs','scripts/figma-r2/tests/scene.test.mjs','scripts/figma-r2/tests/asset-http.test.mjs']],
];
if(existsSync(cli))tests.unshift(
  [process.execPath,[cli,'-p','scripts/figma-r2/tsconfig.text-header.json']],
  [process.execPath,[cli,'-p','scripts/figma-r2/tsconfig.scene.json']],
);
for(const [cmd,args] of tests){
 const r=spawnSync(cmd,args,{cwd:root,encoding:'utf8',maxBuffer:30e6});
 console.log(`$ ${cmd} ${args.join(' ')} => ${r.status ?? 'UNAVAILABLE'}`);
 if(r.stdout)console.log(r.stdout);
 if(r.status!==0){console.error(r.stderr||r.error?.message||'FAILED');process.exit(1)}
}
console.log('PASS_SMD_HOME_R2_TEXT_HEADER_SOURCE_STATIC; BROWSER_FONT_AND_CLIPPING_NOT_VERIFIED');
