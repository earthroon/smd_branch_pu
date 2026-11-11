/** SMD_HOME_LAYOUT_R1 CF4: real local-browser geometry admission; no deploy or writes to source. */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const args=process.argv.slice(2);
const opt=(name, fallback)=>{const i=args.indexOf(name); return i<0?fallback:args[i+1];};
const url=opt('--url','http://127.0.0.1:3000/');
const root=resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const out=resolve(opt('--out',join(root,'artifacts/smd-home-layout-r1/browser-receipt.json')));
if (!/^http:\/\/(?:localhost|127\.0\.0\.1):\d+\/$/.test(url)) throw new Error('SMD_LAYOUT_BROWSER_LOCAL_URL_REQUIRED');
const paths=[process.env.SMD_CHROME_PATH,process.env.CHROME_PATH,
  process.env.PROGRAMFILES&&join(process.env.PROGRAMFILES,'Google/Chrome/Application/chrome.exe'),
  process.env.PROGRAMFILES&&join(process.env.PROGRAMFILES,'Microsoft/Edge/Application/msedge.exe'),
  process.env['PROGRAMFILES(X86)']&&join(process.env['PROGRAMFILES(X86)'],'Microsoft/Edge/Application/msedge.exe'),
  '/usr/bin/chromium','/usr/bin/google-chrome'].filter(Boolean);
const chrome=paths.find(existsSync);
if(!chrome)throw new Error('SMD_LAYOUT_CHROME_NOT_FOUND');
const scratch=join(tmpdir(),`smd-home-layout-r1-${randomUUID()}`);
mkdirSync(scratch,{recursive:true});
const child=spawn(chrome,['--headless=new','--no-first-run','--disable-extensions','--no-default-browser-check',
  '--no-sandbox','--remote-debugging-port=0',`--user-data-dir=${scratch}`,'about:blank'],{stdio:'ignore'});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let ws,serial=0;
