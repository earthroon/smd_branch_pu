/** SMD Home R2 R4 local Chrome/Edge DOM + SVG + screenshot observer. */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID, createHash } from 'node:crypto';

const args=process.argv.slice(2);
const flag=(name,defaultValue)=>{const i=args.indexOf(name);return i<0?defaultValue:args[i+1];};
const url=flag('--url','http://127.0.0.1:3129/');
const output=resolve(flag('--out',resolve('docs/migration/smd-home-r2/visual-restore/browser-local/r4')));
if(!/^http:\/\/(?:127\.0\.0\.1|localhost):\d+\/$/.test(url)) {
  console.error('R4_LOCAL_URL_REQUIRED');process.exit(2);
}
const names=[process.env.SMD_CHROME_PATH,process.env.CHROME_PATH,
 process.env.PROGRAMFILES&&join(process.env.PROGRAMFILES,'Google/Chrome/Application/chrome.exe'),
 process.env.PROGRAMFILES&&join(process.env.PROGRAMFILES,'Microsoft/Edge/Application/msedge.exe'),
 process.env['PROGRAMFILES(X86)']&&join(process.env['PROGRAMFILES(X86)'],'Microsoft/Edge/Application/msedge.exe'),
 '/usr/bin/chromium','/usr/bin/google-chrome'].filter(Boolean);
