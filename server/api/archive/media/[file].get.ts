import {coreResponse} from '../../../utils/public-core';
import {sendWebResponse} from 'h3';
export default defineEventHandler(async event=>{
  const file=getRouterParam(event,'file')??'';
  if(!/^[a-f0-9]{64}\.(?:webp|png|jpe?g)$/.test(file))
    throw createError({statusCode:404,statusMessage:'ARCHIVE_MEDIA_KEY_INVALID'});
  const response=await coreResponse(event,`/v4/archive/media/${file}`);
  return sendWebResponse(event,response);
});
