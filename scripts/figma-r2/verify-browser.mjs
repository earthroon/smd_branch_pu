/**
 * V-R6 physical probe. Use after local Nuxt server is running, not a deployment script.
 *   node scripts/figma-r2/verify-browser.mjs --url http://127.0.0.1:3000
 * Uses Chrome DevTools Protocol with native Node WebSocket. No extra npm deps.
 * Captures 11 widths, tests live SVG HTTP responses, fonts, overflow and element counts.
 * A source Figma screenshot is STILL required for pixel parity.
 */
import {spawn} from 'node:child_process';
import {readFileSync,existsSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
const here=dirname(fileURLToPath(import.meta.url));
const root=resolve(here,'../..');
const args=process.argv.slice(2);
const arg=(name,otherwise)=>{const index=args.indexOf(name);return index>=0?args[index+1]:otherwise};
const url=arg('--url','http://127.0.0.1:3000/');
const output=resolve(arg('--out',join(root,'docs/migration/smd-home-r2/visual-restore/browser-local')));
const widths=[360,390,430,768,1024,1280,1440,1920,2560,3440,3840];
const findChrome=()=>{
 const candidates=[process.env.SMD_CHROME_PATH,process.env.CHROME_PATH,
  process.env.PROGRAMFILES&&join(process.env.PROGRAMFILES,'Google/Chrome/Application/chrome.exe'),
  process.env.PROGRAMFILES&&join(process.env.PROGRAMFILES,'Microsoft/Edge/Application/msedge.exe'),
  process.env['PROGRAMFILES(X86)']&&join(process.env['PROGRAMFILES(X86)'],'Microsoft/Edge/Application/msedge.exe'),
  '/usr/bin/chromium','/usr/bin/google-chrome'].filter(Boolean);
 return candidates.find(existsSync);
};
if(!/^https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?\//.test(url)){
 console.error('BROWSER_PROBE_LOCAL_URL_ONLY: pass a local Nuxt URL ending in /');process.exit(2);
}
const chrome=findChrome();if(!chrome){console.error('CHROME_NOT_FOUND: set SMD_CHROME_PATH to Chrome or Edge executable');process.exit(2);}
const temp=join(tmpdir(),`smd-figma-browser-${randomUUID()}`);mkdirSync(temp,{recursive:true});mkdirSync(output,{recursive:true});
const chromeProcess=spawn(chrome,['--headless=new','--no-first-run','--no-default-browser-check','--disable-extensions',
 '--remote-debugging-port=0',`--user-data-dir=${temp}`,'about:blank'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function getPort(){for(let i=0;i<100;i++){
  if(chromeProcess.exitCode!==null)throw new Error(`CHROME_EXIT ${chromeProcess.exitCode}`);
  const p=join(temp,'DevToolsActivePort');if(existsSync(p))return Number(readFileSync(p,'utf8').split(/\r?\n/)[0]);
  await sleep(100);
}throw new Error('CHROME_DEVTOOLS_PORT_TIMEOUT')}
let socket;let seq=0;const inflight=new Map();
function cdp(method,params={}){return new Promise((resolve,reject)=>{
 const id=++seq;inflight.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));
 setTimeout(()=>{if(inflight.has(id)){inflight.delete(id);reject(new Error(`CDP_TIMEOUT ${method}`))}},18000).unref();
})}
const browserState=async()=>cdp('Runtime.evaluate',{expression:`(async()=>{
 await document.fonts.ready;
 const scene=document.querySelector('.smd-home--figma-scene');
 const reflow=document.querySelector('.smd-home--semantic-reflow');
 const sceneVisible=scene&&getComputedStyle(scene).display!=='none';
 const reflowVisible=reflow&&getComputedStyle(reflow).display!=='none';
 const visible=element=>{if(!element)return false;let p=element;while(p){if(getComputedStyle(p).display==='none')return false;p=p.parentElement}return element.getBoundingClientRect().width>0};
 const images=[...document.querySelectorAll('[data-figma-svg-instance]')].filter(visible);
 const text=[...document.querySelectorAll('[data-figma-text-instance]')].filter(visible);
 const fontFaces=[...document.fonts].filter(f=>/Pretendard/i.test(f.family)).map(f=>({family:f.family,status:f.status,weight:f.weight}));
 const requests=[...new Set(images.map(i=>i.getAttribute('href')||i.getAttribute('xlink:href')).filter(Boolean))];
 const missing=[];
 for(const src of requests){try{const r=await fetch(src,{cache:'no-store'});if(r.status!==200||!(r.headers.get('content-type')||'').includes('image/svg+xml'))missing.push({src,status:r.status,mime:r.headers.get('content-type')});}
 catch(e){missing.push({src,error:String(e)})}}
 return {path:location.pathname,sceneVisible,reflowVisible,images:images.length,text:text.length,uniqueSvgUrls:requests.length,svgResponseFailures:missing,
  documentWidth:document.documentElement.scrollWidth,viewportWidth:document.documentElement.clientWidth,
  fontFaces,fontLoaded:fontFaces.some(f=>f.status==='loaded'),hasR2MediaSlots:document.querySelectorAll('[data-media-slot]').length,
  brokenOriginalFaq:!![...document.querySelectorAll('[data-figma-text-instance]')].some(e=>/^=+$/.test(e.textContent.trim())),
  renderQualification:scene?.getAttribute('data-original-render-qualification')??null,
  ctaLink:!!document.querySelector('a.smd-scene-cta-hitbox[href],.smd-home__consultation-link[href]')}
})()`,awaitPromise:true,returnByValue:true});
try{
 const port=await getPort();const pages=await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
 const page=pages.find(x=>x.type==='page');if(!page?.webSocketDebuggerUrl)throw new Error('CHROME_PAGE_NOT_AVAILABLE');
 socket=new WebSocket(page.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true})});
 socket.addEventListener('message',event=>{const v=JSON.parse(event.data);if(v.id&&inflight.has(v.id)){const {resolve,reject}=inflight.get(v.id);inflight.delete(v.id);v.error?reject(new Error(JSON.stringify(v.error))):resolve(v.result)}});
 await cdp('Page.enable');await cdp('Runtime.enable');
 const results=[];
 for(const width of widths){
  await cdp('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<=430});
  await cdp('Page.navigate',{url});
  for(let attempt=0;attempt<30;attempt++){
   const s=await cdp('Runtime.evaluate',{expression:'document.readyState',returnByValue:true});
   if(s.result?.value==='complete')break;await sleep(180);
  }
  await sleep(1500); // CMS content may hydrate asynchronously; observation records actual currentness.
  const status=(await browserState()).result?.value;
  if(!status)throw new Error(`BROWSER_OBSERVATION_MISSING ${width}`);
  // Capture the entire scrollable page, not only the first 900px hero viewport.
  const layout=await cdp('Page.getLayoutMetrics');
  const pageHeight=Math.ceil(layout.cssContentSize?.height??layout.contentSize?.height??0);
  if(pageHeight<900||pageHeight>30000)throw new Error(`SCENE_PAGE_HEIGHT_INVALID ${width} ${pageHeight}`);
  const screenshot=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,fromSurface:true,
    clip:{x:0,y:0,width,height:pageHeight,scale:1}});
  writeFileSync(join(output,`${width}.png`),Buffer.from(screenshot.data,'base64'));
  const errors=[];if(status.documentWidth>status.viewportWidth+2)errors.push('HORIZONTAL_OVERFLOW');
  if(status.svgResponseFailures.length)errors.push('SVG_RESPONSE_FAILURE');
  if(status.brokenOriginalFaq)errors.push('LITERAL_FAQ_PLACEHOLDER');
  if(!status.fontLoaded)errors.push('PRETENDARD_NOT_LOADED');
  if(width>=1100&&(!status.sceneVisible||status.images<65))errors.push('DESKTOP_SCENE_INCOMPLETE');
  if(width<1100&&!status.reflowVisible)errors.push('RESPONSIVE_REFLOW_INVISIBLE');
  results.push({width,fullPageHeight:pageHeight,...status,errors});
  console.log(`${width}px: ${errors.length?'FAIL '+errors.join(', '):'BROWSER_METRICS_OK'} (${status.images} SVG nodes, font ${status.fontLoaded?'loaded':'missing'})`);
 }
 const receipt={contract:'SMD_FIGMA_VR6_BROWSER_OBSERVATION',url,widths,results,
  pixelParity:'NOT_RUN',originalMaskQualification:'BLOCKED',promotionAllowed:false};
 writeFileSync(join(output,'browser-receipt.json'),JSON.stringify(receipt,null,2)+'\n');
 const errors=results.flatMap(r=>r.errors);
 if(errors.length)process.exitCode=1;
 console.log('BROWSER_OBSERVATION_WRITTEN; ORIGINAL FIGMA PIXEL PARITY STILL NOT_RUN');
}catch(e){console.error(e);process.exitCode=1}
finally{try{socket?.close()}catch{}chromeProcess.kill();await sleep(300);rmSync(temp,{force:true,recursive:true,maxRetries:3});}
