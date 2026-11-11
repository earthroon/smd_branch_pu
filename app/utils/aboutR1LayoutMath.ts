import { aboutR1Source } from '../data/about-r1-manifest.ts';
/** Source-artboard geometry only. Smaller screens use the CSS semantic reflow. */
export function aboutRenderedWidth(viewportWidth: number): number {
  if (!Number.isFinite(viewportWidth) || viewportWidth <= 0) throw new Error('SMD_ABOUT_VIEWPORT_INVALID');
  return Math.min(viewportWidth, aboutR1Source.sourceWidth);
}
export function aboutWideGeometry(viewportWidth: number, top: number, height: number) {
  if (!Number.isFinite(top) || !Number.isFinite(height) || height <= 0 || top < 124)
    throw new Error('SMD_ABOUT_SECTION_GEOMETRY_INVALID');
  const scale = aboutRenderedWidth(viewportWidth) / aboutR1Source.sourceWidth;
  return { scale, top: (top - 124) * scale, height: height * scale };
}
export function aboutMediaCss(photo: Readonly<{
  sourceWidth: number; sourceHeight: number; frame: readonly number[];
  sourceToFrame: readonly number[]; radius: number;
}>) {
  const [left, top, right, bottom] = photo.frame;
  const [a, b, c, d, tx, ty] = photo.sourceToFrame;
  if (left === undefined || top === undefined || right === undefined || bottom === undefined ||
      a === undefined || b === undefined || c === undefined || d === undefined ||
      tx === undefined || ty === undefined) throw new Error('SMD_ABOUT_MEDIA_GEOMETRY_INVALID');
  const width = right - left, height = bottom - top;
  if (photo.frame.length !== 4 || photo.sourceToFrame.length !== 6 ||
      [...photo.frame, ...photo.sourceToFrame, photo.radius, photo.sourceWidth, photo.sourceHeight].some(v => !Number.isFinite(v)) ||
      width <= 0 || height <= 0 || photo.sourceWidth <= 0 || photo.sourceHeight <= 0 ||
      photo.radius < 0 || Math.abs(a * d - b * c) < Number.EPSILON)
    throw new Error('SMD_ABOUT_MEDIA_GEOMETRY_INVALID');
  return { frameWidth: width, frameHeight: height,
    frameStyle: { aspectRatio: width + ' / ' + height,
      borderRadius: (photo.radius / width * 100) + '% / ' + (photo.radius / height * 100) + '%' },
    imageStyle: { width: (photo.sourceWidth / width * 100) + '%', maxWidth: 'none', height: 'auto',
      left: (tx * 100) + '%', top: (ty * 100) + '%', transformOrigin: '0 0',
      transform: 'matrix(' + [a * width, b * height, c * width, d * height, 0, 0].join(',') + ')' } };
}
