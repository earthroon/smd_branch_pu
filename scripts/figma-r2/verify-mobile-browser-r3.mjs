/** Mobile R3 real Nuxt/CDP test. SOURCE/STATIC and live DOM are separate authorities. */
import {spawn} from 'node:child_process';
import {existsSync,readFileSync,writeFileSync,mkdirSync,rmSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {randomUUID,createHash} from 'node:crypto';
const args=process.argv.slice(2);
const argument=(name,defaultValue)=>{const i=args.indexOf(name);return i<0?defaultValue:args[i+1]};
const url=argument('--url','http://127.0.0.1:3129/');
const outfile=resolve(argument('--out','docs/migration/smd-home-r2/visual-restore/browser-local/mobile-r3-browser-receipt.json'));
if(!/^http:\/\/(?:127\.0\.0\.1|localhost):\d+\/$/.test(url))throw Error('LOCAL_PREVIEW_URL_REQUIRED');
const widths=[360,390,430,600,699,768,1024,1280,1440,1920];
const shots=new Set([360,390,430,768,1024,1920]);
const assets=[
 ['derived/calendar-mobile-r2.svg','d13a72b9faec0248076d58572146297b0eed3b1794aaef76725660e9dc33679f'],
 ['assets/asset-31e20f1fc3f43abb314fbe0ec3ee4a6c35997a8b10a51fefd68102a9775b4616.svg','31e20f1fc3f43abb314fbe0ec3ee4a6c35997a8b10a51fefd68102a9775b4616'],
 ['assets/asset-2b6d2381b996643b28e6926979f69304ca5572c50b047406d0c2a994c6acb595.svg','2b6d2381b996643b28e6926979f69304ca5572c50b047406d0c2a994c6acb595'],
];
for(const [path,digest] of assets){
 const r=await fetch(new URL('/figma-r2/'+path,url));
 if(r.status!==200)throw Error(`R3_ASSET_HTTP_FAILED ${path} ${r.status}`);
 const h=createHash('sha256').update(Buffer.from(await r.arrayBuffer())).digest('hex');
 if(h!==digest)throw Error(`R3_ASSET_HTTP_DIGEST_DRIFT ${path}`);
}
const browsers=[process.env.SMD_CHROME_PATH,process.env.CHROME_PATH,
 process.env.PROGRAMFILES&&join(process.env.PROGRAMFILES,'Google/Chrome/Application/chrome.exe'),
 process.env.PROGRAMFILES&&join(process.env.PROGRAMFILES,'Microsoft/Edge/Application/msedge.exe'),
 process.env['PROGRAMFILES(X86)']&&join(process.env['PROGRAMFILES(X86)'],'Microsoft/Edge/Application/msedge.exe'),
 '/usr/bin/chromium','/usr/bin/google-chrome'].filter(Boolean);
const binary=browsers.find(existsSync);
if(!binary)throw Error('CHROME_OR_EDGE_NOT_FOUND');
const userData=join(tmpdir(),'smd-mobile-r3-'+randomUUID());mkdirSync(userData,{recursive:true});
const chrome=spawn(binary,['--headless=new','--no-first-run','--no-default-browser-check','--disable-extensions',
 '--remote-debugging-port=0',`--user-data-dir=${userData}`,
 ...(process.platform==='linux'&&process.getuid?.()===0?['--no-sandbox']:[]),'about:blank'],{stdio:'ignore'});
const delay=ms=>new Promise(r=>setTimeout(r,ms));
let socket,id=0;const pending=new Map();
const cdp=(method,params={})=>new Promise((done,reject)=>{
 const key=++id;const timer=setTimeout(()=>{pending.delete(key);reject(Error(`CDP_TIMEOUT ${method}`))},20000);
 pending.set(key,{done,reject,timer});socket.send(JSON.stringify({id:key,method,params}));
});
async function findPort(){for(let i=0;i<120;i++){
 const f=join(userData,'DevToolsActivePort');if(existsSync(f))return Number(readFileSync(f,'utf8').split(/\r?\n/)[0]);
 if(chrome.exitCode!==null)throw Error(`CHROME_EXIT ${chrome.exitCode}`);
 await delay(100);
}throw Error('CHROME_CDP_PORT_UNAVAILABLE')}
const probe=String.raw`(async()=>{
 await document.fonts.ready;
 await Promise.all([...document.querySelectorAll('.smd-home--training-track img')].map(img=>img.decode().catch(()=>null)));
 await new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done)));
 const display=e=>e&&getComputedStyle(e);
 const visible=e=>Boolean(e&&e.getClientRects().length&&display(e).display!=='none'&&display(e).visibility!=='hidden');
 const rect=e=>{if(!e)return null;const r=e.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,w:r.width,h:r.height}};
 const section=document.querySelector('.smd-home--training-track');
 const grid=section?.querySelector('[data-mobile-training-layout="three-facts-r3"]');
 const cards=[...document.querySelectorAll('.smd-home--training-track [data-mobile-training-fact]')].map(item=>{
  const icon=item.querySelector('[data-training-icon]');const img=icon?.querySelector('img');
  const label=item.querySelector('.smd-training-fact-r2__label'),value=item.querySelector('.smd-training-fact-r2__value');
  return {id:item.getAttribute('data-mobile-training-fact'),visible:visible(item),icon:icon?.getAttribute('data-training-icon'),
   iconVisible:visible(icon),imgLoaded:img?img.complete&&img.naturalWidth>0:false,
   iconBox:rect(icon),box:rect(item),labelBox:rect(label),valueBox:rect(value),
   label:label?.textContent?.replace(/\s+/g,' ').trim()??'',value:value?.textContent?.replace(/\s+/g,' ').trim()??''};
 });
 const extraIcons=[...document.querySelectorAll('.smd-home--training-track [data-training-icon]')]
   .filter(e=>visible(e)&&!e.closest('[data-mobile-training-fact]')).map(e=>e.getAttribute('data-training-icon'));
 const old=section?.querySelector('.smd-home__training-tracks-original-r2');
 const mobile=section?.querySelector('[data-mobile-training-timeline],.smd-home__training-timeline-mobile-r2');
 const summary=section?.querySelector('[data-home-derived="training-timeline-summary-r2"]');
 const scene=document.querySelector('.smd-home--figma-scene');const reflow=document.querySelector('.smd-home--semantic-reflow');
 const info=document.querySelector('.smd-home--info-bar');const special=[...document.querySelectorAll('.smd-home--special-start .smd-home__special-point-r2')];
 return {viewport:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,
  sceneVisible:visible(scene),reflowVisible:visible(reflow),gridVisible:visible(grid),gridColumns:display(grid)?.gridTemplateColumns??null,
  cards,extraIcons,originalTimelineVisible:visible(old),mobileTimelineVisible:visible(mobile),mobileTimelineMounted:Boolean(mobile),
  derivedSummaryMounted:Boolean(summary),specialPoints:special.length,infoVisible:visible(info),
  infoCards:info?.querySelectorAll('.smd-home__fact').length??0,
  fontLoaded:[...document.fonts].some(face=>/Pretendard/i.test(face.family)&&face.status==='loaded')};
})()`;
let failed=false;
try{
 const port=await findPort();const pages=await(await fetch(`http://127.0.0.1:${port}/json/list`)).json();
 const page=pages.find(x=>x.type==='page');if(!page?.webSocketDebuggerUrl)throw Error('CDP_PAGE_MISSING');
 socket=new WebSocket(page.webSocketDebuggerUrl);
 await new Promise((res,rej)=>{socket.addEventListener('open',res,{once:true});socket.addEventListener('error',rej,{once:true})});
 socket.addEventListener('message',event=>{
  const m=JSON.parse(event.data);const p=pending.get(m.id);if(!p)return;pending.delete(m.id);clearTimeout(p.timer);
  m.error?p.reject(Error(JSON.stringify(m.error))):p.done(m.result);
 });
 await cdp('Page.enable');await cdp('Runtime.enable');
 const results=[];
 const screenshotDir=resolve(dirname(outfile),'mobile-r3-screenshots');mkdirSync(screenshotDir,{recursive:true});
 for(const width of widths){
  await cdp('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<=430});
  const nav=await cdp('Page.navigate',{url});if(nav.errorText)throw Error(`NAVIGATION_FAILED ${width} ${nav.errorText}`);
  for(let j=0;j<65;j++){
   const s=await cdp('Runtime.evaluate',{expression:`location.href===${JSON.stringify(url)} && document.readyState==='complete'`,returnByValue:true});
   if(s.result?.value===true)break;await delay(150);
  }
  await delay(700);
  const response=await cdp('Runtime.evaluate',{expression:probe,awaitPromise:true,returnByValue:true});
  if(response.exceptionDetails)throw Error(`PROBE_FAILED ${width} ${response.exceptionDetails.text}`);
  const v=response.result?.value;if(!v)throw Error(`PROBE_EMPTY ${width}`);
  const errors=[];
  if(v.scrollWidth>v.viewport+1)errors.push('HORIZONTAL_OVERFLOW');
  if(!v.fontLoaded)errors.push('PRETENDARD_NOT_LOADED');
  if(width<=1099&&v.cards.length!==3)errors.push('FACT_COUNT_NOT_THREE');
  if(v.derivedSummaryMounted||v.mobileTimelineMounted)errors.push('REMOVED_MOBILE_OWNER_STILL_MOUNTED');
  if(width<=1099){
   if(!v.reflowVisible||v.sceneVisible)errors.push('SEMANTIC_OWNER_MISMATCH');
   if(!v.infoVisible||v.infoCards!==4)errors.push('INFO_BAR_REGRESSION');
   if(v.specialPoints!==3)errors.push('SPECIAL_START_REGRESSION');
  }else if(!v.sceneVisible||v.reflowVisible)errors.push('DESKTOP_OWNER_MISMATCH');
  if(width<=699){
   if(!v.gridVisible)errors.push('MOBILE_GRID_NOT_VISIBLE');
   const expected=['node-1:102','node-1:479','node-1:484'];const icons=['duration','field','experience'];
   for(let i=0;i<3;i++){
    const c=v.cards[i];if(!c||c.id!==expected[i]||c.icon!==icons[i]||!c.visible||!c.iconVisible||!c.imgLoaded)
      errors.push(`MOBILE_FACT_${i}`);
    if(c?.iconBox&&c?.labelBox&&c.iconBox.bottom>c.labelBox.y+2)errors.push(`ICON_LABEL_ORDER_${i}`);
    if(c?.labelBox&&c?.valueBox&&c.labelBox.bottom>c.valueBox.y+2)errors.push(`LABEL_VALUE_ORDER_${i}`);
    if(c?.box&&c.valueBox&&(c.valueBox.right>c.box.right+2||c.valueBox.bottom>c.box.bottom+2))errors.push(`TEXT_CLIPPED_${i}`);
   }
   if(v.extraIcons.length)errors.push('STRAY_PICTOGRAM_ROW');
   if(v.originalTimelineVisible)errors.push('OLD_TIMELINE_VISIBLE');
   const [a,b,c]=v.cards;
   if([a,b,c].every(x=>x?.box)){
    const sameTop=Math.max(a.box.y,b.box.y,c.box.y)-Math.min(a.box.y,b.box.y,c.box.y)<=1;
    const sameWidth=Math.max(a.box.w,b.box.w,c.box.w)-Math.min(a.box.w,b.box.w,c.box.w)<=1;
    const separated=a.box.right<=b.box.x+1&&b.box.right<=c.box.x+1;
    if(!sameTop||!sameWidth||!separated)errors.push('THREE_COLUMNS_GEOMETRY');
   }else errors.push('MISSING_THREE_CARD_BOUNDS');
  }else if(width<=1099){
   if(!v.originalTimelineVisible)errors.push('TABLET_ORIGINAL_TIMELINE_MISSING');
  }
  let screenshot=null;
  if(shots.has(width)){
   const result=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
   screenshot=join(screenshotDir,`mobile-r3-${width}.png`);
   writeFileSync(screenshot,Buffer.from(result.data,'base64'));
  }
  console.log(`${width}px: ${errors.length?'FAIL '+errors.join(','):'MOBILE_R3_BROWSER_OK'}; facts=${v.cards.length} columns=${width<=699?'3':'not-mobile'}`);
  results.push({width,...v,errors,screenshot});
 }
 mkdirSync(dirname(outfile),{recursive:true});
 writeFileSync(outfile,JSON.stringify({contract:'SMD-HOME-R2-MOBILE-VUE3-R3-THREE-FACTS-ONLY',url,results,
  sourceQualification:'REQUIRES_STATIC_SCRIPT',figmaPixelParity:'NOT_RUN',productionPublication:'NOT_TESTED'},null,2)+'\n');
 console.log('MOBILE_R3_BROWSER_RECEIPT '+outfile);
 if(results.some(x=>x.errors.length)){process.exitCode=1;failed=true;}
}catch(error){failed=true;process.exitCode=1;console.error('MOBILE_R3_BROWSER_FAILED',error);}
finally{
 try{socket?.close()}catch{}
 for(const p of pending.values())clearTimeout(p.timer);
 pending.clear();chrome.kill();await delay(300);rmSync(userData,{recursive:true,force:true,maxRetries:3});
}
