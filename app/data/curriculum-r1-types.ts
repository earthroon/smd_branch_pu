import type { curriculumSourceText } from './curriculum-r1-copy.generated.ts';
import type { curriculumSourceAssets } from './curriculum-r1-assets.generated.ts';
import type { curriculumSourceShapes } from './curriculum-r1-shapes.generated.ts';
import type { curriculumR1Source } from './curriculum-r1-manifest.ts';
import type { CmsRootNode } from '@smd/content-contracts/page-slot-contracts';
import type { CurriculumWeekPublishedProgram } from './curriculum-week-program.ts';
export type CurriculumTextId = keyof typeof curriculumSourceText;
export type CurriculumPhotoId = keyof typeof curriculumSourceAssets.photos;
export type CurriculumShapeId = keyof typeof curriculumSourceShapes;
export type CurriculumSectionId = typeof curriculumR1Source.sections[number]['id'];
export type CurriculumOperationalState = Readonly<{
  publicationKey: string; consultationUrl: string | null;
  weekProgram: CurriculumWeekPublishedProgram | null;
  afterTeach: readonly CmsRootNode[]; afterLearningPath: readonly CmsRootNode[]; beforeCta: readonly CmsRootNode[];
}>;
