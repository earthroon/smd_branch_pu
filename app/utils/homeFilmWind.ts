/** FILM-WIND-LUT-V1: build-time nonlinear speed, event-time WAAPI displacement. */
export type FilmWindSample={timeFraction:number;positionFraction:number;normalizedVelocity:number};
export type FilmWindLutV1={
 contract:'FILM-WIND-LUT-V1';modelRevision:'FILM-R13-NONLINEAR-WIND-R1';
 profileId:'r13-film-wind-v1';parentSpeedRevision:'FILM-SPEED-R3';parentSpeedSha256:string;
 unit:'normalized-time-and-distance';meanSpeedCssPxS:number;
 knots:readonly {u:number;q:number}[];samples:readonly FilmWindSample[];
 interpolation:'piecewise-linear-position';
 numericWitness:{sampleCount:number;minSlope:number;maxSlope:number;maxPositionResidual:number;
  maxVelocitySlopeResidual:number;normalizedIntegral:number;seamVelocityDifference:number};
 witnessDigest:string;admission:'CANDIDATE';contentSha256:string;
};
export type WindKeyframePoint={offset:number;distance:number};
export type WindBridgePlan={points:WindKeyframePoint[];originTimePhase:number;
 entryRate:number;exitRate:number;durationMs:number};
const speedSha='d3ce450cabe2f3d959ce2685499d171ded14e4208e56d039805825504e423e33';
const sha=/^[0-9a-f]{64}$/;
const canonicalKnots=[[0,1],[0.62,1.30],[0.85,3.40],[0.94,3.40],[1,1]] as const;
const requireFinite=(n:number,code:string)=>{if(!Number.isFinite(n))throw new Error(code);};

