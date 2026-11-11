/** SMD-CURRICULUM-WEEK-R1: static Figma navigation identity and future CMS slots.
 * This is a Public-side candidate schema; Core 0.7.0 cannot publish it yet.
 * The PSD-generated files and source layer keys are never rewritten here.
 */
import type { CmsRootNode } from '@smd/content-contracts/page-slot-contracts';
import type { CurriculumTextId, CurriculumShapeId } from './curriculum-r1-types.ts';

export const CURRICULUM_WEEK_PROGRAM_SCHEMA = 'SMD_CURRICULUM_WEEK_PROGRAM_V1' as const;
export type CurriculumWeekId =
  | 'week-01' | 'week-02' | 'week-03'
  | 'week-04' | 'week-05' | 'week-06';

export type CurriculumWeekSourceEntry = Readonly<{
  id: CurriculumWeekId;
  week: number;
  shape: CurriculumShapeId;
  label: CurriculumTextId;
  title: CurriculumTextId;
}>;

export const CURRICULUM_WEEK_SOURCE_ENTRIES: readonly CurriculumWeekSourceEntry[] = Object.freeze([
  { id:'week-01',week:1,shape:'72',label:'153',title:'154' },
  { id:'week-02',week:2,shape:'73',label:'389',title:'390' },
  { id:'week-03',week:3,shape:'74',label:'391',title:'392' },
  { id:'week-04',week:4,shape:'75',label:'393',title:'394' },
  { id:'week-05',week:5,shape:'76',label:'395',title:'396' },
  { id:'week-06',week:6,shape:'388',label:'397',title:'398' },
]);

export type CurriculumWeekDetailSlotV1 =
  | Readonly<{ status:'unassigned' }>
  | Readonly<{
      status:'ready';
      eyebrow:string;
      heading:string;
      description:string;
      items:readonly string[];
    }>;
export type CurriculumWeekMediaSlotV1 = Readonly<{
  assetId:string;
  alt:string;
  title:string;
  displayMode:'natural'|'contain';
}>;
export type CurriculumWeekEntryV1 = Readonly<{
  id:CurriculumWeekId;
  navigation:Readonly<{label:string;title:string}>;
  slots:Readonly<{
    detail:CurriculumWeekDetailSlotV1;
    media:CurriculumWeekMediaSlotV1|null;
    extensions:readonly CmsRootNode[];
  }>;
}>;

/** Future Core PublicSurface field: `curriculumWeekProgram`.
 * Publication identity is repeated for fail-closed admission of mixed snapshots.
 */
export type CurriculumWeekProgramV1 = Readonly<{
  schema:typeof CURRICULUM_WEEK_PROGRAM_SCHEMA;
  publicationId:string;
  publicationDigest:string;
  weeks:readonly CurriculumWeekEntryV1[];
}>;

export type CurriculumWeekApprovedMedia = CurriculumWeekMediaSlotV1 & Readonly<{
  src:string;
  width:number;
  height:number;
}>;
export type CurriculumWeekPublishedEntry = Omit<CurriculumWeekEntryV1,'slots'> & Readonly<{
  slots:Omit<CurriculumWeekEntryV1['slots'],'media'> & Readonly<{
    media:CurriculumWeekApprovedMedia|null;
  }>;
}>;
export type CurriculumWeekPublishedProgram = Readonly<{
  schema:typeof CURRICULUM_WEEK_PROGRAM_SCHEMA;
  publicationId:string;
  publicationDigest:string;
  weeks:readonly CurriculumWeekPublishedEntry[];
}>;
