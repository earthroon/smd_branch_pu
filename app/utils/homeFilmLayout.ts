import type { FilmImageId } from '../data/home-film.ts';

/** CSS coordinates are separate from source / rendition physical pixels. */
export const FILM_FRAME_HEIGHT_CSS_PX = 815 as const;
export const FILM_LAYOUT_REVISION = 'FILM-R13-RESTORE-CF5-LAYOUT-V1' as const;
export const FILM_WIND_PRESENTATION_REVISION = 'FILM-WIND-PRESENTATION-V1' as const;

export type FilmLayoutImage = {
  imageId: FilmImageId;
  intrinsicWidthPx: number;
  intrinsicHeightPx: number;
  approvedRenditionWidthPx: number;
  approvedRenditionHeightPx: number;
  renditionId: string | null;
};
export type FilmLayoutMode = 'desktop-lut' | 'native-swipe' | 'static';
export type FilmLayoutInput = {
  frameHeightCssPx: typeof FILM_FRAME_HEIGHT_CSS_PX;
  containerWidthCssPx: number;
  devicePixelRatio: number;
  mode: FilmLayoutMode;
  sourceRevision: string;
  images: readonly FilmLayoutImage[];
  gapCssPx?: number;
};
export type FilmLayoutSlot = {
  imageId: FilmImageId;
  widthCssPx: number;
  heightCssPx: number;
  topCssPx: number; // Original Figma 815px frame coordinate, kept for source compatibility.
  presentationTopCssPx: 0; // Actually painted strip begins at the top of its compact host.
  leftCssPx: number;
  renditionId: string | null;
};
export type FilmLayoutPlan = {
  layoutRevision: string;
  frameHeightCssPx: typeof FILM_FRAME_HEIGHT_CSS_PX;
  presentationRevision: typeof FILM_WIND_PRESENTATION_REVISION | 'FILM-INTRO-VIEWPORT-FILL-R4';
  presentationHeightCssPx: number;
  containerWidthCssPx: number;
  devicePixelRatio: number;
  mode: FilmLayoutMode;
  slots: readonly FilmLayoutSlot[];
  gapCssPx: number;
  cycleWidthCssPx: number;
  targetFullVisibleCount: 1 | 2 | 4;
  realizedFullVisibleCount: number;
  sourceCropCount: 0;
  unapprovedUpscaleCount: number;
  unusedWidthCssPx: number;
  constraintStatus: 'ADMITTED' | 'LAYOUT_CONSTRAINT_CONFLICT';
  violatedSoftGoals: readonly string[];
};

function requirePositiveFinite(value: number, label: string): void {
  switch (Number.isFinite(value) && value > 0) {
    case true: return;
    case false: throw new Error(`FILM_LAYOUT_INPUT_INVALID: ${label}`);
  }
}

function targetCount(width: number, mode: FilmLayoutMode): 1 | 2 | 4 {
  switch (mode) {
    case 'native-swipe': return 1;
    case 'desktop-lut': return width >= 3000 ? 4 : width >= 1600 ? 2 : 1;
    case 'static': return width <= 1099 ? 1 : width >= 3000 ? 4 : width >= 1600 ? 2 : 1;
  }
}