const chrome=names.find(existsSync);
if(!chrome){console.error('R4_CHROME_NOT_FOUND: set SMD_CHROME_PATH');process.exit(2);}
const scratch=join(tmpdir(),`smd-r4-browser-${randomUUID()}`);
mkdirSync(scratch,{recursive:true});mkdirSync(output,{recursive:true});
const child=spawn(chrome,['--headless=new','--no-first-run','--no-default-browser-check',
 '--disable-extensions','--remote-debugging-port=0',`--user-data-dir=${scratch}`,
 ...(process.platform==='linux'&&process.getuid?.()===0?['--no-sandbox']:[]),'about:blank'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let socket,id=0;
const pending=new Map();
function cdp(method,params={}){
 return new Promise((resolve,reject)=>{
  const next=++id;
  const timer=setTimeout(()=>{if(pending.has(next)){pending.delete(next);reject(Error(`R4_CDP_TIMEOUT_${method}`));}},20000);
  pending.set(next,{resolve,reject,timer});
  socket.send(JSON.stringify({id:next,method,params}));
 });
}
async function devtoolsPort(){
 for(let i=0;i<120;i++){
  if(child.exitCode!==null)throw Error('R4_CHROME_EXIT '+child.exitCode);
  const f=join(scratch,'DevToolsActivePort');
  if(existsSync(f))return Number(readFileSync(f,'utf8').split(/\r?\n/)[0]);
  await sleep(100);
 }
 throw Error('R4_CHROME_DEBUG_PORT_TIMEOUT');
}
const expression=String.raw`(async()=>{
 await document.fonts.ready;
 await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
 const methods=document.querySelector('.smd-figma-scene-section--methods');
 const info=document.querySelector('.smd-figma-scene-section--info-bar');
 const visible=element=>!!element&&getComputedStyle(element).display!=='none'&&element.getClientRects().length>0;
 const id='data-figma-text-instance';
 const head=document.querySelector('foreignObject['+id+'="node-1:60"]');
 const title=head?.querySelector('.smd-figma-native-text__runs span');
 const headings=title?getComputedStyle(title):null;
 const keys=['node-18:115','node-1:62','node-18:117'];
 const body=keys.map(key=>{
   const element=document.querySelector('foreignObject['+id+'="'+key+'"]');
   const transform=element?getComputedStyle(element).transform:null;
   const matrix=transform&&transform!=='none'?new DOMMatrixReadOnly(transform):null;
   return {key,exists:!!element,visible:visible(element),transform,offsetY:matrix?matrix.m42:null,
     fontLoaded:[...document.fonts].some(f=>/Pretendard/i.test(f.family)&&f.status==='loaded')};
 });
 const icon=document.querySelector('image[data-r4-display-authority="USER_SUPPLIED_SVG_OVERRIDE_R4"]');
 const rect=icon?.getBoundingClientRect();
 const documentWidth=document.documentElement.scrollWidth;
 const viewportWidth=document.documentElement.clientWidth;
 return {width:window.innerWidth,viewportWidth,documentWidth,
   methodsVisible:visible(methods),infoVisible:visible(info),
   titleText:title?.textContent??null,titleWeight:headings?.fontWeight??null,
   titleFamily:headings?.fontFamily??null,body,
   icon:icon?{visible:visible(icon),src:icon.getAttribute('href'),source:icon.getAttribute('data-figma-svg-instance'),
     bytesSha256:icon.getAttribute('data-user-asset-sha256'),
     originalClip:icon.getAttribute('data-original-clip-qualification'),
     x:rect?.x,y:rect?.y,width:rect?.width,height:rect?.height}:null,
   fontLoaded:[...document.fonts].some(f=>/Pretendard/i.test(f.family)&&f.status==='loaded'),
   originalClipWitness:'BLOCKED_SOURCE_WITNESS',originalPixelParity:'NOT_RUN'};
})()`;
const widths=[360,390,430,768,1024,1280,1440,1920,2560];
let failed=false;
try{
 const response=await fetch(new URL('/figma-r2/user/file-01.svg',url));
 if(response.status!==200||!(response.headers.get('content-type')||'').includes('image/svg+xml'))throw Error(`R4_SVG_HTTP_INVALID ${response.status}`);
 const data=Buffer.from(await response.arrayBuffer());
 const hash=createHash('sha256').update(data).digest('hex');
 if(hash!=='a4f843efe53f1ceb8c6ef7276a6a2d51388b13f23588ca3662444c79054533cc')throw Error('R4_ASSET_HTTP_SHA_MISMATCH');
 const port=await devtoolsPort();
 const pages=await(await fetch(`http://127.0.0.1:${port}/json/list`)).json();
 const page=pages.find(p=>p.type==='page');
 if(!page?.webSocketDebuggerUrl)throw Error('R4_BROWSER_PAGE_UNAVAILABLE');
 socket=new WebSocket(page.webSocketDebuggerUrl);
 await new Promise((ok,no)=>{socket.addEventListener('open',ok,{once:true});socket.addEventListener('error',no,{once:true})});
 socket.addEventListener('message',e=>{
  const x=JSON.parse(e.data);if(x.id && pending.has(x.id)){
   const p=pending.get(x.id);pending.delete(x.id);clearTimeout(p.timer);
   x.error?p.reject(Error(JSON.stringify(x.error))):p.resolve(x.result);
  }
 });
 await cdp('Page.enable');await cdp('Runtime.enable');
 const results=[];
 for(const width of widths){
  await cdp('Emulation.setDeviceMetricsOverride',{width,height:1080,deviceScaleFactor:1,mobile:width<=430});
  const n=await cdp('Page.navigate',{url});if(n.errorText)throw Error(`R4_NAVIGATION_FAILED ${width} ${n.errorText}`);
  for(let i=0;i<70;i++){
   const state=await cdp('Runtime.evaluate',{expression:'document.readyState',returnByValue:true});
   if(state.result?.value==='complete')break;
   await sleep(120);
  }
  await sleep(1000);
  const result=await cdp('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});
  if(result.exceptionDetails)throw Error('R4_DOM_EVALUATION_FAILED '+JSON.stringify(result.exceptionDetails).slice(0,500));
  const value=result.result?.value;if(!value)throw Error(`R4_EMPTY_OBSERVATION ${width}`);
  const errors=[];
  if(value.documentWidth>value.viewportWidth+2)errors.push('HORIZONTAL_OVERFLOW');
  if(!value.fontLoaded)errors.push('PRETENDARD_NOT_LOADED');
  if(width>=1100){
   if(!value.methodsVisible||!value.infoVisible)errors.push('DESKTOP_SCENE_NOT_VISIBLE');
   if(value.titleWeight!=='600')errors.push('METHODS_TITLE_NOT_SEMIBOLD');
   if(!value.icon?.visible||value.icon.source!=='node-18:26'||value.icon.originalClip!=='BLOCKED_SOURCE_WITNESS')errors.push('USER_FILE_ICON_MISSING');
   for(const x of value.body)if(!x.visible||Math.abs((x.offsetY??0)+28)>0.1)errors.push('METHODS_BODY_OFFSET_'+x.key);
  }
  results.push({width,...value,errors});
  console.log(`R4 ${width}px: ${errors.length?'FAIL '+errors.join(', '):'BROWSER_METRICS_OK'}; CF7 original mask BLOCKED`);
  if(width===1920){
   for(const [selector,name] of [['.smd-figma-scene-section--methods','methods'],['.smd-figma-scene-section--info-bar','info-bar']]){
    await cdp('Runtime.evaluate',{expression:`document.querySelector(${JSON.stringify(selector)})?.scrollIntoView({block:'start'})`});
    await sleep(200);
    const screen=await cdp('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false});
    writeFileSync(join(output,`r4-${name}-1920.png`),Buffer.from(screen.data,'base64'));
   }
  }
 }
 writeFileSync(join(output,'r4-browser-receipt.json'),JSON.stringify({contract:'SMD_HOME_R2_VISUAL_REPAIR_R4',source:'LOCAL_DEV_FIXTURE',url,results,
   originalClipQualification:'BLOCKED_SOURCE_WITNESS',originalPixelParity:'NOT_RUN',productionQualified:false},null,2)+'\n');
 if(results.some(x=>x.errors.length))process.exitCode=1;
 console.log('R4_BROWSER_RECEIPT_WRITTEN '+join(output,'r4-browser-receipt.json'));
}catch(e){failed=true;console.error('R4_BROWSER_FAILED',e);process.exitCode=1;}
finally{
 try{socket?.close()}catch{}
 for(const p of pending.values()){clearTimeout(p.timer);p.reject(Error('R4_BROWSER_CLOSED'));}
 pending.clear();child.kill();await sleep(300);rmSync(scratch,{recursive:true,force:true,maxRetries:3});
}
