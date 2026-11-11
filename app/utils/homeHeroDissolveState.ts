/** SMD_HOME_HERO_DISSOLVE_R2 · pure motion/gesture selectors.
 * No timers, browser APIs, CMS source, or Figma geometry in this module.
 */
export type HeroLayerPhase = 'active' | 'leaving' | 'incoming' | 'revealing' | 'hidden';
export type HeroDirection = 'previous' | 'next';

export function heroDissolveLayerPhase(
  order: number,
  selectedIndex: number,
  leavingIndex: number | null,
  enteringVisible: boolean,
): HeroLayerPhase {
  if (order === selectedIndex) {
    return leavingIndex === null ? 'active' : enteringVisible ? 'revealing' : 'incoming';
  }
  return order === leavingIndex ? 'leaving' : 'hidden';
}

export function nextHeroDissolveIndex(
  baseIndex: number,
  direction: HeroDirection,
  count: number,
): number {
  if (!Number.isInteger(baseIndex) || !Number.isInteger(count) ||
      count < 1 || baseIndex < 0 || baseIndex >= count) {
    throw new Error('HERO_DISSOLVE_SELECTION_INVALID');
  }
  switch (direction) {
    case 'previous': return (baseIndex - 1 + count) % count;
    case 'next': return (baseIndex + 1) % count;
  }
}

/** Preserve native vertical scrolling; horizontal touch gestures request one step. */
export function heroDissolveSwipeDirection(dx: number, dy: number): HeroDirection | null {
  if (!Number.isFinite(dx) || !Number.isFinite(dy) ||
      Math.abs(dx) < 48 || Math.abs(dx) <= Math.abs(dy) * 1.4) {
    return null;
  }
  return dx > 0 ? 'previous' : 'next';
}
