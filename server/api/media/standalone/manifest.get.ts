import {coreResponse} from '../../../utils/public-core';
import {sendWebResponse} from 'h3';
export default defineEventHandler(async event=>{
  const config=useRuntimeConfig(event).public;
  if(config.contentMode!=='standalone'||config.standaloneMediaMode!=='published')
    throw createError({statusCode:503,statusMessage:'STANDALONE_MEDIA_MODE_DISABLED'});
  const response=await coreResponse(event,'/v1/standalone/media/manifest');
  return sendWebResponse(event,response);
});
