/** CF2 Standalone-local source. There are NO approved testimonials in the supplied PSD/Figma ZIP.
 * CMS Publication and gallery records are deliberately not imported. */
import type { ReviewCollectionV1 } from '../utils/reviews-contract.ts';

export const standaloneReviewsR1Source = {
  contract: 'SMD_REVIEW_COLLECTION_V1',
  schemaVersion: 1,
  sourceRevision: 'standalone-empty-r1',
  sourceDigest: '2442f7ff7d05d18d88e077bf34e0104f3a9d1fd05720b92286a7b18d51df2898',
  entries: [],
} as const satisfies ReviewCollectionV1;
