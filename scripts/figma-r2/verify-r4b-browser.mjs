/** R4B local Chromium verification. No production deployment or Figma pixel parity claims. */
import {spawn} from 'node:child_process';
import {existsSync,mkdirSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {randomUUID,createHash} from 'node:crypto';

const args=process.argv.slice(2);
const opt=(key,def)=>{const i=args.indexOf(key);return i<0?def:args[i+1]};
const base=opt('--url','http://127.0.0.1:3129/');
const output=resolve(opt('--out','docs/migration/smd-home-r2/visual-restore/browser-local/r4b'));
if(!/^http:\/\/(?:127\.0\.0\.1|localhost):\d+\/$/.test(base))throw Error('R4B_LOCAL_URL_REQUIRED');
const candidates=[process.env.SMD_CHROME_PATH,process.env.CHROME_PATH,
  process.env.PROGRAMFILES&&join(process.env.PROGRAMFILES,'Google/Chrome/Application/chrome.exe'),
  process.env.PROGRAMFILES&&join(process.env.PROGRAMFILES,'Microsoft/Edge/Application/msedge.exe'),
  process.env['PROGRAMFILES(X86)']&&join(process.env['PROGRAMFILES(X86)'],'Microsoft/Edge/Application/msedge.exe'),
  '/usr/bin/chromium','/usr/bin/google-chrome'].filter(Boolean);
const binary=candidates.find(existsSync);
if(!binary)throw Error('R4B_BROWSER_NOT_FOUND');
const scratch=join(tmpdir(),'smd-r4b-browser-'+randomUUID());mkdirSync(scratch,{recursive:true});
const child=spawn(binary,['--headless=new','--no-first-run','--no-default-browser-check','--disable-extensions',
  '--remote-debugging-port=0',`--user-data-dir=${scratch}`,
  ...(process.platform==='linux'&&process.getuid?.()===0?['--no-sandbox']:[]),'about:blank'],{stdio:'ignore'});
const sleep=ms=>new Promise(done=>setTimeout(done,ms));
let ws,serial=0;
const pending=new Map();
async function debugPort(){
  for(let i=0;i<120;i++){
    if(child.exitCode!==null)throw Error('R4B_CHROME_EXIT '+child.exitCode);
    const f=join(scratch,'DevToolsActivePort');
    if(existsSync(f))return Number(readFileSync(f,'utf8').split(/\r?\n/)[0]);
    await sleep(100);
  }
  throw Error('R4B_CHROME_PORT_TIMEOUT');
}
function cdp(method,params={}){
  return new Promise((accept,reject)=>{
    const id=++serial;
    const timer=setTimeout(()=>{pending.delete(id);reject(Error('R4B_CDP_TIMEOUT '+method))},20000);
    pending.set(id,{accept,reject,timer});
    ws.send(JSON.stringify({id,method,params}));
  });
}
const evalText=String.raw`(async()=>{
  await document.fonts.ready;
  await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  const visible=e=>!!e&&e.getClientRects().length>0&&getComputedStyle(e).display!=='none';
  const box=e=>{if(!e)return null;const r=e.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height}};
  const scene=document.querySelector('.smd-home--figma-scene');
  const reflow=document.querySelector('.smd-home--semantic-reflow');
  const iconKeys=['node-1:414','node-1:477','node-1:482'];
  const icons=iconKeys.map(key=>{
    const es=[...document.querySelectorAll('image[data-figma-svg-instance="'+key+'"]')];const el=es[0];
    return {key,count:es.length,visible:visible(el),box:box(el),
      href:el?.getAttribute('href')??null,
      assetId:el?.getAttribute('data-original-asset-id')??null,
      assetSha:el?.getAttribute('data-original-svg-sha256')??null,
      authority:el?.getAttribute('data-user-visual-override')??null,
      candidate:el?.getAttribute('data-r4b-candidate')??null};
  });
  const titleKeys=['node-18:114','node-1:61','node-18:116'];
  const titles=titleKeys.map(key=>{
    const fo=document.querySelector('foreignObject[data-figma-text-instance="'+key+'"]');
    const run=fo?.querySelector('.smd-figma-native-text__runs span');const style=run?getComputedStyle(run):null;
    const range=document.createRange();if(run)range.selectNodeContents(run);
    const glyph=run?box(range):null;
    return {key,visible:visible(fo),text:run?.textContent??null,
      sourceTextDigest:fo?.getAttribute('data-source-text-digest')??null,
      fontWeight:style?.fontWeight??null,fontSize:style?.fontSize??null,
      fontFamily:style?.fontFamily??null,glyph,foreignObjectBox:box(fo)};
  });
  const loadedPretendardFaces=[...document.fonts].filter(f=>/Pretendard/i.test(f.family)&&f.status==='loaded');
  return {viewport:document.documentElement.clientWidth,documentWidth:document.documentElement.scrollWidth,
    sceneVisible:visible(scene),reflowVisible:visible(reflow),
    loadedPretendardFaces:loadedPretendardFaces.length,icons,titles};
})()`;
const imageProbe=String.raw`(async()=>{
  const files=['/figma-r2/derived/helmet-weight-r3.svg',
    '/figma-r2/assets/asset-2b6d2381b996643b28e6926979f69304ca5572c50b047406d0c2a994c6acb595.svg'];
  const result=[];
  for(const src of files){
    const image=new Image();image.src=src;await image.decode();
    const canvas=document.createElement('canvas');canvas.width=104;canvas.height=64;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0,104,64);
    const pixels=ctx.getImageData(0,0,104,64).data;
    let alphaPixels=0,xSum=0,ySum=0,minX=104,minY=64,maxX=-1,maxY=-1;
    for(let y=0;y<64;y++)for(let x=0;x<104;x++){
      const alpha=pixels[(y*104+x)*4+3];if(alpha<128)continue;
      alphaPixels++;xSum+=x;ySum+=y;minX=Math.min(minX,x);minY=Math.min(minY,y);
      maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);
    }
    result.push({src,sourceWidth:image.naturalWidth,sourceHeight:image.naturalHeight,
      alphaPixels,inkBounds:alphaPixels?{x:minX,y:minY,width:maxX-minX+1,height:maxY-minY+1}:null,
      centroid:alphaPixels?{x:xSum/alphaPixels,y:ySum/alphaPixels}:null});
  }
  return result;
})()`;
const widths=[360,390,430,768,1024,1280,1440,1920,2560];
let failed=false;
try{
  const helmetUrl=new URL('/figma-r2/assets/asset-2b6d2381b996643b28e6926979f69304ca5572c50b047406d0c2a994c6acb595.svg',base);
  const response=await fetch(helmetUrl);
  if(response.status!==200)throw Error('R4B_ORIGINAL_HELMET_HTTP '+response.status);
  const received=createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex');
  if(received!=='2b6d2381b996643b28e6926979f69304ca5572c50b047406d0c2a994c6acb595')throw Error('R4B_ORIGINAL_HELMET_HTTP_SHA_MISMATCH');
  const port=await debugPort();
  const pages=await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const page=pages.find(x=>x.type==='page');
  if(!page?.webSocketDebuggerUrl)throw Error('R4B_CHROME_TAB_UNAVAILABLE');
  ws=new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((ok,no)=>{ws.addEventListener('open',ok,{once:true});ws.addEventListener('error',no,{once:true})});
  ws.addEventListener('message',e=>{
    const msg=JSON.parse(e.data),item=pending.get(msg.id);
    if(!item)return;
    pending.delete(msg.id);clearTimeout(item.timer);
    msg.error?item.reject(Error(JSON.stringify(msg.error))):item.accept(msg.result);
  });
  await cdp('Page.enable');await cdp('Runtime.enable');
  const results=[];
  let helmetOptical=null;
  for(const width of widths){
    await cdp('Emulation.setDeviceMetricsOverride',{width,height:1080,deviceScaleFactor:1,mobile:width<=430});
    const nav=await cdp('Page.navigate',{url:base});
    if(nav.errorText)throw Error('R4B_NAVIGATION_ERROR '+width+' '+nav.errorText);
    for(let i=0;i<70;i++){
      const s=await cdp('Runtime.evaluate',{expression:'document.readyState',returnByValue:true});
      if(s.result?.value==='complete')break;await sleep(120);
    }
    await sleep(1000);
    const x=await cdp('Runtime.evaluate',{expression:evalText,awaitPromise:true,returnByValue:true});
    if(x.exceptionDetails)throw Error('R4B_DOM_ERROR '+width+' '+JSON.stringify(x.exceptionDetails).slice(0,300));
    const value=x.result?.value;
    if(!value)throw Error('R4B_DOM_EMPTY '+width);
    const errors=[];
    if(value.documentWidth>value.viewport+2)errors.push('HORIZONTAL_OVERFLOW');
    if(!value.loadedPretendardFaces)errors.push('PRETENDARD_NOT_LOADED');
    if(width>=1100){
      if(!value.sceneVisible)errors.push('DESKTOP_SCENE_NOT_VISIBLE');
      const [calendar,tool,helmet]=value.icons;
      if(calendar.count!==1||tool.count!==1)errors.push('LEGACY_ICONS_INVALID');
      if(helmet.count!==1||!helmet.visible)errors.push('HELMET_MISSING_OR_DUPLICATED');
      if(helmet.candidate!=='B1_CANONICAL_SOURCE_NO_EROSION'||helmet.authority!=='USER_VISUAL_HELMET_OPTICAL_R4B')errors.push('HELMET_B1_NOT_SELECTED');
      if(!helmet.href?.includes('asset-2b6d2381b996643b28e6926979f69304ca5572c50b047406d0c2a994c6acb595.svg'))errors.push('HELMET_ORIGINAL_ASSET_NOT_USED');
      if(helmet.assetSha!=='2b6d2381b996643b28e6926979f69304ca5572c50b047406d0c2a994c6acb595')errors.push('HELMET_SHA_MISMATCH');
      const [first,second,third]=value.titles;
      if(!first.visible||!second.visible||!third.visible)errors.push('METHOD_TITLES_NOT_VISIBLE');
      if(first.fontWeight!=='500'||second.fontWeight!=='500')errors.push('OTHER_CARD_TITLE_WEIGHT_DRIFT');
      if(third.fontWeight!=='600'||third.fontSize!=='36px'||third.text!=='밑작업 중심의 반복 실습')errors.push('CARD3_TITLE_NOT_SEMIBOLD');
      if(third.sourceTextDigest!=='bc22e87b6d91e4bed222827400a5b20a9fc0f80d564018bfdf9db8e3267c200c')errors.push('CARD3_SOURCE_DIGEST_CHANGED');
      if(third.glyph && third.foreignObjectBox && third.glyph.bottom>third.foreignObjectBox.bottom+2)errors.push('CARD3_GLYPH_CLIPPED');
    }else if(!value.reflowVisible){errors.push('RESPONSIVE_REFLOW_MISSING')}
    results.push({width,...value,errors});
    console.log(`R4B ${width}px: ${errors.length?'FAIL '+errors.join(','):'BROWSER_METRICS_OK'}; HELMET_VISUAL_PENDING`);
    if(width===1920){
      const ink=await cdp('Runtime.evaluate',{expression:imageProbe,awaitPromise:true,returnByValue:true});
      if(ink.exceptionDetails)throw Error('R4B_OPTICAL_MEASUREMENT_FAILED '+JSON.stringify(ink.exceptionDetails));
      helmetOptical=ink.result?.value;
      if(!helmetOptical||helmetOptical.length!==2||helmetOptical.some(i=>!i.alphaPixels))throw Error('R4B_OPTICAL_INK_MISSING');
      for(const [selector,file] of [['.smd-figma-scene-section--training-track','r4b-training-1920.png'],
        ['.smd-figma-scene-section--methods','r4b-methods-1920.png']]){
        await cdp('Runtime.evaluate',{expression:`document.querySelector(${JSON.stringify(selector)})?.scrollIntoView({block:'center'})`});
        await sleep(150);
        const png=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,fromSurface:true});
        mkdirSync(output,{recursive:true});writeFileSync(join(output,file),Buffer.from(png.data,'base64'));
      }
    }
  }
  mkdirSync(output,{recursive:true});
  const receipt={contract:'SMD_HOME_R2_VISUAL_REPAIR_R4B',source:'LOCAL_DEV_FIXTURE',url:base,
    originalSvgSha256:received,helmetOptical,results,visualApproved:false,originalFigmaPixelParity:'NOT_RUN',productionQualified:false};
  writeFileSync(join(output,'r4b-browser-receipt.json'),JSON.stringify(receipt,null,2)+'\n');
  if(results.some(r=>r.errors.length))process.exitCode=1;
  console.log('R4B_BROWSER_RECEIPT_WRITTEN '+join(output,'r4b-browser-receipt.json'));
}catch(error){failed=true;process.exitCode=1;console.error('R4B_BROWSER_FAILED',error)}
finally{
  try{ws?.close()}catch{}
  for(const item of pending.values())clearTimeout(item.timer);
  pending.clear();child.kill();await sleep(250);rmSync(scratch,{recursive:true,force:true,maxRetries:3});
}
