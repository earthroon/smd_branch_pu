/** SMD_HOME_LAYOUT_R1 CF1: pure Figma Y-axis compaction arithmetic. */
export type HomeSourceSection = Readonly<{
  id: string;
  nodeKey: string;
  top: number;
  height: number;
  width: number;
}>;
export type HomeWideLayoutRow = Readonly<{
  id: string;
  sourceNodeKey: string;
  sourceTopY: number;
  sourceHeight: number;
  sourceGapBefore: number;
  targetTopY: number;
  targetHeight: number;
  targetGapBefore: number;
  gapCss: string;
}>;
export const HOME_WIDE_SOURCE_WIDTH = 1920;
export const HOME_WIDE_BODY_SCALE = 0.75;

export function homeWideGapCss(sourceGap: number): string {
  if (!Number.isFinite(sourceGap)) throw new Error('SMD_HOME_LAYOUT_GAP_NONFINITE');
  if (sourceGap === 0) return '0px';
  // Original SVG stops growing at 1920px. Relative gaps must stop growing too.
  // This expression is SSR-stable and uses native CSS min()/max().
  const widePx = sourceGap * HOME_WIDE_BODY_SCALE;
  const responsiveVw = widePx * 100 / HOME_WIDE_SOURCE_WIDTH;
  const vw = Number(responsiveVw.toFixed(9));
  const px = Number(widePx.toFixed(9));
  return sourceGap > 0
    ? `min(${vw}vw, ${px}px)`
    : `max(${vw}vw, ${px}px)`;
}

export function homeWideRenderedWidth(viewportWidth: number): number {
  if (!Number.isFinite(viewportWidth) || viewportWidth <= 0) {
    throw new Error('SMD_HOME_LAYOUT_VIEWPORT_WIDTH_INVALID');
  }
  return Math.min(viewportWidth * HOME_WIDE_BODY_SCALE,
    HOME_WIDE_SOURCE_WIDTH * HOME_WIDE_BODY_SCALE);
}

export function createHomeWideLayout(
  source: readonly HomeSourceSection[],
  bodyIds: readonly string[],
): readonly HomeWideLayoutRow[] {
  const byId = new Map(source.map(s => [s.id, s]));
  if (byId.size !== source.length) throw new Error('SMD_HOME_LAYOUT_SECTION_ID_DUPLICATED');
  if (bodyIds.length === 0 || new Set(bodyIds).size !== bodyIds.length) {
    throw new Error('SMD_HOME_LAYOUT_BODY_IDS_INVALID');
  }
  let previous: HomeSourceSection | null = null;
  let originTop: number | null = null;
  const result: HomeWideLayoutRow[] = [];
  for (const id of bodyIds) {
    const s = byId.get(id);
    if (!s || !Number.isFinite(s.top) || !Number.isFinite(s.height) ||
      s.height <= 0 || s.width !== HOME_WIDE_SOURCE_WIDTH) {
      throw new Error(`SMD_HOME_LAYOUT_SOURCE_GEOMETRY_INVALID:${id}`);
    }
    if (originTop === null) originTop = s.top;
    const gap = previous ? s.top - (previous.top + previous.height) : 0;
    if (previous && s.top <= previous.top) throw new Error('SMD_HOME_LAYOUT_SOURCE_ORDER_INVALID');
    result.push(Object.freeze({
      id,
      sourceNodeKey: s.nodeKey,
      sourceTopY: s.top,
      sourceHeight: s.height,
      sourceGapBefore: gap,
      targetTopY: (s.top - originTop) * HOME_WIDE_BODY_SCALE,
      targetHeight: s.height * HOME_WIDE_BODY_SCALE,
      targetGapBefore: gap * HOME_WIDE_BODY_SCALE,
      gapCss: homeWideGapCss(gap),
    }));
    previous = s;
  }
  return Object.freeze(result);
}
