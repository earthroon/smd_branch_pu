/** SMD_HOME_BENEFITS_REVEAL_R1 browser witness.
 * Requires a running Nuxt dev server with SMD_DEV_FIXTURE_ONLY=1.
 * Never promotes STATIC tests to runtime/physical evidence. */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { readCdpEvaluateValue } from './cdp-evaluate-result.mjs';
import { isBenefitsPageReady } from './home-benefits-browser-readiness.mjs';

const args=process.argv.slice(2);
const arg=(key,fallback)=>{const i=args.indexOf(key);return i>=0?args[i+1]:fallback;};
const url=arg('--url','http://127.0.0.1:3000/');
if(!/^https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?\/$/.test(url))
  throw new Error('SMD_BENEFITS_BROWSER_LOCAL_URL_ONLY');
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const out=resolve(arg('--out',join(root,'artifacts/smd-home-benefits-reveal-r1/browser-receipt.json')));
const candidates=[
  process.env.SMD_CHROME_PATH,process.env.CHROME_PATH,
  process.env.PROGRAMFILES&&join(process.env.PROGRAMFILES,'Google/Chrome/Application/chrome.exe'),
  process.env.PROGRAMFILES&&join(process.env.PROGRAMFILES,'Microsoft/Edge/Application/msedge.exe'),
  process.env['PROGRAMFILES(X86)']&&join(process.env['PROGRAMFILES(X86)'],'Microsoft/Edge/Application/msedge.exe'),
  '/usr/bin/chromium','/usr/bin/google-chrome',
].filter(Boolean);
const chrome=candidates.find(existsSync);
if(!chrome)throw Error('SMD_BENEFITS_CHROMIUM_NOT_FOUND');
const scratch=join(tmpdir(),`smd-benefits-browser-${randomUUID()}`);
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
    const timeout=setTimeout(()=>{pending.delete(id);fail(Error(`SMD_BENEFITS_CDP_TIMEOUT_${method}`));},15000);
    pending.set(id,{done:v=>{clearTimeout(timeout);done(v);},fail:e=>{clearTimeout(timeout);fail(e);}});
    ws.send(JSON.stringify({id,method,params}));
  });
}
async function port(){
  for(let i=0;i<100;i++){
    if(child.exitCode!==null)throw Error('SMD_BENEFITS_CHROMIUM_EXITED');
    const p=join(scratch,'DevToolsActivePort');
    if(existsSync(p))return Number(readFileSync(p,'utf8').split(/\r?\n/)[0]);
    await sleep(100);
  }
  throw Error('SMD_BENEFITS_CDP_STARTUP_TIMEOUT');
}
async function evaluate(expression){
  const result=await cdp('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});
  return readCdpEvaluateValue(result,'SMD_BENEFITS');
}
/** Page.navigate acknowledges navigation before the new document necessarily loads.
 * A unique browser-only query identity prevents accepting the previous page DOM.
 * Then wait for Vue onMounted(), not just SSR markup and readyState=complete. */
async function navigate(w,h,touch){
  const probeUrl=new URL(url);
  const nonce=randomUUID();
  probeUrl.searchParams.set('__smd_benefits_browser_probe',nonce);
  await cdp('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile:touch});
  await cdp('Emulation.setTouchEmulationEnabled',touch?{enabled:true,maxTouchPoints:5}:{enabled:false});
  const response=await cdp('Page.navigate',{url:probeUrl.href});
  if(response.result?.errorText)throw Error(`SMD_BENEFITS_NAVIGATION_FAILED ${response.result.errorText}`);
  const loaderId=response.result?.loaderId;
  if(!loaderId)throw Error('SMD_BENEFITS_NEW_DOCUMENT_LOADER_MISSING');
  let last=null;
  let contextTransientCount=0;
  for(let i=0;i<120;i++){
    const frame=await cdp('Page.getFrameTree');
    if(frame.result?.frameTree?.frame?.loaderId!==loaderId){ await sleep(100); continue; }
    let state;
    try { state=await evaluate(`(() => {
      const intro=document.querySelector('[data-intro-contract="SMD_HOME_INTERACTION_R1"]');
      const stage=document.querySelector('[data-benefits-contract="SMD_HOME_BENEFITS_REVEAL_R1"]');
      return {
        documentIdentity:new URLSearchParams(location.search).get('__smd_benefits_browser_probe'),
        loaded:document.readyState==='complete',
        present:!!stage,
        introPhase:intro?.dataset.introPhase??null,
        introAdmission:intro?.dataset.introAdmissionReason??null,
        benefitsPhase:stage?.dataset.benefitsPhase??null,
        media:matchMedia('(min-width: 1380px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)').matches,
        maxTouchPoints:navigator.maxTouchPoints,
      };
    })()`); } catch(error) {
      // Only transient CDP context turnover while the NEW document is installing.
      // Other evaluation failures must retain their exact error.
      if(!/Execution context was destroyed|Cannot find context with specified id|Inspected target navigated/i.test(String(error)))throw error;
      contextTransientCount++;
      await sleep(100);
      continue;
    }
    last=state;
    if(isBenefitsPageReady(state,nonce,touch))return;
    await sleep(100);
  }
  throw Error('SMD_BENEFITS_HYDRATION_OR_NAVIGATION_NOT_READY '+JSON.stringify({last,contextTransientCount}));
}

async function measure(){
  return evaluate(`(() => {
    const stage=document.querySelector('[data-benefits-contract="SMD_HOME_BENEFITS_REVEAL_R1"]');
    const intro=document.querySelector('[data-intro-contract="SMD_HOME_INTERACTION_R1"]');
    const section=id=>stage?.querySelector('[data-wide-section="'+id+'"]');
    const box=el=>{if(!el)return null;const r=el.getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:r.height};};
    const targets=[...document.querySelectorAll('[data-wide-section="benefits"] .smd-home-benefits__target')]
      .map(el=>({index:Number(el.dataset.benefitsItemIndex),source:el.dataset.benefitsSourceNode,
        opacity:Number(getComputedStyle(el).opacity),transform:getComputedStyle(el).transform}));
    return {
      phase:stage?.dataset.benefitsPhase??null,
      outcome:stage?.dataset.benefitsOutcome??null,
      prepared:stage?.dataset.benefitsPrepared??null,
      starts:Number(stage?.dataset.benefitsAnimationStarts??-1),
      skips:Number(stage?.dataset.benefitsSkips??-1),
      reason:stage?.dataset.benefitsSkipReason??null,
      introPhase:intro?.dataset.introPhase??null,
      introRelease:intro?.dataset.introReleaseReason??null,
      introAdmission:intro?.dataset.introAdmissionReason??null,
      desktopMedia:matchMedia('(min-width: 1380px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)').matches,
      touchPoints:navigator.maxTouchPoints,
      specialPhase:stage?.dataset.specialPhase??null,
      specialReason:stage?.dataset.specialSkipReason??null,
      trainingPhase:stage?.dataset.trainingPhase??null,
      trainingReason:stage?.dataset.trainingSkipReason??null,
      viewport:[innerWidth,innerHeight],scrollY,
      benefits:box(section('benefits')),
      training:box(section('training-track')),
      methods:box(section('methods')),
      header:box(document.querySelector('.smd-site-header')),
      targets,
    };
  })()`);
}
async function wheel(w,h,deltaY=320){
  await cdp('Input.dispatchMouseEvent',{
    type:'mouseWheel',x:Math.floor(w/2),y:Math.floor(h/2),deltaX:0,deltaY,
  });
}
function phaseSnapshot(snapshot){
  return {
    introPhase:snapshot?.introPhase, introRelease:snapshot?.introRelease,
    introAdmission:snapshot?.introAdmission,
    specialPhase:snapshot?.specialPhase, specialReason:snapshot?.specialReason,
    trainingPhase:snapshot?.trainingPhase, trainingReason:snapshot?.trainingReason,
    benefitsPhase:snapshot?.phase, benefitsReason:snapshot?.reason,
    desktopMedia:snapshot?.desktopMedia, touchPoints:snapshot?.touchPoints,
    scrollY:snapshot?.scrollY,
  };
}
async function awaitPhase(label,field,expected,timeoutMs){
  const deadline=Date.now()+timeoutMs;
  let last=null;
  while(Date.now()<deadline){
    last=await measure();
    if(last?.[field]===expected)return last;
    if(last?.[field]==='disabled'||last?.[field]==='skipped'||
       (field==='introPhase'&&last?.[field]==='released')) {
      throw Error(`SMD_BENEFITS_${label}_TERMINATED `+JSON.stringify(phaseSnapshot(last)));
    }
    await sleep(90);
  }
  throw Error(`SMD_BENEFITS_${label}_TIMEOUT `+JSON.stringify(phaseSnapshot(last)));
}
async function throughSpecial(w,h){
  await wheel(w,h);
  const introDone=await awaitPhase('INTRO','introPhase','released',3200);
  if(introDone.introRelease!=='completed')
    throw Error('SMD_BENEFITS_INTRO_NOT_COMPLETED '+JSON.stringify(phaseSnapshot(introDone)));
  await wheel(w,h);
  const specialDone=await awaitPhase('SPECIAL','specialPhase','completed',3400);
  return {introDone,specialDone};
}
async function throughTraining(w,h){
  const prior=await throughSpecial(w,h);
  await wheel(w,h);
  const trainingDone=await awaitPhase('TRAINING','trainingPhase','completed',4700);
  return {...prior,trainingDone};
}
const results=[];
let failure=null;
const check=(errors,condition,code)=>{if(!condition)errors.push(code);};
try{
  const p=await port();
  const tabs=await(await fetch(`http://127.0.0.1:${p}/json/list`)).json();
  const tab=tabs.find(x=>x.type==='page');
  if(!tab?.webSocketDebuggerUrl)throw Error('SMD_BENEFITS_BROWSER_TAB_NOT_FOUND');
  ws=new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((done,fail)=>{
    ws.addEventListener('open',done,{once:true});
    ws.addEventListener('error',fail,{once:true});
  });
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
    check(errors,initial.targets.length===5,'TARGET_COUNT');
    check(errors,initial.targets.map(x=>x.source).sort().join(',')===
      ['node-1:92','node-1:85','node-18:144','node-18:86','node-18:131'].sort().join(','),
      'TARGET_SOURCE_IDENTITY');
    const {trainingDone}=await throughTraining(w,h);
    check(errors,trainingDone.trainingPhase==='completed','TRAINING_NOT_COMPLETED');
    check(errors,trainingDone.phase==='ready','BENEFITS_NOT_READY');
    await wheel(w,h);
    await awaitPhase('BENEFITS_REVEAL','phase','revealing',2300);
    await sleep(210); // sample intermediate opacity after reveal starts
    const mid=await measure();
    check(errors,mid.phase==='revealing','BENEFITS_NOT_REVEALING');
    check(errors,mid.starts===1,'BENEFITS_START_COUNT');
    check(errors,mid.targets.length===5,'MID_TARGET_COUNT');
    check(errors,mid.targets.some(x=>x.opacity>0&&x.opacity<1),'NO_INTERMEDIATE_OPACITY');
    const done=await awaitPhase('BENEFITS_COMPLETE','phase','completed',2700);
    check(errors,done.phase==='completed'&&done.outcome==='completed','BENEFITS_NOT_COMPLETED');
    check(errors,done.targets.every(x=>x.opacity>=0.999),'TARGET_NOT_VISIBLE');
    check(errors,Math.abs((done.benefits?.top??-999)-(done.header?.height??0))<=5,'BENEFITS_NOT_ALIGNED');
    await wheel(w,h,-700);await sleep(380);
    const replay=await measure();
    check(errors,replay.phase==='completed'&&replay.starts===1,'COMPLETED_REPLAY');
    results.push({viewport:[w,h],variant:'completed',initial,trainingDone,mid,done,replay,errors});
    console.log(`SMD_BENEFITS ${w}x${h} COMPLETE ${errors.length?'FAIL '+errors.join(','):'BROWSER_OK'}`);
  }

  { // Skip during card reveal → Methods, all five groups fully visible.
    const w=1920,h=1080,errors=[];
    await navigate(w,h,false);
    await throughTraining(w,h);
    await wheel(w,h);
    await awaitPhase('BENEFITS_SKIP_READY','phase','revealing',2300);
    await sleep(430); // card reveal in progress
    const mid=await measure();
    check(errors,mid.phase==='revealing','SKIP_PRECONDITION_NOT_REVEALING');
<<<<<<< HEAD
    await wheel(w,h);await sleep(230);
=======
    await wheel(w,h);await sleep(70);await wheel(w,h);await sleep(230);
>>>>>>> dec113c (feat(home): add FAQ accordion and stabilize scroll animations)
    const skipped=await measure();
    check(errors,skipped.phase==='skipped'&&skipped.reason==='WHEEL_DOWN','BENEFITS_SKIP_NOT_TERMINAL');
    check(errors,skipped.skips===1,'BENEFITS_SKIP_COUNT');
    check(errors,skipped.targets.every(x=>x.opacity>=0.999),'SKIP_TARGET_HIDDEN');
    check(errors,Math.abs((skipped.methods?.top??-999)-(skipped.header?.height??0))<=5,'METHODS_NOT_ALIGNED');
    await wheel(w,h,-900);await sleep(380);
    const replay=await measure();
    check(errors,replay.phase==='skipped'&&replay.starts===1,'SKIPPED_REPLAY');
    results.push({viewport:[w,h],variant:'skip',mid,skipped,replay,errors});
    console.log(`SMD_BENEFITS SKIP ${errors.length?'FAIL '+errors.join(','):'BROWSER_OK'}`);
  }

<<<<<<< HEAD
  { // Training's down-skip already lands at Benefits, one event, one reveal.
=======
  { // Training's confirmed down-skip lands at Benefits once; one handoff, one reveal.
>>>>>>> dec113c (feat(home): add FAQ accordion and stabilize scroll animations)
    const w=1920,h=1080,errors=[];
    await navigate(w,h,false);
    await throughSpecial(w,h);
    await wheel(w,h);
    await awaitPhase('TRAINING_SKIP_READY','trainingPhase','revealing',2300);
    await sleep(180);
<<<<<<< HEAD
    await wheel(w,h);await sleep(230);
=======
    await wheel(w,h);await sleep(70);await wheel(w,h);await sleep(230);
>>>>>>> dec113c (feat(home): add FAQ accordion and stabilize scroll animations)
    const handoff=await measure();
    check(errors,handoff.trainingPhase==='skipped'&&handoff.trainingReason==='WHEEL_DOWN','TRAINING_NOT_SKIPPED_DOWN');
    check(errors,handoff.phase==='revealing'&&handoff.starts===1,'BENEFITS_HANDOFF_NOT_REVEALING');
    check(errors,Math.abs((handoff.benefits?.top??-999)-(handoff.header?.height??0))<=5,'HANDOFF_NOT_ALIGNED');
    results.push({viewport:[w,h],variant:'training-skip-handoff',handoff,errors});
    console.log(`SMD_BENEFITS HANDOFF ${errors.length?'FAIL '+errors.join(','):'BROWSER_OK'}`);
  }

  for(const [w,h] of [[390,844],[1024,768]]){
    const errors=[];
    await navigate(w,h,true);
    const initial=await measure();
    check(errors,initial.phase==='disabled','TOUCH_NOT_DISABLED');
    check(errors,initial.starts===0,'TOUCH_ANIMATION_STARTED');
    check(errors,initial.targets.every(x=>x.opacity>=.999),'TOUCH_TARGET_HIDDEN');
    results.push({viewport:[w,h],variant:'touch',initial,errors});
  }
}catch(error){
  failure=String(error?.stack??error);
  console.error('SMD_BENEFITS_BROWSER_BLOCKED',failure);
}finally{
  const receipt={contract:'SMD_HOME_BENEFITS_REVEAL_R1',url,
    status:failure?'BLOCKED':results.some(x=>x.errors.length)?'FAIL':'PASS',failure,results,
    figmaPixelParity:'NOT_RUN',performance:'NOT_MEASURED'};
  mkdirSync(dirname(out),{recursive:true});
  writeFileSync(out,JSON.stringify(receipt,null,2)+'\n');
  console.log('SMD_BENEFITS_BROWSER_RECEIPT '+out);
  ws?.close();child.kill();await sleep(250);
  rmSync(scratch,{recursive:true,force:true,maxRetries:3});
  if(receipt.status!=='PASS')process.exitCode=1;
}
