/// <reference lib="webworker" />
import {
  FILM_FOCUS_PROTOCOL, validateFilmFocusChunk,
  type FilmFocusRequest, type FilmFocusResponse, type FilmFocusRequestIdentity,
} from '../utils/homeFilmFocusAdmission.ts';

/** Optional, publication-admitted focus presenter. Never owns logical Commit or rail position. */
const scope=self as unknown as DedicatedWorkerGlobalScope;
const shader=`@group(0) @binding(0) var samp: sampler;
@group(0) @binding(1) var chunk: texture_2d<f32>;
struct Params { uv: vec4f };
@group(0) @binding(2) var<uniform> params:Params;
struct V { @builtin(position) position:vec4f, @location(0) uv:vec2f };
@vertex fn vs(@builtin(vertex_index) index:u32)->V {
  let p=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));
  var v:V;v.position=vec4f(p[index],0,1);
  v.uv=vec2f((p[index].x+1)*.5,1-(p[index].y+1)*.5);
  return v;
}
@fragment fn fs(v:V)->@location(0) vec4f {
  let texuv=mix(params.uv.xy,params.uv.zw,v.uv);
  return textureSample(chunk,samp,texuv);
}`;
let hostGeneration=0,deviceGeneration=0,focusGeneration=0;
let canvas:OffscreenCanvas|null=null,device:any=null,context:any=null,pipeline:any=null,sampler:any=null;
let currentAbort:AbortController|null=null,currentTexture:any=null;
let activeIdentity:FilmFocusRequestIdentity|null=null;
let pendingSubmissions=0,disposed=false;

