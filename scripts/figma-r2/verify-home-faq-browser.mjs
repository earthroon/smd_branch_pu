/** SMD_HOME_FAQ_R1 browser witness. Local Nuxt server must already be running.
 * Source: user-approved Q/A; CMS takes precedence for each current published ID.
 * Physical checks are reported only after real Chromium/CDP interactions. */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { readCdpEvaluateValue } from './cdp-evaluate-result.mjs';

const args=process.argv.slice(2);
const arg=(key,fallback)=>{const i=args.indexOf(key);return i>=0?args[i+1]:fallback;};
const url=arg('--url','http://127.0.0.1:3129/');
if(!/^http:\/\/(?:127\.0\.0\.1|localhost):\d+\/$/.test(url))
  throw new Error('SMD_HOME_FAQ_BROWSER_LOCAL_URL_REQUIRED');
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const out=resolve(arg('--out',join(root,'artifacts/smd-home-faq-r1/browser-receipt.json')));
const candidates=[process.env.SMD_CHROME_PATH,process.env.CHROME_PATH,
  process.env.PROGRAMFILES&&join(process.env.PROGRAMFILES,'Google/Chrome/Application/chrome.exe'),
  process.env.PROGRAMFILES&&join(process.env.PROGRAMFILES,'Microsoft/Edge/Application/msedge.exe'),
  process.env['PROGRAMFILES(X86)']&&join(process.env['PROGRAMFILES(X86)'],'Microsoft/Edge/Application/msedge.exe'),
  '/usr/bin/chromium','/usr/bin/google-chrome'].filter(Boolean);
const chrome=candidates.find(existsSync);
if(!chrome)throw Error('SMD_HOME_FAQ_BROWSER_CHROMIUM_NOT_FOUND');
const scratch=join(tmpdir(),`smd-home-faq-r1-${randomUUID()}`);
mkdirSync(scratch,{recursive:true});
const child=spawn(chrome,['--headless=new','--no-sandbox','--no-first-run','--disable-extensions',
  '--no-default-browser-check','--remote-debugging-port=0',`--user-data-dir=${scratch}`,'about:blank'],{stdio:'ignore'});
