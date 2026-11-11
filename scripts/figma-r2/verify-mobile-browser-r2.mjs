/** Mobile R2 real Nuxt Chromium DOM/asset audit. NOT an Figma pixel-parity certificate. */
import {spawn} from 'node:child_process';
import {existsSync, readFileSync, writeFileSync, mkdirSync, rmSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {randomUUID,createHash} from 'node:crypto';
const args=process.argv.slice(2);
const arg=(flag,fallback)=>{const idx=args.indexOf(flag);return idx<0?fallback:args[idx+1]};
const base=arg('--url','http://127.0.0.1:3129/');
const output=resolve(arg('--out','docs/migration/smd-home-r2/visual-restore/browser-local/mobile-r2-browser-receipt.json'));
if(!/^http:\/\/(?:127\.0\.0\.1|localhost):\d+\/$/.test(base))throw Error('LOCAL_PREVIEW_URL_REQUIRED');
const root=resolve(import.meta.dirname,'../..');
const assets=[
 ['derived/calendar-mobile-r2.svg','d13a72b9faec0248076d58572146297b0eed3b1794aaef76725660e9dc33679f'],
 ['derived/chevron-mobile-r2.svg','14eed2bf83479784db04d4d118b93fe3005fa3bd1e6cc6678c35a8edc32bc9af'],
 ['assets/asset-31e20f1fc3f43abb314fbe0ec3ee4a6c35997a8b10a51fefd68102a9775b4616.svg','31e20f1fc3f43abb314fbe0ec3ee4a6c35997a8b10a51fefd68102a9775b4616'],
 ['assets/asset-2b6d2381b996643b28e6926979f69304ca5572c50b047406d0c2a994c6acb595.svg','2b6d2381b996643b28e6926979f69304ca5572c50b047406d0c2a994c6acb595'],
];
for(const [path,expected] of assets){
 const response=await fetch(new URL('/figma-r2/'+path,base));
 if(response.status!==200)throw Error(`MOBILE_R2_HTTP_ASSET_UNAVAILABLE ${path} ${response.status}`);
 const digest=createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex');
 if(digest!==expected)throw Error(`MOBILE_R2_HTTP_ASSET_DRIFT ${path}`);
}
const browsers=[process.env.SMD_CHROME_PATH,process.env.CHROME_PATH,
 process.env.PROGRAMFILES&&join(process.env.PROGRAMFILES,'Google/Chrome/Application/chrome.exe'),
 process.env.PROGRAMFILES&&join(process.env.PROGRAMFILES,'Microsoft/Edge/Application/msedge.exe'),
 process.env['PROGRAMFILES(X86)']&&join(process.env['PROGRAMFILES(X86)'],'Microsoft/Edge/Application/msedge.exe'),
 '/usr/bin/chromium','/usr/bin/google-chrome'].filter(Boolean);
const binary=browsers.find(existsSync);
if(!binary)throw Error('CHROME_OR_EDGE_NOT_FOUND');
const work=join(tmpdir(),'smd-mobile-r2-'+randomUUID());mkdirSync(work,{recursive:true});
const browser=spawn(binary,['--headless=new','--no-first-run','--no-default-browser-check',
 '--disable-extensions','--remote-debugging-port=0',`--user-data-dir=${work}`,
 ...(process.platform==='linux'&&process.getuid?.()===0?['--no-sandbox']:[]),'about:blank'],{stdio:'ignore'});
const delay=ms=>new Promise(done=>setTimeout(done,ms));
let socket,sequence=0;const pending=new Map();
async function port(){for(let n=0;n<120;n++){
 if(browser.exitCode!==null)throw Error(`CHROME_EXIT ${browser.exitCode}`);
 const path=join(work,'DevToolsActivePort');if(existsSync(path))return Number(readFileSync(path,'utf8').split(/\r?\n/)[0]);
 await delay(100);
}throw Error('CHROME_DEVTOOLS_UNAVAILABLE')}
function cdp(method,params={}){return new Promise((done,reject)=>{
 const id=++sequence;
 const timer=setTimeout(()=>{pending.delete(id);reject(Error('CDP_TIMEOUT '+method))},20000);
 pending.set(id,{done,reject,timer});socket.send(JSON.stringify({id,method,params}));
})}
const probe=String.raw`(async()=>{
 await document.fonts.ready;
 await Promise.all([...document.querySelectorAll('.smd-home__training-fact img,.smd-training-timeline-r2 img')].map(i=>i.decode().catch(()=>null)));
 await new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done)));
 const style=e=>e?getComputedStyle(e):null;
 const visible=e=>!!e&&e.getClientRects().length>0&&style(e)?.display!=='none'&&style(e)?.visibility!=='hidden';
 const rect=e=>{if(!e)return null;const r=e.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,w:r.width,h:r.height}};
 const rows=e=>{
  if(!e)return 0;
  const spans=[...e.querySelectorAll('.smd-home-figma-text > span')];
  const tops=[];
  for(const span of spans){const range=document.createRange();range.selectNodeContents(span);
   for(const r of range.getClientRects()){if(r.width<.5||r.height<.5)continue;if(!tops.some(y=>Math.abs(y-r.top)<2))tops.push(r.top)}
  }
  return tops.length;
 };
 const sourceCopy=[
  '수강생이 스스로 작업할 수 있는 수준까지 교육하는 것을 목표로 합니다.',
  '현장 매커니즘을 반영하여 오전 일작업과 프라이머 도포, 오후 필름 래핑 순으로 현장감 있게 수업합니다.',
  '수료 후 개인별 맞춤 · 취업 창업 컨설팅을 통해 필름 시장 진입을 돕습니다.'
 ];
 const points=[...document.querySelectorAll('.smd-home--special-start .smd-home__special-point-r2')].map((item,index)=>{
  const p=item.querySelector('.smd-home__special-point-body-r2');return {
    index, visible:visible(item), lines:rows(p), text:p?.textContent?.replace(/\s+/g,' ').trim()??'',
    sourceMatches:p?.textContent?.replace(/\s+/g,' ').trim()===sourceCopy[index],
    fontSize:p?style(p.querySelector('.smd-home-figma-text > span'))?.fontSize:null,
    whiteSpace:p?style(p.querySelector('.smd-home-figma-text > span'))?.whiteSpace:null,
    box:rect(p),numberBox:rect(item.querySelector('span'))};
 });
 const cards=[...document.querySelectorAll('.smd-home--training-track [data-mobile-training-fact]')].map(el=>{
  const icon=el.querySelector('[data-training-icon]');const image=icon?.querySelector('img');
  const label=el.querySelector('.smd-training-fact-r2__label');const value=el.querySelector('.smd-training-fact-r2__value');
  return {id:el.getAttribute('data-mobile-training-fact'),derived:el.getAttribute('data-home-derived'),
    visible:visible(el), icon:icon?.getAttribute('data-training-icon'),iconVisible:visible(icon),imageLoaded:image?image.complete&&image.naturalWidth>0:false,
    box:rect(el),iconBox:rect(icon),labelBox:rect(label),valueBox:rect(value),text:value?.textContent?.replace(/\s+/g,' ').trim()??'',
    labelText:label?.textContent?.replace(/\s+/g,' ').trim()??''};
 });
 const timeline=document.querySelector('[data-mobile-training-timeline="R2"]');
 const old=document.querySelector('.smd-home__training-tracks-original-r2');
 const stages=[...document.querySelectorAll('[data-mobile-timeline-step]')].map(e=>({
  key:e.getAttribute('data-mobile-timeline-step'),source:e.getAttribute('data-source-work'),visible:visible(e),
  text:e.textContent?.replace(/\s+/g,' ').trim()??'',box:rect(e)}));
 const arrows=[...document.querySelectorAll('.smd-training-timeline-r2__connector')].map(e=>{
  const img=e.querySelector('img');return {node:e.getAttribute('data-source-arrow'),visible:visible(e),imageLoaded:img?.complete&&img.naturalWidth>0,box:rect(e)};
 });
 const scene=document.querySelector('.smd-home--figma-scene'),reflow=document.querySelector('.smd-home--semantic-reflow');
 return {viewport:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,
   sceneVisible:visible(scene),reflowVisible:visible(reflow),specialPoints:points,trainingCards:cards,
   gridColumns:style(document.querySelector('.smd-home__training-facts'))?.gridTemplateColumns,
   timelineVisible:visible(timeline),oldTimelineVisible:visible(old),stages,arrows,
   fontLoaded:[...document.fonts].some(f=>/Pretendard/i.test(f.family)&&f.status==='loaded')};
})()`;
const widths=[360,390,430,600,699,768,1024,1280,1920];
try{
 const portNumber=await port();const pages=await(await fetch(`http://127.0.0.1:${portNumber}/json/list`)).json();
 const page=pages.find(x=>x.type==='page');if(!page?.webSocketDebuggerUrl)throw Error('CHROME_PAGE_NOT_FOUND');
 socket=new WebSocket(page.webSocketDebuggerUrl);
 await new Promise((done,reject)=>{socket.addEventListener('open',done,{once:true});socket.addEventListener('error',reject,{once:true})});
 socket.addEventListener('message',e=>{const m=JSON.parse(e.data),item=pending.get(m.id);if(!item)return;
  pending.delete(m.id);clearTimeout(item.timer);m.error?item.reject(Error(JSON.stringify(m.error))):item.done(m.result);
 });
 await cdp('Page.enable');await cdp('Runtime.enable');
 const results=[];
 for(const width of widths){
  await cdp('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<=430});
  const navigation=await cdp('Page.navigate',{url:base});if(navigation.errorText)throw Error('NAVIGATION_FAILED '+navigation.errorText);
  for(let i=0;i<65;i++){
   const s=await cdp('Runtime.evaluate',{expression:'document.readyState',returnByValue:true});
   if(s.result?.value==='complete')break;await delay(150);
  }
  await delay(700);
  const response=await cdp('Runtime.evaluate',{expression:probe,awaitPromise:true,returnByValue:true});
  if(response.exceptionDetails)throw Error('R2_PROBE_FAILED '+JSON.stringify(response.exceptionDetails));
  const r=response.result?.value;if(!r)throw Error('R2_EMPTY_PROBE '+width);
  const errors=[];
  if(r.scrollWidth>r.viewport+2)errors.push('HORIZONTAL_OVERFLOW');
  if(!r.fontLoaded)errors.push('PRETENDARD_NOT_LOADED');
  if(width<=1099){
   if(!r.reflowVisible||r.sceneVisible)errors.push('SEMANTIC_OWNER_INVALID');
   if(r.specialPoints.length!==3)errors.push('SPECIAL_POINT_COUNT');
   if(r.trainingCards.length!==4)errors.push('TRAINING_DOM_COUNT');
  }else if(!r.sceneVisible||r.reflowVisible)errors.push('DESKTOP_OWNER_INVALID');
  if(width<=699){
   for(const p of r.specialPoints){
    if(!p.visible||!p.sourceMatches||p.lines<1||p.lines>3||p.fontSize!=='16px'||p.whiteSpace!=='normal')errors.push('SPECIAL_LINES_'+p.index);
   }
   const ids=['node-1:102','node-1:479','node-1:484','derived-summary'];
   const icons=['duration','field','experience','timeline'];
   for(let i=0;i<4;i++){
    const c=r.trainingCards[i];if(!c||c.id!==ids[i]||c.icon!==icons[i]||!c.visible||!c.iconVisible||!c.imageLoaded)errors.push('TRAINING_CARD_'+i);
    if(c?.iconBox&&c.labelBox&&c.iconBox.bottom>c.labelBox.y+3)errors.push('TRAINING_ICON_LABEL_ORDER_'+i);
    if(c?.labelBox&&c.valueBox&&c.labelBox.bottom>c.valueBox.y+3)errors.push('TRAINING_LABEL_VALUE_ORDER_'+i);
   }
   if(r.trainingCards[3]?.derived!=='training-timeline-summary-r2')errors.push('DERIVED_SUMMARY_AUTHORITY');
   const [a,b,c,d]=r.trainingCards;
   if([a,b,c,d].every(x=>x?.box)){
    const close=(x,y)=>Math.abs(x-y)<3;
    if(!(close(a.box.y,b.box.y)&&close(c.box.y,d.box.y)&&c.box.y>a.box.bottom-3&&close(a.box.x,c.box.x)&&close(b.box.x,d.box.x)&&close(a.box.h,b.box.h)&&close(c.box.h,d.box.h)))errors.push('TRAINING_NOT_2X2');
   }else errors.push('TRAINING_GEOMETRY_MISSING');
   if(!r.timelineVisible||r.oldTimelineVisible)errors.push('TIMELINE_OWNER');
   const wanted=['morning','repeat','afternoon'];const source=['node-1:493','node-1:499','node-1:494'];
   if(r.stages.length!==3||r.arrows.length!==2)errors.push('TIMELINE_COUNT');
   for(let i=0;i<3;i++)if(r.stages[i]?.key!==wanted[i]||r.stages[i]?.source!==source[i]||!r.stages[i]?.visible)errors.push('TIMELINE_STEP_'+i);
   for(let i=0;i<2;i++)if(r.arrows[i]?.node!==['node-1:501','node-1:555'][i]||!r.arrows[i]?.visible||!r.arrows[i]?.imageLoaded)errors.push('TIMELINE_ARROW_'+i);
  }else if(width<=1099){
   if(r.timelineVisible||!r.oldTimelineVisible||r.trainingCards[3]?.visible)errors.push('TABLET_OWNER_CHANGED');
  }
  console.log(`${width}px: ${errors.length?'FAIL '+errors.join(','):'MOBILE_R2_BROWSER_OK'}; points=${r.specialPoints.map(p=>p.lines).join('/')} timeline=${r.timelineVisible}`);
  results.push({requestedWidth:width,...r,errors});
 }
 mkdirSync(dirname(output),{recursive:true});
 writeFileSync(output,JSON.stringify({contract:'SMD_HOME_R2_MOBILE_VUE3_R2',localUrl:base,results,originalFigmaPixelParity:'NOT_RUN',actualCmsPublication:'NOT_TESTED'},null,2)+'\n');
 console.log('MOBILE_R2_BROWSER_RECEIPT '+output);
 if(results.some(x=>x.errors.length))process.exitCode=1;
}catch(e){console.error('MOBILE_R2_BROWSER_FAILED',e);process.exitCode=1}
finally{
 try{socket?.close()}catch{}
 for(const v of pending.values())clearTimeout(v.timer);
 pending.clear();browser.kill();await delay(250);rmSync(work,{recursive:true,force:true,maxRetries:3});
}
