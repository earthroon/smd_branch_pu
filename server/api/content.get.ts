import { coreRequest, coreBindingAvailable } from '../utils/public-core';
import type { PublicContentV2 } from '@smd/content-contracts/contracts';
import { devFixtureContent } from '../utils/dev-fixture';

export default defineEventHandler(async (event):Promise<PublicContentV2> => {
  if (import.meta.dev && process.env.SMD_DEV_FIXTURE_ONLY==='1' && !coreBindingAvailable(event)) {
    setHeader(event,'x-content-authority','DEV_FIXTURE_ONLY');
    return devFixtureContent();
  }
  return await coreRequest<PublicContentV2>(event,'/v2/content');
});
