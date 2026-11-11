import { webhookRequest } from '../../utils/public-core';
import type { BotAnswer } from '@smd/content-contracts/contracts';
// External signed webhook: signature and replay checks belong to smd-core.
export default defineEventHandler(async (event):Promise<BotAnswer> => await webhookRequest<BotAnswer>(event));
