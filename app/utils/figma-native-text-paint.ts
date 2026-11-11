/** SVG foreignObject *paint* bounds, not the source Figma node's rect/affine. */
export type FigmaTextPaintGrowth = Readonly<{
  left: number; right: number; top: number; bottom: number;
}>;
export type FigmaTextPaintWindow = Readonly<{
  x: number; y: number; width: number; height: number;
  contentX: number; contentY: number;
  sourceWidth: number; sourceHeight: number;
  maxFontPx: number;
}>;
export const ZERO_FIGMA_TEXT_GROWTH: FigmaTextPaintGrowth = {
  left: 0, right: 0, top: 0, bottom: 0,
};

/** Supports only the pixel-valued font sizes emitted by the frozen Scene compiler. */
export function figmaRunMaxFontPx(runs: readonly {style: Readonly<Record<string, string | number>>}[]): number {
  const sizes = runs.map(run => {
    const value = run.style.fontSize;
    const n = typeof value === 'number' ? value :
      typeof value === 'string' && /^\d+(?:\.\d+)?px$/.test(value) ? Number(value.slice(0, -2)) : NaN;
    if (!Number.isFinite(n) || n <= 0 || n > 1024) throw new Error('SMD_FIGMA_TEXT_FONT_SIZE_INVALID');
    return n;
  });
  return Math.max(0, ...sizes);
}

export function deriveFigmaTextPaintWindow(
  sourceWidth: number, sourceHeight: number,
  runs: readonly {style: Readonly<Record<string, string | number>>}[],
  growth: FigmaTextPaintGrowth = ZERO_FIGMA_TEXT_GROWTH,
): FigmaTextPaintWindow {
  if (![sourceWidth, sourceHeight].every(v => Number.isFinite(v) && v > 0) ||
      Object.values(growth).some(v => !Number.isFinite(v) || v < 0 || v > 512)) {
    throw new Error('SMD_FIGMA_TEXT_SOURCE_RECT_INVALID');
  }
  const maxFontPx = figmaRunMaxFontPx(runs);
  const padX = Math.max(8, Math.ceil(maxFontPx * 0.20));
  const padY = Math.max(8, Math.ceil(maxFontPx * 0.30));
  // Browser 'normal' line-height varies by actual font. This is only a conservative
  // initial ink window; the client-side range audit expands it when necessary.
  const lineFloor = Math.ceil(maxFontPx * 1.48);
  const bottomFloor = Math.max(0, lineFloor - sourceHeight);
  const left = padX + growth.left;
  const top = padY + growth.top;
  const right = padX + growth.right;
  const bottom = padY + bottomFloor + growth.bottom;
  return {
    x: -left, y: -top,
    width: sourceWidth + left + right,
    height: sourceHeight + top + bottom,
    contentX: left, contentY: top,
    sourceWidth, sourceHeight, maxFontPx,
  };
}
