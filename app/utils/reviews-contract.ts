/** SMD-REVIEWS-R1-CF2: local Standalone review authority, NOT a CMS Publication. */
import { reviewsSha256Utf8 } from './reviews-sha256.ts';

export const REVIEW_FILTER_ORDER = [
  'all', 'interior-film', 'glass-film', 'career-prep',
] as const;
export type ReviewFilterId = typeof REVIEW_FILTER_ORDER[number];
export type ReviewCategoryId = Exclude<ReviewFilterId, 'all'>;

export const REVIEW_FILTER_V1 = {
  all: { label: '전체 후기' },
  'interior-film': { label: '인테리어필름' },
  'glass-film': { label: '유리필름' },
  'career-prep': { label: '취업·창업 준비' },
} as const satisfies Readonly<Record<ReviewFilterId, Readonly<{ label: string }>>>;

export type ReviewEntryV1 = Readonly<{
  id: string;
  category: ReviewCategoryId;
  title: string;
  body: string;
  authorDisplayName: string;
  courseLabel: string;
  displayOrder: number;
  visibility: 'draft' | 'public';
  consent: Readonly<{
    verified: boolean;
    receiptId: string | null;
  }>;
}>;

export type ReviewCollectionV1 = Readonly<{
  contract: 'SMD_REVIEW_COLLECTION_V1';
  schemaVersion: 1;
  sourceRevision: string;
  sourceDigest: string;
  entries: readonly ReviewEntryV1[];
}>;

export const REVIEW_SOURCE_DIGEST_PATTERN = /^[0-9a-f]{64}$/;

function reject(code: string): never {
  throw new Error(code);
}

function strictRecord(value: unknown, keys: readonly string[], code: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return reject(code);
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) return reject(code);
  const actualKeys = Reflect.ownKeys(value);
  if (actualKeys.length !== keys.length ||
      actualKeys.some(key => typeof key !== 'string' || !keys.includes(key))) return reject(code);
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !('value' in descriptor)) return reject(code);
  }
  return value as Record<string, unknown>;
}

function checkText(value: unknown, maxCodePoints: number, allowNewline: boolean): value is string {
  if (typeof value !== 'string' || !value.trim()) return false;
  if ([...value].length > maxCodePoints) return false;
  for (let i = 0; i < value.length; i += 1) {
    const cp = value.codePointAt(i)!;
    if (cp >= 0xD800 && cp <= 0xDFFF) return false; // No unpaired surrogates.
    if (cp < 0x20 && (cp !== 0x0A || !allowNewline)) return false;
    if (cp >= 0x7F && cp <= 0x9F) return false;
    if (cp > 0xFFFF) i += 1;
  }
  return true;
}

export function isReviewFilterId(value: unknown): value is ReviewFilterId {
  switch (value) {
    case 'all':
    case 'interior-film':
    case 'glass-film':
    case 'career-prep':
      return true;
    default:
      return false;
  }
}

export function isReviewCategoryId(value: unknown): value is ReviewCategoryId {
  switch (value) {
    case 'interior-film':
    case 'glass-film':
    case 'career-prep':
      return true;
    default:
      return false;
  }
}

