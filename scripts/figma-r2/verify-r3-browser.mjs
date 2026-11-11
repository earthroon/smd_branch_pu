/** Optional local Nuxt runtime observation for R3 overrides. NOT a pixel parity gate. */
import {spawn} from 'node:child_process';
import {existsSync,readFileSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {randomUUID} from 'node:crypto';
const root=resolve(import.meta.dirname,'../..');
const args=process.argv.slice(2);
const getArg=(flag,def)=>{const i=args.indexOf(flag);return i>=0?args[i+1]:def};
const url=getArg('--url','http://127.0.0.1:3129/');
const out=resolve(getArg('--out',join(root,'docs/migration/smd-home-r2/visual-restore/browser-local/r3-browser-receipt.json')));
if(!/^https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?\//.test(url)){
 console.error('LOCAL_URL_ONLY');process.exit(2);
}
const paths=[process.env.SMD_CHROME_PATH,process.env.CHROME_PATH,
 process.env.PROGRAMFILES&&join(process.env.PROGRAMFILES,'Google/Chrome/Application/chrome.exe'),
 process.env.PROGRAMFILES&&join(process.env.PROGRAMFILES,'Microsoft/Edge/Application/msedge.exe'),
 process.env['PROGRAMFILES(X86)']&&join(process.env['PROGRAMFILES(X86)'],'Microsoft/Edge/Application/msedge.exe'),
 '/usr/bin/chromium','/usr/bin/google-chrome'].filter(Boolean);
const chrome=paths.find(existsSync);
if(!chrome){console.error('CHROME_MISSING');process.exit(2)}
const tmp=join(tmpdir(),`smd-r3-chromium-${randomUUID()}`);mkdirSync(tmp,{recursive:true});
const child=spawn(chrome,['--headless=new','--no-first-run','--no-default-browser-check',
 '--disable-extensions','--remote-debugging-port=0',`--user-data-dir=${tmp}`,'about:blank'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let ws,id=0;const inflight=new Map();
function cdp(method,params={}){return new Promise((accept,reject)=>{
 const n=++id;inflight.set(n,{accept,reject});ws.send(JSON.stringify({id:n,method,params}));
 setTimeout(()=>{if(inflight.has(n)){inflight.delete(n);reject(Error(`CDP_TIMEOUT ${method}`))}},20000).unref();
})}
const widths=[360,390,430,768,1024,1280,1440,1920,2560];
const keys=['node-18:114','node-1:61','node-18:116','node-18:115','node-1:62','node-18:117'];
async function getChromePort(){for(let i=0;i<100;i++){
 if(child.exitCode!==null)throw Error(`CHROME_EXIT ${child.exitCode}`);
 const f=join(tmp,'DevToolsActivePort');if(existsSync(f))return +readFileSync(f,'utf8').split(/\r?\n/)[0];
 await sleep(100);
}throw Error('DEVTOOLS_TIMEOUT')}
const expr=`(async()=>{
 await document.fonts.ready;
 const visible=e=>!!e&&!!e.getClientRects().length&&getComputedStyle(e).display!=='none';
 const lookup=(k,tag)=>document.querySelector('[data-figma-'+tag+'-instance="'+k+'"]');
 const textKeys=${JSON.stringify(keys)};
 const texts=textKeys.map((key,index)=>{
  const fo=lookup(key,'text');const run=fo?.querySelector('.smd-figma-native-text__runs span');
  return {key,visible:visible(fo),sourceDigest:fo?.getAttribute('data-source-text-digest'),
   override:fo?.getAttribute('data-user-visual-override'),
   size:run?getComputedStyle(run).fontSize:null,inkGate:fo?.getAttribute('data-ink-gate'),
   text:run?.textContent??null,expected:index<3?'36px':'24px'};
 });
 const refs=['node-1:52','node-1:482','node-1:501','node-1:555'].map(key=>{
  const img=lookup(key,'svg');return {key,visible:visible(img),
   override:img?.getAttribute('data-user-visual-override'),
   originalSha:img?.getAttribute('data-original-svg-sha256'),
   derivedSha:img?.getAttribute('data-derived-svg-sha256'),
   href:img?.getAttribute('href')||null,
   box:img?{x:img.getBoundingClientRect().x,y:img.getBoundingClientRect().y,
    w:img.getBoundingClientRect().width,h:img.getBoundingClientRect().height}:null};
 });
 const hidden=document.querySelector('.smd-home--figma-scene');
 return {width:document.documentElement.clientWidth,documentWidth:document.documentElement.scrollWidth,
   sceneVisible:visible(hidden),fontLoaded:[...document.fonts].some(f=>/Pretendard/i.test(f.family)&&f.status==='loaded'),
   texts,svg:refs,cf7:'BLOCKED_SOURCE_WITNESS',pixelParity:'NOT_RUN'};
})()`;
try{
 const port=await getChromePort();const pages=await(await fetch(`http://127.0.0.1:${port}/json/list`)).json();
 const page=pages.find(x=>x.type==='page');if(!page?.webSocketDebuggerUrl)throw Error('CHROME_PAGE_MISSING');
 ws=new WebSocket(page.webSocketDebuggerUrl);await new Promise((res,rej)=>{ws.addEventListener('open',res,{once:true});ws.addEventListener('error',rej,{once:true})});
 ws.addEventListener('message',event=>{const m=JSON.parse(event.data);if(m.id&&inflight.has(m.id)){
  const {accept,reject}=inflight.get(m.id);inflight.delete(m.id);m.error?reject(Error(JSON.stringify(m.error))):accept(m.result);
 }});
 await cdp('Page.enable');await cdp('Runtime.enable');
 const results=[];
 for(const width of widths){
  await cdp('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<=430});
  await cdp('Page.navigate',{url});
  for(let i=0;i<40;i++){
   const r=await cdp('Runtime.evaluate',{expression:'document.readyState',returnByValue:true});
   if(r.result?.value==='complete')break;await sleep(150);
  }
  await sleep(1200);
  const v=(await cdp('Runtime.evaluate',{expression:expr,awaitPromise:true,returnByValue:true})).result?.value;
  if(!v)throw Error(`PROBE_EMPTY ${width}`);
  const errors=[];
  if(!v.fontLoaded)errors.push('PRETENDARD_MISSING');
  if(v.documentWidth>v.width+2)errors.push('HORIZONTAL_OVERFLOW');
  if(width>=1100){
   if(!v.sceneVisible)errors.push('DESKTOP_SCENE_MISSING');
   for(const t of v.texts)if(!t.visible||t.size!==t.expected||t.override!=='USER_REQUESTED_METHODS_TEXT_SCALE_R3'||t.inkGate==='WINDOW_EXCEEDED')errors.push(`TEXT_${t.key}`);
   for(const a of v.svg)if(!a.visible||!a.override||!a.originalSha||(a.key!=='node-1:52'&&!a.derivedSha))errors.push(`SVG_${a.key}`);
  }
  results.push({width,...v,errors});
  console.log(`R3 ${width}px: ${errors.length?`FAIL ${errors.join(',')}`:'METRICS_OK'}; CF7 BLOCKED`);
 }
 mkdirSync(resolve(out,'..'),{recursive:true});writeFileSync(out,JSON.stringify({contract:'SMD_HOME_R2_VISUAL_REPAIR_R3',url,results,
   sourceClipWitness:'BLOCKED',originalFigmaPixelParity:'NOT_RUN',promotable:false},null,2)+'\n');
 if(results.some(r=>r.errors.length))process.exitCode=1;
 console.log('R3_BROWSER_RECEIPT_WRITTEN '+out);
}catch(e){console.error(e);process.exitCode=1}
finally{try{ws?.close()}catch{}child.kill();await sleep(250);rmSync(tmp,{recursive:true,force:true,maxRetries:3})}
