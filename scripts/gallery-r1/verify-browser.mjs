/** SMD-GALLERY-R1-CF4-CF5: read-only Chrome/Edge CDP browser observer.
 * This is not a CMS/Production test tool, a Figma pixel diff, or evidence of YouTube playback.
 * Usage: node scripts/gallery-r1/verify-browser.mjs --url http://127.0.0.1:3129/ --out artifacts/gallery-r1/receipt.json
 * Requires an explicitly local/staging URL, a working V3 Publication, and Chrome/Edge.
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

const args=process.argv.slice(2);
const argument=(name,def)=>{const i=args.indexOf(name);return i<0?def:args[i+1];};
const raw=argument('--url',process.env.SMD_GALLERY_R1_BROWSER_URL);
const out=resolve(argument('--out','artifacts/gallery-r1-cf5-browser/receipt.json'));
const sleep=ms=>new Promise(done=>setTimeout(done,ms));
const notRun=(code,reason)=>{
 console.error(`${code}: ${reason}`);
 process.exit(2);
};
if(!raw)notRun('NOT_RUN','SMD_GALLERY_R1_BROWSER_URL or --url is required');
let target;
try{target=new URL(raw)}catch{notRun('BROWSER_URL_INVALID',String(raw))}
const local=/^(localhost|127\.0\.0\.1)$/.test(target.hostname);
const staging=/(?:^|[.-])(?:staging|preview|test)(?:[.-]|$)/i.test(target.hostname);
if(!['https:','http:'].includes(target.protocol)||(!local&&!staging)||
   (!local&&target.protocol!=='https:')||target.username||target.password||
   target.search||target.hash||target.pathname!=='/')
 notRun('STAGING_OR_LOCAL_URL_REQUIRED',raw);
const base=target.origin+'/';
const candidates=[process.env.SMD_CHROME_PATH,process.env.CHROME_PATH,
 process.env.PROGRAMFILES&&join(process.env.PROGRAMFILES,'Google','Chrome','Application','chrome.exe'),
 process.env.PROGRAMFILES&&join(process.env.PROGRAMFILES,'Microsoft','Edge','Application','msedge.exe'),
 process.env['PROGRAMFILES(X86)']&&join(process.env['PROGRAMFILES(X86)'],'Microsoft','Edge','Application','msedge.exe'),
 '/usr/bin/chromium','/usr/bin/google-chrome'].filter(Boolean);
const executable=candidates.find(existsSync);
if(!executable)notRun('CHROME_OR_EDGE_NOT_FOUND','SMD_CHROME_PATH/CHROME_PATH');
const profile=join(tmpdir(),'smd-gallery-r1-'+randomUUID());
mkdirSync(profile,{recursive:true});
const child=spawn(executable,[
 '--headless=new','--no-first-run','--no-default-browser-check','--disable-extensions',
 '--remote-debugging-port=0',`--user-data-dir=${profile}`,
 ...(process.platform==='linux'&&process.getuid?.()===0?['--no-sandbox']:[]),'about:blank',
],{stdio:'ignore'});
let socket=null,seq=0;
const pending=new Map(),network=[],runtimeErrors=[],renderRequests=[];
const cdp=(method,params={})=>new Promise((done,reject)=>{
 const id=++seq,timer=setTimeout(()=>{pending.delete(id);reject(new Error(`CDP_TIMEOUT_${method}`))},45000);
 pending.set(id,{done,reject,timer});
 socket.send(JSON.stringify({id,method,params}));
});
async function port(){for(let i=0;i<100;i++){
 const f=join(profile,'DevToolsActivePort');
 if(existsSync(f))return Number(readFileSync(f,'utf8').split(/\r?\n/)[0]);
 if(child.exitCode!==null)throw new Error(`CHROME_EXIT_${child.exitCode}`);
 await sleep(100);
}throw new Error('CDP_PORT_UNAVAILABLE')}
async function evalJs(expression){
 const value=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
 if(value.exceptionDetails)throw new Error('BROWSER_EVAL_FAILED '+(value.exceptionDetails.text??''));
 return value.result?.value;
}
async function goto(path){
 const dest=new URL(path,base).href;
 const result=await cdp('Page.navigate',{url:dest});
 if(result.errorText)throw new Error(`NAVIGATE_${path}_${result.errorText}`);
 for(let i=0;i<100;i++){
  const ready=await evalJs(`document.readyState==='complete'&&location.href===${JSON.stringify(dest)}`);
  if(ready)return;
  await sleep(150);
 }
 throw new Error(`NAVIGATION_TIMEOUT_${path}`);
}
const PROBE=String.raw`(()=>{
 const q=s=>document.querySelector(s),rect=e=>{if(!e)return null;const b=e.getBoundingClientRect();return {x:b.x,y:b.y,width:b.width,height:b.height,right:b.right,bottom:b.bottom}};
 const frame=q('[data-figma-node="node-1:27"]');
 const cards=[...(frame?.querySelectorAll('.smd-gallery-card')??[])].map(c=>{
  const img=c.querySelector('img.smd-gallery-card__image'),poster=c.querySelector('[data-gallery-poster-state] img'),media=c.querySelector('.smd-gallery-card__media');
  return {entryOwner:c.getAttribute('data-gallery-owner'),kind:c.dataset.mediaKind,
   badge:c.querySelector('.smd-gallery-card__badge')?.textContent?.trim(),
   mediaRect:rect(media),mediaStatus:media?.getAttribute('data-gallery-media-state'),
   errorCode:c.querySelector('[data-gallery-error-code]')?.getAttribute('data-gallery-error-code')??null,
   staleImageEvents:Number(c.getAttribute('data-gallery-stale-image-events')??0),
   imageSrc:img?.getAttribute('src')??null,imageComplete:img?.complete??null,imageNaturalWidth:img?.naturalWidth??null,
   objectFit:img?getComputedStyle(img).objectFit:null,
   posterOrigin:c.querySelector('[data-gallery-poster-origin]')?.getAttribute('data-gallery-poster-origin')??null,
   posterState:c.querySelector('[data-gallery-poster-state]')?.getAttribute('data-gallery-poster-state')??null,
   posterSrc:poster?.getAttribute('src')??null,
   playerPhase:c.querySelector('[data-gallery-player-phase]')?.getAttribute('data-gallery-player-phase')??null,
   iframe:c.querySelector('iframe')?.getAttribute('src')??null};
 });
 const tabs=[...(frame?.querySelectorAll('[role="tab"]')??[])].map(e=>({id:e.id,label:e.textContent?.trim(),selected:e.getAttribute('aria-selected')}));
 const inner=q('.smd-gallery-frame2__inner');
 return {url:location.pathname,viewport:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,
  overflowPx:Math.max(0,document.documentElement.scrollWidth-document.documentElement.clientWidth),
  headerCount:document.querySelectorAll('.smd-site-header').length,footerCount:document.querySelectorAll('.smd-site-footer').length,
  framePresent:!!frame,frame:rect(frame),inner:rect(inner),
  headerHeight:rect(q('.smd-site-header'))?.height??null,
  publicationId:frame?.dataset.galleryPublicationId??null,publicationDigest:frame?.dataset.galleryPublicationDigest??null,
  filter:frame?.dataset.galleryActiveFilter??null,currentPage:Number(frame?.dataset.galleryCurrentPage??0),totalPages:Number(frame?.dataset.galleryTotalPages??0),
  tabs,cards,iframeCount:frame?.querySelectorAll('iframe').length??0,
  gridColumns:q('.smd-gallery-frame2__grid')?getComputedStyle(q('.smd-gallery-frame2__grid')).gridTemplateColumns.split(' ').filter(Boolean).length:0,
  activeUnderline:q('.smd-gallery-tabs__tab--active')?getComputedStyle(q('.smd-gallery-tabs__tab--active'),'::after').backgroundColor:null,
  noGlobalScale:frame?getComputedStyle(frame).transform==='none':null,
  fontLoaded:[...document.fonts].some(f=>/Pretendard/i.test(f.family)&&f.status==='loaded')};
})()`;
const LOAD_IMAGES=String.raw`(async()=>{
 await document.fonts.ready;
 const images=[...document.querySelectorAll('.smd-gallery-card__image, [data-gallery-poster-state] img')];
 for(const img of images)img.loading='eager';
 await Promise.all(images.map(img=>Promise.race([
  img.decode().then(()=>true,()=>false),
  new Promise(done=>setTimeout(()=>done(false),7000)),
 ])));
 await new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done)));
 return images.length;
})()`;
const widths=[1920,1440,1100,1099,768,700,699,390,320];
const samples=[],errors=[];
const receipt={contract:'SMD_GALLERY_R1_CF4_CF5_BROWSER_RECEIPT_V1',baseUrl:base,
 figmaFileKey:'aVzrXSUp4FrQ1dp7nKrSVI',figmaFrameNodeId:'1:27',
 publicationId:null,publicationDigest:null,viewports:samples,interactions:{status:'NOT_RUN'},
 routes:{videos:'NOT_RUN',homePreview:'NOT_RUN',historicalV2:'NOT_RUN'},
 media:{imageRequestCount:null,imageDecodeSuccessCount:null,imageLoadFailureCount:null,posterFailureCount:null,
  iframeMountedCount:null,playbackPhysicallyObserved:null,stalePlayerAfterFilterCount:null},
 visual:{figmaFrame2Status:'FIGMA_PIXEL_PARITY_NOT_RUN',geometryStatus:'NOT_RUN',maxAbsCssPx:null,dynamicMediaMaskedForParity:false},
 staticChecks:{ssrHydration:'NOT_RUN'},errors,productPromotion:false};
try{
 const p=await port();
 const pages=await (await fetch(`http://127.0.0.1:${p}/json/list`)).json();
 const page=pages.find(p=>p.type==='page');
 if(!page?.webSocketDebuggerUrl)throw new Error('CDP_PAGE_NOT_FOUND');
 socket=new WebSocket(page.webSocketDebuggerUrl);
 await new Promise((done,reject)=>{socket.addEventListener('open',done,{once:true});socket.addEventListener('error',reject,{once:true})});
 socket.addEventListener('message',ev=>{
  const msg=JSON.parse(ev.data);
  if(msg.method==='Network.requestWillBeSent'){
   const uri=msg.params?.request?.url??'';
   if(uri.includes('/api/render?'))renderRequests.push(uri);
  }
  if(msg.method==='Network.responseReceived'){
   const uri=msg.params?.response?.url??'';
   if(uri.includes('/api/archive/media/'))network.push({url:uri,status:msg.params.response.status,mimeType:msg.params.response.mimeType});
  }
  if(msg.method==='Runtime.exceptionThrown')runtimeErrors.push(msg.params.exceptionDetails?.text??'BROWSER_EXCEPTION');
  const handle=pending.get(msg.id);if(!handle)return;
  pending.delete(msg.id);clearTimeout(handle.timer);
  msg.error?handle.reject(new Error(JSON.stringify(msg.error))):handle.done(msg.result);
 });
 await cdp('Page.enable');await cdp('Runtime.enable');await cdp('Network.enable');
 // SSR truth: load one exact route with script disabled, then with hydration enabled.
 await cdp('Emulation.setDeviceMetricsOverride',{width:1920,height:1000,deviceScaleFactor:1,mobile:false});
 await cdp('Emulation.setScriptExecutionDisabled',{value:true});
 await goto('/archive');
 const server=await evalJs(PROBE);
 await cdp('Emulation.setScriptExecutionDisabled',{value:false});
 await goto('/archive');
 await evalJs(LOAD_IMAGES);
 const hydrated=await evalJs(PROBE);
 const snapshotKey=s=>JSON.stringify({pub:s.publicationId,digest:s.publicationDigest,filter:s.filter,
  page:s.currentPage,totalPages:s.totalPages,items:s.cards.map(x=>[x.entryOwner,x.kind,x.badge])});
 receipt.staticChecks.ssrHydration=server.framePresent&&hydrated.framePresent&&snapshotKey(server)===snapshotKey(hydrated)?'PASS':'FAIL';
 if(receipt.staticChecks.ssrHydration!=='PASS')errors.push('SSR_HYDRATION_MISMATCH_OR_V3_FIXTURE_MISSING');
 receipt.publicationId=hydrated.publicationId;
 receipt.publicationDigest=hydrated.publicationDigest;
 if(!hydrated.framePresent)errors.push('ARCHIVE_V3_FRAME2_NOT_FOUND');
 if(hydrated.cards.length===0)errors.push('ARCHIVE_V3_MEDIA_FIXTURE_EMPTY');
 const initialImageCount=hydrated.cards.filter(x=>x.kind==='photo').length;
 const initialVideoCount=hydrated.cards.filter(x=>x.kind==='video').length;
 if(initialImageCount===0||initialVideoCount===0)errors.push('MIXED_MEDIA_FIXTURE_REQUIRED_FOR_PLAYER_TEST');
 // UI event sequence exercises real Vue handlers and owner retirement, never CMS writes.
 const renderBefore=renderRequests.length;
 const interacted=await evalJs(String.raw`(()=>{
  const before=document.querySelector('.smd-gallery-card[data-media-kind="video"]');
  const target=before?.getAttribute('data-gallery-owner')??null;
  const play=before?.querySelector('button[aria-label$="영상 재생"]');
  play?.click();
  return {target,clicked:!!play,iframeAfterClick:!!before?.querySelector('iframe')};
 })()`);
 await sleep(160);
 const afterPlay=await evalJs(PROBE);
 await evalJs(`document.getElementById('smd-gallery-tab-video')?.click()`);
 await sleep(160);
 const switched=await evalJs(PROBE);
 await evalJs(`document.getElementById('smd-gallery-tab-photo')?.click()`);
 await sleep(160);
 const photo=await evalJs(PROBE);
 await evalJs(`document.getElementById('smd-gallery-tab-all')?.click()`);
 await sleep(160);
 const restored=await evalJs(PROBE);
 const matching=switched.cards.find(c=>c.entryOwner===interacted.target);
 const retired=interacted.clicked&&interacted.iframeAfterClick&&afterPlay.iframeCount>0&&
  switched.iframeCount===0&&photo.iframeCount===0&&restored.iframeCount===0&&
  matching===undefined; // full owner includes activeFilter; reusing the old key is forbidden
 const noFilterRenderFetch=renderRequests.length===renderBefore;
 receipt.interactions={status:retired&&noFilterRenderFetch?'PASS':'FAIL',
  videoClick:interacted,oldOwnerRetired:retired,noCmsRenderRefetch:noFilterRenderFetch,
  switchedVideoCount:switched.cards.length,photoCount:photo.cards.length,restoredCount:restored.cards.length};
 if(!retired)errors.push('PLAYER_OWNER_RETIRED_NOT_CONFIRMED');
 if(!noFilterRenderFetch)errors.push('FILTER_TRIGGERED_CMS_RENDER_REQUEST');
 // Restore initial all before viewport inspection.
 for(const width of widths){
  const dpr=width===1920||width===390?2:1;
  await cdp('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:dpr,mobile:width<=390});
  await sleep(150);
  await evalJs(LOAD_IMAGES);
  const measured=await evalJs(PROBE);
  const expectedCols=width>=1100?3:width>=700?2:1;
  const reasons=[];
  if(measured.overflowPx>0)reasons.push('HORIZONTAL_OVERFLOW');
  if(measured.headerCount!==1||measured.footerCount!==1)reasons.push('SHARED_CHROME_COUNT');
  if(!measured.framePresent)reasons.push('FRAME2_ABSENT');
  if(measured.gridColumns!==expectedCols&&measured.cards.length>0)reasons.push('GRID_COLUMN_DRIFT');
  if(measured.noGlobalScale!==true)reasons.push('GALLERY_TRANSFORM_DRIFT');
  for(const card of measured.cards){
   if(card.badge!==(card.kind==='photo'?'사진':'영상'))reasons.push('BADGE_KIND_CONFLICT');
   if(card.kind==='photo'&&card.objectFit!=='contain'&&card.mediaStatus!=='failed')reasons.push('IMAGE_CROP');
  }
  let screenshot=null;
  if([1920,1099,699,390,320].includes(width)){
   const metrics=await cdp('Page.getLayoutMetrics');
   const content=metrics.cssContentSize??metrics.contentSize;
   const clipHeight=Math.min(12000,Math.max(1,Math.ceil(content.height)));
   const shot=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,
    clip:{x:0,y:0,width:Math.ceil(content.width),height:clipHeight,scale:1}});
   // A long page can exceed the explicit screenshot budget; the receipt records it.
   if(content.height>clipHeight)errors.push(`${width}px: SCREENSHOT_HEIGHT_TRUNCATED`);
   screenshot=join(dirname(out),`gallery-${width}-dpr${dpr}.png`);
   mkdirSync(dirname(screenshot),{recursive:true});
   writeFileSync(screenshot,Buffer.from(shot.data,'base64'));
  }
  samples.push({width,dpr,...measured,expectedCols,reasons,screenshot});
  if(reasons.length)errors.push(`${width}px: ${reasons.join(',')}`);
 }
 const desktop=samples[0];
 const firstMedia=desktop?.cards[0]?.mediaRect;
 const delta=firstMedia&&desktop.inner ? [
  Math.abs(desktop.inner.width-1046),
  Math.abs(firstMedia.width-343.7843),
  Math.abs(firstMedia.height-305.8026),
  Math.abs(firstMedia.x-desktop.frame.x-437.9869),
 ] : [];
 receipt.visual.geometryStatus=delta.length?'OBSERVED_UNQUALIFIED':'NOT_RUN';
 receipt.visual.maxAbsCssPx=delta.length?Math.max(...delta):null;
 receipt.media.imageRequestCount=network.length;
 receipt.media.imageDecodeSuccessCount=desktop.cards.filter(x=>x.kind==='photo'&&x.mediaStatus==='ready').length;
 receipt.media.imageLoadFailureCount=desktop.cards.filter(x=>x.kind==='photo'&&x.mediaStatus==='failed').length;
 receipt.media.posterFailureCount=desktop.cards.filter(x=>x.kind==='video'&&x.posterState==='failed').length;
 receipt.media.iframeMountedCount=afterPlay.iframeCount;
 receipt.media.stalePlayerAfterFilterCount=switched.iframeCount;
 if(receipt.media.imageLoadFailureCount)errors.push('IMAGE_LOAD_FAILED');
 if(receipt.media.posterFailureCount)errors.push('POSTER_LOAD_FAILED');
 // Separate route contract witnesses. A staging publication may not have /videos.
 await goto('/videos');await sleep(250);
 const videos=await evalJs(PROBE);
 receipt.routes.videos=videos.headerCount===1&&videos.footerCount===1&&!videos.framePresent&&
   (await evalJs(`document.querySelector('h1')?.textContent?.trim()`))==='영상'?'PASS':'FAIL';
 if(receipt.routes.videos!=='PASS')errors.push('VIDEOS_ROUTE_INVALID');
 await goto('/');await sleep(250);
 const home=await evalJs(PROBE);
 receipt.routes.homePreview=home.headerCount===1&&home.footerCount===1&&!home.framePresent?'OBSERVED_UNQUALIFIED':'FAIL';
 if(receipt.routes.homePreview==='FAIL')errors.push('HOME_CHROME_OR_GALLERY_LEAK');
 receipt.networkArchiveMedia=network;
 receipt.cmsRenderRequests=renderRequests;
 receipt.browserExceptions=runtimeErrors;
 // iframe DOM is NOT evidence of actual remote YouTube playback.
 if(runtimeErrors.length)errors.push('BROWSER_RUNTIME_EXCEPTION');
} catch(error){errors.push(String(error?.message??error));process.exitCode=1}
finally{
 receipt.browserStatus=errors.length?'FAIL':'OBSERVED_UNQUALIFIED';
 receipt.visual.figmaFrame2Status='FIGMA_PIXEL_PARITY_NOT_RUN';
 receipt.media.playbackPhysicallyObserved=null;
 receipt.productPromotion=false;
 mkdirSync(dirname(out),{recursive:true});
 writeFileSync(out,JSON.stringify(receipt,null,2)+'\n');
 console.log(`SMD_GALLERY_R1_BROWSER_RECEIPT ${out} status=${receipt.browserStatus} errors=${errors.length}`);
 if(errors.length)console.error(errors.join('\n'));
 if(errors.length)process.exitCode=1;
 try{socket?.close()}catch{}
 for(const h of pending.values())clearTimeout(h.timer);
 child.kill();await sleep(300);rmSync(profile,{recursive:true,force:true,maxRetries:3});
}
