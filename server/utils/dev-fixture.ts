/** Development-only fixture. Never a production publication fallback. */
import seed from '@smd/content-contracts/seed-content.json';
import pages from '../../fixtures/page-copy.source.json';
import type {PublicContentV2} from '@smd/content-contracts/contracts';
import {validatePageCopyV1} from '@smd/content-contracts/page-copy-contracts';
import {publicSlots} from '@smd/content-contracts/page-slot-contracts';

export function devFixtureContent():PublicContentV2 {
  if(!import.meta.dev)
    throw new Error('DEV_FIXTURE_PRODUCTION_FORBIDDEN');

  const status=seed.promotion.enrollmentStatus;
  if(status!=='draft' && status!=='open' && status!=='closed')
    throw new Error('DEV_FIXTURE_ENROLLMENT_STATUS_INVALID');

  const checkedPages=validatePageCopyV1(pages);

  return {
    ...seed,
    promotion:{...seed.promotion,enrollmentStatus:status},
    pages:checkedPages,
    pageSlots:publicSlots(checkedPages),
    publication:{
      id:'DEV_FIXTURE_ONLY',
      revision:0,
      at:'1970-01-01T00:00:00.000Z',
      digest:'DEV_FIXTURE_NOT_PUBLISHED'
    }
  };
}
