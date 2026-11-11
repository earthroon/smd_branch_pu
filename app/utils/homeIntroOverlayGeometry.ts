/** SMD_HOME_INTRO_VUE_PAINT_STACK_R3. Presentation geometry, never Figma source geometry. */
export type IntroVariant = 'figma' | 'semantic';
export type IntroRectCss = Readonly<{ left: number; top: number; width: number; height: number }>;
export type FilmPaintGeometry = Readonly<{
  owner: 'HomeHeroFilm';
  viewportRectCss: IntroRectCss;
  paintedTopCss: number;
  paintedHeightCss: number;
  layoutRevision: string;
  generation: number;
}>;
export type IntroOverlayPlacement = Readonly<{
  kind: 'admitted';
  contract: 'SMD_HOME_INTRO_VUE_PAINT_STACK_R3';
  reason: null;
  hostRevision: string;
  sourceSectionKey: 'node-1:134';
  leftCssPx: number;
  topCssPx: number;
  widthCssPx: number;
  heightCssPx: number;
  paintedOverlapCssPx: number;
  paintedIntersectionAreaCssPx2: number;
}> | Readonly<{
  kind: 'blocked';
  contract: 'SMD_HOME_INTRO_VUE_PAINT_STACK_R3';
  reason: string;
  hostRevision: string;
  sourceSectionKey: 'node-1:134';
}>;
export type IntroOverlayGeometryInput = Readonly<{
  frameRectCss: IntroRectCss;
  film: FilmPaintGeometry;
  overlayHeightCssPx: number;
  overlayWidthCssPx: number;
  sourceRevision: string;
  expectedSourceRevision: string;
  minimumFilmGeneration: number;
  hostRevision: string;
}>;
const contract = 'SMD_HOME_INTRO_VUE_PAINT_STACK_R3' as const;
const sourceSectionKey = 'node-1:134' as const;
const blocked = (reason: string, hostRevision: string): IntroOverlayPlacement =>
  ({ kind: 'blocked', contract, reason, hostRevision, sourceSectionKey });

/** Use viewport-relative CSS rectangles exactly once; don't multiply by DPR or negate source Y. */
export function planIntroOverlay(input: IntroOverlayGeometryInput): IntroOverlayPlacement {
  const { frameRectCss: frame, film, overlayHeightCssPx: height, overlayWidthCssPx: width } = input;
  if (!input.sourceRevision || input.sourceRevision !== input.expectedSourceRevision) {
    return blocked('INTRO_R3_SOURCE_IDENTITY_DRIFT', input.hostRevision);
  }
  if (film.owner !== 'HomeHeroFilm' || !film.layoutRevision ||
      film.generation < input.minimumFilmGeneration) {
    return blocked('INTRO_R3_GEOMETRY_STALE', input.hostRevision);
  }
  const viewport = film.viewportRectCss;
  const values = [frame.left, frame.top, frame.width, frame.height,
    viewport.left, viewport.top, viewport.width, viewport.height,
    film.paintedTopCss, film.paintedHeightCss, height, width];
  if (!values.every(Number.isFinite) || frame.width <= 0 || frame.height <= 0 ||
      viewport.width <= 0 || viewport.height <= 0 || height <= 0 || width <= 0 ||
      film.paintedTopCss < 0 || film.paintedHeightCss <= 0 ||
      film.paintedTopCss + film.paintedHeightCss > viewport.height + 1) {
    return blocked('INTRO_R3_GEOMETRY_UNAVAILABLE', input.hostRevision);
  }
  if (height > film.paintedHeightCss + 0.5) {
    return blocked('INTRO_R3_BAR_EXCEEDS_PAINTED_FILM', input.hostRevision);
  }
  const photoTop = viewport.top + film.paintedTopCss;
  const photoBottom = photoTop + film.paintedHeightCss;
  const barTop = photoBottom - height;
  // The host is the measured base frame. Geometry must stay inside it.
  const epsilon = 1;
  if (barTop < photoTop - epsilon || barTop < frame.top - epsilon ||
      photoBottom > frame.top + frame.height + epsilon ||
      viewport.left < frame.left - epsilon ||
      viewport.left + viewport.width > frame.left + frame.width + epsilon) {
    return blocked('INTRO_R3_GEOMETRY_UNAVAILABLE', input.hostRevision);
  }
  const paintedOverlap = Math.max(0, Math.min(photoBottom, barTop + height) - Math.max(photoTop, barTop));
  const widthOverlap = Math.max(0, Math.min(viewport.left + viewport.width, viewport.left + width) - viewport.left);
  const area = paintedOverlap * widthOverlap;
  if (paintedOverlap <= 0 || area <= 0) {
    return blocked('INTRO_R3_OVERLAY_NO_INTERSECTION', input.hostRevision);
  }
  return {
    kind:'admitted', contract, reason:null, hostRevision:input.hostRevision, sourceSectionKey,
    leftCssPx:viewport.left-frame.left, topCssPx:barTop-frame.top,
    widthCssPx:viewport.width, heightCssPx:height,
    paintedOverlapCssPx:paintedOverlap, paintedIntersectionAreaCssPx2:area,
  };
}
