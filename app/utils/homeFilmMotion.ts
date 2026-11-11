import { filmTap } from './homeFilmInput.ts';
import type { FilmImageId } from './homeFilmSelection.ts';

/** Product transport and selection are separate authorities. */
export type FilmHorizontalTransport =
  | { kind: 'desktop-lut'; generation: number; layoutRevision: number }
  | { kind: 'native-swipe'; generation: number; layoutRevision: number }
  | { kind: 'static'; generation: number; reason: 'hidden' | 'reduced-motion' };

export type FilmMotionPlan =
  | { kind: 'desktop-lut'; generation: number; profileId: string; speedRevision: 'FILM-SPEED-R3';
      lutRevision: string; anchorCssX: number; phaseCssPx: number; targetCssPxPerSec: number;
      rateBin: number; rate: number }
  | { kind: 'native-swipe'; generation: number; layoutRevision: number }
  | { kind: 'mobile-bezier'; generation: number; imageId: FilmImageId }
  | { kind: 'static'; generation: number; reason: 'hidden' | 'reduced-motion' };

export type FilmPointerObservation = {
  pointerId: number;
  motionGeneration: number;
  layoutRevision: number;
  x: number;
  y: number;
  atMs: number;
  emaX: number;
  emaY: number;
};

export type PointerPolicy = {
  emaTauMs: number;
  minDtMs: number;
  maxDtMs: number;
  idleResetMs: number;
  coalesceMs: number;
  hysteresisFraction: number;
};

export type BakedMotionRateLut = {
  contract: 'FILM-R13-RESTORE-CF3';
  revision: string;
  parentSpeedRevision: 'FILM-SPEED-R3';
  parentSpeedSha256: string;
  unit: 'css-px-per-second';
  status: 'CANDIDATE_NOT_PHYSICALLY_ADMITTED';
  policy: PointerPolicy;
  bins: Array<{ direction: -1 | 0 | 1; lower: number; upper: number; profileId: string; rate: number }>;
  hysteresis: { enter: number[]; leave: number[] };
  positionVelocityWitnessDigest: string;
  contentSha256: string;
};

export type FilmRateDecision = { profileId: string; bin: number; rate: number; direction: -1 | 0 | 1 };
export type FilmViewportAnchor = {
  imageId: FilmImageId;
  fraction: number;
  viewportCssX: number;
};
export type FilmSlotRect = { imageId: FilmImageId; left: number; right: number; top: number; bottom: number };

export type NativeTouchGesture =
  | { kind: 'idle' }
  | { kind: 'candidate'; pointerId: number; generation: number; imageId: FilmImageId;
      startX: number; startY: number; startTime: number; startScrollLeft: number;
      maxDistance: number; observedScroll: boolean }
  | { kind: 'scrolling'; pointerId: number; generation: number; axis: 'horizontal' | 'vertical' }
  | { kind: 'cancelled'; generation: number; reason: string };

export type FilmInputCapability = {
  fineHover: boolean;
  actualPointerType: 'mouse' | 'touch' | null;
};
/** Layout width does not own the input transport. A real touch temporarily owns native scroll. */
export function filmMotionMode(viewportWidth:number,visible:boolean,reduced:boolean,
  input:FilmInputCapability={fineHover:false,actualPointerType:null}):
  'desktop-lut' | 'native-swipe' | 'static' {
  switch (visible && Number.isFinite(viewportWidth) && viewportWidth>0) {
    case false:return 'static';
    case true:
      switch (input.actualPointerType) {
        case 'touch':return 'native-swipe'; // Reduced motion still permits native touch scrolling.
        case 'mouse':return reduced?'static':'desktop-lut';
        case null:return input.fineHover?(reduced?'static':'desktop-lut'):'native-swipe';
      }
  }
}

export function startFilmPointerObservation(
  e: { pointerId: number; clientX: number; clientY: number; timeStamp: number },
  motionGeneration: number, layoutRevision: number,
): FilmPointerObservation {
  if (![e.pointerId,e.clientX,e.clientY,e.timeStamp].every(Number.isFinite)) {
    throw new Error('FILM_MOTION_POINTER_NONFINITE');
  }
  return { pointerId:e.pointerId, motionGeneration, layoutRevision, x:e.clientX, y:e.clientY,
    atMs:e.timeStamp, emaX:0, emaY:0 };
}

