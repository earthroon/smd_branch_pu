/** SMD_HOME_METHODS_REVEAL_R1 browser witness.
 * Requires local Nuxt with SMD_DEV_FIXTURE_ONLY=1. This proves browser
 * behavior, not source-Figma pixel parity or remote Cloudflare deployment. */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { readCdpEvaluateValue } from './cdp-evaluate-result.mjs';
import { isBenefitsPageReady } from './home-benefits-browser-readiness.mjs';

const args=process.argv.slice(2);
const arg=(key,fallback)=>{const index=args.indexOf(key);return index>=0?args[index+1]:fallback;};
const url=arg('--url','http://127.0.0.1:3129/');
if(!/^https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?\/$/.test(url))
  throw new Error('SMD_METHODS_BROWSER_LOCAL_URL_ONLY');
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const out=resolve(arg('--out',join(root,'artifacts/smd-home-methods-reveal-r1/browser-receipt.json')));
const chromeCandidates=[
  process.env.SMD_CHROME_PATH,process.env.CHROME_PATH,
  process.env.PROGRAMFILES&&join(process.env.PROGRAMFILES,'Google/Chrome/Application/chrome.exe'),
  process.env.PROGRAMFILES&&join(process.env.PROGRAMFILES,'Microsoft/Edge/Application/msedge.exe'),
  process.env['PROGRAMFILES(X86)']&&join(process.env['PROGRAMFILES(X86)'],'Microsoft/Edge/Application/msedge.exe'),
  '/usr/bin/chromium','/usr/bin/google-chrome',
].filter(Boolean);
const chrome=chromeCandidates.find(existsSync);
if(!chrome)throw Error('SMD_METHODS_CHROMIUM_NOT_FOUND');
const scratch=join(tmpdir(),`smd-methods-browser-${randomUUID()}`);
mkdirSync(scratch,{recursive:true});
const child=spawn(chrome,[
  '--headless=new','--no-sandbox','--no-first-run','--disable-extensions',
  '--no-default-browser-check','--remote-debugging-port=0',`--user-data-dir=${scratch}`,'about:blank',
],{stdio:'ignore'});
const sleep=ms=>new Promise(done=>setTimeout(done,ms));
let ws;let seq=0;const pending=new Map();
function cdp(method,params={}){
  return new Promise((done,fail)=>{
    const id=++seq;
    const timeout=setTimeout(()=>{pending.delete(id);fail(Error(`SMD_METHODS_CDP_TIMEOUT_${method}`));},15000);
    pending.set(id,{done:v=>{clearTimeout(timeout);done(v);},fail:e=>{clearTimeout(timeout);fail(e);}});
    ws.send(JSON.stringify({id,method,params}));
  });
}
async function port(){
  for(let i=0;i<100;i++){
    if(child.exitCode!==null)throw Error('SMD_METHODS_CHROMIUM_EXITED');
    const name=join(scratch,'DevToolsActivePort');
    if(existsSync(name))return Number(readFileSync(name,'utf8').split(/\r?\n/)[0]);
    await sleep(100);
  }
  throw Error('SMD_METHODS_CDP_STARTUP_TIMEOUT');
}
async function evaluate(expression){
  const response=await cdp('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});
  return readCdpEvaluateValue(response,'SMD_METHODS');
}

async function navigate(w,h,touch,{reduced=false}={}){
  const u=new URL(url),nonce=randomUUID();
  u.searchParams.set('__smd_methods_browser_probe',nonce);
  await cdp('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile:touch});
  await cdp('Emulation.setTouchEmulationEnabled',touch?{enabled:true,maxTouchPoints:5}:{enabled:false});
  await cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:reduced?'reduce':'no-preference'}]});
  const response=await cdp('Page.navigate',{url:u.href});
  if(response.result?.errorText)throw Error(`SMD_METHODS_NAVIGATION_FAILED ${response.result.errorText}`);
  const loaderId=response.result?.loaderId;
  if(!loaderId)throw Error('SMD_METHODS_DOCUMENT_LOADER_MISSING');
  let last=null;
  for(let attempt=0;attempt<120;attempt++){
    const tree=await cdp('Page.getFrameTree');
    if(tree.result?.frameTree?.frame?.loaderId!==loaderId){await sleep(100);continue;}
    try {
      last=await evaluate(`(() => {
        const intro=document.querySelector('[data-intro-contract="SMD_HOME_INTERACTION_R1"]');
        const stage=document.querySelector('[data-methods-contract="SMD_HOME_METHODS_REVEAL_R1"]');
        return {
          documentIdentity:new URLSearchParams(location.search).get('__smd_methods_browser_probe'),
          loaded:document.readyState==='complete',present:!!stage,
          introAdmission:intro?.dataset.introAdmissionReason??null,
          benefitsPhase:stage?.dataset.benefitsPhase??null,
          methodsPhase:stage?.dataset.methodsPhase??null,
        };
      })()`);
    } catch(error) {
      if(!/Execution context was destroyed|Cannot find context with specified id|Inspected target navigated/i.test(String(error)))throw error;
      await sleep(100);
      continue;
    }
    if(isBenefitsPageReady(last,nonce,touch||reduced) &&
       typeof last?.methodsPhase==='string' && (!touch&&!reduced||last.methodsPhase==='disabled'))return;
    await sleep(100);
  }
  throw Error('SMD_METHODS_HYDRATION_NOT_READY '+JSON.stringify(last));
}

