import { coreRequest, sameOrigin } from '../../utils/public-core';
import type { BotAnswer } from '@smd/content-contracts/contracts';
export default defineEventHandler(async (event):Promise<BotAnswer> => {
  sameOrigin(event);
  return await coreRequest<BotAnswer>(event,'/v1/bot/ask','POST',await readBody(event));
});