export function observeFilmPointer(
  prev: FilmPointerObservation,
  e: { pointerId: number; clientX: number; clientY: number; timeStamp: number },
  policy: PointerPolicy,
  motionGeneration: number, layoutRevision: number,
): { kind: 'accepted' | 'reset' | 'ignored'; sample: FilmPointerObservation; reason?: string } {
  if (prev.motionGeneration !== motionGeneration || prev.layoutRevision !== layoutRevision ||
      prev.pointerId !== e.pointerId) {
    return { kind:'ignored', sample:prev, reason:'FILM_MOTION_GENERATION_STALE' };
  }
  if (![e.clientX,e.clientY,e.timeStamp].every(Number.isFinite)) {
    return { kind:'ignored', sample:prev, reason:'FILM_MOTION_POINTER_NONFINITE' };
  }
  const dt = e.timeStamp - prev.atMs;
  if (dt <= 0) return { kind:'ignored', sample:prev, reason:'FILM_MOTION_POINTER_TIME_INVALID' };
  if (dt > policy.maxDtMs) {
    return { kind:'reset', sample:startFilmPointerObservation(e,motionGeneration,layoutRevision),
      reason:'FILM_MOTION_POINTER_GAP_RESET' };
  }
  if (dt < Math.max(policy.minDtMs,policy.coalesceMs))
    return { kind:'ignored', sample:prev, reason:'FILM_MOTION_POINTER_COALESCED' };
  const alpha = 1 - Math.exp(-dt / policy.emaTauMs);
  const vx = (e.clientX-prev.x)*1000/dt;
  const vy = (e.clientY-prev.y)*1000/dt;
  const emaX = (1-alpha)*prev.emaX + alpha*vx;
  const emaY = (1-alpha)*prev.emaY + alpha*vy;
  if (![emaX,emaY].every(Number.isFinite)) {
    return { kind:'ignored', sample:prev, reason:'FILM_MOTION_POINTER_NONFINITE' };
  }
  return { kind:'accepted', sample:{...prev,x:e.clientX,y:e.clientY,atMs:e.timeStamp,emaX,emaY} };
}

export function idleFilmPointer(prev: FilmPointerObservation, nowMs: number, policy: PointerPolicy): FilmPointerObservation {
  if (!Number.isFinite(nowMs) || nowMs < prev.atMs) {
    throw new Error('FILM_MOTION_POINTER_TIME_INVALID');
  }
  const gap = nowMs - prev.atMs;
  if (gap >= policy.idleResetMs) return { ...prev, emaX:0, emaY:0, atMs:nowMs };
  const attenuation = Math.exp(-gap/policy.emaTauMs);
  return {...prev,emaX:prev.emaX*attenuation,emaY:prev.emaY*attenuation,atMs:nowMs};
}

const pinnedSpeedSha256 = 'd3ce450cabe2f3d959ce2685499d171ded14e4208e56d039805825504e423e33';
const sha256 = /^[0-9a-f]{64}$/;

