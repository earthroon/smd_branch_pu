/** SMD_HOME_INTRO_VIEWPORT_FILL_R4 product browser witness.
 * The historical timing contract remains SMD_HOME_INTERACTION_R1.
 * Run against an already-started local Nuxt server. No deployment or page mutation.
 * Node 22+; Chrome / Edge headless with CDP over native WebSocket.
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID, createHash } from 'node:crypto';
import { readCdpEvaluateValue } from './cdp-evaluate-result.mjs';

const args = process.argv.slice(2);
const arg = (key, otherwise) => { const i = args.indexOf(key); return i >= 0 ? args[i + 1] : otherwise; };
const url = arg('--url', 'http://127.0.0.1:3000/');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const out = resolve(arg('--out', join(root, 'artifacts/smd-home-intro-viewport-fill-r4/browser-receipt.json')));
if (!/^https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?\/$/.test(url)) {
  throw new Error('SMD_INTRO_BROWSER_LOCAL_URL_ONLY');
}
const candidates = [process.env.SMD_CHROME_PATH, process.env.CHROME_PATH,
  process.env.PROGRAMFILES && join(process.env.PROGRAMFILES, 'Google/Chrome/Application/chrome.exe'),
  process.env.PROGRAMFILES && join(process.env.PROGRAMFILES, 'Microsoft/Edge/Application/msedge.exe'),
  process.env['PROGRAMFILES(X86)'] && join(process.env['PROGRAMFILES(X86)'], 'Microsoft/Edge/Application/msedge.exe'),
  '/usr/bin/chromium', '/usr/bin/google-chrome'].filter(Boolean);
const chrome = candidates.find(existsSync);
if (!chrome) throw new Error('SMD_INTRO_CHROME_NOT_FOUND: configure SMD_CHROME_PATH');
const temp = join(tmpdir(), `smd-intro-browser-${randomUUID()}`);
mkdirSync(temp, { recursive: true });
const child = spawn(chrome, ['--headless=new', '--no-sandbox', '--no-first-run', '--disable-extensions',
  '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${temp}`, 'about:blank'],
  { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let socket;
let sequence = 0;
const pending = new Map();
function cdp(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`SMD_INTRO_CDP_TIMEOUT ${method}`)); }, 15000);
    pending.set(id, { resolve: value => { clearTimeout(timeout); resolve(value); },
      reject: error => { clearTimeout(timeout); reject(error); } });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function getPort() {
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) throw new Error(`SMD_INTRO_CHROME_EXITED_${child.exitCode}`);
    const portFile = join(temp, 'DevToolsActivePort');
    if (existsSync(portFile)) return Number(readFileSync(portFile, 'utf8').split(/\r?\n/)[0]);
    await sleep(100);
  }
  throw new Error('SMD_INTRO_CHROME_DEBUG_PORT_TIMEOUT');
}
async function evaluate(expression) {
  const value = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  return readCdpEvaluateValue(value, 'SMD_INTRO');
}
async function measure() {
 return evaluate(`(() => {
   const roots=[...document.querySelectorAll('[data-intro-paint-contract="SMD_HOME_INTRO_VUE_PAINT_STACK_R3"]')];
   const root=roots.find(el=>el.getClientRects().length>0 &&
       el.getBoundingClientRect().width>0 && getComputedStyle(el).display!=='none');
   const frame=root?.querySelector('.smd-home-intro__paint-stack');
   const base=root?.querySelector('[data-intro-paint-owner="base"]');
   const film=root?.querySelector('.smd-hero-film');
   const track=film?.querySelector('.smd-hero-film__track');
   const overlay=root?.querySelector('[data-intro-paint-owner="overlay"]');
   const info=overlay?.firstElementChild;
   const items=[...root?.querySelectorAll('.smd-home-intro__item')??[]];
   const title=base?.querySelector('.smd-figma-scene-svg [data-figma-node="node-35:5"],.smd-home__hero-heading');
   const body=root?.closest('.smd-home')?.querySelector('.smd-home-body-stage, [data-home-section="special-start"]');
   const box=el=>{
     if(!el)return null;const r=el.getBoundingClientRect();
     return {x:r.x,y:r.y,left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};
   };
   const frameR=box(frame),baseR=box(base),filmR=box(track),overlayR=box(overlay);
   const header=box(document.querySelector('.smd-site-header'));
   const protectedNodes=[...base?.querySelectorAll(root?.dataset.introVariant==='figma'
     ? '.smd-figma-scene-section--hero [data-figma-kind="TEXT"]'
     : '.smd-home--hero h1,.smd-home--hero .font-label,.smd-home--hero .smd-home__hero-intro')??[]];
   const titleRects=protectedNodes.map(box).filter(r=>r&&r.width>0&&r.height>0);
   const titleOverlapArea=overlayR?titleRects.reduce((sum,r)=>sum+
     Math.max(0,Math.min(r.right,overlayR.right)-Math.max(r.left,overlayR.left)) *
     Math.max(0,Math.min(r.bottom,overlayR.bottom)-Math.max(r.top,overlayR.top)),0):null;
   const photoHeight=Number(film?.dataset.filmPaintedHeight??0);
   const photoR=filmR && Number.isFinite(photoHeight)?{...filmR,bottom:filmR.top+photoHeight,height:photoHeight}:null;
   const xOverlap=photoR&&overlayR?Math.max(0,Math.min(photoR.right,overlayR.right)-Math.max(photoR.left,overlayR.left)):0;
   const yOverlap=photoR&&overlayR?Math.max(0,Math.min(photoR.bottom,overlayR.bottom)-Math.max(photoR.top,overlayR.top)):0;
   const overlayStyle=overlay?getComputedStyle(overlay):null;
   return {
     activeOwners:roots.filter(el=>el.getClientRects().length && el.getBoundingClientRect().width>0).length,
     renderVariant:root?.dataset.introVariant??null,route:root?.dataset.introRoute??null,
     phase:root?.dataset.introPhase??null,admitted:root?.dataset.introAdmitted??null,
     admissionReason:root?.dataset.introAdmissionReason??null,
     overlayStatus:root?.dataset.introOverlayStatus??null,
     overlayReason:root?.dataset.introOverlayReason??null,
     visual:root?.dataset.introVisual??null,starts:Number(root?.dataset.introAnimationStarts??0),
     firstIntent:root?.dataset.introFirstIntent??null,releaseReason:root?.dataset.introReleaseReason??null,
     ignored:Number(root?.dataset.introIgnoredWheel??0),
     frame:frameR,base:baseR,film:filmR,photo:photoR,overlay:overlayR,info:box(info),title:box(title),body:box(body),
     header,titleRects,titleOverlapArea,viewportPaintContract:root?.dataset.introViewportContract??null,
     plannedPaintHeight:Number(root?.dataset.introPaintHeight),
     viewportFault:root?.dataset.introViewportFault??null,
     upscaleCount:Number(film?.dataset.filmSourcePixelUpscaleCount??-1),
     photoBottomGapPx:photoR?window.innerHeight-photoR.bottom:null,
     photoTopGapPx:photoR&&header?photoR.top-header.bottom:null,
     overlayPosition:overlayStyle?.position??null,overlayZ:overlayStyle?.zIndex??null,
     opacity:overlayStyle?Number(overlayStyle.opacity):null,
     flowExtent:frameR&&baseR?frameR.height-baseR.height:null,
     photoOverlapArea:xOverlap*yOverlap,
     whiteBandAttribution:frameR&&photoR?(frameR.bottom>photoR.bottom+1?
       {owner:'HERO_FRAME_UNPAINTED',heightCssPx:frameR.bottom-photoR.bottom}:
       {owner:'NONE',heightCssPx:0}):{owner:'UNKNOWN'},
     items:items.map(el=>({index:Number(el.dataset.introIconIndex),opacity:Number(getComputedStyle(el).opacity)})),
     scrollY:window.scrollY,viewport:[window.innerWidth,window.innerHeight],
     windLut:film?.dataset.filmWindRevision??null,
     errors:[...document.querySelectorAll('[data-intro-error]')].map(el=>el.dataset.introError),
   };
 })()`);
}
async function waitForDom() {
 for(let i=0;i<90;i++){
  const m=await measure();
  if(m.activeOwners===1 && m.overlayStatus==='admitted' && m.phase==='idle')return m;
  if(m.activeOwners===1 && m.overlayStatus==='blocked')return m;
  await sleep(100);
 }
 return measure();
}
async function navigate(width, height, touch) {
  await cdp('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: touch });
  await cdp('Emulation.setTouchEmulationEnabled', touch ? { enabled: true, maxTouchPoints: 5 } : { enabled: false });
  const navigation = await cdp('Page.navigate', { url });
  if (navigation.result?.errorText) throw new Error(`SMD_INTRO_NAVIGATION_FAILED ${navigation.result.errorText}`);
  await waitForDom();
}
async function wheel(width, height, deltaY = 320) {
  await cdp('Input.dispatchMouseEvent', { type: 'mouseWheel', x: Math.floor(width/2),
    y: Math.floor(height/2), deltaX: 0, deltaY });
}
async function capturePng(path) {
 const image=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
 const bytes=Buffer.from(image.result.data,'base64');
 mkdirSync(dirname(path),{recursive:true});writeFileSync(path,bytes);
 return {path,sha256:createHash('sha256').update(bytes).digest('hex')};
}
const screenshotDir=arg('--screenshots',null);
const results=[];
let failure=null;
try{
 const port=await getPort();
 const pages=await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
 const page=pages.find(p=>p.type==='page');
 if(!page?.webSocketDebuggerUrl)throw new Error('SMD_INTRO_CHROME_PAGE_MISSING');
 socket=new WebSocket(page.webSocketDebuggerUrl);
 await new Promise((res,rej)=>{socket.addEventListener('open',res,{once:true});socket.addEventListener('error',rej,{once:true});});
 socket.addEventListener('message',event=>{
  const response=JSON.parse(event.data);
  const job=pending.get(response.id);if(!job)return;
  pending.delete(response.id);
  response.error?job.reject(new Error(JSON.stringify(response.error))):job.resolve(response);
 });
 await cdp('Page.enable');await cdp('Runtime.enable');
 for(const [width,height,touch] of [
   [1920,1080,false],[3440,1440,false],[2048,688,false],[1366,768,false],
   [1100,768,false],[1099,768,false],[926,768,false],[390,844,true]]){
  await navigate(width,height,touch);
  const initial=await measure();
  const screenshots=[];
  if(screenshotDir) screenshots.push(await capturePng(resolve(screenshotDir,`${width}x${height}-initial.png`)));
  const errors=[];
  if(initial.activeOwners!==1)errors.push('INTRO_R4_PAINT_OWNER_DUPLICATE_OR_MISSING');
  if(initial.viewportPaintContract!=='SMD_HOME_INTRO_VIEWPORT_FILL_R4')errors.push('INTRO_R4_PAINT_CONTRACT_MISSING');
  if(initial.viewportFault)errors.push(initial.viewportFault);
  if(Math.abs(initial.photoBottomGapPx??Infinity)>1.5)errors.push('INTRO_R4_PHOTO_BOTTOM_GAP');
  if(Math.abs(initial.photoTopGapPx??Infinity)>1.5)errors.push('INTRO_R4_PHOTO_TOP_GAP');
  if(Math.abs((initial.photo?.height??0)-(initial.frame?.height??0))>1.5)errors.push('INTRO_R4_PHOTO_HEIGHT_MISMATCH');
  if(Math.abs((initial.frame?.height??0)-(initial.plannedPaintHeight??0))>1.5)errors.push('INTRO_R4_VUE_PAINT_HEIGHT_MISMATCH');
  if((initial.titleOverlapArea??Infinity)>0)errors.push('INTRO_R4_TITLE_OVERLAY_COLLISION');
  if(initial.route!=='vue-overlay')errors.push('INTRO_R3_WRONG_ROUTE');
  if(initial.overlayStatus!=='admitted')errors.push(initial.overlayReason??'INTRO_R3_GEOMETRY_UNAVAILABLE');
  if(initial.overlayPosition!=='absolute'||initial.overlayZ!=='3')errors.push('INTRO_R3_OVERLAY_PAINT_OWNER_INVALID');
  if(initial.opacity===null||initial.opacity>.01)errors.push('INTRO_R3_SSR_INITIAL_FLASH');
  if(initial.items.length!==4)errors.push('INTRO_R3_ICON_OWNER_COUNT_INVALID');
  if(initial.items.some(item=>item.opacity>.01))errors.push('INTRO_R3_ICON_INITIAL_FLASH');
  if(Math.abs(initial.flowExtent??Infinity)>.5)errors.push('INTRO_R3_INFO_FLOW_EXTENT_NONZERO');
  if(initial.overlayStatus==='admitted'&&initial.photoOverlapArea<=0)
    errors.push('INTRO_R3_OVERLAY_NO_INTERSECTION');
  if(errors.length===0){
   await wheel(width,height);
   await sleep(100);
   const onset=await measure();
   if(!touch){
     if(onset.starts!==1||onset.firstIntent!=='wheel')errors.push('INTRO_R3_FIRST_WHEEL_NOT_CONSUMED');
     if(Math.abs(onset.scrollY-initial.scrollY)>1)errors.push('INTRO_R3_WHEEL_MOVED_DOCUMENT');
   }
   await sleep(1450);
   const released=await measure();
   if(screenshotDir) screenshots.push(await capturePng(resolve(screenshotDir,`${width}x${height}-revealed.png`)));
   if(!touch){
     if(released.phase!=='released'||released.releaseReason!=='completed')errors.push('INTRO_R3_REVEAL_INCOMPLETE');
     if((released.opacity??0)<.999)errors.push('INTRO_R3_OVERLAY_NOT_VISIBLE');
     if(released.items.some(item=>item.opacity<.999))errors.push('INTRO_R3_ITEM_STAGGER_NOT_VISIBLE');
     if(initial.title && released.title && Math.abs(released.title.top-initial.title.top)>1)
       errors.push('INTRO_R3_TITLE_GEOMETRY_DRIFT');
     if(initial.body && released.body && Math.abs(released.body.top-initial.body.top)>1)
       errors.push('INTRO_R3_BODY_LAYOUT_SHIFT');
     if(Math.abs((released.frame?.height??0)-(initial.frame?.height??0))>1 ||
        Math.abs((released.base?.height??0)-(initial.base?.height??0))>1)
       errors.push('INTRO_R3_FRAME_GEOMETRY_DRIFT');
     if(released.photoOverlapArea<=0)errors.push('INTRO_R3_NO_PAINT_INTERSECTION_AFTER_REVEAL');
     if(released.starts!==1)errors.push('INTRO_R3_DUPLICATE_REVEAL');
     await wheel(width,height);
     await sleep(300);
     const next=await measure();
     if(next.scrollY<=released.scrollY+2)errors.push('INTRO_R3_NATIVE_SCROLL_NOT_RELEASED');
     results.push({width,height,touch,initial,onset,released,next,screenshots,errors});
   }else{
     results.push({width,height,touch,initial,onset,released,touchPhysical:'NOT_RUN',screenshots,errors});
   }
  }else results.push({width,height,touch,initial,screenshots,errors});
  console.log(`SMD INTRO R4 ${width}x${height}: ${errors.length? 'FAIL '+errors.join(','):'BROWSER_OK'}`);
 }
}catch(error){failure=String(error?.stack??error);console.error('SMD_INTRO_R4_BROWSER_BLOCKED',failure);}
finally{
 const report={contract:'SMD_HOME_INTRO_VIEWPORT_FILL_R4',url,
  status:failure?'BLOCKED':results.some(r=>r.errors.length)?'FAIL':'PASS',failure,
  nuxtBrowserGate:failure?'NOT_RUN':results.some(r=>r.errors.length)?'FAIL':'PASS',
  touchHardwarePhysical:'NOT_RUN',figmaPixelParity:'NOT_RUN',results};
 mkdirSync(dirname(out),{recursive:true});
 writeFileSync(out,JSON.stringify(report,null,2)+'\n');
 console.log(`SMD_INTRO_R4_BROWSER_RECEIPT ${out}`);
 socket?.close();child.kill();await sleep(300);
 rmSync(temp,{recursive:true,force:true,maxRetries:3});
 if(report.status!=='PASS')process.exitCode=1;
}
