import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFileSync(resolve(root,p),'utf8');
const utility='server/utils/public-core.ts';
const src=read(utility);
for(const needle of ['coreMediaResponse','HEAD:[','v5','if-none-match','PUBLIC_MEDIA_ROUTE_NOT_ADMITTED'])
  if(!src.includes(needle))throw new Error('CF4_BFF_SOURCE_DRIFT:'+needle);
for(const method of ['get','head']){
  const file=`server/api/media/image/[assetId].${method}.ts`;
  if(!existsSync(resolve(root,file)))throw new Error('CF4_ROUTE_MISSING:'+file);
  const code=read(file);
  if(!code.includes(`'${method.toUpperCase()}'`)||!code.includes('sendWebResponse(event,response)'))
    throw new Error('CF4_ROUTE_SEMANTICS_DRIFT:'+file);
  const spec=code.match(/from\s+['"](\.\.\/[^'"]+)['"]/);
  if(!spec||relative(resolve(root,'server/utils/public-core'),resolve(root,'server/api/media/image',spec[1]))!=='' )
    throw new Error('CF4_ROUTE_IMPORT_DRIFT:'+file);
}
if(!read('server/api/archive/media/[file].get.ts').includes('/v4/archive/media/'))
  throw new Error('CF4_ARCHIVE_ROUTE_DRIFT');
console.log('PASS_SMD_SITE_MEDIA_R1_CF4_PUBLIC_STATIC');
