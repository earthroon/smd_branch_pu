import {coreMediaResponse} from '../../../../utils/public-core';
import {sendWebResponse} from 'h3';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const asset=/^sm_[a-f0-9]{64}$/;
export default defineEventHandler(async event=>{
  if(useRuntimeConfig(event).public.contentMode!=='standalone'||
     useRuntimeConfig(event).public.standaloneMediaMode!=='published')
    throw createError({statusCode:503,statusMessage:'STANDALONE_MEDIA_MODE_DISABLED'});
  const publicationId=getRouterParam(event,'publicationId')??'';
  const assetId=getRouterParam(event,'assetId')??'';
  if(!uuid.test(publicationId)||!asset.test(assetId))
    throw createError({statusCode:404,statusMessage:'STANDALONE_MEDIA_ID_INVALID'});
  const response=await coreMediaResponse(event,`/v1/standalone/media/${publicationId}/${assetId}`,'GET');
  return sendWebResponse(event,response);
});
