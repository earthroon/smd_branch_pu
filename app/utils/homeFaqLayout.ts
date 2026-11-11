/** SMD_HOME_FAQ_R1: pure viewport alignment math; no Figma coordinate copy. */
import { HOME_WIDE_BODY_SCALE, HOME_WIDE_SOURCE_WIDTH, type HomeWideLayoutRow } from './homeWideLayoutMath.ts';

export type FaqAlignmentInput = Readonly<{
  scrollY: number;
  itemTop: number;
  itemHeight: number;
  viewportHeight: number;
  headerHeight: number;
  documentHeight: number;
  safeGap: number;
}>;
export type FaqAlignmentResult = Readonly<{
  targetY: number;
  mode: 'center' | 'top-for-tall-item';
  clamped: boolean;
}>;

export function faqAlignmentTarget(input: FaqAlignmentInput): FaqAlignmentResult {
  const { scrollY, itemTop, itemHeight, viewportHeight, headerHeight, documentHeight, safeGap } = input;
  if (![scrollY, itemTop, itemHeight, viewportHeight, headerHeight, documentHeight, safeGap]
    .every(Number.isFinite) || scrollY < 0 || itemHeight <= 0 || viewportHeight <= 0
    || headerHeight < 0 || headerHeight >= viewportHeight || documentHeight < viewportHeight || safeGap < 0) {
    throw new RangeError('SMD_HOME_FAQ_ALIGNMENT_GEOMETRY_INVALID');
  }
  const available = viewportHeight - headerHeight - 2 * safeGap;
  const oversized = itemHeight > available;
  const rawTarget = oversized
    ? scrollY + itemTop - headerHeight - safeGap
    : scrollY + itemTop + itemHeight / 2 - (viewportHeight + headerHeight) / 2;
  const targetY = Math.min(Math.max(0, rawTarget), Math.max(0, documentHeight - viewportHeight));
  return {
    targetY,
    mode: oversized ? 'top-for-tall-item' : 'center',
    clamped: Math.abs(targetY - rawTarget) > 0.5,
  };
}

/** Original section height is preserved as a responsive MINIMUM, not as a clip cap.
 * Width/scale authority remains homeWideLayoutMath; expansion may grow the row.
 */
export function homeFaqSceneMinimums(row: Pick<HomeWideLayoutRow, 'sourceHeight' | 'targetHeight'>) {
  if (!Number.isFinite(row.sourceHeight) || row.sourceHeight <= 0
    || !Number.isFinite(row.targetHeight) || row.targetHeight <= 0
    || Math.abs(row.targetHeight - row.sourceHeight * HOME_WIDE_BODY_SCALE) > 1e-6) {
    throw new RangeError('SMD_HOME_FAQ_WIDE_ROW_GEOMETRY_INVALID');
  }
  const fullVw = Number((row.sourceHeight * 100 / HOME_WIDE_SOURCE_WIDTH).toFixed(9));
  const wideVw = Number((row.targetHeight * 100 / HOME_WIDE_SOURCE_WIDTH).toFixed(9));
  return {
    '--smd-faq-scene-height-desktop': `${fullVw}vw`,
    '--smd-faq-scene-height-wide': `min(${wideVw}vw, ${row.targetHeight}px)`,
  } as const;
}

export function faqScrollEase(value: number): number {
  if (!Number.isFinite(value)) throw new RangeError('SMD_HOME_FAQ_SCROLL_PROGRESS_INVALID');
  const t = Math.min(1, Math.max(0, value));
  return 1 - (1 - t) ** 3;
}
