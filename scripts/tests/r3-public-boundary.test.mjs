import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const read=(p)=>readFileSync(resolve(root,p),'utf8');
const original=await import(pathToFileURL(resolve(root,'server/utils/public-core.ts')));
globalThis.createError=({statusCode,statusMessage})=>Object.assign(new Error(statusMessage),{statusCode});
globalThis.getHeader=(event,key)=>event.headers[key.toLowerCase()]??null;
globalThis.getRequestURL=(event)=>new URL(event.url);
globalThis.setResponseStatus=(event,n)=>{event.status=n};
globalThis.setHeader=(event,name,value)=>{event.out[name]=value};
globalThis.readRawBody=async event=>event.body;
const make=(fetch,headers={})=>({url:'https://public.example.invalid/',headers,
  status:null,out:{},context:{cloudflare:{env:{SMD_CORE:{fetch}}}}});
test('public artifact pin verified before build',()=>{
  assert.ok(existsSync(resolve(root,'vendor/content-contracts/RELEASE.json')));
  const pin=JSON.parse(read('vendor/content-contracts/RELEASE.json'));
  assert.equal(pin.schema,'SMD_CONTRACT_ARTIFACT_PIN_V1');
  const pkg=JSON.parse(read('package.json'));
  assert.equal(pkg.dependencies['@smd/content-contracts'],`file:./vendor/content-contracts/${pin.tarball}`);
  assert.match(pin.sha256,/^[a-f0-9]{64}$/);
});
test('no public admin pages or privileged binding; PublicSurface only',()=>{
  assert.equal(existsSync(resolve(root,'app/pages/admin')),false);
  assert.equal(existsSync(resolve(root,'server/api/admin')),false);
  const wr=read('wrangler.toml');
  // R7: exactly one public Core service binding.
  const blocks = wr.split(/^\s*\[\[services\]\]\s*$/m);
  assert.equal(blocks.length, 2, 'exactly one service block');

  const service = blocks[1].split(/^\s*\[/m, 1)[0];
  const rows = service.split(/\r?\n/)
    .map(row => row.trim())
    .filter(row => row && !row.startsWith('#'));

  assert.equal(rows.length, 3, 'no extra service keys');
  assert.match(service, /^\s*binding\s*=\s*"SMD_CORE"\s*$/m);
  assert.match(service, /^\s*service\s*=\s*"smd-core"\s*$/m);
  assert.match(service, /^\s*entrypoint\s*=\s*"PublicSurface"\s*$/m);
  assert.match(wr,/NUXT_PUBLIC_CONTENT_MODE = "standalone"/);
  const cms=read('wrangler.cms.toml');
  assert.match(cms,/entrypoint = "PublicSurface"/);
  assert.match(cms,/NUXT_PUBLIC_CONTENT_MODE = "cms"/);
  assert.doesNotMatch(cms,/AdminSurface/);
  assert.doesNotMatch(wr,/\[\[d1_databases\]\]|\[\[r2_buckets\]\]|AdminSurface/);
  assert.doesNotMatch(read('nuxt.config.ts'),/['"]\/admin(?:\/\*\*)?['"]\s*:/);
});
test('public fetch removes forged Access JWT and passes only edge-bound IP',async()=>{
  let capture=null;
  const e=make(async r=>{capture=r;return Response.json({ok:true},{status:201})},
    {'cf-access-jwt-assertion':'forged','cf-connecting-ip':'203.0.113.7'});
  const result=await original.coreRequest(e,'/v1/inquiries','POST',{name:'test'});
  assert.deepEqual(result,{ok:true});
  assert.equal(e.status,201);
  assert.equal(capture.headers.get('Cf-Access-Jwt-Assertion'),null);
  assert.equal(capture.headers.get('CF-Connecting-IP'),'203.0.113.7');
  assert.equal(await capture.text(),JSON.stringify({name:'test'}));
});
test('public adapter rejects admin path before calling Core',async()=>{
  let calls=0;
  const e=make(()=>{calls++;return Response.json({})});
  await assert.rejects(original.coreRequest(e,'/v1/admin/content','GET'),e=>e.statusCode===403);
  assert.equal(calls,0);
});
test('signed webhook forwards original bytes, signature and event exactly',async()=>{
  const body=Buffer.from('{"message": "안녕하세요"}','utf8');let capture=null;
  const e=make(async r=>{capture=r;return Response.json({status:'unmatched'})},{
    'x-smd-signature':'deadbeef','x-smd-event-id':'some-id','x-smd-timestamp':'1760000000000'});
  e.body=body;
  await original.webhookRequest(e);
  assert.equal(Buffer.compare(Buffer.from(await capture.arrayBuffer()),body),0);
  assert.equal(capture.headers.get('X-SMD-Signature'),'deadbeef');
  assert.equal(capture.headers.get('X-SMD-Event-Id'),'some-id');
});
test('bodyless Core 308 remains a raw redirect response',async()=>{
  const e=make(async()=>new Response(null,{status:308,headers:{location:'/archive/carpentry'}}));
  const response=await original.coreResponse(e,'/v3/render?path=%2Farchive%2Fcarpentry');
  assert.equal(response.status,308);
  assert.equal(response.headers.get('location'),'/archive/carpentry');
  assert.equal(await response.text(),'');
});
test('missing Cloudflare binding rejects instead of fixture',async()=>{
  const e=make(async()=>Response.json({}));e.context={};
  await assert.rejects(original.coreRequest(e,'/v1/content'),e=>e.statusCode===503);
});
test('public source has no relative sibling CMS import',()=>{
  for(const p of ['app/app.vue','server/api/render.get.ts','server/utils/render.ts'])
    assert.doesNotMatch(read(p),/\.\.\/smd-cms|from\s*['"][^'"]*\/shared\//);
});
