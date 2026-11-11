/** SMD-CURRICULUM-WEEK-R1 CF5: actual local Nuxt/Chrome interaction witness.
 * Runs only against an already running local, admitted Public page.
 * A missing CMS publication or Chrome is BLOCKED, never silently PASS.
 */
import {spawn} from 'node:child_process';
import {existsSync,mkdirSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const args=process.argv.slice(2);
const opt=(name,fallback)=>{const i=args.indexOf(name);return i<0?fallback:args[i+1];};
const url=opt('--url','http://127.0.0.1:3000/curriculum');
const out=resolve(opt('--out',join(root,'artifacts/curriculum-week-r1/browser-receipt.json')));
if(!/^http:\/\/(?:127\.0\.0\.1|localhost):\d+\/curriculum\/?$/.test(url))
  throw new Error('SMD_CURRICULUM_WEEK_LOCAL_URL_REQUIRED');
const paths=[process.env.SMD_CHROME_PATH,process.env.CHROME_PATH,
  process.env.PROGRAMFILES&&join(process.env.PROGRAMFILES,'Google/Chrome/Application/chrome.exe'),
  process.env.PROGRAMFILES&&join(process.env.PROGRAMFILES,'Microsoft/Edge/Application/msedge.exe'),
  '/usr/bin/chromium','/usr/bin/google-chrome'].filter(Boolean);
const chrome=paths.find(existsSync);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let child=null,ws=null,serial=0,failure=null;
const pending=new Map(),results=[];
const scratch=join(tmpdir(),`smd-curriculum-week-${randomUUID()}`);
function cdp(method,params={}){return new Promise((done,fail)=>{
  const id=++serial;
  const timeout=setTimeout(()=>{pending.delete(id);fail(new Error(`SMD_WEEK_CDP_TIMEOUT:${method}`));},20000);
  pending.set(id,{done:v=>{clearTimeout(timeout);done(v);},fail:e=>{clearTimeout(timeout);fail(e);}});
  ws.send(JSON.stringify({id,method,params}));
});}
async function evaluate(expression){
  const r=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
  if(r.exceptionDetails)throw new Error(`SMD_WEEK_EVAL_FAILED:${r.exceptionDetails.text}`);
  return r.result?.value;
}
async function port(){
  for(let i=0;i<120;i++){
    if(child.exitCode!==null)throw new Error('SMD_WEEK_CHROME_EXITED');
    const p=join(scratch,'DevToolsActivePort');
    if(existsSync(p))return Number(readFileSync(p,'utf8').split(/\r?\n/)[0]);
    await sleep(100);
  }
  throw new Error('SMD_WEEK_BROWSER_START_TIMEOUT');
}
async function navigation(width,height,touch){
  await cdp('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:touch});
  await cdp('Emulation.setTouchEmulationEnabled',{enabled:touch,maxTouchPoints:touch?5:1});
  await cdp('Page.navigate',{url});
  for(let i=0;i<90;i++){
    const ok=await evaluate('document.readyState==="complete" && document.querySelectorAll(".smd-curriculum__week[role=tab]").length===6');
    if(ok)break;
    await sleep(150);
  }
  const admitted=await evaluate('document.querySelectorAll(".smd-curriculum__week[role=tab]").length===6');
  if(!admitted)throw new Error(`SMD_WEEK_PUBLIC_NOT_ADMITTED:${width}`);
  await evaluate('(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));return true;})()');
}
async function verify(width,height,touch){
  await navigation(width,height,touch);
  const observed=await evaluate(`(async()=>{
    const tabs=[...document.querySelectorAll('.smd-curriculum__week[role="tab"]')];
    const colors=[],errors=[];
    const panel=()=>document.querySelector('#curriculum-week-panel[role="tabpanel"]');
    const mediaPaint=[...document.querySelectorAll('[data-source-shape]')]
      .filter(x=>['72','73','74','75','76','388'].includes(x.dataset.sourceShape));
    if(mediaPaint.length!==0)errors.push('DUPLICATE_STATIC_CARD_PAINT');
    const initial=panel()?.dataset.detailWeek;
    for(let i=0;i<6;i++){
      tabs[i].click();
      await new Promise(r=>requestAnimationFrame(r));
      const selected=tabs.filter(t=>t.getAttribute('aria-selected')==='true');
      const p=panel();
      if(selected.length!==1||selected[0]!==tabs[i])errors.push('NONEXCLUSIVE_'+i);
      if(p?.dataset.detailWeek!=='week-'+String(i+1).padStart(2,'0'))errors.push('PANEL_ID_'+i);
      if(p?.getAttribute('aria-labelledby')!==tabs[i].id)errors.push('PANEL_LABEL_'+i);
      if(tabs.some(t=>t.disabled))errors.push('TAB_DISABLED_'+i);
      const color=getComputedStyle(tabs[i]).backgroundColor;
      if(color!=='rgb(23, 44, 87)')errors.push('NAVY_COLOR_'+i+':'+color);
      colors.push(color);
    }
    tabs[0].focus();
    tabs[0].dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));
    await new Promise(r=>requestAnimationFrame(r));
    if(tabs[1].getAttribute('aria-selected')!=='true')errors.push('ARROW_NAVIGATION');
    return {width:innerWidth,height:innerHeight,selectedAtStart:initial,colors,
      scrollOverflow:document.documentElement.scrollWidth-innerWidth,
      panelCount:document.querySelectorAll('[role="tabpanel"]').length,errors,
      authority:document.querySelector('.smd-curriculum')?.dataset.weekProgramSource??null};
  })()`);
  const errors=[...observed.errors];
  if(observed.scrollOverflow>2)errors.push('HORIZONTAL_OVERFLOW');
  if(observed.panelCount!==1)errors.push('PANEL_COUNT');
  results.push({width,height,touch,errors,observed});
  console.log(`SMD_WEEK_BROWSER ${width}x${height} ${touch?'TOUCH':'DESKTOP'} ${errors.length?'FAIL '+errors.join(','):'PASS'}`);
}
try {
  if(!chrome)throw new Error('SMD_WEEK_CHROME_UNAVAILABLE');
  mkdirSync(scratch,{recursive:true});
  child=spawn(chrome,['--headless=new','--no-sandbox','--disable-extensions','--no-first-run',
    '--remote-debugging-port=0',`--user-data-dir=${scratch}`,'about:blank'],{stdio:'ignore'});
  const p=await port();
  const list=await (await fetch(`http://127.0.0.1:${p}/json/list`)).json();
  const tab=list.find(v=>v.type==='page');
  if(!tab?.webSocketDebuggerUrl)throw new Error('SMD_WEEK_CDP_PAGE_MISSING');
  ws=new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((done,fail)=>{
    ws.addEventListener('open',done,{once:true});ws.addEventListener('error',fail,{once:true});
  });
  ws.addEventListener('message',e=>{
    const msg=JSON.parse(e.data),p=pending.get(msg.id);if(!p)return;
    pending.delete(msg.id);msg.error?p.fail(new Error(JSON.stringify(msg.error))):p.done(msg);
  });
  await cdp('Page.enable');await cdp('Runtime.enable');
  for(const [w,h,touch] of [[1920,1080,false],[1380,900,false],[768,1024,true],[390,844,true]])
    await verify(w,h,touch);
}catch(error){failure=String(error?.stack??error);console.error('SMD_WEEK_BROWSER_BLOCKED',failure);}
finally{
  const receipt={contract:'SMD_CURRICULUM_WEEK_PROGRAM_V1',status:failure?'BLOCKED':
    results.some(v=>v.errors.length)?'FAIL':'PASS',failure,results,
    note:'Requires real, matching local Public publication and browser; no CMS mutations.'};
  mkdirSync(dirname(out),{recursive:true});writeFileSync(out,JSON.stringify(receipt,null,2)+'\n');
  console.log('SMD_WEEK_BROWSER_RECEIPT '+out);
  ws?.close();child?.kill();await sleep(250);
  if(existsSync(scratch))rmSync(scratch,{recursive:true,force:true,maxRetries:3});
  if(receipt.status!=='PASS')process.exitCode=1;
}