async function measure(){
  return evaluate(`(() => {
    const stage=document.querySelector('[data-methods-contract="SMD_HOME_METHODS_REVEAL_R1"]');
    const intro=document.querySelector('[data-intro-contract="SMD_HOME_INTERACTION_R1"]');
    const row=id=>stage?.querySelector('[data-wide-section="'+id+'"]');
    const box=el=>{if(!el)return null;const b=el.getBoundingClientRect();return {top:b.top,bottom:b.bottom,height:b.height};};
    const collect=(selector,indexAttr,sourceAttr)=>[...document.querySelectorAll('[data-wide-section="methods"] '+selector)]
      .map(el=>({index:indexAttr?Number(el.getAttribute(indexAttr)):0,source:el.getAttribute(sourceAttr),
        opacity:Number(getComputedStyle(el).opacity),transform:getComputedStyle(el).transform}));
    const title=collect('.smd-home-methods__title',null,'data-methods-title-source');
    const cards=collect('.smd-home-methods__card','data-methods-card-index','data-methods-card-source');
    const texts=collect('.smd-home-methods__text','data-methods-text-index','data-methods-text-source');
    return {
      phase:stage?.dataset.methodsPhase??null,outcome:stage?.dataset.methodsOutcome??null,
      prepared:stage?.dataset.methodsPrepared??null,
      starts:Number(stage?.dataset.methodsAnimationStarts??-1),skips:Number(stage?.dataset.methodsSkips??-1),
      reason:stage?.dataset.methodsSkipReason??null,
      benefitsPhase:stage?.dataset.benefitsPhase??null,benefitsReason:stage?.dataset.benefitsSkipReason??null,
      trainingPhase:stage?.dataset.trainingPhase??null,
      specialPhase:stage?.dataset.specialPhase??null,
      introPhase:intro?.dataset.introPhase??null,introRelease:intro?.dataset.introReleaseReason??null,
      viewport:[innerWidth,innerHeight],scrollY,
      methods:box(row('methods')),benefits:box(row('benefits')),
      location:box(row('location')),header:box(document.querySelector('.smd-site-header')),
      title,cards,texts,
    };
  })()`);
}
async function wheel(w,h,deltaY=320){
  await cdp('Input.dispatchMouseEvent',{
    type:'mouseWheel',x:Math.floor(w/2),y:Math.floor(h/2),deltaX:0,deltaY,
  });
}
function compact(s){
  return {
    intro:s?.introPhase,introRelease:s?.introRelease,
    special:s?.specialPhase,training:s?.trainingPhase,
    benefits:s?.benefitsPhase,benefitsReason:s?.benefitsReason,
    methods:s?.phase,methodsReason:s?.reason,
    starts:s?.starts,skips:s?.skips,scrollY:s?.scrollY,
  };
}
async function awaitPhase(label,field,wanted,timeoutMs){
  const deadline=Date.now()+timeoutMs;
  let last=null;
  while(Date.now()<deadline){
    last=await measure();
    if(last?.[field]===wanted)return last;
    if(last?.[field]==='disabled'||last?.[field]==='skipped')
      throw Error(`SMD_METHODS_${label}_TERMINATED ${JSON.stringify(compact(last))}`);
    await sleep(85);
  }
  throw Error(`SMD_METHODS_${label}_TIMEOUT ${JSON.stringify(compact(last))}`);
}
async function throughBenefits(w,h){
  await wheel(w,h);
  const intro=await awaitPhase('INTRO','introPhase','released',4000);
  if(intro.introRelease!=='completed')throw Error('SMD_METHODS_INTRO_NOT_COMPLETED');
  await wheel(w,h);
  const special=await awaitPhase('SPECIAL','specialPhase','completed',3800);
  await wheel(w,h);
  const training=await awaitPhase('TRAINING','trainingPhase','completed',4900);
  await wheel(w,h);
  const benefits=await awaitPhase('BENEFITS','benefitsPhase','completed',4900);
  return {intro,special,training,benefits};
}
async function throughTraining(w,h){
  await wheel(w,h);
  const intro=await awaitPhase('INTRO','introPhase','released',4000);
  if(intro.introRelease!=='completed')throw Error('SMD_METHODS_INTRO_NOT_COMPLETED');
  await wheel(w,h);
  await awaitPhase('SPECIAL','specialPhase','completed',3800);
  await wheel(w,h);
  await awaitPhase('TRAINING','trainingPhase','completed',4900);
}
const check=(errors,cond,reason)=>{if(!cond)errors.push(reason);};
const results=[];let failure=null;
try {
  const p=await port();
  const tabs=await(await fetch(`http://127.0.0.1:${p}/json/list`)).json();
  const tab=tabs.find(x=>x.type==='page');
  if(!tab?.webSocketDebuggerUrl)throw Error('SMD_METHODS_BROWSER_TAB_NOT_FOUND');
  ws=new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((done,fail)=>{ws.addEventListener('open',done,{once:true});ws.addEventListener('error',fail,{once:true});});
  ws.addEventListener('message',event=>{
    const data=JSON.parse(event.data),job=pending.get(data.id);
    if(!job)return;
    pending.delete(data.id);
    data.error?job.fail(Error(JSON.stringify(data.error))):job.done(data);
  });
  await cdp('Page.enable');await cdp('Runtime.enable');

  for(const [w,h] of [[1920,1080],[2560,1080],[3440,1440],[3840,1080]]){
    const errors=[];
    await navigate(w,h,false);
    const initial=await measure();
    check(errors,initial.title.length===1,'TITLE_COUNT');
    check(errors,initial.cards.length===3,'CARD_COUNT');
    check(errors,initial.texts.length===6,'TEXT_COUNT');
    check(errors,initial.cards.map(x=>x.source).join(',')==='node-1:54,node-1:56,node-1:58','CARD_ORDER');
    check(errors,initial.phase==='unarmed','INITIAL_PHASE');
    await throughBenefits(w,h);
    const armed=await measure();
    check(errors,armed.phase==='ready','METHODS_NOT_READY');
    await wheel(w,h);
    await awaitPhase('METHODS_REVEAL','phase','revealing',2400);
    await sleep(750);
    const mid=await measure();
    check(errors,mid.phase==='revealing','MID_NOT_REVEALING');
    check(errors,mid.starts===1,'START_COUNT');
    check(errors,mid.cards.some(x=>x.opacity>0&&x.opacity<1),'CARD_NOT_IN_PROGRESS');
    check(errors,mid.title[0]?.opacity>=.999,'TITLE_NOT_COMPLETE_BEFORE_CARDS');
    check(errors,mid.texts.every(x=>x.opacity<.001),'TEXT_STARTED_BEFORE_CARD_COMPLETE');
    await sleep(570);
    const textMid=await measure();
    check(errors,textMid.phase==='revealing','TEXT_MID_NOT_REVEALING');
    check(errors,textMid.texts.some(x=>x.opacity>0&&x.opacity<1),'TEXT_NOT_FADING_IN');
    const done=await awaitPhase('METHODS_COMPLETE','phase','completed',3400);
    check(errors,done.title.every(x=>x.opacity>=.999),'TITLE_HIDDEN');
    check(errors,done.cards.every(x=>x.opacity>=.999),'CARD_HIDDEN');
    check(errors,done.texts.every(x=>x.opacity>=.999),'TEXT_HIDDEN');
    check(errors,Math.abs((done.methods?.top??-999)-(done.header?.height??0))<=5,'METHODS_NOT_ALIGNED');
    await wheel(w,h,-850);await sleep(350);
    await wheel(w,h,800);await sleep(350);
    const replay=await measure();
    check(errors,replay.starts===1&&replay.phase==='completed','METHODS_REPLAY');
    results.push({viewport:[w,h],variant:'completed',initial,armed,mid,textMid,done,replay,errors});
    console.log(`SMD_METHODS ${w}x${h} COMPLETE ${errors.length?'FAIL '+errors.join(','):'BROWSER_OK'}`);
  }

  { // Intentional down-skip lands at Location with all 10 motion targets visible.
    const w=1920,h=1080,errors=[];
    await navigate(w,h,false);
    await throughBenefits(w,h);
    await wheel(w,h);
    await awaitPhase('METHODS_DOWN_SKIP_REVEAL','phase','revealing',2400);
    await sleep(470);
    await wheel(w,h);await sleep(70);await wheel(w,h);await sleep(230);
    const skipped=await measure();
    check(errors,skipped.phase==='skipped'&&skipped.reason==='WHEEL_DOWN','DOWN_SKIP_NOT_TERMINAL');
    check(errors,skipped.skips===1&&skipped.starts===1,'DOWN_SKIP_COUNT');
    check(errors,[...skipped.title,...skipped.cards,...skipped.texts].every(x=>x.opacity>=.999),'DOWN_SKIP_TARGET_HIDDEN');
    check(errors,Math.abs((skipped.location?.top??-999)-(skipped.header?.height??0))<=5,'LOCATION_NOT_ALIGNED');
    await wheel(w,h,-1200);await sleep(350);
    const replay=await measure();
    check(errors,replay.phase==='skipped'&&replay.starts===1,'DOWN_SKIP_REPLAY');
    results.push({viewport:[w,h],variant:'down-skip',skipped,replay,errors});
  }

  { // Benefits' confirmed down-skip hands off without reusing its Wheel events.
    const w=1920,h=1080,errors=[];
    await navigate(w,h,false);
    await throughTraining(w,h);
    await wheel(w,h);
    await awaitPhase('BENEFITS_SKIP_REVEAL','benefitsPhase','revealing',2400);
    await sleep(440);
    await wheel(w,h);await sleep(70);await wheel(w,h);await sleep(260);
    const handoff=await measure();
    check(errors,handoff.benefitsPhase==='skipped'&&handoff.benefitsReason==='WHEEL_DOWN','BENEFITS_DOWN_SKIP_MISSING');
    check(errors,handoff.phase==='revealing'&&handoff.starts===1,'METHODS_HANDOFF_NOT_STARTED');
    check(errors,Math.abs((handoff.methods?.top??-999)-(handoff.header?.height??0))<=5,'HANDOFF_ALIGNMENT');
    results.push({viewport:[w,h],variant:'benefits-skip-handoff',handoff,errors});
  }

  { // Upward intent terminates without jumping ahead to Location.
    const w=1920,h=1080,errors=[];
    await navigate(w,h,false);
    await throughBenefits(w,h);
    await wheel(w,h);
    await awaitPhase('METHODS_UP_SKIP_REVEAL','phase','revealing',2400);
    await sleep(420);
    const before=await measure();
    await wheel(w,h,-700);await sleep(70);await wheel(w,h,-700);await sleep(280);
    const after=await measure();
    check(errors,after.phase==='skipped'&&after.reason==='WHEEL_UP','UP_SKIP_NOT_TERMINAL');
    check(errors,after.scrollY<before.scrollY,'UP_SKIP_NOT_NATIVE');
    check(errors,after.starts===1,'UP_SKIP_REPLAY');
    results.push({viewport:[w,h],variant:'up-skip',before,after,errors});
  }

  for(const [w,h,touch,reduced] of [[390,844,true,false],[1024,768,true,false],[1920,1080,false,true]]){
    const errors=[];
    await navigate(w,h,touch,{reduced});
    const snapshot=await measure();
    check(errors,snapshot.phase==='disabled'&&snapshot.starts===0,'NON_DESKTOP_NOT_DISABLED');
    check(errors,[...snapshot.title,...snapshot.cards,...snapshot.texts].every(x=>x.opacity>=.999),'NON_DESKTOP_HIDDEN');
    results.push({viewport:[w,h],variant:reduced?'reduced-motion':'touch',snapshot,errors});
  }
} catch(error) {
  failure=String(error?.stack??error);
  console.error('SMD_METHODS_BROWSER_BLOCKED',failure);
} finally {
  const receipt={contract:'SMD_HOME_METHODS_REVEAL_R1',url,
    status:failure?'BLOCKED':results.some(x=>x.errors.length)?'FAIL':'PASS',
    failure,results,figmaPixelParity:'NOT_RUN',performance:'NOT_MEASURED'};
  mkdirSync(dirname(out),{recursive:true});
  writeFileSync(out,JSON.stringify(receipt,null,2)+'\n');
  console.log('SMD_METHODS_BROWSER_RECEIPT '+out);
  ws?.close();child.kill();await sleep(250);
  rmSync(scratch,{recursive:true,force:true,maxRetries:3});
  if(receipt.status!=='PASS')process.exitCode=1;
}
