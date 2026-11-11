/** SMD-REVIEWS-R1-CF2/CF3. Pure validated projection + URL-owned filter intent. */
import {
  REVIEW_FILTER_ORDER,
  isReviewFilterId,
  validateReviewCollectionV1,
  type ReviewCategoryId,
  type ReviewCollectionV1,
  type ReviewEntryV1,
  type ReviewFilterId,
} from './reviews-contract.ts';
import { REVIEW_SOURCE_DIGEST_PATTERN } from './reviews-contract.ts';

export type ReviewProjectionV1 = Readonly<{
  contract: 'SMD_REVIEW_PROJECTION_V1';
  sourceRevision: string;
  sourceDigest: string;
  views: Readonly<Record<ReviewFilterId, readonly ReviewEntryV1[]>>;
}>;

export type ReviewQueryAdmission =
  | Readonly<{ kind: 'admitted'; filter: ReviewFilterId }>
  | Readonly<{ kind: 'canonicalize'; filter: 'all'; replace: true }>
  | Readonly<{ kind: 'rejected'; statusCode: 400; code: 'SMD_REVIEWS_R1_QUERY_INVALID' }>;

export const REVIEW_INITIAL_VISIBLE = 3 as const;
export const REVIEW_LOAD_INCREMENT = 3 as const;

export type ReviewInteractionState = Readonly<{
  sourceDigest: string;
  visibleByFilter: Readonly<Record<ReviewFilterId, number>>;
}>;

export type ReviewVisibleResult = Readonly<{
  filter: ReviewFilterId;
  total: number;
  visibleCount: number;
  items: readonly ReviewEntryV1[];
  hasMore: boolean;
  empty: boolean;
}>;

export type ReviewFilterIntent =
  | Readonly<{ kind: 'noop'; filter: ReviewFilterId }>
  | Readonly<{
      kind: 'navigate';
      filter: ReviewFilterId;
      history: 'push';
      query: Readonly<{ category?: ReviewCategoryId }>;
    }>;

function reject(code: string): never {
  throw new Error(code);
}

/** Route.query must be an object. Unrelated query fields are not category authority. */
export function admitReviewCategoryQuery(query: unknown): ReviewQueryAdmission {
  if (typeof query !== 'object' || query === null || Array.isArray(query) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(query))) {
    return { kind: 'rejected', statusCode: 400, code: 'SMD_REVIEWS_R1_QUERY_INVALID' };
  }
  const categoryDescriptor = Object.getOwnPropertyDescriptor(query, 'category');
  switch (categoryDescriptor) {
    case undefined:
      return { kind: 'admitted', filter: 'all' };
    default:
      if (!('value' in categoryDescriptor)) {
        return { kind: 'rejected', statusCode: 400, code: 'SMD_REVIEWS_R1_QUERY_INVALID' };
      }
      switch (categoryDescriptor.value) {
        case 'all':
          return { kind: 'canonicalize', filter: 'all', replace: true };
        case 'interior-film':
        case 'glass-film':
        case 'career-prep':
          return { kind: 'admitted', filter: categoryDescriptor.value };
        default:
          return { kind: 'rejected', statusCode: 400, code: 'SMD_REVIEWS_R1_QUERY_INVALID' };
      }
  }
}

