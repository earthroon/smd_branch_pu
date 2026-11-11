/** CF6 optional read-only local/staging Chrome CDP qualification.
 * Usage: node scripts/reviews-r1/verify-browser.mjs --url http://127.0.0.1:3129 --out artifacts/reviews-r1/browser.json
 * Does not publish, change CMS, load fake testimonies or declare Figma pixel parity. */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
const args=process.argv.slice(2);
const arg=(name,fallback)=>{const i=args.indexOf(name);return i===-1?fallback:args[i+1]};
const notRun=(code,detail)=>{console.error(`${code}: ${detail}`);process.exit(2)};
const raw=arg('--url',process.env.SMD_REVIEWS_BROWSER_URL);
if(!raw)notRun('BROWSER_NOT_RUN','Provide --url or SMD_REVIEWS_BROWSER_URL');
let url;
try{url=new URL(raw)}catch{notRun('BROWSER_URL_INVALID',raw)}
const local=/^(localhost|127\.0\.0\.1)$/.test(url.hostname);
const staging=/(?:^|[.-])(?:staging|preview|test)(?:[.-]|$)/i.test(url.hostname);
if(!['http:','https:'].includes(url.protocol)||(!local&&!staging)||
  (!local&&url.protocol!=='https:')||url.username||url.password||url.search||url.hash||
  !['/',''].includes(url.pathname))notRun('LOCAL_OR_STAGING_URL_REQUIRED',raw);
const base=url.origin;
const out=resolve(arg('--out','artifacts/reviews-r1/browser.json'));
const candidates=[process.env.SMD_CHROME_PATH,process.env.CHROME_PATH,
  process.env.PROGRAMFILES&&join(process.env.PROGRAMFILES,'Google','Chrome','Application','chrome.exe'),
  process.env.PROGRAMFILES&&join(process.env.PROGRAMFILES,'Microsoft','Edge','Application','msedge.exe'),
  process.env['PROGRAMFILES(X86)']&&join(process.env['PROGRAMFILES(X86)'],'Microsoft','Edge','Application','msedge.exe'),
  '/usr/bin/chromium','/usr/bin/google-chrome'].filter(Boolean);
const executable=candidates.find(existsSync);
if(!executable)notRun('BROWSER_NOT_RUN','Chrome/Edge not found. Set SMD_CHROME_PATH.');
const profile=join(tmpdir(),'smd-reviews-r1-'+randomUUID());
mkdirSync(profile,{recursive:true});
const child=spawn(executable,['--headless=new','--no-first-run','--no-default-browser-check','--disable-extensions',
  '--remote-debugging-port=0',`--user-data-dir=${profile}`,
  ...(process.platform==='linux'&&process.getuid?.()===0?['--no-sandbox']:[]),'about:blank'],{stdio:'ignore'});
