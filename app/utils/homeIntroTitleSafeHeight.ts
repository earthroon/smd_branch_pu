/** SMD-HOME-HERO-CAROUSEL-R1C.
 * Pure proposal for the smallest Hero height that can fit the existing Intro
 * information bar below its protected heading/description rectangles.
 * Source Figma node geometry, bar dimensions and title padding are unchanged.
 */
import { rectIntersectionArea, type TitleSafetyRect } from './homeIntroViewportGeometry.ts';

export function planIntroTitleSafeMinimumHeight(
  currentHeightCssPx: number,
  overlay: TitleSafetyRect,
  protectedRects: readonly TitleSafetyRect[],
  padCssPx = 12,
): number | null {
  if (!Number.isFinite(currentHeightCssPx) || currentHeightCssPx <= 0 ||
      !Number.isFinite(padCssPx) || padCssPx < 0 || protectedRects.length === 0) {
    throw new Error('INTRO_R1C_TITLE_SAFE_INPUT_INVALID');
  }
  // Same padded rectangles used by the existing titleSafeOverlay authority.
  const colliding = protectedRects.filter(rect => rectIntersectionArea(overlay, {
    left: rect.left - padCssPx,
    top: rect.top - padCssPx,
    width: rect.width + 2 * padCssPx,
    height: rect.height + 2 * padCssPx,
  }) > 0);
  if (colliding.length === 0) return null;

  // Growing the Hero moves the bottom-anchored overlay down, while the source
  // heading remains in its original location. Keep one additional CSS pixel
  // for rounding and subpixel metrics across DPRs.
  const requestedTop = Math.max(...colliding.map(rect => rect.top + rect.height + padCssPx + 1));
  const growCssPx = Math.max(0, requestedTop - overlay.top);
  const minimum = Math.ceil(currentHeightCssPx + growCssPx);
  if (!Number.isSafeInteger(minimum) || minimum <= currentHeightCssPx) {
    throw new Error('INTRO_R1C_TITLE_SAFE_HEIGHT_UNRESOLVED');
  }
  return minimum;
}
