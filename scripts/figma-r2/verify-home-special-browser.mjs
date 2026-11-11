/** SMD_HOME_SPECIAL_REVEAL_R1 physical witness (read-only).
 * Run against an already started local Nuxt server with SMD_DEV_FIXTURE_ONLY=1.
 * Uses Chromium/Edge CDP with zero npm runtime dependencies. */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { readCdpEvaluateValue } from './cdp-evaluate-result.mjs';

const args = process.argv.slice(2);
const arg = (key, fallback) => { const i=args.indexOf(key); return i>=0?args[i+1]:fallback; };
const url = arg('--url', 'http://127.0.0.1:3000/');
if (!/^https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?\/$/.test(url)) {
  throw new Error('SMD_SPECIAL_BROWSER_LOCAL_URL_ONLY');
}
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const out = resolve(arg('--out', join(root,'artifacts/smd-home-special-reveal-r1/browser-receipt.json')));
const candidates=[process.env.SMD_CHROME_PATH,process.env.CHROME_PATH,
  process.env.PROGRAMFILES && join(process.env.PROGRAMFILES,'Google/Chrome/Application/chrome.exe'),
  process.env.PROGRAMFILES && join(process.env.PROGRAMFILES,'Microsoft/Edge/Application/msedge.exe'),
  process.env['PROGRAMFILES(X86)'] && join(process.env['PROGRAMFILES(X86)'],'Microsoft/Edge/Application/msedge.exe'),
  '/usr/bin/chromium','/usr/bin/google-chrome'].filter(Boolean);
const chrome = candidates.find(existsSync);
if (!chrome) throw new Error('SMD_SPECIAL_CHROME_NOT_FOUND');
const scratch=join(tmpdir(),`smd-special-browser-${randomUUID()}`);
mkdirSync(scratch,{recursive:true});
const child=spawn(chrome,['--headless=new','--no-sandbox','--no-first-run','--disable-extensions',
  '--no-default-browser-check','--remote-debugging-port=0',`--user-data-dir=${scratch}`,'about:blank'],
  {stdio:'ignore'});
