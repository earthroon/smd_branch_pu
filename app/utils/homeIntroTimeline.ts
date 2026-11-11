/** SMD_HOME_INTERACTION_R1: presentation timing only. Figma geometry remains immutable. */
export const HOME_INTRO_TIMING = Object.freeze({
  barDurationMs: 430,
  barToIconDelayMs: 30,
  iconStaggerMs: 60,
  iconDurationMs: 350,
  iconCount: 4,
  barEntryOffsetPx: 18,
  iconEntryOffsetPx: 24,
  postRevealSettleMs: 120,
  wheelQuietMs: 220,
});

export const HOME_INTRO_DESKTOP_MEDIA =
  '(min-width: 1380px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)';

export const HOME_INTRO_REVEAL_COMPLETE_MS =
  HOME_INTRO_TIMING.barDurationMs + HOME_INTRO_TIMING.barToIconDelayMs
  + (HOME_INTRO_TIMING.iconCount - 1) * HOME_INTRO_TIMING.iconStaggerMs
  + HOME_INTRO_TIMING.iconDurationMs;

export const HOME_INTRO_MIN_RELEASE_MS =
  HOME_INTRO_REVEAL_COMPLETE_MS + HOME_INTRO_TIMING.postRevealSettleMs;

export const HOME_INTRO_ITEM_NODES: Readonly<Record<string, number>> = Object.freeze({
  'node-1:320': 0,
  'node-1:154': 0,
  'node-1:395': 1,
  'node-1:400': 1,
  'node-1:411': 2,
  'node-1:404': 2,
  'node-18:58': 3,
});

export function introItemIndex(nodeKey: string): number | null {
  return HOME_INTRO_ITEM_NODES[nodeKey] ?? null;
}

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

/** Invert cubic Bezier x(t) numerically, then evaluate y(t).
 *  Unlike interpolating y(u) directly, this matches CSS cubic-bezier timing. */
export function dampedEaseOut(progress: number): number {
  const x = clamp01(progress);
  if (x === 0 || x === 1) return x;
  const [x1, y1, x2, y2] = [0.16, 1, 0.3, 1];
  const cubic = (t: number, a: number, b: number) => {
    const inv = 1 - t;
    return 3 * inv * inv * t * a + 3 * inv * t * t * b + t * t * t;
  };
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 24; i++) {
    const t = (lo + hi) / 2;
    if (cubic(t, x1, x2) < x) lo = t;
    else hi = t;
  }
  return cubic((lo + hi) / 2, y1, y2);
}

export function barProgress(elapsedMs: number): number {
  return dampedEaseOut(clamp01(elapsedMs / HOME_INTRO_TIMING.barDurationMs));
}

export function iconStartMs(index: number): number {
  if (!Number.isInteger(index) || index < 0 || index >= HOME_INTRO_TIMING.iconCount) {
    throw new RangeError('SMD_INTRO_ICON_INDEX_INVALID');
  }
  return HOME_INTRO_TIMING.barDurationMs + HOME_INTRO_TIMING.barToIconDelayMs
    + index * HOME_INTRO_TIMING.iconStaggerMs;
}

export function iconProgress(elapsedMs: number, index: number): number {
  return dampedEaseOut(clamp01((elapsedMs - iconStartMs(index)) / HOME_INTRO_TIMING.iconDurationMs));
}

export function canReleaseIntro(elapsedMs: number, wheelQuietElapsedMs: number): boolean {
  return elapsedMs >= HOME_INTRO_MIN_RELEASE_MS
    && wheelQuietElapsedMs >= HOME_INTRO_TIMING.wheelQuietMs;
}

/** The actual DOM intro bottom determines where sticky exits; no fixed scroll distance. */
export function introTargetScrollY(
  introDocumentBottom: number,
  viewportHeight: number,
): number {
  if (!Number.isFinite(introDocumentBottom) || !Number.isFinite(viewportHeight) || viewportHeight <= 0) {
    throw new RangeError('SMD_INTRO_GEOMETRY_INVALID');
  }
  return Math.max(0, introDocumentBottom - viewportHeight);
}
