/** FILM-R13-NONLINEAR-WIND-R1: actual hydrated Nuxt Chromium verification, not a fixture HTML. */
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
let chromium;
try{({chromium}=await import('playwright'));}
catch(error){console.error('FILM_WIND_BROWSER_MISSING_PLAYWRIGHT',String(error));process.exit(2);}
const url=process.env.SMD_VERIFY_URL||'http://127.0.0.1:3129/';
const browser=await chromium.launch({headless:true});
const cases=[
 {width:926,height:830,dpr:1,mobile:false},
 {width:1100,height:900,dpr:2,mobile:false},
 {width:1920,height:1080,dpr:1,mobile:false},
 {width:1920,height:1080,dpr:3,mobile:false},
 {width:3440,height:1440,dpr:1,mobile:false},
 {width:390,height:844,dpr:1,mobile:true},
 {width:390,height:844,dpr:3,mobile:true},
];
const receipts=[];
const failures=[];
function failMessage(name,error){return `${name}: ${String(error?.stack||error)}`;}
async function dragNativeTouch(page,from,to){
 const cdp=await page.context().newCDPSession(page);
 try{
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[from]});
  for(let step=1;step<=8;step++){
   const x=from.x+(to.x-from.x)*step/8,y=from.y+(to.y-from.y)*step/8;
   await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y}]});
   await page.waitForTimeout(20);
  }
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 }finally{await cdp.detach();}
}
async function inspectFilm(film){
 return film.evaluate(root=>{
  const rail=root.querySelector('.smd-hero-film__rail'),track=root.querySelector('.smd-hero-film__track');
  const image=root.querySelector('.smd-hero-film__slot img');
  const photo=image?.getBoundingClientRect(),frame=root.getBoundingClientRect();
  const hero=root.parentElement,section=hero?.getBoundingClientRect();
  const header=document.querySelector('header')?.getBoundingClientRect();
  const info=document.querySelector('.smd-figma-scene-section--info-bar, .smd-home--info-bar')?.getBoundingClientRect();
  const motion=rail?.getAnimations().filter(a=>a.playState==='running')??[];
  return {mode:root.dataset.filmMode,selected:root.dataset.filmSelectionKind,
   windReady:root.dataset.filmWindReady,windProfile:root.dataset.filmWindProfile,
   fault:root.dataset.filmMotionFault??null,
   frames:Number(root.dataset.filmWindKeyframes||0),running:motion.length,
   filmHeight:frame.height,photoHeight:photo?.height,sourceHeight:image?.naturalHeight,
   photoWidth:photo?.width,sourceWidth:image?.naturalWidth,
   internalTopBlankPx:photo?photo.top-frame.top:null,
   sectionHeight:section?.height,
   headerToPaintPx:header&&photo?photo.top-header.bottom:null,
   paintToInfoBarPx:info&&photo?info.top-photo.bottom:null,
   railAnimationTime:motion[0]?.currentTime??null,
   railPlaybackRate:motion[0]?.playbackRate??null,
   trackScrollLeft:track?.scrollLeft,
   reducedMotion:matchMedia('(prefers-reduced-motion:reduce)').matches,
  };
 });
}
async function verifyRenderedNonlinearRail(film){
 return film.locator('.smd-hero-film__rail').evaluate(rail=>{
  const animation=rail.getAnimations().find(a=>a.playState==='running'&&a.effect?.getKeyframes()?.length>200);
  if(!animation)throw new Error('FILM_WIND_PRODUCT_LOOP_NOT_RUNNING');
  const keyframes=animation.effect.getKeyframes(),duration=animation.effect.getTiming().duration;
  if(typeof duration!=='number'||!Number.isFinite(duration))throw new Error('FILM_WIND_DURATION_INVALID');
  const previous=animation.currentTime;
  const times=[0.05,0.18,0.35,0.52,0.7,0.86,0.9,0.95,0.99];
  const samples=[];
  try{
   for(const fraction of times){
    animation.currentTime=fraction*duration;
    const matrix=new DOMMatrixReadOnly(getComputedStyle(rail).transform);
    samples.push({fraction,translateX:matrix.m41});
   }
  }finally{animation.currentTime=previous;}
  const speed=samples.slice(1).map((s,i)=>Math.abs((s.translateX-samples[i].translateX)/
    ((s.fraction-samples[i].fraction)*duration/1000)));
  const spread=Math.max(...speed)/Math.min(...speed);
  if(keyframes.length<=200||!Number.isFinite(spread)||spread<1.2)
   throw new Error(`FILM_WIND_RENDER_NOT_NONLINEAR frames=${keyframes.length} speedSpread=${spread}`);
  return {keyframes:keyframes.length,durationMs:duration,samples,speedSpread:spread};
 });
}
try{
 for(const fixture of cases){
  const id=`${fixture.width}-${fixture.height}-dpr${fixture.dpr}-${fixture.mobile?'touch':'mouse'}`;
  const context=await browser.newContext({viewport:{width:fixture.width,height:fixture.height},
   deviceScaleFactor:fixture.dpr,hasTouch:fixture.mobile,isMobile:fixture.mobile,
   reducedMotion:'no-preference'});
  const page=await context.newPage(),errors=[],focusRequests=[];
  page.on('pageerror',error=>errors.push(String(error)));
  page.on('request',request=>{
   if(/\/api\/media\/focus|hero-focus\//.test(request.url()))focusRequests.push(request.url());
  });
  try{
   await page.goto(url,{waitUntil:'domcontentloaded'});
   const film=page.locator('.smd-hero-film:visible');
   await film.waitFor({timeout:10000});
   await film.scrollIntoViewIfNeeded();
   const expectedMode=fixture.mobile?'native-swipe':'desktop-lut';
   await page.waitForFunction(expected=>Array.from(document.querySelectorAll('.smd-hero-film')).some(f=>
     f.getClientRects().length>0&&f.clientWidth>0&&f.getAttribute('data-film-mode')===expected),
     expectedMode,{timeout:10000});
   assert.equal(await film.getAttribute('data-film-mode'),expectedMode);
   assert.equal(await film.locator('[data-film-semantic-id]').count(),3);
   assert.equal(await film.getAttribute('data-film-focus-request-count'),'0');
   assert.equal(errors.length,0,errors.join('\n'));
   let observed=await inspectFilm(film);
   assert(observed.photoHeight>0&&observed.sourceWidth>0);
   assert(Math.abs(observed.photoWidth/observed.photoHeight-observed.sourceWidth/observed.sourceHeight)<0.002);
   // R4 fills the viewport; resolution insufficiency is observed in the DOM receipt,
   // not silently promoted as source-pixel parity.
   const scaleExceeded=observed.photoWidth*fixture.dpr>observed.sourceWidth+1.1 ||
     observed.photoHeight*fixture.dpr>observed.sourceHeight+1.1;
   if(scaleExceeded){
    assert(Number(await film.getAttribute('data-film-source-pixel-upscale-count'))>0,
      'FILM_R4_UPSCALE_WITNESS_MISSING');
   }
   assert(Math.abs(observed.internalTopBlankPx)<1.5,
    `FILM_WIND_UNINTENTIONAL_TOP_GAP ${observed.internalTopBlankPx}px`);
   assert(Math.abs(observed.filmHeight-observed.photoHeight)<1.5,
    `FILM_WIND_UNINTENTIONAL_FRAME_GAP ${observed.filmHeight} vs ${observed.photoHeight}`);
   if(!fixture.mobile){
    await page.waitForFunction(()=>Array.from(document.querySelectorAll('.smd-hero-film')).some(f=>
      f.getClientRects().length&&f.clientWidth>0&&Number(f.dataset.filmWindKeyframes)>500),
      null,{timeout:7000});
    const nonlinear=await verifyRenderedNonlinearRail(film);
    const box=await film.boundingBox();assert(box);
    await page.mouse.move(box.x+Math.min(box.width*0.25,300),box.y+box.height/2);
    await page.waitForTimeout(750);
    const rail=film.locator('.smd-hero-film__rail');
    const stop1=await rail.evaluate(x=>new DOMMatrixReadOnly(getComputedStyle(x).transform).m41);
    await page.waitForTimeout(400);
    const stop2=await rail.evaluate(x=>new DOMMatrixReadOnly(getComputedStyle(x).transform).m41);
    assert(Math.abs(stop2-stop1)<2,`FILM_WIND_BRAKE_NOT_STOPPED ${stop1}, ${stop2}`);
    await page.mouse.move(-1,-1);await page.waitForTimeout(1550);
    const resumed=await rail.evaluate(x=>new DOMMatrixReadOnly(getComputedStyle(x).transform).m41);
    assert(Math.abs(resumed-stop2)>1,'FILM_WIND_RELEASE_NOT_RUNNING');
    // Keyboard Commit must remain independent of focus-GPU publication.
    const button=film.locator('.smd-hero-film__commit').first();await button.focus();
    await page.keyboard.press('Enter');
    assert.equal(await film.getAttribute('data-film-selection-kind'),'committed');
    await page.keyboard.press('Enter');
    assert.equal(await film.getAttribute('data-film-selection-kind'),'idle');
    observed=await inspectFilm(film);
    receipts.push({id,...fixture,observed,nonlinear,focusRequests:focusRequests.length,errors});
   }else{
    const track=film.locator('.smd-hero-film__track'),box=await film.boundingBox();assert(box);
    const before=await track.evaluate(x=>x.scrollLeft);
    await page.waitForTimeout(800);
    assert.equal(await track.evaluate(x=>x.scrollLeft),before);
    assert.equal((await inspectFilm(film)).running,0);
    const from={x:box.x+box.width*.78,y:box.y+box.height/2};
    await dragNativeTouch(page,from,{x:box.x+box.width*.18,y:from.y});
    await page.waitForTimeout(500);
    assert((await track.evaluate(x=>x.scrollLeft))>before,'FILM_WIND_NATIVE_SWIPE_BROKEN');
    assert.equal(await film.getAttribute('data-film-selection-kind'),'idle');
    observed=await inspectFilm(film);
    receipts.push({id,...fixture,observed,focusRequests:focusRequests.length,errors});
   }
  }catch(error){failures.push(failMessage(id,error));}
  finally{await context.close();}
 }
}finally{await browser.close();}
const result={contract:'FILM-R13-NONLINEAR-WIND-R1',harness:'ACTUAL_NUXT_CHROMIUM',
 caseCount:cases.length,passed:receipts.length,failed:failures.length,
 receipts,failures,physicalRefreshRates:[],performance:'NOT_MEASURED',
 productPromotion:false};
const output=process.env.SMD_VERIFY_RECEIPT||fileURLToPath(new URL('../FILM_WIND_BROWSER_RECEIPT.json',import.meta.url));
writeFileSync(output,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({contract:result.contract,passed:result.passed,failed:result.failed,output}));
if(failures.length){console.error(failures.join('\n'));process.exitCode=1;}
