/** R2 browser verification. Actual Nuxt server and Playwright Chromium required.
 * Measures DOM/CSS motion, text timing and control interaction; no pixel-quality claim.
 */
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
let chromium;
try { ({ chromium } = await import('playwright')); }
catch (error) {
  console.error('HERO_DISSOLVE_R2_PLAYWRIGHT_UNAVAILABLE',String(error));
  process.exit(2);
}
const url=process.env.SMD_VERIFY_URL || 'http://127.0.0.1:3129/';
const browser=await chromium.launch({headless:true});
const receipts=[];
const rootSelector='.smd-hero-carousel[data-hero-owner="active"]';

async function awaitReady(page){
  await page.locator(rootSelector).waitFor({state:'visible',timeout:20000});
  await page.waitForFunction(selector=>{
    const root=document.querySelector(selector);
    return root?.dataset.heroReady==='true' && !root.dataset.heroFault;
  },rootSelector,{timeout:20000});
}
async function getIndex(page){
  return Number(await page.locator(rootSelector).getAttribute('data-hero-selected-index'));
}
async function startSampling(page){
  await page.evaluate(selector=>{
    const root=document.querySelector(selector);
    if(!root)throw Error('HERO_DISSOLVE_R2_ACTIVE_ROOT_MISSING');
    globalThis.__smdHeroSamples=[];
    globalThis.__smdHeroCaptionChanges=[];
    globalThis.__smdHeroSampling=true;
    const observer=new MutationObserver(records=>{
      for(const r of records) {
        if(r.attributeName==='data-hero-caption-phase'){
          globalThis.__smdHeroCaptionChanges.push({phase:root.dataset.heroCaptionPhase,t:performance.now()});
        }
      }
    });
    observer.observe(root,{attributes:true,attributeFilter:['data-hero-caption-phase']});
    globalThis.__smdHeroSampleObserver=observer;
    const sample=()=>{
      if(!globalThis.__smdHeroSampling)return;
      const layer=root.querySelector('[data-hero-layer-state="revealing"]');
      const frame=layer?.getBoundingClientRect();
      if(layer && frame){
        globalThis.__smdHeroSamples.push({
          t:performance.now(),opacity:Number(getComputedStyle(layer).opacity),
          left:frame.left,width:frame.width,phase:root.dataset.heroCaptionPhase,
        });
      }
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  },rootSelector);
}
async function endSampling(page){
  return await page.evaluate(()=>{
    globalThis.__smdHeroSampling=false;
    globalThis.__smdHeroSampleObserver?.disconnect();
    return {samples:globalThis.__smdHeroSamples??[],
      caption:globalThis.__smdHeroCaptionChanges??[]};
  });
}
function assertDissolve(trace,reason){
  const middle=trace.samples.filter(x=>x.opacity>0.05&&x.opacity<0.95);
  assert.ok(middle.length>=3,`${reason}: image opacity missing intermediate frames`);
  const xs=trace.samples.map(x=>x.left);
  assert.ok(Math.max(...xs)-Math.min(...xs)<=0.5,`${reason}: horizontal movement detected`);
  const hidden=trace.caption.find(x=>x.phase==='hidden');
  const visible=trace.caption.find(x=>x.phase==='visible' && (!hidden || x.t>=hidden.t));
  assert.ok(hidden && visible,`${reason}: caption phase change missing`);
  const delay=visible.t-hidden.t;
  // Timers have frame/event-loop jitter. 20ms is a scheduling target, not a PHYSICAL guarantee.
  assert.ok(delay>=15 && delay<=130,`${reason}: caption start delay ${delay.toFixed(1)}ms`);
  return {middleFrames:middle.length,maxShiftPx:Math.max(...xs)-Math.min(...xs),captionDelayMs:delay};
}
try {
  for(const [width,height] of [[390,844],[1440,900],[1920,1080],[3440,1440]]){
    const context=await browser.newContext({viewport:{width,height},reducedMotion:'no-preference'});
    try {
      const page=await context.newPage();
      await page.goto(url,{waitUntil:'domcontentloaded'});
      await awaitReady(page);
      const original=await getIndex(page);
      await startSampling(page);
      await page.locator(rootSelector).locator('[data-hero-carousel-action="next"]').click();
      await page.waitForFunction(({selector,next})=>
        Number(document.querySelector(selector)?.dataset.heroSelectedIndex)===next,
        {selector:rootSelector,next:(original+1)%3},{timeout:3000});
      await page.waitForTimeout(950);
      const manual=assertDissolve(await endSampling(page),'manual');
      await page.locator(rootSelector).locator('[data-hero-carousel-action="previous"]').click();
      await page.waitForFunction(({selector,index})=>
        Number(document.querySelector(selector)?.dataset.heroSelectedIndex)===index,
        {selector:rootSelector,index:original},{timeout:3000});
      await page.waitForTimeout(850);
      await page.evaluate(()=>{if(document.activeElement instanceof HTMLElement)document.activeElement.blur()});
      await page.mouse.move(0,0);
      await page.waitForTimeout(100);
      const beforeAuto=await getIndex(page);
      await startSampling(page);
      await page.waitForFunction(({selector,initial})=>
        Number(document.querySelector(selector)?.dataset.heroSelectedIndex)!==initial,
        {selector:rootSelector,initial:beforeAuto},{timeout:6000,polling:50});
      await page.waitForTimeout(950);
      const automatic=assertDissolve(await endSampling(page),'automatic');
      receipts.push({size:`${width}x${height}`,status:'PASS',manual,automatic});
    } catch(error){
      receipts.push({size:`${width}x${height}`,status:'FAIL',error:String(error?.stack??error)});
      throw error;
    } finally {
      await context.close();
    }
  }
  const reduced=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
  try {
    const page=await reduced.newPage();
    await page.goto(url,{waitUntil:'domcontentloaded'});
    await awaitReady(page);
    const before=await getIndex(page);
    await page.locator(rootSelector).locator('[data-hero-carousel-action="next"]').click();
    assert.equal(await getIndex(page),(before+1)%3);
    const states=await page.locator(rootSelector).locator('.smd-hero-carousel__slide').evaluateAll(
      items=>items.map(x=>x.dataset.heroLayerState));
    assert.ok(!states.includes('revealing')&&!states.includes('leaving'),'reduced motion should settle immediately');
    receipts.push({size:'390x844-reduced',status:'PASS'});
  } finally {await reduced.close();}
} finally {
  await browser.close();
  writeFileSync('hero-dissolve-r2-browser-receipt.json',JSON.stringify({contract:'SMD_HOME_HERO_DISSOLVE_R2',url,receipts},null,2));
}
console.log('PASS_SMD_HERO_DISSOLVE_R2_BROWSER',JSON.stringify(receipts.map(({size,status})=>({size,status}))));