/** Deterministic, side-effect-free planner. A conflict never authorizes crop or upscale. */
export function planHomeFilmLayout(input: FilmLayoutInput): FilmLayoutPlan {
  switch (input.frameHeightCssPx === FILM_FRAME_HEIGHT_CSS_PX &&
      input.sourceRevision.length > 0 && input.images.length > 0) {
    case false: throw new Error('FILM_LAYOUT_INPUT_INVALID: frame/source/images');
    case true: break;
  }
  requirePositiveFinite(input.containerWidthCssPx, 'container-width');
  requirePositiveFinite(input.devicePixelRatio, 'DPR');
  const gap = input.gapCssPx ?? 0;
  if (!Number.isFinite(gap) || gap < 0) throw new Error('FILM_LAYOUT_INPUT_INVALID: gap');
  const seen = new Set<string>();
  const ratios = input.images.map((image) => {
    requirePositiveFinite(image.intrinsicWidthPx, 'source-width');
    requirePositiveFinite(image.intrinsicHeightPx, 'source-height');
    requirePositiveFinite(image.approvedRenditionWidthPx, 'rendition-width');
    requirePositiveFinite(image.approvedRenditionHeightPx, 'rendition-height');
    if (seen.has(image.imageId)) throw new Error('FILM_LAYOUT_INPUT_INVALID: duplicate-image');
    seen.add(image.imageId);
    // A rendition cannot claim more real pixels than its verified source.
    if (image.approvedRenditionWidthPx > image.intrinsicWidthPx ||
        image.approvedRenditionHeightPx > image.intrinsicHeightPx) {
      throw new Error('FILM_LAYOUT_INPUT_INVALID: unverified-rendition');
    }
    const ratio = image.intrinsicWidthPx / image.intrinsicHeightPx;
    requirePositiveFinite(ratio, 'aspect-ratio');
    return ratio;
  });
  const target = targetCount(input.containerWidthCssPx, input.mode);
  const rowRatioSum = Array.from({length:target},(_,i)=>ratios[i%ratios.length]!).reduce((a,b)=>a+b,0);
  const available = input.containerWidthCssPx - gap * (target - 1);
  requirePositiveFinite(available, 'available-row-width');
  // Mobile intentionally exposes one full photo plus up to 0.5 neighboring photo.
  const rowHeightLimit = input.mode === 'native-swipe'
    ? input.containerWidthCssPx / (1.25 * ratios[0]!)
    : available / rowRatioSum;
  let height = Math.min(FILM_FRAME_HEIGHT_CSS_PX,rowHeightLimit);
  for (const [index,image] of input.images.entries()) {
    const ratio = ratios[index]!;
    height = Math.min(height,
      image.approvedRenditionWidthPx / (input.devicePixelRatio * ratio),
      image.approvedRenditionHeightPx / input.devicePixelRatio);
  }
  requirePositiveFinite(height, 'computed-height');
  let left = 0;
  const slots:FilmLayoutSlot[] = input.images.map((image,index) => {
    const widthCssPx = height * ratios[index]!;
    const slot:FilmLayoutSlot = {
      imageId:image.imageId,widthCssPx,heightCssPx:height,topCssPx:FILM_FRAME_HEIGHT_CSS_PX-height,
      presentationTopCssPx:0,leftCssPx:left,renditionId:image.renditionId,
    };
    left += widthCssPx+gap;
    return slot;
  });
  const cycleWidth = left-gap;
  let realized=0, consumed=0;
  // Check complete photographs only. Max is bounded independently of loop count.
  const physicalSlotLimit = input.mode==='native-swipe'?slots.length:slots.length*8;
  for(let i=0;i<physicalSlotLimit;i++){
    const width = slots[i%slots.length]!.widthCssPx;
    const next = consumed + width + (i===0?0:gap);
    if (next > input.containerWidthCssPx + 1e-7) break;
    consumed = next;realized++;
  }
  const unused = Math.max(0,input.containerWidthCssPx-consumed);
  const violated:string[]=[];
  if(input.mode!=='native-swipe' && realized!==target) violated.push('TARGET_FULL_VISIBLE_COUNT');
  if(input.mode==='native-swipe' && (realized!==1 || slots[0]!.widthCssPx < input.containerWidthCssPx/1.5)){
    violated.push('MOBILE_ONE_TO_ONE_POINT_FIVE_VISIBLE');
  }
  // The DPR bound may leave space; no image enlargement to fill it is permitted.
  if(input.mode!=='native-swipe' && height < rowHeightLimit-1e-7 &&
     target*height*(rowRatioSum/target)+gap*(target-1) < input.containerWidthCssPx-1e-5){
    violated.push('DPR_PIXEL_CAPACITY_VS_COVERAGE');
  }
  const revisionParts = [FILM_LAYOUT_REVISION,FILM_WIND_PRESENTATION_REVISION,input.sourceRevision,input.mode,
    input.containerWidthCssPx,input.devicePixelRatio,gap,
    ...input.images.flatMap((image,i)=>[image.imageId,image.intrinsicWidthPx,image.intrinsicHeightPx,
      image.approvedRenditionWidthPx,image.approvedRenditionHeightPx,image.renditionId??'source'])];
  return {
    layoutRevision:revisionParts.join('|'),frameHeightCssPx:FILM_FRAME_HEIGHT_CSS_PX,
    presentationRevision:FILM_WIND_PRESENTATION_REVISION,presentationHeightCssPx:height,
    containerWidthCssPx:input.containerWidthCssPx,devicePixelRatio:input.devicePixelRatio,
    mode:input.mode,slots,gapCssPx:gap,cycleWidthCssPx:cycleWidth,
    targetFullVisibleCount:target,realizedFullVisibleCount:realized,sourceCropCount:0,
    unapprovedUpscaleCount:0,unusedWidthCssPx:unused,
    constraintStatus:violated.length?'LAYOUT_CONSTRAINT_CONFLICT':'ADMITTED',violatedSoftGoals:violated,
  };
}

export function filmLayoutPixelCheck(plan: FilmLayoutPlan, images: readonly FilmLayoutImage[]): boolean {
  return plan.slots.every((slot,index)=>{
    const image=images[index];
    return image && Math.abs(slot.widthCssPx/slot.heightCssPx-image.intrinsicWidthPx/image.intrinsicHeightPx)<1e-10 &&
      slot.widthCssPx*plan.devicePixelRatio<=image.approvedRenditionWidthPx+1e-6 &&
      slot.heightCssPx*plan.devicePixelRatio<=image.approvedRenditionHeightPx+1e-6 &&
      slot.topCssPx>=-1e-8 && slot.heightCssPx<=FILM_FRAME_HEIGHT_CSS_PX;
  });
}

/** SMD_HOME_INTRO_VIEWPORT_FILL_R4. Explicit product presentation override.
 *  The 815px Figma source frame is immutable; painted viewport height is independent.
 *  Photo ratio is preserved, no crop, and insufficient source resolution is OBSERVED,
 *  never silently called pixel-exact or approved. The caller owns that product tradeoff.
 */