export function buildReviewProjectionV1(source: ReviewCollectionV1): ReviewProjectionV1 {
  const canonical = validateReviewCollectionV1(source);
  const sorted = [...canonical.entries]
    .filter(item => item.visibility === 'public')
    .sort((left, right) => left.displayOrder < right.displayOrder ? -1 :
      left.displayOrder > right.displayOrder ? 1 :
      left.id < right.id ? -1 : left.id > right.id ? 1 : 0);
  const all = Object.freeze(sorted);
  const interior = Object.freeze(all.filter(item => item.category === 'interior-film'));
  const glass = Object.freeze(all.filter(item => item.category === 'glass-film'));
  const career = Object.freeze(all.filter(item => item.category === 'career-prep'));
  const ids = [...interior, ...glass, ...career].map(item => item.id);
  if (ids.length !== all.length || new Set(ids).size !== all.length ||
      ids.some(id => !all.some(item => item.id === id))) {
    return reject('SMD_REVIEWS_R1_PROJECTION_PARTITION_INVALID');
  }
  return Object.freeze({
    contract: 'SMD_REVIEW_PROJECTION_V1',
    sourceRevision: canonical.sourceRevision,
    sourceDigest: canonical.sourceDigest,
    views: Object.freeze({
      all,
      'interior-film': interior,
      'glass-film': glass,
      'career-prep': career,
    }),
  });
}

function validateDigest(value: unknown): asserts value is string {
  if (typeof value !== 'string' || !REVIEW_SOURCE_DIGEST_PATTERN.test(value)) {
    reject('SMD_REVIEWS_R1_INTERACTION_STATE_INVALID');
  }
}

function validateInteraction(state: ReviewInteractionState): void {
  if (!state || typeof state !== 'object' || Array.isArray(state) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(state)) ||
      Reflect.ownKeys(state).length !== 2 ||
      !Object.prototype.hasOwnProperty.call(state, 'sourceDigest') ||
      !Object.prototype.hasOwnProperty.call(state, 'visibleByFilter')) {
    reject('SMD_REVIEWS_R1_INTERACTION_STATE_INVALID');
  }
  validateDigest(state.sourceDigest);
  const counts = state.visibleByFilter;
  if (!counts || typeof counts !== 'object' || Array.isArray(counts) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(counts)) ||
      Reflect.ownKeys(counts).length !== REVIEW_FILTER_ORDER.length) {
    reject('SMD_REVIEWS_R1_INTERACTION_STATE_INVALID');
  }
  for (const filter of REVIEW_FILTER_ORDER) {
    if (!Object.prototype.hasOwnProperty.call(counts, filter) ||
        !Number.isSafeInteger(counts[filter]) || counts[filter] < REVIEW_INITIAL_VISIBLE) {
      reject('SMD_REVIEWS_R1_VISIBLE_COUNT_INVALID');
    }
  }
}

export function reviewInitialInteractionState(sourceDigest: string): ReviewInteractionState {
  validateDigest(sourceDigest);
  return Object.freeze({
    sourceDigest,
    visibleByFilter: Object.freeze({
      all: REVIEW_INITIAL_VISIBLE,
      'interior-film': REVIEW_INITIAL_VISIBLE,
      'glass-film': REVIEW_INITIAL_VISIBLE,
      'career-prep': REVIEW_INITIAL_VISIBLE,
    }),
  });
}

export function reviewRebaseInteraction(
  state: ReviewInteractionState, newDigest: string,
): ReviewInteractionState {
  validateInteraction(state);
  validateDigest(newDigest);
  return state.sourceDigest === newDigest ? state : reviewInitialInteractionState(newDigest);
}

export function reviewLoadMore(
  state: ReviewInteractionState,
  filter: ReviewFilterId,
  total: number,
): ReviewInteractionState {
  validateInteraction(state);
  if (!isReviewFilterId(filter)) reject('SMD_REVIEWS_R1_FILTER_INVALID');
  if (!Number.isSafeInteger(total) || total < 0) reject('SMD_REVIEWS_R1_VISIBLE_COUNT_INVALID');
  const before = state.visibleByFilter[filter];
  if (before >= total) return state;
  const after = Math.min(total, before + REVIEW_LOAD_INCREMENT);
  if (after === before) return state;
  return Object.freeze({
    sourceDigest: state.sourceDigest,
    visibleByFilter: Object.freeze({ ...state.visibleByFilter, [filter]: after }),
  });
}

