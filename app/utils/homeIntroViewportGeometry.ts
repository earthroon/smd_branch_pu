/** SMD_HOME_INTRO_VIEWPORT_FILL_R4.
 * Browser presentation math only. Never mutates Figma source geometry. */
export type IntroViewportInput = Readonly<{
  viewportHeightCssPx:number;
  headerHeightCssPx:number;
  frameTopCssPx:number; // current viewport-relative top
  scrollYCssPx:number;
}>;
export function planIntroViewportHeight(input:IntroViewportInput):number {
  const {viewportHeightCssPx,headerHeightCssPx,frameTopCssPx,scrollYCssPx}=input;
  if(![viewportHeightCssPx,headerHeightCssPx,frameTopCssPx,scrollYCssPx].every(Number.isFinite) ||
      viewportHeightCssPx<=0 || headerHeightCssPx<0 || scrollYCssPx<0){
    throw new Error('INTRO_R4_VIEWPORT_GEOMETRY_INVALID');
  }
  // The frame's document top is stable as scrollY changes. Do not shorten it on scroll.
  const frameDocumentTop=frameTopCssPx+scrollYCssPx;
  const paintedTop=Math.max(headerHeightCssPx,frameDocumentTop);
  const result=viewportHeightCssPx-paintedTop;
  if(!Number.isFinite(result)||result<=0)throw new Error('INTRO_R4_VIEWPORT_GEOMETRY_UNAVAILABLE');
  return result;
}
export type TitleSafetyRect=Readonly<{left:number;top:number;width:number;height:number}>;
export function rectIntersectionArea(a:TitleSafetyRect,b:TitleSafetyRect):number {
  if(![a.left,a.top,a.width,a.height,b.left,b.top,b.width,b.height].every(Number.isFinite)||
     a.width<0||a.height<0||b.width<0||b.height<0){
    throw new Error('INTRO_R4_TITLE_GEOMETRY_INVALID');
  }
  const width=Math.max(0,Math.min(a.left+a.width,b.left+b.width)-Math.max(a.left,b.left));
  const height=Math.max(0,Math.min(a.top+a.height,b.top+b.height)-Math.max(a.top,b.top));
  return width*height;
}
/** A title-safe overlay must be disjoint from EVERY rendered title / description rect. */
export function titleSafeOverlay(overlay:TitleSafetyRect,protectedRects:readonly TitleSafetyRect[],padCssPx=12):boolean {
  if(!Number.isFinite(padCssPx)||padCssPx<0)throw new Error('INTRO_R4_TITLE_GEOMETRY_INVALID');
  return protectedRects.every(rect=>rectIntersectionArea(overlay,{
    left:rect.left-padCssPx,top:rect.top-padCssPx,
    width:rect.width+padCssPx*2,height:rect.height+padCssPx*2,
  })===0);
}
