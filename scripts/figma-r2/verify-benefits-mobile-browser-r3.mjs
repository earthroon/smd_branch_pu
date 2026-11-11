/** R3 parent/wrapper/run line-box parity evidence for Vue3 benefits section. Read-only; never deploys. */
import {spawn} from 'node:child_process';
import {readFileSync,writeFileSync,existsSync,mkdirSync,rmSync} from 'node:fs';
import {join,resolve,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {randomUUID} from 'node:crypto';

const argv=process.argv.slice(2);
const option=(key,def)=>{const i=argv.indexOf(key);return i<0?def:argv[i+1]};
const target=option('--url','http://127.0.0.1:3129/');
if(!/^http:\/\/(?:127\.0\.0\.1|localhost):\d+\/$/.test(target)){
 console.error('LOCAL_PREVIEW_URL_REQUIRED');process.exit(2);
}
const out=resolve(option('--out','./benefits-mobile-r3-browser-receipt.json'));
const widths=[360,390,430,600,699,768,1024,1280,1920];
const chromeCandidates=[process.env.SMD_CHROME_PATH,process.env.CHROME_PATH,
 process.env.PROGRAMFILES&&join(process.env.PROGRAMFILES,'Google/Chrome/Application/chrome.exe'),
 process.env.PROGRAMFILES&&join(process.env.PROGRAMFILES,'Microsoft/Edge/Application/msedge.exe'),
 process.env['PROGRAMFILES(X86)']&&join(process.env['PROGRAMFILES(X86)'],'Microsoft/Edge/Application/msedge.exe'),
 process.env.LOCALAPPDATA&&join(process.env.LOCALAPPDATA,'Google/Chrome/Application/chrome.exe'),
 '/usr/bin/chromium','/usr/bin/google-chrome'].filter(Boolean);
const binary=chromeCandidates.find(existsSync);
if(!binary){console.error('CHROME_NOT_FOUND; set SMD_CHROME_PATH');process.exit(2)}

const source=`(async()=>{
 await document.fonts.ready;
 await Promise.all([...document.images].filter(img=>img.closest('[data-home-section="benefits"]')).map(img=>
   img.complete?Promise.resolve():new Promise(resolve=>{const done=()=>{clearTimeout(clock);resolve()};const clock=setTimeout(done,8000);img.addEventListener('load',done,{once:true});img.addEventListener('error',done,{once:true})})
 ));
 await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
 const section=document.querySelector('.smd-home--semantic-reflow [data-home-section="benefits"]');
 const styles=el=>el?getComputedStyle(el):null;
 const visible=el=>Boolean(el&&el.getClientRects().length&&styles(el).visibility!=='hidden'&&styles(el).display!=='none');
 const rect=el=>{const r=el?.getBoundingClientRect();return r?{x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height}:null};
 const within=(inner,outer)=>Boolean(inner&&outer&&inner.x>=outer.x-1.5&&inner.right<=outer.right+1.5&&inner.y>=outer.y-1.5&&inner.bottom<=outer.bottom+1.5);
 const lineRects=el=>{if(!el)return[];const r=document.createRange();r.selectNodeContents(el);return [...r.getClientRects()].filter(x=>x.width>1&&x.height>1).map(x=>({y:x.top,x:x.left,right:x.right,bottom:x.bottom}));};
 const headline=section?.querySelector('h2 [data-figma-text="node-1:92"]');
 const runs=headline?[...headline.children]:[];
 const headingRuns=runs.map(el=>({text:el.textContent?.replace(/\\s+/g,' ').trim(),lines:[...new Set(lineRects(el).map(r=>Math.round(r.y*2)/2))].length,weight:styles(el).fontWeight,size:styles(el).fontSize}));
 const cards=[...(section?.querySelectorAll('.smd-home__benefit-card')||[])].map(card=>{
  const media=card.querySelector(':scope > [data-media-slot]');
  const body=card.querySelector(':scope > .smd-home__benefit-body');
  const copy=body?.querySelector('.smd-home__benefit-copy');
  const num=body?.querySelector(':scope > span');
  const title=copy?.querySelector('h3');
  const desc=copy?.querySelector('.smd-home__benefit-description');
  const img=media?.querySelector('img');
  const box=rect(card);
  const textParts=[num,title,desc];
  const nr=rect(num),tr=rect(title),dr=rect(desc);
  const titleRun=title?.querySelector('.smd-home-figma-text > span');
  const bodyWrap=desc?.querySelector('.smd-home-figma-text');
  const bodyRuns=[...(bodyWrap?.querySelectorAll(':scope > span')||[])];
  const bodyRun=bodyRuns[0];
  const size=el=>el?parseFloat(styles(el).fontSize):null;
  const height=el=>el?parseFloat(styles(el).lineHeight):null;
  return {slot:card.getAttribute('data-benefit-slot'),box,mediaCount:card.querySelectorAll('[data-media-slot]').length,
   numberToTitlePx:nr&&tr?+(tr.y-nr.bottom).toFixed(2):null,
   titleToBodyPx:tr&&dr?+(dr.y-tr.bottom).toFixed(2):null,
   copyMarginTop:styles(copy)?.marginTop??null,
   cardMinHeight:styles(card)?.minHeight??null,
   paragraphFontPx:size(desc), paragraphLineHeightPx:height(desc),
   wrapperFontPx:size(bodyWrap),wrapperLineHeightPx:height(bodyWrap),
   bodyRuns:bodyRuns.map(run=>({fontPx:size(run),linePx:height(run)})),
   bodyFontPx:size(bodyRun),bodyLineHeightPx:height(bodyRun),
   titleFontPx:size(titleRun),titleLineHeightPx:height(titleRun),
   mediaState:media?.getAttribute('data-media-state')??null,
   paint:media?{background:styles(media).backgroundColor,box:rect(media),position:styles(media).position}:null,
   bodyPosition:styles(body)?.position??null,
   textInside:textParts.every(el=>within(rect(el),box))&&textParts.every(el=>lineRects(el).every(r=>within({x:r.x,right:r.right,y:r.y,bottom:r.bottom},box))),
   actualText:[num,title,desc].map(el=>el?.textContent?.replace(/\\s+/g,' ').trim()||''),
   overflowY:card.scrollHeight-card.clientHeight,
   img:img?{loaded:img.complete&&img.naturalWidth>0,fit:styles(img).objectFit,src:img.currentSrc}:null,
   backgroundCardClass:card.className};
 });
 return {url:location.href,windowWidth:innerWidth,clientWidth:document.documentElement.clientWidth,
  documentScrollWidth:document.documentElement.scrollWidth,
  fontPretendardLoaded:[...document.fonts].some(f=>/Pretendard/i.test(f.family)&&f.status==='loaded'),
  sceneOwnerVisible:visible(document.querySelector('.smd-home--figma-scene')),
  reflowOwnerVisible:visible(document.querySelector('.smd-home--semantic-reflow')),
  sectionVisible:visible(section),grid:section?.querySelector('.smd-home__benefits-grid')?{
   display:styles(section.querySelector('.smd-home__benefits-grid')).display,
   columns:styles(section.querySelector('.smd-home__benefits-grid')).gridTemplateColumns}:null,
  headingRuns,cards};
})()`;

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const scratch=join(tmpdir(),`smd-benefits-chrome-${randomUUID()}`);
mkdirSync(scratch,{recursive:true});
const child=spawn(binary,['--headless=new','--no-first-run','--no-default-browser-check','--disable-extensions','--remote-debugging-port=0',`--user-data-dir=${scratch}`,...(process.platform==='linux'&&process.getuid?.()===0?['--no-sandbox']:[]),'about:blank'],{stdio:'ignore'});
let ws;let nextId=0;const pending=new Map();let failure=false;
const cdp=(method,params={})=>new Promise((ok,err)=>{
 const id=++nextId;const timeout=setTimeout(()=>{pending.delete(id);err(Error(`CDP_TIMEOUT ${method}`))},18000);
 pending.set(id,{ok,err,timeout});ws.send(JSON.stringify({id,method,params}));
});
const chromePort=async()=>{
 for(let i=0;i<120;i++){
  if(child.exitCode!==null)throw Error(`CHROME_EXIT ${child.exitCode}`);
  const path=join(scratch,'DevToolsActivePort');
  if(existsSync(path))return Number(readFileSync(path,'utf8').split(/\r?\n/)[0]);
  await sleep(100);
 }
 throw Error('CHROME_PORT_TIMEOUT');
};
try{
 const response=await fetch(target,{signal:AbortSignal.timeout(10000)});
 if(response.status!==200)throw Error(`NUXT_HOME_HTTP_${response.status}`);
 const port=await chromePort();
 const pages=await(await fetch(`http://127.0.0.1:${port}/json/list`)).json();
 const page=pages.find(p=>p.type==='page');if(!page?.webSocketDebuggerUrl)throw Error('CHROME_PAGE_NOT_FOUND');
 ws=new WebSocket(page.webSocketDebuggerUrl);
 await new Promise((ok,err)=>{ws.addEventListener('open',ok,{once:true});ws.addEventListener('error',err,{once:true})});
 ws.addEventListener('message',evt=>{const m=JSON.parse(evt.data);const p=pending.get(m.id);if(!p)return;pending.delete(m.id);clearTimeout(p.timeout);m.error?p.err(Error(JSON.stringify(m.error))):p.ok(m.result)});
 await cdp('Page.enable');await cdp('Runtime.enable');
 const results=[];
 for(const width of widths){
  await cdp('Emulation.setDeviceMetricsOverride',{width,height:920,deviceScaleFactor:1,mobile:false});
  const nav=await cdp('Page.navigate',{url:target});if(nav.errorText)throw Error(`NAVIGATE_${width}_${nav.errorText}`);
  let ready=false;
  for(let tries=0;tries<60;tries++){
   const r=await cdp('Runtime.evaluate',{expression:'document.readyState',returnByValue:true});
   if(r.result?.value==='complete'){ready=true;break}
   await sleep(120);
  }
  if(!ready)throw Error(`DOCUMENT_NOT_READY_${width}`);
  await sleep(800);
  const observed=await cdp('Runtime.evaluate',{expression:source,awaitPromise:true,returnByValue:true});
  if(observed.exceptionDetails)throw Error(`BROWSER_EVAL_${width} ${observed.exceptionDetails.text}`);
  const data=observed.result?.value;
  if(!data)throw Error(`BROWSER_DATA_EMPTY_${width}`);
  const errors=[];
  if(width<=699){
   if(!data.sectionVisible)errors.push('MOBILE_SECTION_NOT_VISIBLE');
   if(data.cards.length!==4)errors.push('CARDS_NOT_4');
   if(!data.reflowOwnerVisible)errors.push('REFLOW_NOT_VISIBLE');
   if(data.cards.length===4){
    const [a,b,c,d]=data.cards.map(x=>x.box);
    if(!a||!b||!c||!d||Math.abs(a.y-b.y)>2||Math.abs(c.y-d.y)>2||Math.abs(a.x-c.x)>2||Math.abs(b.x-d.x)>2||!(c.y>a.y+2)||!(b.x>a.x+2))errors.push('GRID_NOT_2X2');
   }
   if(data.cards.some(c=>c.mediaCount!==1||!c.textInside||c.overflowY>2))errors.push('CARD_TEXT_OR_MEDIA_OUTSIDE');
   // R2: number->title 8px, title->paragraph 6px; no forced minimum height.
   if(data.cards.some(c=>c.cardMinHeight!=='0px'||c.copyMarginTop!=='8px'))errors.push('CARD_FORCED_SPACER_REMAINING');
   if(data.cards.some(c=>c.numberToTitlePx===null||Math.abs(c.numberToTitlePx-8)>1.5))errors.push('NUMBER_TITLE_GAP_INVALID');
   if(data.cards.some(c=>c.titleToBodyPx===null||Math.abs(c.titleToBodyPx-6)>1.5))errors.push('TITLE_BODY_GAP_INVALID');
   // R3: validate parent P, wrapper span and every Figma Run, not first Run only.
   if(data.cards.some(c=>{
      const chain=[{fontPx:c.paragraphFontPx,linePx:c.paragraphLineHeightPx},
        {fontPx:c.wrapperFontPx,linePx:c.wrapperLineHeightPx},...c.bodyRuns];
      const base=chain[0];
      return chain.length<3 || !chain.every(v=>Number.isFinite(v.fontPx)&&Number.isFinite(v.linePx) &&
        v.fontPx>=10.9&&v.fontPx<=12.1 && Math.abs(v.linePx/v.fontPx-1.5)<=0.035 &&
        Math.abs(v.fontPx-base.fontPx)<=0.12 && Math.abs(v.linePx-base.linePx)<=0.15);
    }))errors.push('BODY_PARAGRAPH_WRAPPER_RUN_LINEBOX_MISMATCH');
   if(data.cards.some(c=>c.titleFontPx===null||c.titleFontPx<12.9||c.titleFontPx>14.1||
      c.titleLineHeightPx===null||Math.abs(c.titleLineHeightPx/c.titleFontPx-1.35)>0.045))errors.push('TITLE_LINE_HEIGHT_INVALID');
   if(data.cards.length===4){
     const [a,b,c,d]=data.cards;
     if(Math.abs(a.box.height-b.box.height)>2||Math.abs(c.box.height-d.box.height)>2)errors.push('ROW_HEIGHTS_NOT_EQUAL');
   }

   if(data.cards.some(c=>c.mediaState==='published'&&(!c.img?.loaded||c.img?.fit!=='contain')))errors.push('PUBLISHED_IMAGE_UNAVAILABLE_OR_CROPPED');
   if(data.headingRuns.length!==2||data.headingRuns.some(r=>r.lines!==1))errors.push('HEADING_NOT_TWO_LINES');
   if(data.headingRuns.length===2&&(data.headingRuns[0].weight!=='400'||data.headingRuns[1].weight!=='600'))errors.push('HEADING_WEIGHT_DRIFT');
   if(data.documentScrollWidth>data.clientWidth+1)errors.push('HORIZONTAL_OVERFLOW');
   if(!data.fontPretendardLoaded)errors.push('PRETENDARD_NOT_LOADED');
  }else if(width<=1099){
   if(!data.sectionVisible||data.cards.length!==4||!data.reflowOwnerVisible)errors.push('TABLET_OWNER_UNEXPECTED');
  }else{
   if(data.reflowOwnerVisible)errors.push('DESKTOP_REFLOW_LEAK');
  }
  results.push({width,...data,errors});
  console.log(`${width}px: ${errors.length?'FAIL '+errors.join(' | '):'BROWSER_METRICS_OK'} · cards=${data.cards.length} · published=${data.cards.filter(c=>c.mediaState==='published').length}`);
 }
 mkdirSync(dirname(out),{recursive:true});
 writeFileSync(out,JSON.stringify({contract:'SMD_HOME_R2_MOBILE_BENEFITS_R3_LINEBOX_FIX',url:target,results,actualPublishedMediaTested:results.some(r=>r.cards.some(c=>c.mediaState==='published')),figmaPixelParity:'NOT_RUN'},null,2)+'\n');
 if(results.some(r=>r.errors.length))failure=true;
 console.log(`BENEFITS_R3_BROWSER_RECEIPT_WRITTEN ${out}`);
}catch(err){failure=true;console.error('BROWSER_VERIFY_FAILED',err instanceof Error?err.stack:String(err))}
finally{
 ws?.close();for(const p of pending.values())clearTimeout(p.timeout);pending.clear();
 child.kill();await sleep(250);rmSync(scratch,{recursive:true,force:true,maxRetries:3});
}
if(failure)process.exitCode=1;