export function admitFilmWindLut(value:FilmWindLutV1):FilmWindLutV1{
 if(value.contract!=='FILM-WIND-LUT-V1'||value.modelRevision!=='FILM-R13-NONLINEAR-WIND-R1'||
    value.profileId!=='r13-film-wind-v1'||value.parentSpeedRevision!=='FILM-SPEED-R3'||
    value.parentSpeedSha256!==speedSha||value.unit!=='normalized-time-and-distance'||
    value.interpolation!=='piecewise-linear-position'||value.admission!=='CANDIDATE'||
    value.meanSpeedCssPxS!==193.2||!sha.test(value.witnessDigest)||!sha.test(value.contentSha256))
   throw new Error('FILM_WIND_LUT_REVISION_MISMATCH');
 if(value.knots.length!==canonicalKnots.length||
    value.knots.some((k,i)=>k.u!==canonicalKnots[i]![0]||k.q!==canonicalKnots[i]![1]))
   throw new Error('FILM_WIND_LUT_PROFILE_DRIFT');
 const samples=value.samples;
 if(samples.length<128||samples.length>2048||samples[0]?.timeFraction!==0||
    samples[0]?.positionFraction!==0||samples.at(-1)?.timeFraction!==1||
    samples.at(-1)?.positionFraction!==1||value.numericWitness.sampleCount!==samples.length)
   throw new Error('FILM_WIND_LUT_SAMPLES_INVALID');
 let min=Infinity,max=0;
 for(let i=0;i<samples.length;i++){
  const s=samples[i]!;
  if(![s.timeFraction,s.positionFraction,s.normalizedVelocity].every(Number.isFinite)||
    s.normalizedVelocity<=0)throw new Error('FILM_WIND_LUT_SAMPLES_INVALID');
  if(i===0)continue;
  const a=samples[i-1]!;
  const dt=s.timeFraction-a.timeFraction,dp=s.positionFraction-a.positionFraction;
  if(dt<=0||dp<=0)throw new Error('FILM_WIND_LUT_NONMONOTONE');
  const slope=dp/dt;min=Math.min(min,slope);max=Math.max(max,slope);
 }
 if(Math.abs(samples[0]!.normalizedVelocity-samples.at(-1)!.normalizedVelocity)>1e-10||
    max/min<1.2||max<1.5||!Number.isFinite(value.numericWitness.maxPositionResidual)||
    value.numericWitness.maxPositionResidual>0.00005||
    Math.abs(min-value.numericWitness.minSlope)>1e-9||
    Math.abs(max-value.numericWitness.maxSlope)>1e-9)throw new Error('FILM_WIND_LUT_WITNESS_INVALID');
 return value;
}
export async function verifyFilmWindLutDigest(value:FilmWindLutV1):Promise<boolean>{
 if(!globalThis.crypto?.subtle)throw new Error('FILM_WIND_DIGEST_UNAVAILABLE');
 const hash=async(body:unknown)=>{
  const data=new TextEncoder().encode(JSON.stringify(body));
  const digest=await globalThis.crypto.subtle.digest('SHA-256',data);
  return Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('');
 };
 const {contentSha256,...payload}=value;
 if(await hash({knots:value.knots,samples:value.samples,numericWitness:value.numericWitness})!==value.witnessDigest)
  return false;
 return await hash(payload)===contentSha256;
}
function timeSegment(table:readonly FilmWindSample[],u:number):number{
 let low=0,high=table.length-1;
 while(low+1<high){const mid=(low+high)>>>1;
  if(table[mid]!.timeFraction<=u)low=mid;else high=mid;}
 return Math.min(low,table.length-2);
}
function positionSegment(table:readonly FilmWindSample[],p:number):number{
 let low=0,high=table.length-1;
 while(low+1<high){const mid=(low+high)>>>1;
  if(table[mid]!.positionFraction<=p)low=mid;else high=mid;}
 return Math.min(low,table.length-2);
}
/** Evaluate precisely the piecewise-linear position *encoded* in WAAPI, not the analytic curve. */
export function windPositionAtTime(lut:FilmWindLutV1,time:number):number{
 requireFinite(time,'FILM_WIND_TIME_INVALID');
 const whole=Math.floor(time),fract=time-whole;
 const s=lut.samples,i=timeSegment(s,fract),a=s[i]!,b=s[i+1]!;
 const interp=(fract-a.timeFraction)/(b.timeFraction-a.timeFraction);
 return whole+a.positionFraction+(b.positionFraction-a.positionFraction)*interp;
}
export function windSlopeAtTime(lut:FilmWindLutV1,time:number):number{
 requireFinite(time,'FILM_WIND_TIME_INVALID');
 const fract=time-Math.floor(time),s=lut.samples,i=timeSegment(s,fract),a=s[i]!,b=s[i+1]!;
 return (b.positionFraction-a.positionFraction)/(b.timeFraction-a.timeFraction);
}
export function windTimeAtPosition(lut:FilmWindLutV1,positionFraction:number):number{
 requireFinite(positionFraction,'FILM_WIND_POSITION_INVALID');
 if(positionFraction<0||positionFraction>=1)throw new Error('FILM_WIND_POSITION_INVALID');
 const table=lut.samples,i=positionSegment(table,positionFraction),a=table[i]!,b=table[i+1]!;
 return a.timeFraction+(positionFraction-a.positionFraction)*(b.timeFraction-a.timeFraction)/
  (b.positionFraction-a.positionFraction);
}
function admitCycle(cycle:number){if(!Number.isFinite(cycle)||cycle<=0)throw new Error('FILM_WIND_CYCLE_INVALID');}

