import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const sourceFile=resolve(root,'app/data/home-film-speed.json');
const destFile=resolve(root,'app/data/home-film-wind-lut.json');
const sha=(buf)=>createHash('sha256').update(buf).digest('hex');
const parentSha='d3ce450cabe2f3d959ce2685499d171ded14e4208e56d039805825504e423e33';
const knots=Object.freeze([
  {u:0,q:1}, {u:0.62,q:1.30}, {u:0.85,q:3.40},
  {u:0.94,q:3.40}, {u:1,q:1},
]);
const s5=(t)=>t*t*t*(10+t*(-15+6*t));
const g5=(t)=>t**6-3*t**5+2.5*t**4;
const round=(v)=>Number(v.toFixed(12));

function segmentData(){
 const segments=[];let integral=0;
 for(let i=0;i<knots.length-1;i++){
  const a=knots[i],b=knots[i+1];
  const area=(b.u-a.u)*(a.q+b.q)*0.5;
  segments.push({a,b,prefix:integral,area});integral+=area;
 }
 return {segments,normalization:integral};
}
const model=segmentData();
export function analyticWind(u){
 if(!Number.isFinite(u)||u<0||u>1) throw new Error('FILM_WIND_TIME_INVALID');
 const seg=model.segments.find(x=>u<=x.b.u)??model.segments.at(-1);
 const t=(u-seg.a.u)/(seg.b.u-seg.a.u),h=seg.b.u-seg.a.u;
 const q=seg.a.q+(seg.b.q-seg.a.q)*s5(t);
 const integral=seg.prefix+h*(seg.a.q*t+(seg.b.q-seg.a.q)*g5(t));
 return {position:u===1?1:integral/model.normalization,
  velocity:q/model.normalization};
}
export function buildWindLut(){
 const source=readFileSync(sourceFile);
 if(sha(source)!==parentSha)throw new Error('FILM_WIND_PARENT_SPEED_SHA_MISMATCH');
 const parent=JSON.parse(source.toString('utf8'));
 if(parent.base!==193.2 || parent.enterMs!==600 || parent.leaveMs!==1400 || parent.startMs!==1100)
  throw new Error('FILM_WIND_PARENT_SPEED_POLICY_MISMATCH');
 const times=[...new Set([...Array.from({length:513},(_,i)=>i/512),...knots.map(k=>k.u)])].sort((a,b)=>a-b);
 const samples=times.map(u=>{
  const {position,velocity}=analyticWind(u);
  return {timeFraction:round(u),positionFraction:round(position),normalizedVelocity:round(velocity)};
 });
 samples[0]={timeFraction:0,positionFraction:0,normalizedVelocity:round(analyticWind(0).velocity)};
 samples[samples.length-1]={timeFraction:1,positionFraction:1,normalizedVelocity:round(analyticWind(1).velocity)};
 let maxPositionResidual=0, maxVelocitySlopeResidual=0, minSlope=Infinity,maxSlope=0;
 for(let i=1;i<samples.length;i++){
  const a=samples[i-1],b=samples[i],dt=b.timeFraction-a.timeFraction;
  const slope=(b.positionFraction-a.positionFraction)/dt;
  if(!Number.isFinite(slope)||slope<=0)throw new Error('FILM_WIND_NONMONOTONE');
  minSlope=Math.min(minSlope,slope);maxSlope=Math.max(maxSlope,slope);
  const mid=(a.timeFraction+b.timeFraction)/2,ref=analyticWind(mid);
  maxPositionResidual=Math.max(maxPositionResidual,Math.abs((a.positionFraction+b.positionFraction)/2-ref.position));
  maxVelocitySlopeResidual=Math.max(maxVelocitySlopeResidual,Math.abs(slope-ref.velocity));
 }
 const numericWitness={sampleCount:samples.length,minSlope:round(minSlope),maxSlope:round(maxSlope),
  maxPositionResidual:round(maxPositionResidual),maxVelocitySlopeResidual:round(maxVelocitySlopeResidual),
  normalizedIntegral:round(model.normalization), seamVelocityDifference:round(Math.abs(samples[0].normalizedVelocity-samples.at(-1).normalizedVelocity))};
 const payload={contract:'FILM-WIND-LUT-V1',modelRevision:'FILM-R13-NONLINEAR-WIND-R1',
  profileId:'r13-film-wind-v1',parentSpeedRevision:'FILM-SPEED-R3',parentSpeedSha256:parentSha,
  unit:'normalized-time-and-distance',meanSpeedCssPxS:193.2,knots,samples,
  interpolation:'piecewise-linear-position',numericWitness,
  witnessDigest:sha(Buffer.from(JSON.stringify({knots,samples,numericWitness}))),admission:'CANDIDATE'};
 return {...payload,contentSha256:sha(Buffer.from(JSON.stringify(payload)))};
}
export const serializeWindLut=()=>JSON.stringify(buildWindLut(),null,2)+'\n';
const invoked=process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(invoked){
 const args=process.argv.slice(2);
 if(args.length!==1||!['--write','--check'].includes(args[0])){
  console.error('USAGE: node scripts/film/bake-nonlinear-loop.mjs --write|--check');process.exitCode=2;
 }else{
  try{
   const expected=serializeWindLut();
   if(args[0]==='--write'){writeFileSync(destFile,expected);console.log('FILM_WIND_LUT_V1_WRITTEN',buildWindLut().contentSha256);}
   else if(readFileSync(destFile,'utf8')!==expected){throw new Error('FILM_WIND_LUT_BYTES_MISMATCH');}
   else console.log('PASS_FILM_WIND_LUT_V1_READ_ONLY',buildWindLut().contentSha256);
  }catch(error){console.error(String(error));process.exitCode=1;}
 }
}
