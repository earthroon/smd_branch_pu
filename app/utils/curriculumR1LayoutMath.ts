import { curriculumR1Source } from '../data/curriculum-r1-manifest.ts';
import type { CurriculumSectionId } from '../data/curriculum-r1-types.ts';
/** Page-authored geometry; the homepage's compaction policy has no consumer here. */
export const curriculumWideTokens = Object.freeze({
  '--curriculum-source-width': curriculumR1Source.sourceWidth,
  '--curriculum-wide-width': '100%',
  '--curriculum-wide-max': curriculumR1Source.sourceWidth + 'px',
});
/** Source-artboard geometry only. Smaller screens use the CSS semantic reflow. */
export function curriculumRenderedWidth(viewport: number): number {
  if (!Number.isFinite(viewport) || viewport <= 0) throw new Error('SMD_CURRICULUM_VIEWPORT_INVALID');
  return Math.min(viewport, curriculumR1Source.sourceWidth);
}
export function curriculumSection(id: CurriculumSectionId) {
  const section = curriculumR1Source.sections.find(s => s.id === id);
  if (!section) throw new Error('SMD_CURRICULUM_SECTION_INVALID');
  return section;
}
export function curriculumFrameStyle(frame: readonly number[], sectionId: CurriculumSectionId) {
  const [x,y,right,bottom] = frame;
  if (frame.length !== 4 || frame.some(n => !Number.isFinite(n)) || x === undefined ||
      y === undefined || right === undefined || bottom === undefined || right <= x || bottom <= y)
    throw new Error('SMD_CURRICULUM_FRAME_INVALID');
  return { '--frame-x': x, '--frame-y': y - curriculumSection(sectionId).top,
    '--frame-width': right-x, '--frame-height': bottom-y };
}
export function curriculumMediaCss(photo: Readonly<{
  sourceWidth: number; sourceHeight: number; frame: readonly number[];
  sourceToFrame: readonly number[]; radius: number;
}>) {
  const [left,top,right,bottom] = photo.frame;
  const [a,b,c,d,tx,ty] = photo.sourceToFrame;
  if (photo.frame.length !== 4 || photo.sourceToFrame.length !== 6 ||
      [...photo.frame,...photo.sourceToFrame,photo.sourceWidth,photo.sourceHeight,photo.radius].some(n=>!Number.isFinite(n)) ||
      left===undefined || top===undefined || right===undefined || bottom===undefined ||
      a===undefined || b===undefined || c===undefined || d===undefined || tx===undefined || ty===undefined ||
      right<=left || bottom<=top || photo.sourceWidth<=0 || photo.sourceHeight<=0 || photo.radius<0 ||
      Math.abs(a*d-b*c)<Number.EPSILON) throw new Error('SMD_CURRICULUM_MEDIA_GEOMETRY_INVALID');
  const w=right-left,h=bottom-top;
  return { frameStyle:{aspectRatio:w+' / '+h,borderRadius:(photo.radius/w*100)+'% / '+(photo.radius/h*100)+'%'},
    imageStyle:{width:(photo.sourceWidth/w*100)+'%',maxWidth:'none',height:'auto',left:(tx*100)+'%',top:(ty*100)+'%',
      transformOrigin:'0 0',transform:'matrix('+[a*w,b*h,c*w,d*h,0,0].join(',')+')'} };
}
export function roundedSourcePath(frame: readonly number[], radii: readonly number[]): string {
  const [x=0,y=0,r=0,b=0]=frame, [tl=0,tr=0,br=0,bl=0]=radii;
  return `M${x+tl},${y}H${r-tr}A${tr},${tr} 0 0 1 ${r},${y+tr}V${b-br}A${br},${br} 0 0 1 ${r-br},${b}H${x+bl}A${bl},${bl} 0 0 1 ${x},${b-bl}V${y+tl}A${tl},${tl} 0 0 1 ${x+tl},${y}Z`;
}