/** An arbitrary starting position shifts BOTH the time-phase and nonuniform keyframes. */
export function planWindLoop(lut:FilmWindLutV1,phaseCssPx:number,cycleCssPx:number):WindKeyframePoint[]{
 admitCycle(cycleCssPx);requireFinite(phaseCssPx,'FILM_WIND_POSITION_INVALID');
 if(phaseCssPx<0||phaseCssPx>=cycleCssPx)throw new Error('FILM_WIND_POSITION_INVALID');
 const origin=windTimeAtPosition(lut,phaseCssPx/cycleCssPx);
 const offsets=[0,1,...lut.samples.slice(1,-1).map(s=>{
  const delta=s.timeFraction-origin;
  return delta<=0?delta+1:delta;
 })].sort((a,b)=>a-b);
 const points:WindKeyframePoint[]=[];
 const start=windPositionAtTime(lut,origin);
 for(const offset of offsets){
  if(points.length&&offset-points[points.length-1]!.offset<1e-12)continue;
  const distance=offset===1?cycleCssPx:cycleCssPx*(windPositionAtTime(lut,origin+offset)-start);
  points.push({offset,distance:offset===0?0:distance});
 }
 if(points.at(-1)?.offset!==1||points.at(-1)?.distance!==cycleCssPx)
   throw new Error('FILM_WIND_LOOP_DISTANCE_INVALID');
 for(let i=1;i<points.length;i++){
  if(points[i]!.distance<=points[i-1]!.distance||points[i]!.offset<=points[i-1]!.offset)
   throw new Error('FILM_WIND_LOOP_NONMONOTONE');
 }
 return points;
}
const g5=(s:number)=>s**6-3*s**5+2.5*s**4;
/** Same phase field, time warped by a quintic progression during 600/1400/1100ms bridges. */
export function planWindBridge(lut:FilmWindLutV1,phaseCssPx:number,cycleCssPx:number,
 currentPhysicalVelocity:number,targetRate:number,durationMs:number,
 sampleOffsets:readonly number[]):WindBridgePlan{
 admitCycle(cycleCssPx);
 if(!Number.isFinite(phaseCssPx)||phaseCssPx<0||phaseCssPx>=cycleCssPx||
    ![currentPhysicalVelocity,targetRate,durationMs].every(Number.isFinite)||
    currentPhysicalVelocity<0||targetRate<0||targetRate>4||durationMs<=0)
   throw new Error('FILM_WIND_BRIDGE_INVALID');
 const origin=windTimeAtPosition(lut,phaseCssPx/cycleCssPx);
 const cycleDurationMs=cycleCssPx/lut.meanSpeedCssPxS*1000;
 const localWindSpeed=lut.meanSpeedCssPxS*windSlopeAtTime(lut,origin);
 const startRate=currentPhysicalVelocity/localWindSpeed;
 if(!Number.isFinite(startRate)||startRate>4)throw new Error('FILM_WIND_BRIDGE_RATE_INVALID');
 const points:WindKeyframePoint[]=sampleOffsets.map(offset=>{
  if(!Number.isFinite(offset)||offset<0||offset>1)throw new Error('FILM_WIND_BRIDGE_SAMPLES_INVALID');
  const delta=(durationMs/cycleDurationMs)*(startRate*offset+(targetRate-startRate)*g5(offset));
  const distance=cycleCssPx*(windPositionAtTime(lut,origin+delta)-windPositionAtTime(lut,origin));
  return {offset,distance};
 });
 if(points[0]?.offset!==0||points[0]?.distance!==0||points.at(-1)?.offset!==1)
   throw new Error('FILM_WIND_BRIDGE_SAMPLES_INVALID');
 for(let i=1;i<points.length;i++){
  if(points[i]!.offset<=points[i-1]!.offset||points[i]!.distance<points[i-1]!.distance)
   throw new Error('FILM_WIND_BRIDGE_SAMPLES_INVALID');
 }
 return {points,originTimePhase:origin,entryRate:startRate,exitRate:targetRate,durationMs};
}
export function sampleWindKeyframes(points:readonly WindKeyframePoint[],elapsedFraction:number,
 durationMs:number,playbackRate=1):{distance:number;velocityCssPxS:number}{
 if(points.length<2||!Number.isFinite(elapsedFraction)||!Number.isFinite(durationMs)||durationMs<=0||
    !Number.isFinite(playbackRate)||playbackRate<=0)throw new Error('FILM_WIND_SAMPLE_INVALID');
 const u=Math.max(0,Math.min(1,elapsedFraction));
 let left=0,right=points.length-1;
 while(left+1<right){const middle=(left+right)>>>1;
  if(points[middle]!.offset<=u)left=middle;else right=middle;}
 const a=points[left]!,b=points[left+1]!;
 const ratio=(u-a.offset)/(b.offset-a.offset),distance=a.distance+ratio*(b.distance-a.distance);
 const velocityCssPxS=(b.distance-a.distance)/(b.offset-a.offset)*1000/durationMs*playbackRate;
 return {distance,velocityCssPxS};
}
