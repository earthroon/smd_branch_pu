import {coreMediaResponse} from '../../../utils/public-core';
import {sendWebResponse} from 'h3';
export default defineEventHandler(async event=>{
  const assetId=getRouterParam(event,'assetId')??'';
  if(!/^sm_[a-f0-9]{64}$/.test(assetId))
    throw createError({statusCode:404,statusMessage:'SITE_MEDIA_ASSET_ID_INVALID'});
  const response=await coreMediaResponse(event,`/v5/media/image/${assetId}`,'GET');
  return sendWebResponse(event,response);
});
