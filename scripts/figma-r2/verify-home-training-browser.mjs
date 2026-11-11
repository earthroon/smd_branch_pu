/** SMD_HOME_TRAINING_REVEAL_R1 physical witness.
 * Run against an already started local Nuxt server with SMD_DEV_FIXTURE_ONLY=1.
 * Uses installed Chromium/Edge via CDP, no browser automation npm dependency. */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { readCdpEvaluateValue } from './cdp-evaluate-result.mjs';

const args=process.argv.slice(2);
const arg=(key,fallback)=>{const i=args.indexOf(key);return i>=0?args[i+1]:fallback;};
const url=arg('--url','http://127.0.0.1:3000/');
if(!/^https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?\/$/.test(url))
  throw Error('SMD_TRAINING_BROWSER_LOCAL_URL_ONLY');
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const out=resolve(arg('--out',join(root,'artifacts/smd-home-training-reveal-r1/browser-receipt.json')));
const candidates=[process.env.SMD_CHROME_PATH,process.env.CHROME_PATH,
  process.env.PROGRAMFILES&&join(process.env.PROGRAMFILES,'Google/Chrome/Application/chrome.exe'),
  process.env.PROGRAMFILES&&join(process.env.PROGRAMFILES,'Microsoft/Edge/Application/msedge.exe'),
  process.env['PROGRAMFILES(X86)']&&join(process.env['PROGRAMFILES(X86)'],'Microsoft/Edge/Application/msedge.exe'),
  '/usr/bin/chromium','/usr/bin/google-chrome'].filter(Boolean);
const chrome=candidates.find(existsSync);
if(!chrome)throw Error('SMD_TRAINING_CHROMIUM_NOT_FOUND');
const scratch=join(tmpdir(),`smd-training-browser-${randomUUID()}`);
mkdirSync(scratch,{recursive:true});
const child=spawn(chrome,['--headless=new','--no-sandbox','--no-first-run','--disable-extensions',
  '--no-default-browser-check','--remote-debugging-port=0',`--user-data-dir=${scratch}`,'about:blank'],{stdio:'ignore'});
