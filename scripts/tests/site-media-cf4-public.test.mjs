import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {coreMediaResponse} from '../../server/utils/public-core.ts';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const read=p=>readFileSync(resolve(root,p),'utf8');
const id='sm_'+'a'.repeat(64);
globalThis.createError=({statusCode,statusMessage})=>Object.assign(new Error(statusMessage),{statusCode});
globalThis.getHeader=(event,name)=>event.headers?.[name.toLowerCase()]??null;
const event=(fetch,headers={})=>({headers,context:{cloudflare:{env:{SMD_CORE:{fetch}}}}});

test('CF4 Public BFF GET forwards bytes and ETag; never forwards Admin JWT',async()=>{
  const bytes=new Uint8Array([1,0,255,16]);let forwarded=null;
  const e=event(async request=>{forwarded=request;return new Response(bytes,{headers:{'content-type':'image/png','etag':'"etag"','cache-control':'no-store'}})},
    {'cf-access-jwt-assertion':'forged','cookie':'secret','authorization':'Bearer forged','if-none-match':'"etag"'});
  const result=await coreMediaResponse(e,`/v5/media/image/${id}`,'GET');
  assert.equal(forwarded.method,'GET');
  assert.equal(forwarded.headers.get('if-none-match'),'"etag"');
  assert.equal(forwarded.headers.get('cf-access-jwt-assertion'),null);
  assert.equal(forwarded.headers.get('cookie'),null);
  assert.equal(forwarded.headers.get('authorization'),null);
  assert.deepEqual(new Uint8Array(await result.arrayBuffer()),bytes);
  assert.equal(result.headers.get('etag'),'"etag"');
});

test('CF4 HEAD remains HEAD and bodyless; 304 is preserved',async()=>{
  let method=null;
  const e=event(async request=>{method=request.method;return new Response(null,{status:304,headers:{etag:'"etag"'}})});
  const result=await coreMediaResponse(e,`/v5/media/image/${id}`,'HEAD');
  assert.equal(method,'HEAD');assert.equal(result.status,304);assert.equal(result.body,null);
});

test('CF4 BFF rejects unauthorized route without calling Core',async()=>{
  let calls=0;
  const e=event(async()=>{calls++;return new Response('bad')});
  for(const path of ['/v1/admin/site-media/assets','/v5/media/image/sm_bad',
    `/v5/media/image/${id}/..`,`/v5/media/image/${id}?page=1`]){
    await assert.rejects(()=>coreMediaResponse(e,path,'GET'),e=>e.statusCode===403);
  }
  assert.equal(calls,0);
});

test('CF4 route filenames resolve exactly to public-core and no legacy route overwritten',()=>{
  for(const method of ['get','head']){
    const f=`server/api/media/image/[assetId].${method}.ts`;
    const src=read(f);
    assert.match(src,/from '\.\.\/\.\.\/\.\.\/utils\/public-core'/);
    assert.match(src,/sendWebResponse\(event,response\)/);
  }
  assert.match(read('server/api/archive/media/[file].get.ts'),/\/v4\/archive\/media/);
  assert.match(read('server/utils/public-core.ts'),/HEAD:\[/);
});
