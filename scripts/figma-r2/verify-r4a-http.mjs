/** R4A local runtime observer: make no changes to the Public page. */
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,join} from 'node:path';
const url=process.argv[2]||'http://127.0.0.1:3129/';
if(!/^http:\/\/(?:127\.0\.0\.1|localhost):\d+\/$/.test(url)) throw Error('R4A_LOCAL_URL_ONLY');
const root=resolve(import.meta.dirname,'../..');
const original=readFileSync(join(root,'public/figma-r2/user/file-01.svg'));
const variant=readFileSync(join(root,'public/figma-r2/user/file-01-optical-r4a.svg'));
const hash=x=>createHash('sha256').update(x).digest('hex');
for(const [path,bytes] of [['file-01.svg',original],['file-01-optical-r4a.svg',variant]]){
 const response=await fetch(new URL('/figma-r2/user/'+path,url));
 if(response.status!==200)throw Error('R4A_HTTP_STATUS '+path+' '+response.status);
 if(!(response.headers.get('content-type')??'').includes('image/svg+xml'))throw Error('R4A_WRONG_MIME '+path);
 const remote=Buffer.from(await response.arrayBuffer());
 if(hash(remote)!==hash(bytes))throw Error('R4A_HTTP_SHA_MISMATCH '+path);
 console.log('R4A_SVG_HTTP_PASS '+path+' '+hash(remote));
}
console.log('R4A_HTTP_BYTES_PASS; image position/scale and browser visual must be checked using existing R4 viewer and 1920px screenshot');
