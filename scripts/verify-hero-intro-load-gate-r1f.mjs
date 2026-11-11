/** Optional physical check. Run against a running local Nuxt server. */
import { writeFileSync } from 'node:fs';
const url = process.env.SMD_VERIFY_URL ?? 'http://127.0.0.1:3129/';
let chromium;
try { ({ chromium } = await import('playwright')); }
catch (error) { throw new Error(`R1F_PLAYWRIGHT_UNAVAILABLE: ${String(error)}`); }
const browser = await chromium.launch({ headless: true });
const observations=[];
try {
  for(const {width,height,variant} of [
    {width:1920,height:1080,variant:'figma'},
    {width:390,height:844,variant:'semantic'},
  ]) {
    const page=await browser.newPage({viewport:{width,height}});
    const errors=[];
    page.on('pageerror', error=>errors.push(String(error)));
    await page.goto(url,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(v=>{
      const intro=document.querySelector(`.smd-home-intro[data-intro-variant="${v}"]`);
      return intro?.getAttribute('data-intro-load-state')==='ready';
    },variant,{timeout:24000});
    await page.waitForTimeout(300);
    const receipt=await page.evaluate(v=>{
      const intro=document.querySelector(`.smd-home-intro[data-intro-variant="${v}"]`);
      const base=intro?.querySelector('.smd-home-intro__paint-stack');
      const carousel=intro?.querySelector('.smd-hero-carousel');
      return {
        variant:v,
        stage:intro?.getAttribute('data-intro-load-state'),
        overlay:intro?.getAttribute('data-intro-overlay-status'),
        phase:intro?.getAttribute('data-intro-phase'),
        media:carousel?.getAttribute('data-hero-ready'),
        fault:intro?.getAttribute('data-intro-load-fault')??null,
        opacity:base?Number(getComputedStyle(base).opacity):null,
        locked:document.documentElement.hasAttribute('data-smd-intro-load-lock-owner'),
      };
    },variant);
    if(receipt.stage!=='ready'||receipt.overlay!=='admitted'||receipt.media!=='true'||
       receipt.fault!==null||receipt.locked||receipt.opacity===null||receipt.opacity<0.99) {
      throw new Error(`R1F_BROWSER_READY_GATE_FAILED ${JSON.stringify(receipt)}`);
    }
    if(width===1920){
      await page.mouse.move(1000,400);
      await page.mouse.wheel(0,160);
      await page.waitForFunction(()=>{
        const x=document.querySelector('.smd-home-intro[data-intro-variant="figma"]');
        return x?.getAttribute('data-intro-first-intent')==='wheel';
      },null,{timeout:5000});
      await page.waitForFunction(()=>{
        const x=document.querySelector('.smd-home-intro[data-intro-variant="figma"]');
        return x?.getAttribute('data-intro-phase')==='released';
      },null,{timeout:9000});
      const bodyPhase=await page.locator('.smd-home-body-stage').getAttribute('data-special-phase');
      if(bodyPhase==='unarmed')throw new Error('R1F_BROWSER_DOWNSTREAM_NOT_ARMED');
      receipt.bodyPhase=bodyPhase;
    }
    if(errors.length)throw new Error(`R1F_BROWSER_PAGE_ERRORS:${JSON.stringify(errors)}`);
    observations.push({width,height,...receipt});
    await page.close();
  }
  writeFileSync('hero-intro-load-gate-r1f-browser-receipt.json',JSON.stringify({url,observations},null,2));
  console.log('PASS_R1F_BROWSER_LOAD_GATE',JSON.stringify(observations));
} finally { await browser.close(); }
