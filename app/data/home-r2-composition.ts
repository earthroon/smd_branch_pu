import type { HomeFigmaTextKey } from './home-r2-copy';
import { homeBodySections, homeR2Source } from './home-r2-manifest';

// Explicit text ownership is required for source nodes with overlapping Figma paint.
// The unconsumed duplicate source Text nodes remain in CF1, never removed from its freeze.
const textRef = <T extends HomeFigmaTextKey>(key: T): T => key;
export const homeCopyRefs = {
  hero: {
    eyebrow: textRef('node-36:6'),
    heading: textRef('node-35:5'),
    introduction: textRef('node-36:7'),
  },
  infoBar: [
    { label: textRef('node-1:156'), value: textRef('node-1:155') },
    { label: textRef('node-1:402'), value: textRef('node-1:401') },
    { label: textRef('node-1:406'), value: textRef('node-1:405') },
    { label: textRef('node-18:60'), value: textRef('node-18:59') },
  ],
  specialStart: {
    title: textRef('node-1:133'),
    photo: 'home.special-start.photo',
    points: [
      { numeral: textRef('node-1:132'), text: textRef('node-18:120') },
      { numeral: textRef('node-1:130'), text: textRef('node-18:121') },
      { numeral: textRef('node-1:128'), text: textRef('node-18:122') },
    ],
  },
  training: {
    title: textRef('node-1:103'),
    description: textRef('node-1:104'),
    facts: [
      { label: textRef('node-1:102'), value: textRef('node-1:101') },
      { label: textRef('node-1:479'), value: textRef('node-1:478') },
      { label: textRef('node-1:484'), value: textRef('node-1:483') },
    ],
    morning: { label: textRef('node-1:492'), work: textRef('node-1:493') },
    afternoon: { label: textRef('node-1:498'), work: textRef('node-1:494') },
  },
  benefits: {
    title: textRef('node-1:92'),
    cards: [
      { numeral: textRef('node-1:88'), title: textRef('node-1:576'), description: textRef('node-1:578'), slot: 'home.benefits.01.image' },
      { numeral: textRef('node-18:147'), title: textRef('node-18:148'), description: textRef('node-18:149'), slot: 'home.benefits.02.image' },
      { numeral: textRef('node-18:128'), title: textRef('node-18:150'), description: textRef('node-18:151'), slot: 'home.benefits.03.image' },
      { numeral: textRef('node-18:134'), title: textRef('node-18:152'), description: textRef('node-18:153'), slot: 'home.benefits.04.image' },
    ],
  },
  methods: {
    title: textRef('node-1:60'),
    cards: [
      { title: textRef('node-18:114'), description: textRef('node-18:115'), slot: 'home.methods.01.image' },
      { title: textRef('node-1:61'), description: textRef('node-1:62'), slot: 'home.methods.02.image' },
      { title: textRef('node-18:116'), description: textRef('node-18:117'), slot: 'home.methods.03.image' },
    ],
  },
  location: {
    title: textRef('node-1:50'),
    description: textRef('node-1:49'),
    note: textRef('node-1:48'),
  },
  faq: { title: textRef('node-1:24'), pendingSources: [
    textRef('node-1:30'), textRef('node-1:31'), textRef('node-1:32'), textRef('node-1:33'),
  ] },
  consultation: {
    headline: textRef('node-35:4'),
    button: textRef('node-35:3'),
  },
} as const;

export const HOME_BODY_EXPECTED_IDS = [
  'hero', 'info-bar', 'special-start', 'training-track',
  'benefits', 'methods', 'location', 'faq', 'consultation-cta',
] as const;

export function assertHomeBodyPlan(): void {
  if (homeR2Source.sourceSnapshotDigest !== '5e877e46cc1bad3e7985a553163120c59c9b9d0f731a66d575e781fa5c60146f') {
    throw new Error('SMD_HOME_R2_SOURCE_DIGEST_MISMATCH');
  }
  if (homeBodySections.length !== HOME_BODY_EXPECTED_IDS.length ||
    homeBodySections.some((section, index) => section.id !== HOME_BODY_EXPECTED_IDS[index] || section.visualIndex !== index)) {
    throw new Error('SMD_HOME_R2_SECTION_MAPPING_INVALID');
  }
}
