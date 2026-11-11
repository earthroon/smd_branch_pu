/** CF1 immutable evidence lock. SHA-256 values observed from the supplied files, NOT a runtime
 * claim of physical Figma/PSD parity or publication. */
export type ReviewsVisualSourceLockV1 = Readonly<{
  contract: 'SMD_REVIEWS_VISUAL_SOURCE_LOCK_V1';
  publicZipSha256: string;
  psdSha256: string;
  reviewZipSha256: string;
  figmaSourceLedgerSha256: string;
  figmaJsonlSha256: string;
  figmaSnapshotDigest: string;
  figmaSourceWitnessDigest: string;
  visualRenderPlanDigest: string;
  rootNode: 'node-4:200';
  viewport: readonly [1920,3033];
  sourceNodeCount: 177;
  pixelParity: 'NOT_RUN';
  productCommitAllowed: false;
}>;

export const reviewsVisualSourceLock = {
  contract: 'SMD_REVIEWS_VISUAL_SOURCE_LOCK_V1',
  publicZipSha256: 'feb1a42ce066a331223c4d4ac80e2ca40af2c0739d3b71f860a173b59005cc95',
  psdSha256: 'c9b03dbab426f9c83589d24a48c7418b581ce799544b4e45a5dfde9f4d9c57e2',
  reviewZipSha256: '17562f0139469bfd71f5b4294d87a140640798e2291d86143054ccd9dea9a558',
  figmaSourceLedgerSha256: '651b221bb103b6ef8c6cb0977a813b826727573ac96b36b9f77de19fb699fe6d',
  figmaJsonlSha256: '58dd2ec218804a3b46373045149dce97f87f8dbe1de054410851998cf72575c9',
  figmaSnapshotDigest: '1d7aae8a8e999cdc55e5b027f3254aac33777866e59c209ceb5196deb9f5a7fb',
  figmaSourceWitnessDigest: '619e99fe8e0b979fe72bc086ccccfe677b285035f0be4baa3dd17c5073b43d44',
  visualRenderPlanDigest: '016f83f48406bf8c87e4a31a80a484706d9ae7a56d35a50e9921eff8c11ca39b',
  rootNode: 'node-4:200',
  viewport: [1920, 3033],
  sourceNodeCount: 177,
  pixelParity: 'NOT_RUN',
  productCommitAllowed: false,
} as const satisfies ReviewsVisualSourceLockV1;

/** CSS authority is the current Public global source, not Figma-derived replacement CSS. */
export const reviewsTokenSource = {
  brandNavy: { cssVariable: '--smd-brand-navy', source: 'app/assets/css/main.css', value: '#172C57' },
  actionOrange: { cssVariable: '--smd-action-orange', source: 'app/assets/css/main.css', value: '#D95E22' },
  panelSurface: { cssVariable: '--smd-surface-panel', source: 'app/assets/css/main.css', value: '#F2F6FF' },
  fontUi: { cssVariable: '--font-ui', source: 'app/assets/css/main.css', family: 'Pretendard Variable' },
  headerHeight: { cssVariable: '--smd-header-height', source: 'app/assets/css/home-r2-header.css', basePx: 80, desktopFrom1380Px: 93.75, mobileBelow600Px: 76 },
  contentMaxWidth: { configFile: 'tailwind.config.ts', key: 'maxWidth.content', px: 1280 },
  proposedReviewsInnerWidthPx: 1046,
} as const;

/** Observation does not promote blocked paints into executable assets. */
export const reviewsVisualQualification = {
  sourceNodeCount: 177,
  rejectedCandidateCount: 9,
  pixelParity: 'NOT_RUN',
  productCommitAllowed: false,
  knownConflicts: ['header-guide-134.28125-vs-runtime-80-or-93.75', 'native-text-auto-lineheight',
    'inactive-filter-stroke-execution-blocked', 'card-outline-paint-blocked',
    'hero-heading-source-paint-unobserved'],
} as const;