export function reviewVisibleItems(
  projection: ReviewProjectionV1,
  filter: ReviewFilterId,
  state: ReviewInteractionState,
): ReviewVisibleResult {
  validateInteraction(state);
  if (!isReviewFilterId(filter)) reject('SMD_REVIEWS_R1_FILTER_INVALID');
  if (!projection || projection.contract !== 'SMD_REVIEW_PROJECTION_V1' ||
      !REVIEW_SOURCE_DIGEST_PATTERN.test(projection.sourceDigest) || !projection.views ||
      !Array.isArray(projection.views[filter])) {
    reject('SMD_REVIEWS_R1_PROJECTION_PARTITION_INVALID');
  }
  if (state.sourceDigest !== projection.sourceDigest) reject('SMD_REVIEWS_R1_SOURCE_STALE');
  const rows = projection.views[filter];
  const visibleCount = Math.min(rows.length, state.visibleByFilter[filter]);
  return Object.freeze({
    filter,
    total: rows.length,
    visibleCount,
    items: Object.freeze(rows.slice(0, visibleCount)),
    hasMore: visibleCount < rows.length,
    empty: rows.length === 0,
  });
}

/** CF3 pure navigation proposal. Active filter is ALWAYS resolved from admitted route query. */
export function reviewFilterChangeIntent(
  activeFilter: ReviewFilterId, requested: unknown,
): ReviewFilterIntent {
  if (!isReviewFilterId(activeFilter) || !isReviewFilterId(requested)) {
    return reject('SMD_REVIEWS_R1_FILTER_INVALID');
  }
  if (activeFilter === requested) return { kind: 'noop', filter: activeFilter };
  return {
    kind: 'navigate',
    filter: requested,
    history: 'push',
    query: requested === 'all' ? {} : { category: requested },
  };
}

/** Arrow/Home/End select immediately; Enter and Space remain native button activation. */
export function reviewKeyboardTabIntent(active: ReviewFilterId, key: string): ReviewFilterId | null {
  if (!isReviewFilterId(active)) reject('SMD_REVIEWS_R1_FILTER_INVALID');
  const index = REVIEW_FILTER_ORDER.indexOf(active);
  switch (key) {
    case 'ArrowRight': return REVIEW_FILTER_ORDER[(index + 1) % REVIEW_FILTER_ORDER.length]!;
    case 'ArrowLeft': return REVIEW_FILTER_ORDER[(index + REVIEW_FILTER_ORDER.length - 1) % REVIEW_FILTER_ORDER.length]!;
    case 'Home': return REVIEW_FILTER_ORDER[0];
    case 'End': return REVIEW_FILTER_ORDER[REVIEW_FILTER_ORDER.length - 1]!;
    default: return null;
  }
}

export function reviewTabAccessibility(filter: ReviewFilterId, active: ReviewFilterId) {
  if (!isReviewFilterId(filter) || !isReviewFilterId(active)) reject('SMD_REVIEWS_R1_FILTER_INVALID');
  return {
    role: 'tab' as const,
    'aria-selected': filter === active,
    'aria-controls': 'reviews-results',
    tabindex: filter === active ? 0 as const : -1 as const,
  };
}

/** Pure completion gate for CF5 to consume: stale router completions cannot select a panel. */
export function reviewNavigationCompletionIsCurrent(
  settledEpoch: number,
  latestEpoch: number,
  settledQuery: unknown,
  currentQuery: unknown,
): boolean {
  if (!Number.isSafeInteger(settledEpoch) || !Number.isSafeInteger(latestEpoch) ||
      settledEpoch < 0 || latestEpoch < 0) reject('SMD_REVIEWS_R1_INTERACTION_STATE_INVALID');
  const settled = admitReviewCategoryQuery(settledQuery);
  const current = admitReviewCategoryQuery(currentQuery);
  return settledEpoch === latestEpoch && settled.kind === 'admitted' &&
    current.kind === 'admitted' && settled.filter === current.filter;
}