const sleep=ms=>new Promise(done=>setTimeout(done,ms));
let socket=null,seq=0;
const pending=new Map();
const cdp=(method,params={})=>new Promise((done,reject)=>{
  const id=++seq;
  const timer=setTimeout(()=>{pending.delete(id);reject(Error(`CDP_TIMEOUT_${method}`))},30000);
  pending.set(id,{done,reject,timer});
  socket.send(JSON.stringify({id,method,params}));
});
async function evaluate(expression){
  const response=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
  if(response.exceptionDetails)throw Error('BROWSER_EVAL_FAILED '+response.exceptionDetails.text);
  return response.result?.value;
}
async function navigate(path){
  const target=base+path;
  const res=await cdp('Page.navigate',{url:target});
  if(res.errorText)throw Error(`BROWSER_NAVIGATION_FAILED_${res.errorText}`);
  for(let i=0;i<100;i++){
    const ready=await evaluate(`document.readyState==='complete'&&location.href===${JSON.stringify(target)}`);
    if(ready)return;
    await sleep(130);
  }
  throw Error(`BROWSER_NAVIGATION_TIMEOUT_${path}`);
}
const observe=String.raw`(()=>{
  const root=document.querySelector('.smd-reviews-page');
  const pick=s=>document.querySelector(s);
  const rect=e=>{if(!e)return null;const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}};
  const tabs=[...document.querySelectorAll('.smd-reviews-tabs__tab')].map(e=>({id:e.id,selected:e.getAttribute('aria-selected'),tabindex:e.tabIndex,text:e.textContent.trim()}));
  const grid=pick('.smd-reviews-results__grid');
  return {
    path:location.pathname, query:location.search, viewport:document.documentElement.clientWidth,
    overflowPx:Math.max(0,document.documentElement.scrollWidth-document.documentElement.clientWidth),
    root:!!root,publication:root?.getAttribute('data-review-publication')??null,
    filter:root?.getAttribute('data-review-filter')??null,
    sourceDigest:root?.getAttribute('data-review-source-digest')??null,
    tabs,cardCount:document.querySelectorAll('.smd-reviews-card').length,
    empty:!!pick('.smd-reviews-results__empty'),hasMore:!!pick('#reviews-load-more'),
    headerCount:document.querySelectorAll('.smd-site-header').length,
    footerCount:document.querySelectorAll('.smd-site-footer').length,
    headerTarget:pick('.smd-site-header__desktop-nav a[data-header-item="reviews"]')?.getAttribute('data-target-status')??null,
    footerFallback:!!pick('.smd-site-footer [role="status"]'),
    ctaHref:pick('.smd-reviews-cta__action')?.getAttribute('href')??null,
    hero:rect(pick('.smd-reviews-hero__eyebrow')),facts:rect(pick('.smd-reviews-facts')),
    section:rect(pick('.smd-reviews-section-heading')),filterBar:rect(pick('.smd-reviews-tabs')),
    firstCard:rect(pick('.smd-reviews-card')),cta:rect(pick('.smd-reviews-cta')),
    font:pick('.smd-reviews-hero__title')?getComputedStyle(pick('.smd-reviews-hero__title')).fontFamily:null,
    titleLineHeight:pick('.smd-reviews-hero__title')?getComputedStyle(pick('.smd-reviews-hero__title')).lineHeight:null,
    columns:grid?getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length:0,
  };
})()`;
const receipt={contract:'SMD_REVIEWS_R1_CF6_BROWSER_V1',baseUrl:base,source:'FROZEN_REVIEW_SOURCE_EMPTY',
  viewports:[],ssrHydration:'NOT_RUN',invalidQueryHttpStatus:null,backForward:'NOT_RUN',
  figmaPixelParity:'NOT_RUN',cssReconstructionParity:'NOT_RUN',visualAssetDigests:'NOT_RUN',
  screenshotPaths:[],errors:[],productionPromotionAllowed:false};
