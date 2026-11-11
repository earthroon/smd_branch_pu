import {coreResponse} from '../../utils/public-core';
import {sendWebResponse} from 'h3';
export default defineEventHandler(async event=>sendWebResponse(event,
  await coreResponse(event,'/v5/brand/current')));
