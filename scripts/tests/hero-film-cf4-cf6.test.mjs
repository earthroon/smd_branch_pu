import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {filmHorizontal,filmTap} from '../../app/utils/homeFilmInput.ts';
const read=p=>readFileSync(new URL('../../'+p,import.meta.url));
test('shared horizontal classifier preserves vertical wheel and zoom',()=>{
 assert.equal(filmHorizontal({ctrlKey:false,shiftKey:false,deltaX:1,deltaY:90}),false);
 assert.equal(filmHorizontal({ctrlKey:false,shiftKey:false,deltaX:90,deltaY:1}),true);
 assert.equal(filmHorizontal({ctrlKey:true,shiftKey:true,deltaX:90,deltaY:1}),false);
 assert.equal(filmHorizontal({ctrlKey:false,shiftKey:true,deltaX:0,deltaY:90}),true);
});
test('tap excludes swipe, long hold, scroll and invalid measurements',()=>{
 assert(filmTap(0,50,0));for(const a of [[9,20,0],[0,601,0],[0,20,3],[NaN,1,0],[0,-1,0]])assert.equal(filmTap(...a),false);
});
test('offline LUT anchors, finite monotone samples and rate bounds',()=>{
 const l=JSON.parse(read('app/data/home-film-lut.json'));assert.equal(l.samples[0].progress,0);assert.equal(l.samples.at(-1).progress,1);
 l.samples.forEach((x,i)=>{assert(Number.isFinite(x.progress));if(i){assert(x.offset>l.samples[i-1].offset);assert(x.progress>=l.samples[i-1].progress);}});
 assert(l.rates.every(x=>x>=.649&&x<=1.801));
});
test('focus chunks carry exact hash and full-image UV',()=>{
 for(const c of JSON.parse(read('app/data/home-film-focus.json'))){assert.equal(createHash('sha256').update(read('public'+c.url)).digest('hex'),c.sha256);assert.deepEqual(c.uv,[0,0,1,1]);}
});
import vm from 'node:vm';import ts from 'typescript';import {webcrypto} from 'node:crypto';
import { validateFilmFocusChunk, FILM_FOCUS_PROTOCOL } from '../../app/utils/homeFilmFocusAdmission.ts';
const settled=()=>new Promise(resolve=>setImmediate(resolve));
async function waitForWorker(done){
 const until=Date.now()+2500;
 while(!done()&&Date.now()<until)await new Promise(r=>setTimeout(r,10));
 assert(done(),'FILM_WORKER_FIXTURE_TIMEOUT');
}
function workerHarness(){
 let resolveFetch,resolveDeviceLost,submits=0,closed=0,fetches=0;
 const messages=[];
 const device={limits:{maxTextureDimension2D:4096},
  createShaderModule:()=>({}),createRenderPipelineAsync:async()=>({getBindGroupLayout:()=>({})}),
  createSampler:()=>({}),lost:new Promise(r=>{resolveDeviceLost=r}),
  createTexture:()=>({destroy(){},createView:()=>({})}),
  createBuffer:()=>({destroy(){}}),
  createBindGroup:()=>({}),createCommandEncoder:()=>({beginRenderPass:()=>({setPipeline(){},setBindGroup(){},draw(){},end(){}}),finish:()=>({})}),
  queue:{writeBuffer(){},copyExternalImageToTexture(){},submit(){submits++},onSubmittedWorkDone:async()=>{}}};
 const scope={postMessage:m=>messages.push(m),location:{origin:'http://localhost'},
  navigator:{gpu:{requestAdapter:async()=>({requestDevice:async()=>device}),getPreferredCanvasFormat:()=> 'rgba8unorm'}}};
 let source=read('app/workers/home-film-focus.ts').toString().replace(/import[\s\S]*?from\s*['"][^'"]+['"];?/g,'');
 source=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText.replace(/export\s*\{\s*\};?/g,'');
 const ctx={self:scope,validateFilmFocusChunk,FILM_FOCUS_PROTOCOL,AbortController,crypto:webcrypto,
  Blob,fetch:()=>{fetches++;return new Promise(r=>{resolveFetch=r})},
  createImageBitmap:async()=>({width:2,height:2,close(){closed++}})};
 vm.runInNewContext(source,ctx);
 const canvas={getContext:()=>({configure(){},getCurrentTexture:()=>({createView:()=>({})})})};
 const sha256=createHash('sha256').update(new Uint8Array([1,2,3])).digest('hex');
 const chunk={schema:'film-focus-chunk-v1',imageId:'hero-1',sourceImageSha256:'a'.repeat(64),
  sourceWidthPx:2,sourceHeightPx:2,chunkId:'approved-fixture',url:'/api/media/test',
  renditionId:'v1',chunkSha256:sha256,chunkWidthPx:2,chunkHeightPx:2,
  sourceRectPx:{x:0,y:0,width:2,height:2},uv:[0,0,1,1],paddingPx:0,maxZoom:1,
  assetRevision:'fixture',publicationWitness:'fixture-published'};
 const identity={imageId:'hero-1',interactionGeneration:1,focusGeneration:1,
  layoutRevision:'layout-a',assetRevision:'fixture',deviceGeneration:1,hostGeneration:7};
 return {scope,messages,canvas,chunk,identity,resolveDeviceLost:()=>resolveDeviceLost({}),
  stats:()=>({submits,closed,fetches}),respond:()=>resolveFetch({ok:true,arrayBuffer:async()=>new Uint8Array([1,2,3]).buffer})};
}
test('Worker: idle init is fetch-free; stale cancelled request cannot submit',async()=>{
 const h=workerHarness();
 h.scope.onmessage({data:{kind:'init',protocol:'film-focus-v1',hostGeneration:7,canvas:h.canvas}});
 await waitForWorker(()=>h.messages.some(m=>m.kind==='ready'||m.kind==='failed'));
 assert.equal(h.stats().fetches,0);
 assert(h.messages.some(m=>m.kind==='ready'&&m.deviceGeneration===1));
 h.scope.onmessage({data:{kind:'focus',identity:h.identity,chunk:h.chunk,surfacePx:{width:2,height:2}}});
 await settled();assert.equal(h.stats().fetches,1);
 h.scope.onmessage({data:{kind:'cancel',hostGeneration:7,focusGeneration:2}});
 h.respond();await settled();await settled();
 assert.equal(h.stats().submits,0);
 assert(!h.messages.some(m=>m.kind==='rendered'));
});
test('Worker: approved-style fixture current generation submits once and reports complete identity',async()=>{
 const h=workerHarness();h.scope.onmessage({data:{kind:'init',protocol:'film-focus-v1',hostGeneration:7,canvas:h.canvas}});
 await waitForWorker(()=>h.messages.some(m=>m.kind==='ready'||m.kind==='failed'));
 h.scope.onmessage({data:{kind:'focus',identity:h.identity,chunk:h.chunk,surfacePx:{width:2,height:2}}});
 await waitForWorker(()=>h.stats().fetches===1);h.respond();
 await waitForWorker(()=>h.messages.some(m=>m.kind==='rendered'||m.kind==='failed'));
 assert.equal(h.stats().submits,1,JSON.stringify(h.messages));
 assert(h.messages.some(m=>m.kind==='rendered'&&m.identity.imageId==='hero-1'&&m.identity.hostGeneration===7));
});
test('infinite Y-bound film uses gapless source-ratio geometry and original file order',()=>{
 const component=read('app/components/home/HomeHeroFilm.vue').toString();
 assert.match(component,/iterations:loop\?Infinity:1/);assert.match(component,/--film-gap:0px/);
 assert.match(component,/data-film-fill="intro-viewport"|height:100%/);assert.match(component,/slotStyle\(index\)/);assert.doesNotMatch(component,/object-fit:\s*cover/);
 const manifest=read('app/data/home-film.ts').toString();
 assert(manifest.indexOf('1(1).jpg')<manifest.indexOf('2.jpg'));
 assert(manifest.indexOf('2.jpg')<manifest.indexOf('3.jpg'));
});
