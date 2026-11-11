/** Single-command local structural gate, deliberately not a browser parity claim. */
import {spawnSync} from 'node:child_process';
import {resolve,dirname} from 'node:path';import {fileURLToPath} from 'node:url';
import {existsSync} from 'node:fs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const localTsc=resolve(root,'node_modules/typescript/bin/tsc');
const tscCommand=existsSync(localTsc)?[process.execPath,[localTsc,'-p','scripts/figma-r2/tsconfig.scene.json']]:['tsc',['-p','scripts/figma-r2/tsconfig.scene.json']];
const commands=[
 [process.execPath,['scripts/figma-r2/build-render-scene.mjs','--verify']],
 tscCommand,
 [process.execPath,['--experimental-strip-types','--test','scripts/figma-r2/tests/scene.test.mjs','scripts/figma-r2/tests/asset-http.test.mjs']],
];
for(const [cmd,args] of commands){const r=spawnSync(cmd,args,{cwd:root,encoding:'utf8',maxBuffer:16e6});console.log(`$ ${cmd} ${args.join(' ')} -> ${r.status}`);console.log(r.stdout||'');if(r.status!==0){console.error(r.stderr||r.error?.message||'ERROR');process.exit(1)}}
console.log('PASS_SMD_FIGMA_SCENE_SOURCE_STATIC_ONLY; VISUAL_BLOCKED, PHYSICAL_NOT_RUN');
