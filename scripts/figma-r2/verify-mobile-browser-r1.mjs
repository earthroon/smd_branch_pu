/** SMD Home R2 mobile R1 actual Chromium DOM gate. Requires local dev fixture HTTP. */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID, createHash } from 'node:crypto';
const args=process.argv.slice(2);
const arg=(flag,fallback)=>{const n=args.indexOf(flag);return n>=0?args[n+1]:fallback};
const base=arg('--url','http://127.0.0.1:3129/');
const out=resolve(arg('--out','docs/migration/smd-home-r2/visual-restore/browser-local/mobile-r1-browser-receipt.json'));
if(!/^http:\/\/(?:127\.0\.0\.1|localhost):\d+\/$/.test(base))throw Error('LOCAL_PREVIEW_URL_REQUIRED');
const files={
 'assets/asset-907f53254a066699927340bf2d76fceb0d84b85c7548ac570e43e56a2900243c.svg':'907f53254a066699927340bf2d76fceb0d84b85c7548ac570e43e56a2900243c',
 'assets/asset-b7f7017169d802a4cedf1f7f63e8cd9e076df11a6c6b4bf6d1937b95f4d7bef0.svg':'b7f7017169d802a4cedf1f7f63e8cd9e076df11a6c6b4bf6d1937b95f4d7bef0',
 'assets/asset-2b5c24c7f3ab3aed40d08b1b2d95b2be8b43bdb11bc8dc996e239ed13bf3cc16.svg':'2b5c24c7f3ab3aed40d08b1b2d95b2be8b43bdb11bc8dc996e239ed13bf3cc16',
 'assets/asset-63c37cd19ad13fd67fb70f63014993699878fcc07cd77f2d82a5019fd73e4ba6.svg':'63c37cd19ad13fd67fb70f63014993699878fcc07cd77f2d82a5019fd73e4ba6',
 'user/file-01-optical-r4a.svg':'64790e5fae1b1182683ed6472cc5e9e115ec3a49000c9e9951ec29890e117f6e',
};
for(const [name,expected] of Object.entries(files)){
 const r=await fetch(new URL('/figma-r2/'+name,base));
 if(r.status!==200)throw Error(`MOBILE_ICON_HTTP_INVALID ${name} status=${r.status}`);
 const digest=createHash('sha256').update(Buffer.from(await r.arrayBuffer())).digest('hex');
 if(digest!==expected)throw Error(`MOBILE_ICON_HTTP_SHA_INVALID ${name}`);
}
const candidates=[process.env.SMD_CHROME_PATH,process.env.CHROME_PATH,
 process.env.PROGRAMFILES&&join(process.env.PROGRAMFILES,'Google/Chrome/Application/chrome.exe'),
 process.env.PROGRAMFILES&&join(process.env.PROGRAMFILES,'Microsoft/Edge/Application/msedge.exe'),
 process.env['PROGRAMFILES(X86)']&&join(process.env['PROGRAMFILES(X86)'],'Microsoft/Edge/Application/msedge.exe'),
 '/usr/bin/chromium','/usr/bin/google-chrome'].filter(Boolean);
const binary=candidates.find(existsSync);
if(!binary)throw Error('CHROME_OR_EDGE_NOT_FOUND');
const scratch=join(tmpdir(),'smd-mobile-r1-'+randomUUID());mkdirSync(scratch,{recursive:true});
const browser=spawn(binary,['--headless=new','--no-first-run','--no-default-browser-check',
 '--disable-extensions','--remote-debugging-port=0',`--user-data-dir=${scratch}`,
 ...(process.platform==='linux'&&process.getuid?.()===0?['--no-sandbox']:[]),'about:blank'],{stdio:'ignore'});