const sleep=ms=>new Promise(done=>setTimeout(done,ms));
let ws;let seq=0;const pending=new Map();
function cdp(method,params={}){
  return new Promise((done,fail)=>{
    const id=++seq;
    const timeout=setTimeout(()=>{pending.delete(id);fail(Error(`SMD_SPECIAL_CDP_TIMEOUT_${method}`));},15000);
    pending.set(id,{done:v=>{clearTimeout(timeout);done(v);},fail:e=>{clearTimeout(timeout);fail(e);}});
    ws.send(JSON.stringify({id,method,params}));
  });
}
async function port(){
  for(let i=0;i<100;i++){
    if(child.exitCode!==null)throw Error('SMD_SPECIAL_CHROMIUM_EXITED');
    const p=join(scratch,'DevToolsActivePort');
    if(existsSync(p))return Number(readFileSync(p,'utf8').split(/\r?\n/)[0]);
    await sleep(100);
  }
  throw Error('SMD_SPECIAL_CDP_STARTUP_TIMEOUT');
}
async function evalJs(expression){
  const r=await cdp('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});
  return readCdpEvaluateValue(r, 'SMD_SPECIAL');
}
async function measure(){
  return evalJs(`(() => {
    const root=document.querySelector('[data-special-contract="SMD_HOME_SPECIAL_REVEAL_R1"]');
    const intro=document.querySelector('[data-intro-contract="SMD_HOME_INTERACTION_R1"]');
    const special=root?.querySelector('[data-wide-section="special-start"]');
    const next=root?.querySelector('[data-wide-section="training-track"]');
    const box=e=>{ if(!e)return null; const r=e.getBoundingClientRect();
      return {top:r.top,bottom:r.bottom,height:r.height}; };
    const targets=[...document.querySelectorAll('.smd-home-special__target')].map(el=>({
      source:el.dataset.specialSourceNode, index:Number(el.dataset.specialItemIndex),
      opacity:Number(getComputedStyle(el).opacity),
      transform:getComputedStyle(el).transform,
      bounds:box(el),
    }));
    return {
      phase:root?.dataset.specialPhase??null, outcome:root?.dataset.specialOutcome??null,
      starts:Number(root?.dataset.specialAnimationStarts??-1),
      skips:Number(root?.dataset.specialSkips??-1), reason:root?.dataset.specialSkipReason??null,
      introPhase:intro?.dataset.introPhase??null, introRelease:intro?.dataset.introReleaseReason??null,
      viewport:[innerWidth,innerHeight],scrollY, special:box(special), next:box(next),
      header:box(document.querySelector('.smd-site-header')), targets,
    };
  })()`);
}
async function nav(w,h,touch){
  await cdp('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile:touch});
  await cdp('Emulation.setTouchEmulationEnabled',touch?{enabled:true,maxTouchPoints:5}:{enabled:false});
  const navigation = await cdp('Page.navigate',{url});
  if(navigation.result?.errorText)throw Error(`SMD_SPECIAL_NAVIGATION_FAILED ${navigation.result.errorText}`);
  for(let i=0;i<65;i++){
    const d=await evalJs(`({loaded:document.readyState==='complete',present:!!document.querySelector('[data-special-contract]')})`);
    if(d.loaded&&d.present)return;
    await sleep(150);
  }
  throw Error('SMD_SPECIAL_DOM_UNAVAILABLE');
}
async function wheel(w,h,deltaY=320){
  await cdp('Input.dispatchMouseEvent',{type:'mouseWheel',x:Math.floor(w/2),y:Math.floor(h/2),deltaX:0,deltaY});
}
const results=[];let failure=null;
try{
  const p=await port();
  const tabs=await(await fetch(`http://127.0.0.1:${p}/json/list`)).json();
  const tab=tabs.find(x=>x.type==='page');
  if(!tab?.webSocketDebuggerUrl)throw Error('SMD_SPECIAL_BROWSER_TAB_NOT_FOUND');
  ws=new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((done,fail)=>{ws.addEventListener('open',done,{once:true});ws.addEventListener('error',fail,{once:true});});
  ws.addEventListener('message',event=>{
    const data=JSON.parse(event.data),job=pending.get(data.id);if(!job)return;
    pending.delete(data.id);data.error?job.fail(Error(JSON.stringify(data.error))):job.done(data);
  });
  await cdp('Page.enable');await cdp('Runtime.enable');
  for(const [w,h] of [[1920,1080],[2560,1080],[3440,1440],[3840,1080]]){
    const errors=[];
    await nav(w,h,false);
    const initial=await measure();
    if(initial.phase!=='unarmed')errors.push(`INITIAL_PHASE_${initial.phase}`);
    if(initial.targets.length!==4)errors.push(`TARGET_COUNT_${initial.targets.length}`);
    await wheel(w,h);
    await sleep(1400);
    const armed=await measure();
    if(armed.introPhase!=='released'||armed.introRelease!=='completed')errors.push('INTRO_NOT_COMPLETED');
    if(armed.phase!=='ready')errors.push(`SPECIAL_NOT_READY_${armed.phase}`);
    if(errors.length===0){
      await wheel(w,h);
      await sleep(480);
      const revealing=await measure();
      if(revealing.phase!=='revealing')errors.push(`SPECIAL_NOT_REVEALING_${revealing.phase}`);
      if(revealing.starts!==1)errors.push('SPECIAL_START_COUNT');
      await sleep(850);
      const done=await measure();
      if(done.phase!=='completed'||done.outcome!=='completed')errors.push('SPECIAL_NOT_COMPLETED');
      if(done.targets.some(t=>t.opacity<.999))errors.push('SPECIAL_TARGET_NOT_VISIBLE');
      await wheel(w,h,-900);
      await sleep(650);
      const replay=await measure();
      if(replay.starts!==1||replay.phase!=='completed')errors.push('COMPLETED_REPLAY');
      results.push({viewport:[w,h],variant:'completed',initial,armed,revealing,done,replay,errors});
    } else results.push({viewport:[w,h],variant:'completed',initial,armed,errors});
    console.log(`SMD_SPECIAL ${w}x${h} COMPLETE ${errors.length?'FAIL '+errors.join(','):'BROWSER_OK'}`);
  }
  // Separate visit: explicit wheel while revealing must skip, then never replay.
  {
    const w=1920,h=1080,errors=[];
    await nav(w,h,false);
    await wheel(w,h);await sleep(1400);
    await wheel(w,h);await sleep(510);
    const beforeSkip=await measure();
    if(beforeSkip.phase!=='revealing')errors.push(`BEFORE_SKIP_${beforeSkip.phase}`);
    await wheel(w,h);await sleep(70);await wheel(w,h);
    await sleep(180);
    const skipped=await measure();
    if(skipped.phase!=='skipped'||skipped.outcome!=='skipped')errors.push('SKIP_NOT_TERMINAL');
    if(skipped.starts!==1||skipped.skips!==1)errors.push('SKIP_COUNT');
    if(skipped.targets.some(t=>t.opacity<.999))errors.push('SKIP_NOT_FULLY_VISIBLE');
    if(Math.abs((skipped.next?.top??0)-(skipped.header?.height??0))>4)errors.push('NEXT_SECTION_NOT_ALIGNED');
    await wheel(w,h,-850);await sleep(650);
    const replay=await measure();
    if(replay.phase!=='skipped'||replay.starts!==1)errors.push('SKIP_REPLAY');
    results.push({viewport:[w,h],variant:'skipped',beforeSkip,skipped,replay,errors});
    console.log(`SMD_SPECIAL 1920x1080 SKIP ${errors.length?'FAIL '+errors.join(','):'BROWSER_OK'}`);
  }
  for(const [w,h] of [[390,844],[1024,768]]){
    const errors=[];
    await nav(w,h,true);
    const initial=await measure();
    if(initial.phase!=='disabled')errors.push(`TOUCH_PHASE_${initial.phase}`);
    await wheel(w,h);await sleep(350);
    const after=await measure();
    if(after.starts!==0||after.targets.some(t=>t.opacity<.999))errors.push('TOUCH_ANIMATION_OR_HIDDEN');
    results.push({viewport:[w,h],variant:'touch',initial,after,errors});
    console.log(`SMD_SPECIAL ${w}x${h} TOUCH ${errors.length?'FAIL '+errors.join(','):'BROWSER_OK'}`);
  }
}catch(error){failure=String(error?.stack??error);console.error('SMD_SPECIAL_BROWSER_BLOCKED',failure)}
finally{
  const receipt={contract:'SMD_HOME_SPECIAL_REVEAL_R1',url,
    status:failure?'BLOCKED':results.some(r=>r.errors.length)?'FAIL':'PASS',failure,results,
    figmaPixelParity:'NOT_RUN',performance:'NOT_MEASURED'};
  mkdirSync(dirname(out),{recursive:true});writeFileSync(out,JSON.stringify(receipt,null,2)+'\n');
  console.log('SMD_SPECIAL_BROWSER_RECEIPT '+out);
  ws?.close();child.kill();await sleep(300);
  rmSync(scratch,{recursive:true,force:true,maxRetries:3});
  if(receipt.status!=='PASS')process.exitCode=1;
}
