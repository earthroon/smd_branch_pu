/** SMD_HOME_MEDIA_SLOT_R1 · source and file witness for local manual paths. */
import {existsSync,readFileSync,statSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {assertHomeLocalMediaRegistry,resolveHomeLocalMedia} from '../app/utils/homeLocalMedia.ts';
import {homeLocalMediaSlots,homeHeroLocalMediaSlots} from '../app/data/home-local-media.ts';
import {assertHomeHeroLocalMediaRegistry,resolveHomeHeroLocalMedia} from '../app/utils/homeHeroLocalMedia.ts';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
assertHomeLocalMediaRegistry();
assertHomeHeroLocalMediaRegistry();
let active=0;
for(const slotId of [...Object.keys(homeLocalMediaSlots),...Object.keys(homeHeroLocalMediaSlots)]){
  const item=slotId.startsWith('hero-')?resolveHomeHeroLocalMedia(slotId):resolveHomeLocalMedia(slotId);
  if(!item)continue;
  const file=join(root,'public',item.src.slice(1));
  if(!existsSync(file)||!statSync(file).isFile())
    throw new Error(`SMD_HOME_LOCAL_MEDIA_FILE_MISSING:${slotId}:${item.src}`);
  const bytes=readFileSync(file);
  if(bytes.length===0)throw new Error(`SMD_HOME_LOCAL_MEDIA_FILE_EMPTY:${slotId}`);
  const ext=item.src.split('.').at(-1).toLowerCase();
  switch(ext){
    case 'png': {
      if(bytes.length<24||bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||
         bytes.readUInt32BE(16)!==item.width||bytes.readUInt32BE(20)!==item.height)
        throw new Error(`SMD_HOME_LOCAL_MEDIA_PNG_DIMENSION_DRIFT:${slotId}`);
      break;
    }
    case 'jpg':case 'jpeg': {
      if(bytes.length<3||bytes[0]!==0xff||bytes[1]!==0xd8||bytes[2]!==0xff)
        throw new Error(`SMD_HOME_LOCAL_MEDIA_JPEG_INVALID:${slotId}`);
      break;
    }
    case 'webp': {
      if(bytes.length<12||bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,12)!=='WEBP')
        throw new Error(`SMD_HOME_LOCAL_MEDIA_WEBP_INVALID:${slotId}`);
      break;
    }
    default:throw new Error(`SMD_HOME_LOCAL_MEDIA_EXTENSION_INVALID:${slotId}`);
  }
  active++;
}
console.log('PASS_SMD_HOME_MEDIA_SLOT_R2',JSON.stringify({totalSlots:Object.keys(homeLocalMediaSlots).length+Object.keys(homeHeroLocalMediaSlots).length,heroSlots:Object.keys(homeHeroLocalMediaSlots).length,localActive:active,publishedOrCms:'unchanged'}));