const sleep=ms=>new Promise(done=>setTimeout(done,ms));
let ws,serial=0;const pending=new Map();
async function getPort(){for(let n=0;n<120;n++){
 if(browser.exitCode!==null)throw Error('CHROME_EXIT '+browser.exitCode);
 const f=join(scratch,'DevToolsActivePort');if(existsSync(f))return Number(readFileSync(f,'utf8').split(/\r?\n/)[0]);
 await sleep(100);
}throw Error('CHROME_PORT_UNAVAILABLE')}
function cdp(method,params={}){return new Promise((accept,reject)=>{
 const id=++serial;
 const timeout=setTimeout(()=>{pending.delete(id);reject(Error('CDP_TIMEOUT '+method))},20000);
 pending.set(id,{accept,reject,timeout});ws.send(JSON.stringify({id,method,params}));
})}
const probe=String.raw`(async()=>{
 await document.fonts.ready;
 await Promise.all([...document.querySelectorAll('[data-mobile-icon] img')].map(img=>img.decode().catch(()=>null)));
 await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
 const visible=e=>!!e&&e.getClientRects().length>0&&getComputedStyle(e).display!=='none';
 const rect=e=>{if(!e)return null;const r=e.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height}};
 const mobile=document.querySelector('[data-mobile-heading="MOBILE_HERO_COPY_R1"]');
 const source=document.querySelector('.smd-home__hero-heading-source');
 const lines=[...document.querySelectorAll('.smd-home__hero-mobile-line')].map(e=>({text:e.textContent,visible:visible(e),box:rect(e),scrollWidth:e.scrollWidth,clientWidth:e.clientWidth,nowrap:getComputedStyle(e).whiteSpace}));
 const facts=[...document.querySelectorAll('[data-mobile-fact]')].map(e=>{
  const icon=e.querySelector('[data-mobile-icon]');const label=e.querySelector('.smd-home__fact-label');const value=e.querySelector('.smd-home__fact-value');
  const img=icon?.querySelector('img');const svg=icon?.querySelector('svg');
  return {labelId:e.getAttribute('data-mobile-fact'),icon:icon?.getAttribute('data-mobile-icon'),visible:visible(e),box:rect(e),iconBox:rect(icon),labelBox:rect(label),valueBox:rect(value),imageLoaded:img?img.complete&&img.naturalWidth>0:!!svg,clockLayers:svg?.querySelectorAll('image').length??0};
 });
 const scene=document.querySelector('.smd-home--figma-scene');const reflow=document.querySelector('.smd-home--semantic-reflow');
 return {viewport:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,
 mobileTitleVisible:visible(mobile),sourceTitleVisible:visible(source),lines,facts,
 reflowVisible:visible(reflow),sceneVisible:visible(scene),
 grid:document.querySelector('.smd-home--info-bar .smd-home__facts')?getComputedStyle(document.querySelector('.smd-home--info-bar .smd-home__facts')).gridTemplateColumns:null,
 fontLoaded:[...document.fonts].some(f=>/Pretendard/i.test(f.family)&&f.status==='loaded')};
})()`;
const widths=[360,390,430,600,699,768,1024];let failed=false;
try{
 const port=await getPort();const pages=await(await fetch(`http://127.0.0.1:${port}/json/list`)).json();
 const page=pages.find(x=>x.type==='page');if(!page?.webSocketDebuggerUrl)throw Error('CHROME_PAGE_MISSING');
 ws=new WebSocket(page.webSocketDebuggerUrl);
 await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true})});
 ws.addEventListener('message',msg=>{const m=JSON.parse(msg.data),pendingItem=pending.get(m.id);if(!pendingItem)return;
  pending.delete(m.id);clearTimeout(pendingItem.timeout);m.error?pendingItem.reject(Error(JSON.stringify(m.error))):pendingItem.accept(m.result);
 });
 await cdp('Page.enable');await cdp('Runtime.enable');const results=[];
 for(const width of widths){
  await cdp('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<=430});
  const nav=await cdp('Page.navigate',{url:base});if(nav.errorText)throw Error('NAVIGATION_FAILED '+nav.errorText);
  for(let n=0;n<65;n++){
   const state=await cdp('Runtime.evaluate',{expression:'document.readyState',returnByValue:true});
   if(state.result?.value==='complete')break;await sleep(120);
  }
  await sleep(900);
  const outEval=await cdp('Runtime.evaluate',{expression:probe,awaitPromise:true,returnByValue:true});
  if(outEval.exceptionDetails)throw Error('PROBE_FAILED '+JSON.stringify(outEval.exceptionDetails));
  const value=outEval.result?.value;if(!value)throw Error('MOBILE_OBSERVATION_EMPTY '+width);
  const errors=[];
  if(value.scrollWidth>value.viewport+2)errors.push('HORIZONTAL_OVERFLOW');
  if(!value.fontLoaded)errors.push('PRETENDARD_NOT_LOADED');
  if(!value.reflowVisible||value.sceneVisible)errors.push('WRONG_VIEW_OWNER');
  if(value.facts.length!==4)errors.push('FACT_COUNT');
  const expectedIcons=['clock','helmet','tools','file'];
  for(let n=0;n<4;n++){
   const fact=value.facts[n];if(!fact){errors.push('FACT_MISSING_'+n);continue}
   if(fact.icon!==expectedIcons[n]||!fact.visible||!fact.imageLoaded)errors.push('ICON_'+n);
   if(fact.icon==='clock'&&fact.clockLayers!==2)errors.push('CLOCK_ASSET_COMPOSITION');
   if(fact.iconBox&&fact.labelBox&&fact.iconBox.bottom>fact.labelBox.top+2)errors.push('ICON_LABEL_ORDER_'+n);
   if(fact.labelBox&&fact.valueBox&&fact.labelBox.bottom>fact.valueBox.top+2)errors.push('LABEL_VALUE_ORDER_'+n);
  }
  if(width<=699){
   if(!value.mobileTitleVisible||value.sourceTitleVisible)errors.push('MOBILE_TITLE_OWNER');
   if(value.lines.map(line=>line.text).join('|')!=='업계최초 인테리어 유리필름|실무자 양성 프로그램 운영')errors.push('TITLE_COPY');
   if(value.lines.some(line=>!line.visible||line.nowrap!=='nowrap'||line.scrollWidth>line.clientWidth+2))errors.push('TITLE_WRAP');
   const [a,b,c,d]=value.facts;
   if([a,b,c,d].some(x=>!x?.box))errors.push('FACT_GEOMETRY_MISSING');
   else if(!(Math.abs(a.box.top-b.box.top)<3&&Math.abs(c.box.top-d.box.top)<3&&c.box.top>a.box.bottom-2&&Math.abs(a.box.left-c.box.left)<3&&Math.abs(b.box.left-d.box.left)<3))errors.push('NOT_2X2_GRID');
  }else if(value.mobileTitleVisible||!value.sourceTitleVisible)errors.push('TABLET_TITLE_OWNER');
  results.push({requestedWidth:width,...value,errors});
  console.log(`${width}px: ${errors.length?'FAIL '+errors.join(','):'MOBILE_LAYOUT_OK'}; icons=${value.facts.map(f=>f.icon).join(',')}`);
 }
 mkdirSync(dirname(out),{recursive:true});writeFileSync(out,JSON.stringify({contract:'SMD_HOME_R2_MOBILE_VUE3_R1',localUrl:base,results,originalFigmaPixelParity:'NOT_RUN'},null,2)+'\n');
 console.log('MOBILE_R1_BROWSER_RECEIPT '+out);
 if(results.some(x=>x.errors.length))process.exitCode=1;
}catch(error){failed=true;process.exitCode=1;console.error('MOBILE_BROWSER_FAILED',error)}
finally{
 try{ws?.close()}catch{}
 for(const item of pending.values())clearTimeout(item.timeout);
 pending.clear();browser.kill();await sleep(300);rmSync(scratch,{recursive:true,force:true,maxRetries:3});
}
