import type { PublicContentV2, PublicContentV4, PublicContentV5 } from '@smd/content-contracts/contracts';
import type { SelectedPublicPageState } from '../composables/useSelectedCategoryPage.ts';
import type { CurriculumOperationalState } from '../data/curriculum-r1-types.ts';
import { resolvePublicConsultationKakaoUrl } from './publicConsultationKakaoUrl.ts';
import { admitCurriculumWeekProgram } from './curriculumWeekProgramAdmission.ts';
export function resolveCurriculumOperationalState(c: PublicContentV2 | PublicContentV4 | PublicContentV5 | null,
  s: SelectedPublicPageState | null, path: string,
  mode: 'standalone' | 'cms' = 'cms',
): CurriculumOperationalState | null {
  if (path !== '/curriculum' || !c || !s || s.path !== path || s.selected.mode !== 'legacy' ||
      s.selected.pageId !== 'curriculum' || s.publicationId !== c.publication.id || s.publicationDigest !== c.publication.digest) return null;
  // Contract 0.7.0 has no week-program projection. An absent field preserves
  // the frozen 1st-week PSD source; a present but invalid field fails closed.
  const projected=c as typeof c & {curriculumWeekProgram?:unknown};
  const weekProgram = 'curriculumWeekProgram' in c
    ? admitCurriculumWeekProgram(projected.curriculumWeekProgram,c.publication,
        'siteMedia' in c ? c.siteMedia : null)
    : null;
  return { weekProgram, publicationKey: c.publication.id+':'+c.publication.digest,
    consultationUrl: resolvePublicConsultationKakaoUrl(c, mode),
    afterTeach:c.pageSlots.curriculum.afterTeach??[],afterLearningPath:c.pageSlots.curriculum.afterLearningPath??[],beforeCta:c.pageSlots.curriculum.beforeCta??[] };
}
