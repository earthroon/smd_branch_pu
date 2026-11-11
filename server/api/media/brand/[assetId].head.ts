import {coreMediaResponse} from '../../../utils/public-core';
import {sendWebResponse} from 'h3';
export default defineEventHandler(async event=>{
  const id=getRouterParam(event,'assetId')??'';
  if(!/^sb_[a-f0-9]{64}$/.test(id))throw createError({statusCode:404,statusMessage:'SITE_BRAND_ID_INVALID'});
  return sendWebResponse(event,await coreMediaResponse(event,`/v5/media/brand/${id}`,'HEAD'));
});
