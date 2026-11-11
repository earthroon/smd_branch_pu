import type { PublicContentV2, PublicContentV4, PublicContentV5 } from '@smd/content-contracts/contracts';
import type { SelectedPublicPageState } from '../composables/useSelectedCategoryPage.ts';
import type { AboutOperationalState } from '../data/about-r1-types.ts';
import { resolvePublicConsultationKakaoUrl } from './publicConsultationKakaoUrl.ts';
/** Only current, server-validated operational state is consumed by the PSD body. */
export function resolveAboutOperationalState(
  c: PublicContentV2 | PublicContentV4 | PublicContentV5 | null,
  s: SelectedPublicPageState | null, path: string,
  mode: 'standalone' | 'cms' = 'cms',
): AboutOperationalState | null {
  if (path !== '/about' || !c || !s || s.path !== '/about' ||
      s.selected.mode !== 'legacy' || s.selected.pageId !== 'about' ||
      s.publicationId !== c.publication.id || s.publicationDigest !== c.publication.digest) return null;
  return { publicationKey: c.publication.id + ':' + c.publication.digest,
    consultationUrl: resolvePublicConsultationKakaoUrl(c, mode),
    afterAudience: c.pageSlots.about.afterPillars ?? [], beforeCta: c.pageSlots.about.beforeCta ?? [] };
}