/** Validates schema independently from digest so authoring can compute the first digest. */
function validateReviewShape(input: unknown): ReviewCollectionV1 {
  const source = strictRecord(input,
    ['contract', 'schemaVersion', 'sourceRevision', 'sourceDigest', 'entries'],
    'SMD_REVIEWS_R1_SCHEMA_INVALID');
  if (source.contract !== 'SMD_REVIEW_COLLECTION_V1' || source.schemaVersion !== 1 ||
      !checkText(source.sourceRevision, 128, false) ||
      typeof source.sourceDigest !== 'string' ||
      !REVIEW_SOURCE_DIGEST_PATTERN.test(source.sourceDigest) || !Array.isArray(source.entries)) {
    return reject('SMD_REVIEWS_R1_SCHEMA_INVALID');
  }
  if (Object.getPrototypeOf(source.entries) !== Array.prototype ||
      Reflect.ownKeys(source.entries).length !== source.entries.length + 1 ||
      !source.entries.every((_, i) => Object.prototype.hasOwnProperty.call(source.entries, i))) {
    return reject('SMD_REVIEWS_R1_SCHEMA_INVALID');
  }
  const seen = new Set<string>();
  for (const item of source.entries) {
    const entry = strictRecord(item,
      ['id', 'category', 'title', 'body', 'authorDisplayName', 'courseLabel',
        'displayOrder', 'visibility', 'consent'], 'SMD_REVIEWS_R1_ENTRY_INVALID');
    if (typeof entry.id !== 'string' ||
        !/^[a-zA-Z0-9][a-zA-Z0-9_-]{1,79}$/.test(entry.id) ||
        /^\d+$/.test(entry.id) || /^index(?:-|$)/i.test(entry.id)) {
      return reject('SMD_REVIEWS_R1_ENTRY_INVALID');
    }
    if (seen.has(entry.id)) return reject('SMD_REVIEWS_R1_DUPLICATE_ID');
    seen.add(entry.id);
    if (!isReviewCategoryId(entry.category)) return reject('SMD_REVIEWS_R1_CATEGORY_INVALID');
    if (!checkText(entry.title, 120, false) || !checkText(entry.body, 3000, true) ||
        !checkText(entry.authorDisplayName, 64, false) || !checkText(entry.courseLabel, 80, false) ||
        !Number.isSafeInteger(entry.displayOrder) || (entry.displayOrder as number) < 0 ||
        (entry.visibility !== 'draft' && entry.visibility !== 'public')) {
      return reject('SMD_REVIEWS_R1_ENTRY_INVALID');
    }
    const consent = strictRecord(entry.consent, ['verified', 'receiptId'], 'SMD_REVIEWS_R1_ENTRY_INVALID');
    if (typeof consent.verified !== 'boolean' ||
        (consent.receiptId !== null && !checkText(consent.receiptId, 256, false))) {
      return reject('SMD_REVIEWS_R1_ENTRY_INVALID');
    }
    if (entry.visibility === 'public' && (!consent.verified || consent.receiptId === null)) {
      return reject('SMD_REVIEWS_R1_PUBLIC_CONSENT_MISSING');
    }
  }
  return source as ReviewCollectionV1;
}

/** Canonical field order is frozen. Source array order intentionally contributes to digest. */
function canonicalReviewJson(source: ReviewCollectionV1): string {
  return JSON.stringify({
    contract: source.contract,
    schemaVersion: source.schemaVersion,
    sourceRevision: source.sourceRevision,
    entries: source.entries.map(item => ({
      id: item.id,
      category: item.category,
      title: item.title,
      body: item.body,
      authorDisplayName: item.authorDisplayName,
      courseLabel: item.courseLabel,
      displayOrder: item.displayOrder,
      visibility: item.visibility,
      consent: { verified: item.consent.verified, receiptId: item.consent.receiptId },
    })),
  });
}

/** Explicit authoring-only helper. It does not repair a stale source during public projection. */
export function computeReviewCollectionDigestV1(input: unknown): string {
  return reviewsSha256Utf8(canonicalReviewJson(validateReviewShape(input)));
}

/** Admission copies/finalizes the source, so later mutations of input cannot change a projection. */
export function validateReviewCollectionV1(input: unknown): ReviewCollectionV1 {
  const source = validateReviewShape(input);
  const digest = reviewsSha256Utf8(canonicalReviewJson(source));
  if (source.sourceDigest !== digest) return reject('SMD_REVIEWS_R1_SOURCE_DIGEST_MISMATCH');
  const entries = source.entries.map(item => Object.freeze({
    id: item.id,
    category: item.category,
    title: item.title,
    body: item.body,
    authorDisplayName: item.authorDisplayName,
    courseLabel: item.courseLabel,
    displayOrder: item.displayOrder,
    visibility: item.visibility,
    consent: Object.freeze({ verified: item.consent.verified, receiptId: item.consent.receiptId }),
  }));
  return Object.freeze({
    contract: source.contract,
    schemaVersion: source.schemaVersion,
    sourceRevision: source.sourceRevision,
    sourceDigest: source.sourceDigest,
    entries: Object.freeze(entries),
  });
}
