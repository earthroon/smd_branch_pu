/** Explicit temporary Public-only view. Never a CMS publication or Core fallback. */
import seed from '@smd/content-contracts/seed-content.json';
import pages from '../../fixtures/page-copy.source.json';
import type { PublicContentV2 } from '@smd/content-contracts/contracts';
import { validatePageCopyV1 } from '@smd/content-contracts/page-copy-contracts';
import { publicSlots } from '@smd/content-contracts/page-slot-contracts';
import { LEGACY_CANONICAL_PATHS, LEGACY_SEO_TITLES } from '@smd/content-contracts/category-page-contracts';
import { LEGACY_PAGE_IDS } from '@smd/content-contracts/cms-kind-registry';
import type { SelectedPublicPageState } from '../composables/useSelectedCategoryPage';

import { STANDALONE_PREVIEW_PUBLICATION_ID } from './publicExternalActionPolicy';
export { STANDALONE_PREVIEW_PUBLICATION_ID } from './publicExternalActionPolicy';

/** Only existing, concrete Public pages are admitted. CMS-only category routes remain closed. */
export function standalonePreviewPathAllowed(path: string): boolean {
  return LEGACY_PAGE_IDS.some(page => LEGACY_CANONICAL_PATHS[page] === path) ||
    path === '/reviews' || path === '/faq';
}

/** Source-backed display data, distinctly marked as UNPUBLISHED. No remote content is invented. */
export function standalonePreviewContent(): PublicContentV2 {
  const enrollmentStatus = seed.promotion.enrollmentStatus;
  switch (enrollmentStatus) {
    case 'draft':
    case 'open':
    case 'closed': break;
    default: throw new Error('PUBLIC_STANDALONE_PREVIEW_SEED_STATUS_INVALID');
  }
  const sourcePages = validatePageCopyV1(pages);
  return {
    ...seed,
    promotion: { ...seed.promotion, enrollmentStatus },
    pages: sourcePages,
    pageSlots: publicSlots(sourcePages),
    publication: {
      id: STANDALONE_PREVIEW_PUBLICATION_ID,
      revision: 0,
      at: '1970-01-01T00:00:00.000Z',
      digest: 'STANDALONE_PREVIEW_NO_CMS_DIGEST',
    },
  };
}

/** Legacy components retain their existing route identity checks without a fake CMS publish. */
export function standalonePreviewSelected(
  path: string, content: PublicContentV2,
): SelectedPublicPageState | null {
  const pageId = LEGACY_PAGE_IDS.find(page => LEGACY_CANONICAL_PATHS[page] === path);
  switch (pageId) {
    case undefined: return null;
    default: return {
      path,
      publicationId: content.publication.id,
      publicationDigest: content.publication.digest,
      selected: {
        mode: 'legacy',
        pageId,
        templateKind: `legacy-${pageId}-v1`,
        seo: {
          title: LEGACY_SEO_TITLES[pageId],
          description: 'SMD 아카데미 임시 독립 프리뷰. CMS 발행 콘텐츠가 아닙니다.',
          noindex: true,
        },
        slots: {},
      },
    };
  }
}