const pending=new Map();
const cdp=(method,params={})=>new Promise((done,fail)=>{
  const id=++serial;
  const timeout=setTimeout(()=>{pending.delete(id);fail(Error(`SMD_LAYOUT_CDP_TIMEOUT:${method}`));},20000);
  pending.set(id,{done:v=>{clearTimeout(timeout);done(v);},fail:e=>{clearTimeout(timeout);fail(e);}});
  ws.send(JSON.stringify({id,method,params}));
});
async function getPort(){
  for(let i=0;i<120;i++){
    if(child.exitCode!==null)throw new Error('SMD_LAYOUT_CHROME_EXITED');
    const f=join(scratch,'DevToolsActivePort');
    if(existsSync(f))return Number(readFileSync(f,'utf8').split(/\r?\n/)[0]);
    await sleep(100);
  }
  throw Error('SMD_LAYOUT_DEBUG_PORT_TIMEOUT');
}
async function evaluate(expr){
  const r=await cdp('Runtime.evaluate',{expression:expr,returnByValue:true,awaitPromise:true});
  if(r.exceptionDetails)throw Error(`SMD_LAYOUT_EVAL_FAILED:${r.exceptionDetails.text}`);
  return r.result?.value;
}
async function navigation(width,height,touch=false){
  await cdp('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:touch});
  await cdp('Emulation.setTouchEmulationEnabled',touch?{enabled:true,maxTouchPoints:5}:{enabled:false});
  await cdp('Page.navigate',{url});
  for(let i=0;i<90;i++){
    const state=await evaluate('({ready:document.readyState,rows:document.querySelectorAll(".smd-home-body-stage__row").length})');
    if(state?.ready==='complete' && state.rows===7)break;
    await sleep(150);
  }
  await evaluate('(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));return true;})()');
}
async function measure(){
  return evaluate(`(() => {
    const box=e=>{if(!e)return null;const r=e.getBoundingClientRect();
      return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,right:r.right}};
    const rows=[...document.querySelectorAll('.smd-home-body-stage__row')];
    const parts=rows.map(e=>({id:e.dataset.wideSection,sourceTop:Number(e.dataset.sourceTop),
      sourceHeight:Number(e.dataset.sourceHeight),sourceGap:Number(e.dataset.sourceGap),
      row:box(e),svg:box(e.querySelector('.smd-figma-scene-svg'))}));
    const iconNodes=[...document.querySelectorAll('.smd-home-intro .smd-home-info-layout__item')].map(e=>({
      source:e.getAttribute('data-home-info-source'),scale:Number(e.getAttribute('data-home-info-scale')),
      kind:e.getAttribute('data-home-info-kind'),box:box(e)}));
    const show=e=>e?getComputedStyle(e).display:null;
    const icon=e=>{const r=e?.getBoundingClientRect();return r?{cx:r.x+r.width/2,cy:r.y+r.height/2}:null};
    const iconMap=Object.fromEntries([...document.querySelectorAll(
      '.smd-home-intro .smd-home-info-layout__item[data-home-info-kind="icon"]')].map(e=>
      [e.getAttribute('data-home-info-source'),icon(e)]));
    const run=document.querySelector('.smd-home-intro foreignObject[data-figma-text-instance="node-18:59"] .smd-figma-native-text__runs span');
    let valueInk=null;
    if(run){const range=document.createRange();range.selectNodeContents(run);const r=range.getBoundingClientRect();
      valueInk={cx:r.x+r.width/2,width:r.width};range.detach();}
    const optical={icons:iconMap,valueInk};
    return {viewport:[innerWidth,innerHeight],horizontalOverflow:document.documentElement.scrollWidth-innerWidth,
      info:box(document.querySelector('.smd-home-intro .smd-figma-scene-section--info-bar')),
      infoSvg:box(document.querySelector('.smd-home-intro .smd-figma-scene-section--info-bar svg')),
      intro:box(document.querySelector('.smd-home-intro')),
      introPhase:document.querySelector('.smd-home-intro')?.dataset.introPhase,
      body:box(document.querySelector('.smd-home-body-stage')),
      sceneDisplay:show(document.querySelector('.smd-home--figma-scene')),
      reflowDisplay:show(document.querySelector('.smd-home--semantic-reflow')),
      icons:iconNodes,rows:parts,optical};
  })()`);
}
const results=[];let failure=null;
try{
  const port=await getPort();
  const tabs=await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const tab=tabs.find(x=>x.type==='page');
  if(!tab?.webSocketDebuggerUrl)throw Error('SMD_LAYOUT_TAB_MISSING');
  ws=new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((done,fail)=>{ws.addEventListener('open',done,{once:true});ws.addEventListener('error',fail,{once:true});});
  ws.addEventListener('message',e=>{
    const result=JSON.parse(e.data);const p=pending.get(result.id);if(!p)return;
    pending.delete(result.id);result.error?p.fail(Error(JSON.stringify(result.error))):p.done(result);
  });
  await cdp('Page.enable');await cdp('Runtime.enable');
  for(const [width,height,touch] of [[1920,1080,false],[2560,1080,false],[3440,1440,false],[3840,1080,false],[1380,900,false],[390,844,true],[768,1024,true],[1024,768,true]]){
    await navigation(width,height,touch);
    const observed=await measure();const errors=[];
    if(observed.rows.length!==7) errors.push('BODY_ROW_COUNT');
    if(observed.horizontalOverflow>2) errors.push('HORIZONTAL_OVERFLOW');
    if(touch){
      if(observed.sceneDisplay!=='none')errors.push('TOUCH_SCENE_NOT_HIDDEN');
      if(observed.reflowDisplay==='none')errors.push('TOUCH_REFLOW_HIDDEN');
      if(observed.introPhase!=='disabled')errors.push('TOUCH_INTRO_ACTIVE');
    }else{
      if(observed.sceneDisplay==='none')errors.push('DESKTOP_SCENE_HIDDEN');
      if(observed.reflowDisplay!=='none')errors.push('DESKTOP_REFLOW_VISIBLE');
      const ratio=Math.min(width*.75,1440)/1920;
      const bodyStart=observed.rows[0]?.row.y;
      const topOrigin=observed.rows[0]?.sourceTop;
      for(let i=0;i<observed.rows.length;i++){
        const row=observed.rows[i];
        const expectedHeight=row.sourceHeight*ratio;
        const expectedTop=bodyStart+(row.sourceTop-topOrigin)*ratio;
        if(Math.abs(row.svg.width-ratio*1920)>2)errors.push(`WIDTH_${row.id}`);
        if(Math.abs(row.row.height-expectedHeight)>2)errors.push(`HEIGHT_${row.id}`);
        if(Math.abs(row.row.y-expectedTop)>3)errors.push(`TOP_${row.id}`);
        if(i>0){const prev=observed.rows[i-1];
          if(Math.abs(row.row.y-prev.row.bottom-row.sourceGap*ratio)>3)errors.push(`GAP_${row.id}`);
        }
      }
      const expectedBarHeight=253.8*Math.min(width,1920)/1920;
      if(Math.abs(observed.info.height-expectedBarHeight)>2)errors.push('INFO_BAR_HEIGHT');
      if(observed.icons.length!==8)errors.push(`INFO_LAYOUT_NODE_COUNT_${observed.icons.length}`);
      if(observed.icons.filter(v=>v.kind==='icon'&&Math.abs(v.scale-.7)<1e-7).length!==4)errors.push('ICON_SCALE');
      if(observed.icons.filter(v=>v.kind==='text'&&Math.abs(v.scale-.9)<1e-7).length!==4)errors.push('TEXT_SCALE');
      const ink=observed.optical;
      const helmet=ink?.icons?.['node-1:395'],clock=ink?.icons?.['node-1:320'],
        tools=ink?.icons?.['node-1:411'],file=ink?.icons?.['node-18:26'];
      if(!helmet||!clock||!tools||!file||!ink?.valueInk)errors.push('OPTICAL_INK_NOT_OBSERVED');
      else {
        // Optical thresholds are proposal gates until Windows physical qualification.
        const iconMedian=[clock.cy,tools.cy,file.cy].sort((a,b)=>a-b)[1];
        if(Math.abs(helmet.cy-iconMedian)>15)errors.push('HELMET_Y_OPTICAL_DRIFT');
        if(Math.abs(file.cx-ink.valueInk.cx)>7)errors.push('FILE_TEXT_X_OPTICAL_DRIFT');
      }
    }
    results.push({width,height,touch,errors,observed});
    console.log(`SMD_LAYOUT_R1 ${width}x${height} ${touch?'TOUCH':'DESKTOP'} ${errors.length?'FAIL '+errors.join(','):'BROWSER_OK'}`);
  }
}catch(error){failure=String(error?.stack??error);console.error('SMD_LAYOUT_BROWSER_BLOCKED',failure)}
finally{
  const receipt={contract:'SMD_HOME_LAYOUT_R1',source:'local-nuxt',url,
    status:failure?'BLOCKED':results.some(r=>r.errors.length)?'FAIL':'PASS',failure,results,
    figmaPixelParity:'NOT_RUN',performance:'NOT_MEASURED'};
  mkdirSync(dirname(out),{recursive:true});writeFileSync(out,JSON.stringify(receipt,null,2)+'\n');
  console.log('SMD_LAYOUT_BROWSER_RECEIPT '+out);
  ws?.close();child.kill();await sleep(250);rmSync(scratch,{recursive:true,force:true,maxRetries:3});
  if(receipt.status!=='PASS')process.exitCode=1;
}