const sleep=ms=>new Promise(done=>setTimeout(done,ms));
let ws;let serial=0;const pending=new Map();
const cdp=(method,params={})=>new Promise((done,fail)=>{
  const id=++serial;
  const timeout=setTimeout(()=>{pending.delete(id);fail(Error(`SMD_HOME_FAQ_CDP_TIMEOUT_${method}`));},20000);
  pending.set(id,{done:v=>{clearTimeout(timeout);done(v);},fail:e=>{clearTimeout(timeout);fail(e);}});
  ws.send(JSON.stringify({id,method,params}));
});
async function cdpPort(){
  for(let i=0;i<100;i++){
    if(child.exitCode!==null)throw Error('SMD_HOME_FAQ_CHROMIUM_EXITED');
    const f=join(scratch,'DevToolsActivePort');
    if(existsSync(f))return Number(readFileSync(f,'utf8').split(/\r?\n/)[0]);
    await sleep(100);
  }
  throw Error('SMD_HOME_FAQ_CDP_STARTUP_TIMEOUT');
}
async function evaluate(expression){
  const response=await cdp('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});
  return readCdpEvaluateValue(response,'SMD_HOME_FAQ');
}
async function navigate(w,h,touch){
  const nonce=randomUUID();
  const link=new URL(url);
  link.searchParams.set('__smd_faq_probe',nonce);
  await cdp('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile:touch});
  await cdp('Emulation.setTouchEmulationEnabled',touch?{enabled:true,maxTouchPoints:5}:{enabled:false});
  const response=await cdp('Page.navigate',{url:link.href});
  if(response.result?.errorText)throw Error(`SMD_HOME_FAQ_NAVIGATION_FAILED ${response.result.errorText}`);
  const loaderId=response.result?.loaderId;
  if(!loaderId)throw Error('SMD_HOME_FAQ_NEW_LOADER_MISSING');
  let last=null;
  for(let i=0;i<120;i++){
    const frame=await cdp('Page.getFrameTree');
    if(frame.result?.frameTree?.frame?.loaderId!==loaderId){await sleep(100);continue;}
    try{
      last=await evaluate(`(() => {
        const all=[...document.querySelectorAll('[data-faq-contract="SMD_HOME_FAQ_R1"]')];
        const visible=all.filter(el=>el.getClientRects().length>0);
        return {nonce:new URLSearchParams(location.search).get('__smd_faq_probe'),
          ready:document.readyState==='complete',visible:visible.length,
          rows:visible[0]?.querySelectorAll('[data-faq-id]').length??0,
          renderer:visible[0]?.dataset.faqRenderer??null,
          introAdmission:document.querySelector('[data-intro-contract]')?.dataset.introAdmissionReason??null};
      })()`);
    }catch(error){
      if(!/Execution context was destroyed|Cannot find context|Inspected target navigated/i.test(String(error)))throw error;
      await sleep(100);continue;
    }
    if(last?.nonce===nonce&&last.ready&&last.visible===1&&last.rows===4
      &&typeof last.introAdmission==='string'
      &&last.introAdmission!=='NOT_MOUNTED')return;
    await sleep(100);
  }
  throw Error('SMD_HOME_FAQ_HYDRATION_NOT_READY '+JSON.stringify(last));
}
async function measure(){
  return evaluate(`(() => {
    const faq=[...document.querySelectorAll('[data-faq-contract="SMD_HOME_FAQ_R1"]')]
      .find(el=>el.getClientRects().length>0);
    const box=el=>{if(!el)return null;const r=el.getBoundingClientRect();
      return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height,centerY:(r.top+r.bottom)/2};};
    const items=[...faq.querySelectorAll('[data-faq-id]')].map(item=>{
      const button=item.querySelector('button');const answer=item.querySelector('[role="region"]');
      const plus=item.querySelector('.smd-home__faq-plus');
      return {id:item.dataset.faqId,open:item.dataset.faqOpen,
        authority:item.dataset.faqRowAuthority,question:button?.innerText,
        expanded:button?.getAttribute('aria-expanded'),
        visibleAnswer:!!answer&&getComputedStyle(answer).display!=='none',
        paragraphs:[...(answer?.querySelectorAll('p')??[])].map(p=>p.textContent),
        itemBox:box(item),plusBox:box(plus),buttonBox:box(button)};
    });
    const stage=document.querySelector('[data-methods-contract]');
    const cta=stage?.querySelector('[data-wide-section="consultation-cta"]')
      ?? document.querySelector('.smd-home--semantic-reflow [data-home-section="consultation-cta"]');
    const header=document.querySelector('.smd-site-header');
    return {viewport:[innerWidth,innerHeight],scrollY,
      header:box(header),faq:box(faq),cta:box(cta),
      faqAuthority:faq.dataset.faqContentAuthority,
      faqRenderer:faq.dataset.faqRenderer,
      phase:faq.dataset.faqAlignmentState,
      mode:faq.dataset.faqAlignmentMode??null,
      expandedId:faq.dataset.faqExpandedId??null,
      generation:Number(faq.dataset.faqSelectionGeneration??-1),
      methodsPhase:stage?.dataset.methodsPhase??null,
      wideSvgFaq:stage?.querySelectorAll('[data-wide-section="faq"] .smd-figma-scene-svg').length??0,
      visibleFaqCount:[...document.querySelectorAll('[data-faq-contract="SMD_HOME_FAQ_R1"]')]
        .filter(el=>el.getClientRects().length>0).length,
      faqXOverflow:Math.max(0,faq.scrollWidth-faq.clientWidth),items};
  })()`);
}
async function alignItemIntoView(id){
  const response=await evaluate(`(() => {
    const faq=[...document.querySelectorAll('[data-faq-contract="SMD_HOME_FAQ_R1"]')]
      .find(el=>el.getClientRects().length>0);
    const item=[...faq.querySelectorAll('[data-faq-id]')].find(el=>el.dataset.faqId===${JSON.stringify(id)});
    const header=document.querySelector('.smd-site-header');
    const y=scrollY+item.getBoundingClientRect().top-header.getBoundingClientRect().height-100;
    window.scrollTo({top:Math.max(0,y),behavior:'instant'});
    return true;
  })()`);
  if(response!==true)throw Error('SMD_HOME_FAQ_SCROLL_TARGET_MISSING');
  await sleep(140);
}
async function clickPlus(id,w,h){
  await alignItemIntoView(id);
  const snap=await measure();
  const plus=snap.items.find(item=>item.id===id)?.plusBox;
  if(!plus)throw Error('SMD_HOME_FAQ_PLUS_MISSING '+id);
  const x=(plus.left+plus.right)/2,y=(plus.top+plus.bottom)/2;
  if(x<0||x>=w||y<0||y>=h)throw Error('SMD_HOME_FAQ_PLUS_NOT_IN_VIEW '+JSON.stringify({id,plus,viewport:[w,h]}));
  await cdp('Input.dispatchMouseEvent',{type:'mousePressed',x,y,button:'left',clickCount:1});
  await cdp('Input.dispatchMouseEvent',{type:'mouseReleased',x,y,button:'left',clickCount:1});
}
async function waitForAlignment(){
  let last=null;
  for(let i=0;i<40;i++){
    last=await measure();
    if(last.phase==='aligned'||last.phase==='cancelled')return last;
    await sleep(60);
  }
  throw Error('SMD_HOME_FAQ_ALIGNMENT_TIMEOUT '+JSON.stringify({phase:last?.phase,generation:last?.generation}));
}
const check=(errors,pass,code)=>{if(!pass)errors.push(code);};
const results=[];let failure=null;
try{
  const port=await cdpPort();
  const tabs=await(await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const tab=tabs.find(el=>el.type==='page');
  if(!tab?.webSocketDebuggerUrl)throw Error('SMD_HOME_FAQ_CDP_TAB_NOT_FOUND');
  ws=new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((done,fail)=>{
    ws.addEventListener('open',done,{once:true});ws.addEventListener('error',fail,{once:true});
  });
  ws.addEventListener('message',event=>{
    const response=JSON.parse(event.data),job=pending.get(response.id);
    if(!job)return;pending.delete(response.id);
    response.error?job.fail(Error(JSON.stringify(response.error))):job.done(response);
  });
  await cdp('Page.enable');await cdp('Runtime.enable');
  for(const [w,h,touch] of [[1920,1080,false],[1280,900,false],[1024,768,true],[390,844,true]]){
    const errors=[];
    await navigate(w,h,touch);
    const initial=await measure();
    check(errors,initial.items.length===4,'ROW_COUNT');
    check(errors,initial.visibleFaqCount===1,'VISIBLE_FAQ_OWNER_COUNT');
    check(errors,initial.items.every(row=>row.open==='false'&&row.expanded==='false'&&!row.visibleAnswer),'INITIAL_CLOSED');
    check(errors,initial.items.map(x=>x.id).join(',')==='home.faq.01,home.faq.02,home.faq.03,home.faq.04','ROW_ORDER');
    check(errors,initial.faqXOverflow<=2,'FAQ_HORIZONTAL_OVERFLOW');
    if(!touch)check(errors,initial.wideSvgFaq===0,'DESKTOP_DUPLICATE_FIGMA_FAQ');
    await clickPlus('home.faq.02',w,h);
    const opened02=await waitForAlignment();
    check(errors,opened02.phase==='aligned','OPEN_02_ALIGNMENT_NOT_COMPLETE');
    check(errors,opened02.expandedId==='home.faq.02','OPEN_02_ID');
    check(errors,opened02.items.filter(i=>i.visibleAnswer).length===1,'OPEN_02_EXCLUSIVE');
    check(errors,opened02.items[1].visibleAnswer,'OPEN_02_NOT_VISIBLE');
    await clickPlus('home.faq.03',w,h);
    const opened03=await waitForAlignment();
    check(errors,opened03.phase==='aligned','OPEN_03_ALIGNMENT_NOT_COMPLETE');
    check(errors,opened03.expandedId==='home.faq.03','OPEN_03_ID');
    check(errors,opened03.items.filter(i=>i.visibleAnswer).length===1,'OPEN_03_EXCLUSIVE');
    check(errors,!opened03.items[1].visibleAnswer,'OLD_02_ANSWER_STILL_VISIBLE');
    check(errors,opened03.items[2].paragraphs.length===2,'FAQ_03_PARAGRAPH_COUNT');
    check(errors,(opened03.cta?.top??Infinity)>=(opened03.faq?.bottom??0)-3,'FAQ_CTA_OVERLAP');
    // The selected whole Q/A should be centered in the header-safe viewport if physically reachable.
    const selected=opened03.items[2].itemBox;
    const expectedCenter=(h+(opened03.header?.height??0))/2;
    const maxScroll=await evaluate('Math.max(0,document.documentElement.scrollHeight-innerHeight)');
    const nearBounds=opened03.scrollY<=2||opened03.scrollY>=maxScroll-2;
    check(errors,nearBounds||Math.abs((selected?.centerY??-999)-expectedCenter)<6,'FAQ_SELECTED_NOT_CENTERED');
    await clickPlus('home.faq.03',w,h);
    await sleep(150);
    const closed=await measure();
    check(errors,closed.expandedId===null&&closed.items.every(i=>!i.visibleAnswer),'SAME_BUTTON_NOT_CLOSED');
    results.push({viewport:[w,h],touch,initial,opened02,opened03,closed,errors});
    console.log(`SMD_HOME_FAQ ${w}x${h} ${errors.length?'FAIL '+errors.join(','):'BROWSER_OK'}`);
  }
}catch(error){
  failure=String(error?.stack??error);console.error('SMD_HOME_FAQ_BROWSER_BLOCKED',failure);
}finally{
  const receipt={contract:'SMD_HOME_FAQ_R1',url,
    status:failure?'BLOCKED':results.some(result=>result.errors.length)?'FAIL':'PASS',
    failure,results,figmaPixelParity:'NOT_RUN',performance:'NOT_MEASURED'};
  mkdirSync(dirname(out),{recursive:true});
  writeFileSync(out,JSON.stringify(receipt,null,2)+'\n');
  console.log('SMD_HOME_FAQ_BROWSER_RECEIPT '+out);
  ws?.close();child.kill();await sleep(250);
  rmSync(scratch,{recursive:true,force:true,maxRetries:3});
  if(receipt.status!=='PASS')process.exitCode=1;
}
