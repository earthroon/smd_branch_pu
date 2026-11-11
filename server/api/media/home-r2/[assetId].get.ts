import {coreMediaResponse} from '../../../utils/public-core';
import {sendWebResponse} from 'h3';
export default defineEventHandler(async event=>{
  const assetId=getRouterParam(event,'assetId')??'';
  if(!/^sm_[a-f0-9]{64}$/.test(assetId))
    throw createError({statusCode:404,statusMessage:'SMD_HOME_M4_MEDIA_ID_INVALID'});
  // No fallback to old V5 routes; Core must verify the ACTIVE V6 snapshot.
  const response=await coreMediaResponse(event,`/v6/media/home-r2/${assetId}`,'GET');
  return sendWebResponse(event,response);
});