export function admitFilmRateLut(lut: BakedMotionRateLut): BakedMotionRateLut {
  if (lut.contract!=='FILM-R13-RESTORE-CF3' ||
      lut.parentSpeedRevision!=='FILM-SPEED-R3' || lut.parentSpeedSha256!==pinnedSpeedSha256 ||
      lut.unit!=='css-px-per-second' || lut.status!=='CANDIDATE_NOT_PHYSICALLY_ADMITTED' ||
      !sha256.test(lut.positionVelocityWitnessDigest) || !sha256.test(lut.contentSha256)) {
    throw new Error('FILM_MOTION_LUT_REVISION_MISMATCH');
  }
  const policy=lut.policy;
  if (![policy.emaTauMs,policy.minDtMs,policy.maxDtMs,policy.idleResetMs,
        policy.coalesceMs,policy.hysteresisFraction].every(Number.isFinite) ||
      policy.emaTauMs<=0 || policy.minDtMs<=0 || policy.maxDtMs<=policy.minDtMs ||
      policy.idleResetMs<=policy.maxDtMs || policy.coalesceMs<=0 ||
      policy.hysteresisFraction<0 || policy.hysteresisFraction>=0.5) {
    throw new Error('FILM_MOTION_LUT_POLICY_INVALID');
  }
  if (lut.bins.length<3 || lut.bins[0]?.direction!==0 || lut.bins[0]?.rate!==1 ||
      lut.bins[0]?.lower!==0 || lut.bins[0]?.upper!==0) {
    throw new Error('FILM_MOTION_LUT_BINS_INVALID');
  }
  for (const sign of [-1,1] as const) {
    const entries=lut.bins.filter(b=>b.direction===sign);
    if (entries.length<2 || entries[0]?.lower!==0) throw new Error('FILM_MOTION_LUT_BINS_INVALID');
    for (let i=0;i<entries.length;i++) {
      const b=entries[i]!;
      if (![b.lower,b.upper,b.rate].every(Number.isFinite) || b.rate<=0 ||
          b.upper<=b.lower || !b.profileId ||
          (i>0 && b.lower!==entries[i-1]?.upper)) throw new Error('FILM_MOTION_LUT_BINS_INVALID');
    }
  }
  if (lut.bins.some(b=>b.direction!==-1&&b.direction!==0&&b.direction!==1) ||
      lut.bins.filter(b=>b.direction===0).length!==1 ||
      lut.hysteresis.enter.length!==lut.hysteresis.leave.length ||
      lut.hysteresis.enter.some((x,i)=> !Number.isFinite(x)|| x!==lut.hysteresis.leave[i])) {
    throw new Error('FILM_MOTION_LUT_BINS_INVALID');
  }
  return lut;
}

/** SHA-256 is verified asynchronously before the candidate can touch WAAPI. */
export async function verifyFilmRateLutDigest(lut: BakedMotionRateLut): Promise<boolean> {
  const { contentSha256, ...payload }=lut;
  if (!globalThis.crypto?.subtle) throw new Error('FILM_MOTION_LUT_DIGEST_UNAVAILABLE');
  const bytes=new TextEncoder().encode(JSON.stringify(payload));
  const digest=new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256',bytes));
  return Array.from(digest,b=>b.toString(16).padStart(2,'0')).join('')===contentSha256;
}

export function rateForFilmPointer(
  lut: BakedMotionRateLut, sample: FilmPointerObservation,
  previous: FilmRateDecision | null,
): FilmRateDecision {
  const magnitude=Math.hypot(sample.emaX,sample.emaY);
  const direction: -1 | 0 | 1= Math.abs(sample.emaX)<0.5 ? 0 : sample.emaX<0 ? -1 : 1;
  const zero=lut.bins[0]!;
  if (!Number.isFinite(magnitude)) throw new Error('FILM_MOTION_RATE_NONFINITE');
  if (direction===0) return { bin:0, profileId:zero.profileId, direction:0, rate:zero.rate };
  if (previous?.direction===direction) {
    const b=lut.bins[previous.bin];
    const h=lut.policy.hysteresisFraction;
    if (b && b.direction===direction && magnitude>=b.lower*(1-h) && magnitude<b.upper*(1+h)) {
      return previous;
    }
  }
  const index=lut.bins.findIndex(b=>b.direction===direction && magnitude>=b.lower && magnitude<b.upper);
  if (index<0) throw new Error('FILM_MOTION_RATE_NONFINITE: out-of-range pointer velocity');
  const b=lut.bins[index]!;
  return { bin:index, profileId:b.profileId, direction, rate:b.rate };
}