try{
  let port=null;
  for(let k=0;k<100;k++){
    const f=join(profile,'DevToolsActivePort');
    if(existsSync(f)){port=Number(readFileSync(f,'utf8').split(/\r?\n/)[0]);break}
    if(child.exitCode!==null)throw Error(`CHROME_EXIT_${child.exitCode}`);
    await sleep(100);
  }
  if(port===null)throw Error('CDP_PORT_UNAVAILABLE');
  const pages=await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const page=pages.find(x=>x.type==='page');
  if(!page?.webSocketDebuggerUrl)throw Error('CDP_PAGE_NOT_FOUND');
  socket=new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((done,reject)=>{socket.addEventListener('open',done,{once:true});socket.addEventListener('error',reject,{once:true})});
  socket.addEventListener('message',ev=>{
    const msg=JSON.parse(ev.data),p=pending.get(msg.id);
    if(!p)return;
    pending.delete(msg.id);clearTimeout(p.timer);
    msg.error?p.reject(Error(JSON.stringify(msg.error))):p.done(msg.result);
  });
  await cdp('Page.enable');await cdp('Runtime.enable');
  await cdp('Emulation.setDeviceMetricsOverride',{width:1920,height:1080,deviceScaleFactor:1,mobile:false});
  await cdp('Emulation.setScriptExecutionDisabled',{value:true});
  await navigate('/reviews?category=glass-film');
  const ssr=await evaluate(observe);
  await cdp('Emulation.setScriptExecutionDisabled',{value:false});
  await navigate('/reviews?category=glass-film');
  await evaluate('(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));return true})()');
  const hydrated=await evaluate(observe);
  receipt.ssrHydration=ssr.root&&hydrated.root&&ssr.filter===hydrated.filter&&
    ssr.cardCount===hydrated.cardCount&&JSON.stringify(ssr.tabs)===JSON.stringify(hydrated.tabs)?'PASS':'FAIL';
  if(receipt.ssrHydration!=='PASS')receipt.errors.push('SSR_HYDRATION_MISMATCH');
  const response=await fetch(base+'/reviews?category=UNKNOWN',{redirect:'manual'});
  receipt.invalidQueryHttpStatus=response.status;
  if(response.status!==400)receipt.errors.push('QUERY_HTTP_400_NOT_OBSERVED');
  const widths=[1920,1440,1024,768,390,320];
  for(const width of widths){
    await cdp('Emulation.setDeviceMetricsOverride',{width,height:1080,deviceScaleFactor:1,mobile:false});
    await navigate('/reviews?category=glass-film');
    await evaluate('(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));return true})()');
    const current=await evaluate(observe);
    receipt.viewports.push({width,...current});
    if(!current.root||current.headerCount!==1||current.footerCount!==1||current.overflowPx!==0||
      current.publication!=='STANDALONE_PREVIEW_NOT_PUBLISHED'||current.cardCount!==0||
      current.filter!=='glass-film'||current.headerTarget!=='ready'||current.ctaHref!=='/curriculum')
      receipt.errors.push(`RENDER_INVARIANT_FAIL_${width}`);
    if(width===1920||width===390){
      const pic=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});
      const name=out.replace(/\.json$/,'')+`-${width}.png`;
      mkdirSync(dirname(name),{recursive:true});writeFileSync(name,Buffer.from(pic.data,'base64'));
      receipt.screenshotPaths.push(name);
    }
  }
  await cdp('Emulation.setDeviceMetricsOverride',{width:1920,height:1080,deviceScaleFactor:1,mobile:false});
  await navigate('/reviews?category=glass-film');
  await evaluate(`document.getElementById('reviews-tab-career-prep').click()`);
  for(let i=0;i<40;i++){if((await evaluate(observe)).filter==='career-prep')break;await sleep(100)}
  const switched=await evaluate(observe);
  await evaluate('history.back()');
  for(let i=0;i<40;i++){if((await evaluate(observe)).filter==='glass-film')break;await sleep(100)}
  const back=await evaluate(observe);
  receipt.backForward=switched.filter==='career-prep'&&back.filter==='glass-film'?'PASS':'FAIL';
  if(receipt.backForward!=='PASS')receipt.errors.push('BACK_FORWARD_FAILED');
} catch(failure) {receipt.errors.push(failure instanceof Error?failure.message:String(failure))}
finally{
  for(const [,p] of pending)clearTimeout(p.timer);
  try{socket?.close()}catch{}
  child.kill();rmSync(profile,{recursive:true,force:true});
  mkdirSync(dirname(out),{recursive:true});
  receipt.status=receipt.errors.length===0?'BROWSER_OBSERVATION_PASS':'BROWSER_OBSERVATION_FAIL';
  writeFileSync(out,JSON.stringify(receipt,null,2)+'\n');
  console.log(JSON.stringify({status:receipt.status,out,errors:receipt.errors,figmaPixelParity:'NOT_RUN'}));
  if(receipt.errors.length)process.exitCode=1;
}
