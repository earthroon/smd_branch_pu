/** SMD_R7_CF3_SHEET_PLAN_V1
 * Presentation-only. Original Figma/PSD source and CMS publication remain authoritative.
 * Pure module so its invariants can be tested with Node's TS stripping.
 */
export const CATALOGUE_R7_SHEET_CONTRACT = 'SMD_R7_CF3_SHEET_V1' as const;
export const CATALOGUE_R7_HOME_SOURCE_DIGEST =
  '5e877e46cc1bad3e7985a553163120c59c9b9d0f731a66d575e781fa5c60146f' as const;

export type CatalogueR7PageId =
  | 'home' | 'about' | 'curriculum' | 'archive' | 'reviews' | 'faq'
  | 'contact' | 'practice' | 'promotion' | 'videos';
export type CatalogueR7Variant =
  | 'standard' | 'spread' | 'quartet' | 'triptych' | 'technical'
  | 'faq' | 'closing';
export type CatalogueR7Fit = 'viewport' | 'flow';
export type CatalogueR7SheetProps = Readonly<{
  pageId: CatalogueR7PageId;
  sectionId: string;
  ordinal: number;
  total: number;
  variant: CatalogueR7Variant;
  fit: CatalogueR7Fit;
  headingId: string;
  label: string;
}>;

export const CATALOGUE_R7_HOME_SECTION_IDS = [
  'hero', 'info-bar', 'special-start', 'training-track',
  'benefits', 'methods', 'location', 'faq', 'consultation-cta',
] as const;
export type CatalogueR7HomeSectionId = typeof CATALOGUE_R7_HOME_SECTION_IDS[number];

type HomePlanEntry = Readonly<{
  sectionId: CatalogueR7HomeSectionId;
  ordinal: number;
  variant: CatalogueR7Variant;
  fit: CatalogueR7Fit;
  mediaSlotIds: readonly string[];
  activation: 'CF3_PROOF' | 'LATER';
}>;
/** All product pages stay on their existing renderers. These are plan records only. */
export const CATALOGUE_R7_HOME_PLAN = [
  {sectionId:'hero', ordinal:1, variant:'standard', fit:'flow', mediaSlotIds:[], activation:'LATER'},
  {sectionId:'info-bar', ordinal:2, variant:'technical', fit:'flow', mediaSlotIds:[], activation:'LATER'},
  {sectionId:'special-start', ordinal:3, variant:'spread', fit:'flow',
    mediaSlotIds:['home.special-start.photo'], activation:'CF3_PROOF'},
  {sectionId:'training-track', ordinal:4, variant:'technical', fit:'flow', mediaSlotIds:[], activation:'LATER'},
  {sectionId:'benefits', ordinal:5, variant:'quartet', fit:'flow',
    mediaSlotIds:['home.benefits.01.image','home.benefits.02.image',
      'home.benefits.03.image','home.benefits.04.image'], activation:'CF3_PROOF'},
  {sectionId:'methods', ordinal:6, variant:'triptych', fit:'flow',
    mediaSlotIds:['home.methods.01.image','home.methods.02.image','home.methods.03.image'], activation:'LATER'},
  {sectionId:'location', ordinal:7, variant:'spread', fit:'flow', mediaSlotIds:[], activation:'LATER'},
  {sectionId:'faq', ordinal:8, variant:'faq', fit:'flow', mediaSlotIds:[], activation:'LATER'},
  {sectionId:'consultation-cta', ordinal:9, variant:'closing', fit:'flow', mediaSlotIds:[], activation:'LATER'},
] as const satisfies readonly HomePlanEntry[];

function fail(code: string, detail: string): never {
  throw new Error(`${code}: ${detail}`);
}

export function assertCatalogueR7SheetProps(value: CatalogueR7SheetProps): true {
  const pages: readonly string[] = [
    'home','about','curriculum','archive','reviews','faq',
    'contact','practice','promotion','videos',
  ];
  const variants: readonly string[] = [
    'standard','spread','quartet','triptych','technical','faq','closing',
  ];
  switch (true) {
    case !pages.includes(value.pageId):
    case typeof value.sectionId !== 'string':
    case !/^[a-z][a-z0-9-]*$/.test(value.sectionId):
    case !Number.isSafeInteger(value.ordinal):
    case !Number.isSafeInteger(value.total):
    case value.ordinal < 1:
    case value.total < 1:
    case value.ordinal > value.total:
    case !variants.includes(value.variant):
    case value.fit !== 'viewport' && value.fit !== 'flow':
    case typeof value.headingId !== 'string':
    case !/^[A-Za-z][A-Za-z0-9_:.-]*$/.test(value.headingId):
    case typeof value.label !== 'string':
    case value.label.trim() === '':
    case value.label.length > 96:
      return fail('R7_CF3_SHEET_PLAN_INVALID','sheet props');
    default:
      return true;
  }
}

export type CatalogueR7SourceSection = Readonly<{
  id: string;
  visualIndex: number;
  mediaSlotRefs: readonly string[];
}>;
export function assertCatalogueR7HomePlan(
  sourceDigest: string,
  sections: readonly CatalogueR7SourceSection[],
  approvedMediaIds: readonly string[],
): true {
  if (sourceDigest !== CATALOGUE_R7_HOME_SOURCE_DIGEST ||
      sections.length !== CATALOGUE_R7_HOME_PLAN.length) {
    return fail('R7_CF3_SHEET_PLAN_INVALID','source digest or section count');
  }
  const observedIds = new Set<string>();
  for (const [i, planned] of CATALOGUE_R7_HOME_PLAN.entries()) {
    const original = sections[i];
    if (!original || original.id !== planned.sectionId ||
        original.visualIndex !== i || planned.ordinal !== i + 1 ||
        observedIds.has(original.id)) {
      return fail('R7_CF3_SHEET_PLAN_INVALID',`section ${i}`);
    }
    observedIds.add(original.id);
    if (original.mediaSlotRefs.length !== planned.mediaSlotIds.length ||
        original.mediaSlotRefs.some((slot, n) => slot !== planned.mediaSlotIds[n])) {
      return fail('R7_CF3_SOURCE_SLOT_DRIFT',original.id);
    }
    for (const slot of planned.mediaSlotIds) {
      if (!approvedMediaIds.includes(slot)) {
        return fail('R7_CF3_SOURCE_SLOT_DRIFT',slot);
      }
    }
  }
  if (new Set(approvedMediaIds).size !== approvedMediaIds.length) {
    return fail('R7_CF3_SOURCE_SLOT_DRIFT','duplicate media id');
  }
  return true;
}

export function assertCatalogueR7HomeMediaSlot(
  slotId: string,
  approvedMediaIds: readonly string[],
): true {
  switch (approvedMediaIds.includes(slotId)) {
    case true: return true;
    default: return fail('R7_CF3_SOURCE_SLOT_DRIFT',slotId);
  }
}