function send(response:FilmFocusResponse):void { scope.postMessage(response); }
function fail(stage:string,reason:string,identity:Partial<FilmFocusRequestIdentity>={}):void {
  send({kind:'failed',stage,reason,identity});
}
function clearReadyTexture():void {currentTexture?.destroy();currentTexture=null;}
function cancelPending():void {
  currentAbort?.abort();currentAbort=null;
  activeIdentity=null;
  // Already-submitted textures remain owned by the in-flight submit promise.
  clearReadyTexture();
}
function current(identity:FilmFocusRequestIdentity):boolean {
  return !disposed&&hostGeneration===identity.hostGeneration&&
    deviceGeneration===identity.deviceGeneration&&focusGeneration===identity.focusGeneration&&
    activeIdentity===identity;
}
function reset():void {
  cancelPending();disposed=true;hostGeneration=0;canvas=null;
  device=null;context=null;pipeline=null;sampler=null;
}
async function initialize(m:Extract<FilmFocusRequest,{kind:'init'}>):Promise<void> {
  if(m.protocol!==FILM_FOCUS_PROTOCOL||!Number.isSafeInteger(m.hostGeneration)||m.hostGeneration<=0){
    fail('INIT','FILM_FOCUS_PROTOCOL_INVALID',{hostGeneration:m.hostGeneration});return;
  }
  if(canvas!==null||device!==null){fail('INIT','FILM_FOCUS_CANVAS_ALREADY_TRANSFERRED',{hostGeneration:m.hostGeneration});return;}
  disposed=false;hostGeneration=m.hostGeneration;focusGeneration=0;
  try {
    canvas=m.canvas;
    const gpu=(scope.navigator as any).gpu;
    const adapter=await gpu?.requestAdapter();
    if(!adapter)throw new Error('FILM_FOCUS_GPU_UNAVAILABLE');
    const nextDevice=await adapter.requestDevice();
    if(disposed||hostGeneration!==m.hostGeneration)return;
    device=nextDevice;
    const nextContext=canvas.getContext('webgpu');
    if(!nextContext)throw new Error('FILM_FOCUS_GPU_UNAVAILABLE');
    context=nextContext;
    const format=gpu.getPreferredCanvasFormat();
    context.configure({device,format,alphaMode:'premultiplied'});
    const module=device.createShaderModule({code:shader});
    pipeline=await device.createRenderPipelineAsync({layout:'auto',vertex:{module,entryPoint:'vs'},
      fragment:{module,entryPoint:'fs',targets:[{format}]},primitive:{topology:'triangle-list'}});
    if(disposed||hostGeneration!==m.hostGeneration)return;
    sampler=device.createSampler({magFilter:'linear',minFilter:'linear',addressModeU:'clamp-to-edge',addressModeV:'clamp-to-edge'});
    deviceGeneration++;
    const generation=deviceGeneration;
    void device.lost.then(()=>{
      if(disposed||hostGeneration!==m.hostGeneration||generation!==deviceGeneration)return;
      deviceGeneration++;cancelPending();
      fail('DEVICE','FILM_FOCUS_DEVICE_LOST',{hostGeneration:m.hostGeneration,deviceGeneration:generation});
    });
    send({kind:'ready',hostGeneration:m.hostGeneration,deviceGeneration:generation});
  }catch(error){
    fail('INIT',error instanceof Error?error.message:'FILM_FOCUS_GPU_UNAVAILABLE',
      {hostGeneration:m.hostGeneration});
    reset();
  }
}
async function render(m:Extract<FilmFocusRequest,{kind:'focus'}>):Promise<void> {
  const identity=m.identity;
  if(!identity||identity.hostGeneration!==hostGeneration||identity.deviceGeneration!==deviceGeneration||
     !device||!pipeline||!context||!canvas||disposed){
    fail('ADMISSION','FILM_FOCUS_STALE_RESULT',identity??{});return;
  }
  if(!Number.isSafeInteger(identity.focusGeneration)||identity.focusGeneration<=focusGeneration){
    fail('ADMISSION','FILM_FOCUS_STALE_RESULT',identity);return;
  }
  const validated=validateFilmFocusChunk(m.chunk,scope.location.origin);
  if(validated.kind==='rejected'||m.chunk.imageId!==identity.imageId||
      m.chunk.assetRevision!==identity.assetRevision||!identity.layoutRevision||
      !Number.isSafeInteger(identity.interactionGeneration)||identity.interactionGeneration<0){
    fail('ADMISSION',validated.kind==='rejected'?validated.reason:'FILM_FOCUS_CHUNK_REJECTED',identity);return;
  }
  const width=m.surfacePx?.width,height=m.surfacePx?.height;
  if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<=0||height<=0||
      width>device.limits.maxTextureDimension2D||height>device.limits.maxTextureDimension2D){
    fail('SIZE','FILM_FOCUS_OVERLAY_GEOMETRY_INVALID',identity);return;
  }
  if(pendingSubmissions>=2){fail('RESOURCE','FILM_FOCUS_RESOURCE_PRESSURE',identity);return;}
  cancelPending();focusGeneration=identity.focusGeneration;activeIdentity=identity;
  const controller=new AbortController();currentAbort=controller;
  let bitmap:ImageBitmap|undefined,texture:any=null,uvBuffer:any=null;
  let submitted=false;
  try {
    const response=await fetch(m.chunk.url,{signal:controller.signal,credentials:'same-origin'});
    if(!response.ok)throw new Error(`FILM_FOCUS_CHUNK_HTTP_${response.status}`);
    const bytes=await response.arrayBuffer();
    if(!current(identity))return;
    const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),
      n=>n.toString(16).padStart(2,'0')).join('');
    if(digest!==m.chunk.chunkSha256)throw new Error('FILM_FOCUS_CHUNK_DIGEST_MISMATCH');
    if(!current(identity))return;
    bitmap=await createImageBitmap(new Blob([bytes]));
    if(bitmap.width!==m.chunk.chunkWidthPx||bitmap.height!==m.chunk.chunkHeightPx){
      throw new Error('FILM_FOCUS_CHUNK_GEOMETRY_INVALID');
    }
    if(!current(identity))return;
    canvas.width=width;canvas.height=height;
    texture=device.createTexture({size:[bitmap.width,bitmap.height],format:'rgba8unorm',
      usage:4|2});
    device.queue.copyExternalImageToTexture({source:bitmap},{texture},[bitmap.width,bitmap.height]);
    bitmap.close();bitmap=undefined;
    uvBuffer=device.createBuffer({size:16,usage:64|8});
    device.queue.writeBuffer(uvBuffer,0,new Float32Array(m.chunk.uv));
    const bind=device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[
      {binding:0,resource:sampler},{binding:1,resource:texture.createView()},
      {binding:2,resource:{buffer:uvBuffer}}]});
    if(!current(identity))return;
    const encoder=device.createCommandEncoder();
    const pass=encoder.beginRenderPass({colorAttachments:[{
      view:context.getCurrentTexture().createView(),
      clearValue:{r:0,g:0,b:0,a:0},loadOp:'clear',storeOp:'store'}]});
    pass.setPipeline(pipeline);pass.setBindGroup(0,bind);pass.draw(3);pass.end();
    device.queue.submit([encoder.finish()]);submitted=true;pendingSubmissions++;
    // Submission completion is a one-shot lease, not a per-frame RAF barrier.
    await device.queue.onSubmittedWorkDone();
    if(current(identity)){
      currentTexture=texture;texture=null;
      send({kind:'rendered',identity});
    }
  }catch(error){
    if(current(identity)){
      cancelPending();
      fail('FOCUS',error instanceof Error?error.message:'FILM_FOCUS_CHUNK_REJECTED',identity);
    }
  }finally{
    bitmap?.close();texture?.destroy();uvBuffer?.destroy();
    if(submitted)pendingSubmissions--;
    if(currentAbort===controller)currentAbort=null;
  }
}
scope.onmessage=({data:m}:{data:FilmFocusRequest})=>{
  switch(m?.kind){
    case 'init':void initialize(m);return;
    case 'cancel':
      if(m.hostGeneration===hostGeneration&&m.focusGeneration>=focusGeneration){
        focusGeneration=m.focusGeneration;cancelPending();
      }
      return;
    case 'focus':void render(m);return;
    case 'dispose':if(m.hostGeneration===hostGeneration)reset();return;
    default:fail('PROTOCOL','FILM_FOCUS_PROTOCOL_INVALID');return;
  }
};