const sleep=ms=>new Promise(done=>setTimeout(done,ms));
let ws;let seq=0;const pending=new Map();
function cdp(method,params={}){
  return new Promise((done,fail)=>{
    const id=++seq;
    const timeout=setTimeout(()=>{pending.delete(id);fail(Error(`SMD_TRAINING_CDP_TIMEOUT_${method}`));},15000);
    pending.set(id,{done:v=>{clearTimeout(timeout);done(v);},fail:e=>{clearTimeout(timeout);fail(e);}});
    ws.send(JSON.stringify({id,method,params}));
  });
}
async function port(){
  for(let i=0;i<100;i++){
    if(child.exitCode!==null)throw Error('SMD_TRAINING_CHROMIUM_EXITED');
    const p=join(scratch,'DevToolsActivePort');
    if(existsSync(p))return Number(readFileSync(p,'utf8').split(/\r?\n/)[0]);
    await sleep(100);
  }
  throw Error('SMD_TRAINING_CDP_STARTUP_TIMEOUT');
}
async function evaluate(expression){
  const response=await cdp('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});
  return readCdpEvaluateValue(response,'SMD_TRAINING');
}
async function measure(){
  return evaluate(`(() => {
    const stage=document.querySelector('[data-training-contract="SMD_HOME_TRAINING_REVEAL_R1"]');
    const intro=document.querySelector('[data-intro-contract="SMD_HOME_INTERACTION_R1"]');
    const section=id=>stage?.querySelector('[data-wide-section="'+id+'"]');
    const box=el=>{if(!el)return null;const r=el.getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:r.height};};
    const targets=[...document.querySelectorAll('[data-wide-section="training-track"] .smd-home-training__target')]
      .map(el=>({index:Number(el.dataset.trainingItemIndex),source:el.dataset.trainingSourceNode,
        opacity:Number(getComputedStyle(el).opacity),transform:getComputedStyle(el).transform,bounds:box(el)}));
    const diagram=[...document.querySelectorAll('[data-wide-section="training-track"] .smd-home-training__diagram-part')]
      .map(el=>({source:el.dataset.trainingDiagramNode,opacity:Number(getComputedStyle(el).opacity),
        transform:getComputedStyle(el).transform}));
    return {
      phase:stage?.dataset.trainingPhase??null,outcome:stage?.dataset.trainingOutcome??null,
      starts:Number(stage?.dataset.trainingAnimationStarts??-1),
      skips:Number(stage?.dataset.trainingSkips??-1),prepared:stage?.dataset.trainingPrepared??null,
      reason:stage?.dataset.trainingSkipReason??null,
      specialPhase:stage?.dataset.specialPhase??null,specialReason:stage?.dataset.specialSkipReason??null,
      introPhase:intro?.dataset.introPhase??null,introRelease:intro?.dataset.introReleaseReason??null,
      viewport:[innerWidth,innerHeight],scrollY,training:box(section('training-track')),
      benefits:box(section('benefits')),header:box(document.querySelector('.smd-site-header')),
      targets,diagram,
    };
  })()`);
}
async function navigate(w,h,touch){
  await cdp('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile:touch});
  await cdp('Emulation.setTouchEmulationEnabled',touch?{enabled:true,maxTouchPoints:5}:{enabled:false});
  const navigation=await cdp('Page.navigate',{url});
  if(navigation.result?.errorText)throw Error(`SMD_TRAINING_NAVIGATION_FAILED ${navigation.result.errorText}`);
  for(let i=0;i<70;i++){
    const state=await evaluate(`({loaded:document.readyState==='complete',present:!!document.querySelector('[data-training-contract]')})`);
    if(state?.loaded&&state?.present)return;
    await sleep(150);
  }
  throw Error('SMD_TRAINING_DOM_UNAVAILABLE');
}
async function wheel(w,h,deltaY=320){
  await cdp('Input.dispatchMouseEvent',{type:'mouseWheel',x:Math.floor(w/2),y:Math.floor(h/2),deltaX:0,deltaY});
}
const results=[];let failure=null;
const check=(errors,condition,code)=>{if(!condition)errors.push(code);};
try{
  const p=await port();
  const tabs=await(await fetch(`http://127.0.0.1:${p}/json/list`)).json();
  const tab=tabs.find(x=>x.type==='page');
  if(!tab?.webSocketDebuggerUrl)throw Error('SMD_TRAINING_BROWSER_TAB_NOT_FOUND');
  ws=new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((done,fail)=>{ws.addEventListener('open',done,{once:true});ws.addEventListener('error',fail,{once:true});});
  ws.addEventListener('message',e=>{
    const data=JSON.parse(e.data),job=pending.get(data.id);if(!job)return;
    pending.delete(data.id);data.error?job.fail(Error(JSON.stringify(data.error))):job.done(data);
  });
  await cdp('Page.enable');await cdp('Runtime.enable');
  for(const [w,h] of [[1920,1080],[2560,1080],[3440,1440],[3840,1080]]){
    const errors=[];
    await navigate(w,h,false);
    const initial=await measure();
    check(errors,initial.targets.length===5,'TARGET_COUNT');
    check(errors,initial.diagram.length===14,'DIAGRAM_COUNT');
    await wheel(w,h);await sleep(1450); // Intro 1110ms + quiet gate
    const introDone=await measure();
    check(errors,introDone.introPhase==='released','INTRO_NOT_RELEASED');
    await wheel(w,h);await sleep(1300); // Special entry 420ms + reveal 740ms
    const specialDone=await measure();
    check(errors,specialDone.specialPhase==='completed','SPECIAL_NOT_COMPLETED');
    check(errors,specialDone.phase==='ready','TRAINING_NOT_READY');
    await wheel(w,h);await sleep(550); // Training entry 420ms + reveal 130ms
    const mid=await measure();
    check(errors,mid.phase==='revealing','TRAINING_NOT_REVEALING');
    check(errors,mid.starts===1,'TRAINING_START_COUNT');
    check(errors,mid.diagram.every(x=>x.opacity<0.001),'DIAGRAM_TOO_EARLY');
    await sleep(2300); // finish 2260ms
    const done=await measure();
    check(errors,done.phase==='completed'&&done.outcome==='completed','TRAINING_NOT_COMPLETED');
    check(errors,done.targets.every(x=>x.opacity>=.999),'TARGET_NOT_VISIBLE');
    check(errors,done.diagram.every(x=>x.opacity>=.999),'DIAGRAM_NOT_VISIBLE');
    await wheel(w,h,-880);await sleep(480);
    const replay=await measure();
    check(errors,replay.phase==='completed'&&replay.starts===1,'COMPLETED_REPLAY');
    results.push({viewport:[w,h],variant:'completed',initial,introDone,specialDone,mid,done,replay,errors});
    console.log(`SMD_TRAINING ${w}x${h} COMPLETE ${errors.length?'FAIL '+errors.join(','):'BROWSER_OK'}`);
  }
  { // Mid-sequence skip forward: all content becomes visible, no replay.
    const w=1920,h=1080,errors=[];
    await navigate(w,h,false);
    await wheel(w,h);await sleep(1450);
    await wheel(w,h);await sleep(1300);
    await wheel(w,h);await sleep(720);
    const mid=await measure();
    check(errors,mid.phase==='revealing','SKIP_PRECONDITION_NOT_REVEALING');
    await wheel(w,h);await sleep(70);await wheel(w,h);await sleep(200);
    const skipped=await measure();
    check(errors,skipped.phase==='skipped'&&skipped.skips===1,'SKIP_NOT_TERMINAL');
    check(errors,skipped.targets.every(x=>x.opacity>=.999),'SKIP_TARGETS_HIDDEN');
    check(errors,skipped.diagram.every(x=>x.opacity>=.999),'SKIP_DIAGRAM_HIDDEN');
    check(errors,Math.abs((skipped.benefits?.top??-999)-(skipped.header?.height??0))<=5,'BENEFITS_NOT_ALIGNED');
    await wheel(w,h,-900);await sleep(450);
    const replay=await measure();
    check(errors,replay.phase==='skipped'&&replay.starts===1,'SKIPPED_REPLAY');
    results.push({viewport:[w,h],variant:'skip',mid,skipped,replay,errors});
    console.log(`SMD_TRAINING ${w}x${h} SKIP ${errors.length?'FAIL '+errors.join(','):'BROWSER_OK'}`);
  }
  { // Special down-skip confirmed across 50ms lands at Training once and arms reveal once.
    const w=1920,h=1080,errors=[];
    await navigate(w,h,false);
    await wheel(w,h);await sleep(1450);
    await wheel(w,h);await sleep(520);
    await wheel(w,h);await sleep(70);await wheel(w,h);await sleep(190);
    const handoff=await measure();
    check(errors,handoff.specialPhase==='skipped'&&handoff.specialReason==='WHEEL_DOWN','SPECIAL_NOT_SKIPPED_DOWN');
    check(errors,handoff.starts===1,'TRAINING_DUPLICATE_OR_MISSING_START');
    check(errors,handoff.phase==='revealing','TRAINING_HANDOFF_NOT_REVEALING');
    results.push({viewport:[w,h],variant:'special-skip-handoff',handoff,errors});
    console.log(`SMD_TRAINING ${w}x${h} HANDOFF ${errors.length?'FAIL '+errors.join(','):'BROWSER_OK'}`);
  }
  for(const [w,h] of [[390,844],[1024,768]]){
    const errors=[];
    await navigate(w,h,true);
    const initial=await measure();
    check(errors,initial.phase==='disabled','MOBILE_PHASE_NOT_DISABLED');
    check(errors,initial.starts===0,'MOBILE_ANIMATION_STARTED');
    check(errors,initial.targets.every(x=>x.opacity>=.999),'MOBILE_TARGET_HIDDEN');
    check(errors,initial.diagram.every(x=>x.opacity>=.999),'MOBILE_DIAGRAM_HIDDEN');
    results.push({viewport:[w,h],variant:'touch',initial,errors});
  }
}catch(error){failure=String(error?.stack??error);console.error('SMD_TRAINING_BROWSER_BLOCKED',failure)}
finally{
  const receipt={contract:'SMD_HOME_TRAINING_REVEAL_R1',url,
    status:failure?'BLOCKED':results.some(x=>x.errors.length)?'FAIL':'PASS',failure,results,
    figmaPixelParity:'NOT_RUN',performance:'NOT_MEASURED'};
  mkdirSync(dirname(out),{recursive:true});writeFileSync(out,JSON.stringify(receipt,null,2)+'\n');
  console.log('SMD_TRAINING_BROWSER_RECEIPT '+out);
  ws?.close();child.kill();await sleep(250);rmSync(scratch,{recursive:true,force:true,maxRetries:3});
  if(receipt.status!=='PASS')process.exitCode=1;
}