export function planFullViewportFilmLayout(
  input: FilmLayoutInput & { presentationHeightCssPx: number },
): FilmLayoutPlan {
  if (input.frameHeightCssPx !== FILM_FRAME_HEIGHT_CSS_PX ||
      !input.sourceRevision || !input.images.length) {
    throw new Error('FILM_VIEWPORT_FILL_SOURCE_INVALID');
  }
  requirePositiveFinite(input.containerWidthCssPx, 'viewport-width');
  requirePositiveFinite(input.devicePixelRatio, 'DPR');
  requirePositiveFinite(input.presentationHeightCssPx, 'viewport-height');
  const gap = input.gapCssPx ?? 0;
  if (!Number.isFinite(gap) || gap < 0) throw new Error('FILM_VIEWPORT_FILL_GAP_INVALID');
  const seen = new Set<FilmImageId>();
  let x = 0;
  let upscaleCount = 0;
  const height = input.presentationHeightCssPx;
  const slots:FilmLayoutSlot[] = input.images.map(image => {
    if (seen.has(image.imageId)) throw new Error('FILM_VIEWPORT_FILL_DUPLICATE_IMAGE');
    seen.add(image.imageId);
    for(const value of [image.intrinsicWidthPx,image.intrinsicHeightPx,
      image.approvedRenditionWidthPx,image.approvedRenditionHeightPx]) {
      requirePositiveFinite(value, 'image-dimensions');
    }
    if(image.approvedRenditionWidthPx>image.intrinsicWidthPx ||
       image.approvedRenditionHeightPx>image.intrinsicHeightPx){
      throw new Error('FILM_VIEWPORT_FILL_RENDITION_UNVERIFIED');
    }
    const width=height*image.intrinsicWidthPx/image.intrinsicHeightPx;
    if(width*input.devicePixelRatio>image.approvedRenditionWidthPx+1e-6 ||
       height*input.devicePixelRatio>image.approvedRenditionHeightPx+1e-6)upscaleCount++;
    const slot:FilmLayoutSlot={
      imageId:image.imageId,widthCssPx:width,heightCssPx:height,
      // Compatibility geometry: this is a VIEWPORT placement, not a change to source Y.
      topCssPx:0,presentationTopCssPx:0,leftCssPx:x,renditionId:image.renditionId,
    };
    x+=width+gap;
    return slot;
  });
  const cycleWidth=x-gap;
  const target=targetCount(input.containerWidthCssPx,input.mode);
  let realized=0,consumed=0;
  const maxSlots=input.mode==='native-swipe'?slots.length:slots.length*8;
  for(let i=0;i<maxSlots;i++){
    const next=consumed+slots[i%slots.length]!.widthCssPx+(i===0?0:gap);
    if(next>input.containerWidthCssPx+1e-7)break;
    consumed=next;realized++;
  }
  const violated:string[]=[];
  if(upscaleCount>0)violated.push('SOURCE_PIXEL_DENSITY_BELOW_VIEWPORT_REQUEST');
  if(input.mode!=='native-swipe'&&realized!==target)violated.push('TARGET_FULL_VISIBLE_COUNT_SUPERSEDED_BY_VIEWPORT_FILL');
  return {
    layoutRevision:[ 'FILM-INTRO-VIEWPORT-FILL-R4',input.sourceRevision,input.mode,
      input.containerWidthCssPx,height,input.devicePixelRatio,gap,
      ...input.images.map(i=>`${i.imageId}:${i.renditionId}:${i.intrinsicWidthPx}x${i.intrinsicHeightPx}`),
    ].join('|'),
    frameHeightCssPx:FILM_FRAME_HEIGHT_CSS_PX,
    presentationRevision:'FILM-INTRO-VIEWPORT-FILL-R4',
    presentationHeightCssPx:height,
    containerWidthCssPx:input.containerWidthCssPx,
    devicePixelRatio:input.devicePixelRatio,mode:input.mode,
    slots,gapCssPx:gap,cycleWidthCssPx:cycleWidth,
    targetFullVisibleCount:target,realizedFullVisibleCount:realized,
    sourceCropCount:0,unapprovedUpscaleCount:upscaleCount,
    unusedWidthCssPx:Math.max(0,input.containerWidthCssPx-consumed),
    constraintStatus:violated.length?'LAYOUT_CONSTRAINT_CONFLICT':'ADMITTED',
    violatedSoftGoals:violated,
  };
}

export function verifyFullViewportFilmCoverage(plan:FilmLayoutPlan,heightCssPx:number):boolean {
  return plan.presentationRevision==='FILM-INTRO-VIEWPORT-FILL-R4' &&
    Number.isFinite(heightCssPx)&&heightCssPx>0&&
    Math.abs(plan.presentationHeightCssPx-heightCssPx)<0.01 &&
    plan.sourceCropCount===0 &&
    plan.slots.every(s=>Math.abs(s.heightCssPx-heightCssPx)<0.01 &&
      s.presentationTopCssPx===0 && s.widthCssPx>0);
}
