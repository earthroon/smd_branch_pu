import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {figmaScene} from '../../../app/data/figma-r2-scene.generated.ts';
import {createHash} from 'node:crypto';
const root=resolve(import.meta.dirname,'../../..');
const sha=b=>createHash('sha256').update(b).digest('hex');
test('31/31 SVG assets return 200 image/svg+xml with the original SHA via static handler',async()=>{
 const server=createServer((req,res)=>{
  const url=new URL(req.url??'','http://localhost');
  const match=/^\/figma-r2\/assets\/(asset-[a-f0-9]{64})\.svg$/.exec(url.pathname);
  if(!match||!figmaScene.assets[match[1]]){res.writeHead(404).end();return;}
  res.writeHead(200,{'Content-Type':'image/svg+xml','Cache-Control':'public, max-age=3600'});
  res.end(readFileSync(join(root,'public','figma-r2','assets',`${match[1]}.svg`)));
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  const port=server.address().port;
  for(const asset of Object.values(figmaScene.assets)){
   // Node uses native fetch; no external network or credentials.
   const r=await fetch(`http://127.0.0.1:${port}${asset.src}`);
   assert.equal(r.status,200,asset.src);
   assert.match(r.headers.get('content-type')??'',/image\/svg\+xml/);
   const bytes=Buffer.from(await r.arrayBuffer());assert.equal(sha(bytes),asset.sha256);
  }
 }finally{await new Promise((resolve,reject)=>server.close(e=>e?reject(e):resolve()))}
});
