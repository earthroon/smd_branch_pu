/** R4A read-only live Nuxt/CDP check. SOURCE, BROWSER and PIXEL-PARITY are separate. */
import {spawn} from 'node:child_process';
import {existsSync,readFileSync,writeFileSync,mkdirSync,rmSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {tmpdir} from 'node:os';
import {randomUUID,createHash} from 'node:crypto';
const args=process.argv.slice(2);
const arg=(key,def)=>{const i=args.indexOf(key);return i<0?def:args[i+1];};
const url=arg('--url','http://127.0.0.1:3129/');
const out=resolve(arg('--out','docs/migration/smd-home-r2/visual-restore/browser-local/mobile-r4a-receipt.json'));
if(!/^http:\/\/(?:127\.0\.0\.1|localhost):\d+\/$/.test(url))throw Error('LOCAL_PREVIEW_URL_REQUIRED');
const assets=[
 ['derived/calendar-mobile-r2.svg','d13a72b9faec0248076d58572146297b0eed3b1794aaef76725660e9dc33679f'],
 ['assets/asset-31e20f1fc3f43abb314fbe0ec3ee4a6c35997a8b10a51fefd68102a9775b4616.svg','31e20f1fc3f43abb314fbe0ec3ee4a6c35997a8b10a51fefd68102a9775b4616'],
 ['assets/asset-2b6d2381b996643b28e6926979f69304ca5572c50b047406d0c2a994c6acb595.svg','2b6d2381b996643b28e6926979f69304ca5572c50b047406d0c2a994c6acb595'],
 ['derived/chevron-mobile-r2.svg','14eed2bf83479784db04d4d118b93fe3005fa3bd1e6cc6678c35a8edc32bc9af'],
];
const ping=await fetch(url).catch(e=>{throw Error(`LOCAL_SERVER_NOT_REACHABLE ${url}: ${e.cause?.code??e.message}`)});
if(ping.status!==200)throw Error(`HOME_REQUEST_FAILED HTTP_${ping.status}`);
for(const [path,digest] of assets){
 const r=await fetch(new URL('/figma-r2/'+path,url));
 if(r.status!==200)throw Error(`R4A_ASSET_HTTP_FAILED ${path} ${r.status}`);
 const received=createHash('sha256').update(Buffer.from(await r.arrayBuffer())).digest('hex');
 if(received!==digest)throw Error(`R4A_ASSET_SHA_DRIFT ${path}`);
}
const locations=[process.env.SMD_CHROME_PATH,process.env.CHROME_PATH,
 process.env.PROGRAMFILES&&join(process.env.PROGRAMFILES,'Google/Chrome/Application/chrome.exe'),
 process.env.PROGRAMFILES&&join(process.env.PROGRAMFILES,'Microsoft/Edge/Application/msedge.exe'),
 process.env['PROGRAMFILES(X86)']&&join(process.env['PROGRAMFILES(X86)'],'Microsoft/Edge/Application/msedge.exe'),
 '/usr/bin/chromium','/usr/bin/google-chrome'].filter(Boolean);
const executable=locations.find(existsSync);
if(!executable)throw Error('CHROME_OR_EDGE_NOT_FOUND');
const profile=join(tmpdir(),'smd-mobile-r4a-'+randomUUID());mkdirSync(profile,{recursive:true});
const chrome=spawn(executable,['--headless=new','--no-first-run','--no-default-browser-check','--disable-extensions',
 '--remote-debugging-port=0',`--user-data-dir=${profile}`,
 ...(process.platform==='linux'&&process.getuid?.()===0?['--no-sandbox']:[]),'about:blank'],{stdio:'ignore'});
const sleep=ms=>new Promise(res=>setTimeout(res,ms));
let socket,seq=0;const pending=new Map();
const cdp=(method,params={})=>new Promise((done,reject)=>{
 const id=++seq;const timer=setTimeout(()=>{pending.delete(id);reject(Error(`CDP_TIMEOUT ${method}`))},20000);
 pending.set(id,{done,reject,timer});socket.send(JSON.stringify({id,method,params}));
});
async function port(){for(let i=0;i<100;i++){
 const p=join(profile,'DevToolsActivePort');if(existsSync(p))return +readFileSync(p,'utf8').split(/\r?\n/)[0];
 if(chrome.exitCode!==null)throw Error(`CHROME_EXIT_${chrome.exitCode}`);await sleep(100);
}throw Error('CDP_PORT_UNAVAILABLE')}
const probe=String.raw`(async()=>{
 await document.fonts.ready;
 await Promise.all([...document.querySelectorAll('.smd-home--training-track img')].map(i=>i.decode().catch(()=>null)));
 await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
 const q=s=>document.querySelector(s), css=e=>e?getComputedStyle(e):null;
 const visible=e=>Boolean(e && e.getClientRects().length && css(e).display!=='none' && css(e).visibility!=='hidden');
 const rect=e=>{if(!e)return null;const b=e.getBoundingClientRect();return {x:b.x,y:b.y,right:b.right,bottom:b.bottom,width:b.width,height:b.height}};
 const root=q('.smd-home--training-track');
 const grid=q('[data-mobile-training-layout="three-facts-r3"]');
 const cards=[...(root?.querySelectorAll('[data-mobile-training-fact]')??[])].map(card=>{
   const icon=card.querySelector('[data-training-icon]'),img=icon?.querySelector('img');
   return {key:card.getAttribute('data-mobile-training-fact'),visible:visible(card),box:rect(card),
    icon:icon?.getAttribute('data-training-icon'),iconVisible:visible(icon),imgLoaded:img?img.complete&&img.naturalWidth>0:false,
    iconBox:rect(img), label:card.querySelector('.smd-training-fact-r2__label')?.textContent?.trim(),
    value:card.querySelector('.smd-training-fact-r2__value')?.textContent?.trim()};
 });
 const fieldCard=root?.querySelector('[data-mobile-training-fact="node-1:479"]');
 const field=fieldCard?.querySelector('.smd-training-field-mobile-r4a');
 const original=fieldCard?.querySelector('.smd-training-field-original-r4a');
 const token=field?.querySelector('.smd-training-nobreak-r4a');
 const flow=root?.querySelector('[data-mobile-training-timeline="R4A"]');
 const steps=[...(flow?.querySelectorAll('[data-mobile-r4a-step]')??[])].map(e=>({id:e.dataset.mobileR4aStep,
   text:e.textContent?.replace(/\s+/g,'').trim(),visible:visible(e),source:e.dataset.sourceNode,box:rect(e)}));
 const arrows=[...(flow?.querySelectorAll('[data-mobile-r4a-arrow]')??[])].map(e=>({
   id:e.dataset.mobileR4aArrow,source:e.dataset.sourceNode,visible:visible(e),loaded:e.complete&&e.naturalWidth>0,box:rect(e)}));
 const old=root?.querySelector('.smd-home__training-tracks-original-r2');
 const stray=[...(root?.querySelectorAll('[data-training-icon]')??[])].filter(e=>visible(e)&&!e.closest('[data-mobile-training-fact]'));
 return {viewport:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,
  sceneVisible:visible(q('.smd-home--figma-scene')),reflowVisible:visible(q('.smd-home--semantic-reflow')),
  originalTimelineVisible:visible(old),flowVisible:visible(flow),cards,steps,arrows,
  fieldMobileVisible:visible(field),fieldOriginalVisible:visible(original),fieldMobileText:field?.textContent??null,
  fieldTokenText:token?.textContent??null,fieldTokenRectCount:token?.getClientRects().length??0,
  fieldTokenWhiteSpace:token?css(token).whiteSpace:null,extraIcons:stray.length,
  fontLoaded:[...document.fonts].some(face=>/Pretendard/i.test(face.family)&&face.status==='loaded'),
  obsoleteSummary:root?.querySelector('[data-home-derived="training-timeline-summary-r2"]')!==null,
  obsoleteR2Timeline:root?.querySelector('[data-mobile-training-timeline="R2"]')!==null};
})()`;
let failed=false;
try{
 const p=await port(),pages=await(await fetch(`http://127.0.0.1:${p}/json/list`)).json();
 const page=pages.find(x=>x.type==='page');if(!page?.webSocketDebuggerUrl)throw Error('CDP_PAGE_NOT_FOUND');
 socket=new WebSocket(page.webSocketDebuggerUrl);
 await new Promise((res,rej)=>{socket.addEventListener('open',res,{once:true});socket.addEventListener('error',rej,{once:true})});
 socket.addEventListener('message',e=>{const m=JSON.parse(e.data),p=pending.get(m.id);if(!p)return;
  pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(Error(JSON.stringify(m.error))):p.done(m.result)});
 await cdp('Page.enable');await cdp('Runtime.enable');
 const results=[];
 const widths=[360,390,430,600,699,768,1024,1280,1920];
 const photos=new Set([360,390,430,768,1920]);
 const folder=join(dirname(out),'mobile-r4a-screenshots');mkdirSync(folder,{recursive:true});
 for(const width of widths){
   await cdp('Emulation.setDeviceMetricsOverride',{width,height:950,deviceScaleFactor:1,mobile:width<=430});
   const nav=await cdp('Page.navigate',{url});if(nav.errorText)throw Error(`NAVIGATION_${width}_${nav.errorText}`);
   for(let k=0;k<70;k++){
     const r=await cdp('Runtime.evaluate',{expression:`location.href===${JSON.stringify(url)}&&document.readyState==='complete'`,returnByValue:true});
     if(r.result?.value===true)break;await sleep(150);
   }
   await sleep(700);
   const response=await cdp('Runtime.evaluate',{expression:probe,awaitPromise:true,returnByValue:true});
   if(response.exceptionDetails)throw Error(`R4A_PROBE_EXCEPTION_${width}: ${response.exceptionDetails.text}`);
   const o=response.result?.value;if(!o)throw Error(`R4A_PROBE_EMPTY_${width}`);
   const errors=[];
   if(o.scrollWidth>o.viewport+1)errors.push('HORIZONTAL_OVERFLOW');
   if(!o.fontLoaded)errors.push('PRETENDARD_NOT_LOADED');
   if(o.obsoleteSummary||o.obsoleteR2Timeline)errors.push('OLD_MOBILE_OWNER_PRESENT');
   if(width<=1099){
     if(!o.reflowVisible||o.sceneVisible)errors.push('SEMANTIC_OWNER_MISMATCH');
     if(o.cards.length!==3)errors.push('FACT_COUNT_NOT_3');
   }else if(!o.sceneVisible||o.reflowVisible)errors.push('DESKTOP_SCENE_OWNER_MISMATCH');
   if(width<=699){
     const expect=['node-1:102','node-1:479','node-1:484'];
     const types=['duration','field','experience'];
     for(let n=0;n<3;n++){
       const c=o.cards[n];if(!c||c.key!==expect[n]||!c.visible||c.icon!==types[n]||!c.iconVisible||!c.imgLoaded)
         errors.push(`FACT_${n}`);
       if(c?.iconBox && c.iconBox.width>60.5)errors.push(`ICON_OPTICAL_${n}`);
     }
     const [a,b,c]=o.cards;
     if([a,b,c].every(x=>x?.box)){
       if(Math.max(a.box.y,b.box.y,c.box.y)-Math.min(a.box.y,b.box.y,c.box.y)>1 ||
          a.box.right>b.box.x+1||b.box.right>c.box.x+1)errors.push('THREE_COL_GEOMETRY');
     }
     if(o.extraIcons)errors.push('STRAY_ICON_ROW');
     if(o.originalTimelineVisible)errors.push('OLD_TABLET_TIMELINE_VISIBLE');
     if(!o.fieldMobileVisible||o.fieldOriginalVisible||o.fieldMobileText!=='인테리어·유리필름'||
         o.fieldTokenText!=='유리필름'||o.fieldTokenRectCount!==1||o.fieldTokenWhiteSpace!=='nowrap')
       errors.push('FIELD_DISPLAY_OR_WORD_WRAP');
     const labels=['morning','center','afternoon','morning-bottom','afternoon-bottom'];
     const text=['오전','밑작업','오후','밑작업','필름래핑'];
     if(!o.flowVisible||o.steps.length!==5||o.arrows.length!==2)errors.push('R4A_FLOW_COUNT');
     for(let i=0;i<5;i++)if(!o.steps[i]?.visible||o.steps[i].id!==labels[i]||o.steps[i].text!==text[i])errors.push(`FLOW_${i}`);
     for(const a of o.arrows)if(!a.visible||!a.loaded)errors.push('ARROW_MISSING');
   }else if(width<=1099){
     if(!o.originalTimelineVisible||o.flowVisible||o.fieldMobileVisible||!o.fieldOriginalVisible)
       errors.push('TABLET_OWNER_REGRESSION');
   }else if(o.flowVisible)errors.push('DESKTOP_FLOW_LEAK');
   let screenshot=null;
   if(photos.has(width)){
     const shot=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
     screenshot=join(folder,`mobile-r4a-${width}.png`);writeFileSync(screenshot,Buffer.from(shot.data,'base64'));
   }
   console.log(`${width}px: ${errors.length?'FAIL '+errors.join(','):'MOBILE_R4A_BROWSER_OK'}; cards=${o.cards.length} flow=${o.flowVisible}`);
   results.push({width,...o,errors,screenshot});
 }
 mkdirSync(dirname(out),{recursive:true});
 writeFileSync(out,JSON.stringify({contract:'SMD_HOME_R2_MOBILE_R4A_TRACK_OPTICAL_FIX',url,results,
   figmaPixelParity:'NOT_RUN',publicationAuthority:'DEV_FIXTURE_ONLY_EXPECTED',productionQualified:false},null,2)+'\n');
 console.log('MOBILE_R4A_BROWSER_RECEIPT '+out);
 if(results.some(r=>r.errors.length)){process.exitCode=1;failed=true}
}catch(err){failed=true;process.exitCode=1;console.error('MOBILE_R4A_BROWSER_FAILED',err)}
finally{
 try{socket?.close()}catch{}
 for(const p of pending.values())clearTimeout(p.timer);
 chrome.kill();await sleep(300);rmSync(profile,{recursive:true,force:true,maxRetries:3});
}