/** Same logical image and fractional local coordinate across desktop/native layout changes. */
export function captureFilmViewportAnchor(
  slots: readonly FilmSlotRect[], viewportCssX: number, viewportCssY: number,
): FilmViewportAnchor | null {
  if (![viewportCssX,viewportCssY].every(Number.isFinite)) return null;
  for (const slot of slots) {
    if (slot.right<=slot.left || slot.bottom<=slot.top) continue;
    if (viewportCssX>=slot.left && viewportCssX<slot.right &&
        viewportCssY>=slot.top && viewportCssY<slot.bottom) {
      return { imageId:slot.imageId, fraction:(viewportCssX-slot.left)/(slot.right-slot.left), viewportCssX };
    }
  }
  return null;
}

export function positionFilmAnchor(
  anchor: FilmViewportAnchor, slots: readonly FilmSlotRect[],
  trackLeft: number, currentScrollLeft: number,
  cycleWidth: number | null, maxScrollLeft: number,
): number {
  const slot=slots.find(r=>r.imageId===anchor.imageId);
  if (!slot || !Number.isFinite(slot.left) || slot.right<=slot.left ||
      ![trackLeft,currentScrollLeft,maxScrollLeft,anchor.fraction,anchor.viewportCssX].every(Number.isFinite) ||
      anchor.fraction<0 || anchor.fraction>1) throw new Error('FILM_MOTION_ANCHOR_UNRESOLVED');
  const absolute=slot.left+anchor.fraction*(slot.right-slot.left)-anchor.viewportCssX+currentScrollLeft;
  if (cycleWidth===null) return Math.max(0,Math.min(maxScrollLeft,absolute));
  if (!Number.isFinite(cycleWidth)||cycleWidth<=0) throw new Error('FILM_MOTION_ANCHOR_UNRESOLVED');
  return ((absolute%cycleWidth)+cycleWidth)%cycleWidth;
}

export function startNativeFilmGesture(
  pointerId: number, generation: number, imageId: FilmImageId,
  x: number, y: number, atMs: number, scrollLeft: number,
): NativeTouchGesture {
  if (![pointerId,generation,x,y,atMs,scrollLeft].every(Number.isFinite))
    throw new Error('FILM_TOUCH_GESTURE_INVALID');
  return {kind:'candidate',pointerId,generation,imageId,startX:x,startY:y,
    startTime:atMs,startScrollLeft:scrollLeft,maxDistance:0,observedScroll:false};
}

export function moveNativeFilmGesture(
  state: NativeTouchGesture, pointerId: number, generation: number, x: number, y: number,
): NativeTouchGesture {
  if (state.kind!=='candidate' || state.pointerId!==pointerId || state.generation!==generation) return state;
  if (![x,y].every(Number.isFinite)) return {kind:'cancelled',generation,reason:'FILM_TOUCH_GESTURE_INVALID'};
  const dx=x-state.startX,dy=y-state.startY;
  const distance=Math.hypot(dx,dy);
  if (distance>8) return {kind:'scrolling',pointerId,generation,axis:Math.abs(dx)>=Math.abs(dy)?'horizontal':'vertical'};
  return {...state,maxDistance:Math.max(state.maxDistance,distance)};
}

export function nativeFilmGestureScrolled(state: NativeTouchGesture, generation: number): NativeTouchGesture {
  return state.kind==='candidate'&&state.generation===generation?{...state,observedScroll:true}:state;
}

export function endNativeFilmGesture(
  state:NativeTouchGesture,pointerId:number,generation:number,x:number,y:number,
  atMs:number,scrollLeft:number,finalImageId:FilmImageId|null,
):{kind:'tap';imageId:FilmImageId}|{kind:'not-tap';reason:string} {
  if (state.kind!=='candidate'||state.generation!==generation||state.pointerId!==pointerId)
    return {kind:'not-tap',reason:'FILM_TOUCH_GESTURE_STALE'};
  if (finalImageId!==state.imageId) return {kind:'not-tap',reason:'FILM_TOUCH_GESTURE_IDENTITY_DRIFT'};
  const distance=Math.max(state.maxDistance,Math.hypot(x-state.startX,y-state.startY));
  if (state.observedScroll || !filmTap(distance,atMs-state.startTime,scrollLeft-state.startScrollLeft))
    return {kind:'not-tap',reason:'FILM_TOUCH_SWIPE_NOT_TAP'};
  return {kind:'tap',imageId:state.imageId};
}
