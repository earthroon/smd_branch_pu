/** Optional PHYSICAL harness: actual Nuxt hydration + browser CSS/interaction.
 * Requires Playwright installed in the local project, and a running Nuxt server.
 * Does not infer full pixel-quality parity from DOM-only checks.
 */
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
let chromium;
try { ({ chromium } = await import('playwright')); }
catch (error) {
  console.error('HERO_CAROUSEL_BROWSER_PLAYWRIGHT_UNAVAILABLE', String(error));
  process.exit(2);
}
const url=process.env.SMD_VERIFY_URL || 'http://127.0.0.1:3129/';
const sizes=[
  [390,844], [768,1024], [1440,900], [1920,1080],
  [2560,1440], [3440,1440], [3840,1600], [5120,1440],
];
const browser=await chromium.launch({headless:true});
const receipts=[];
const close=(x,y,eps=1.5)=>Math.abs(x-y)<=eps;
try {
  for(const [width,height] of sizes){
    const context=await browser.newContext({viewport:{width,height},reducedMotion:'no-preference'});
    const page=await context.newPage();
    try {
      await page.goto(url,{waitUntil:'domcontentloaded'});
      await page.locator('.smd-hero-carousel[data-hero-owner="active"]').waitFor({state:'visible'});
      await page.waitForFunction(()=>{
        const root=document.querySelector('.smd-hero-carousel[data-hero-owner="active"]');
        return root?.dataset.heroReady==='true';
      },null,{timeout:20000});
      const receipt=await page.evaluate(()=>{
        const roots=[...document.querySelectorAll('.smd-hero-carousel')];
        const active=roots.filter(r=>r.dataset.heroOwner==='active');
        const root=active[0];
        if(!root)throw new Error('HERO_CAROUSEL_NO_ACTIVE_OWNER');
        const frame=root.getBoundingClientRect();
        const hero=root.closest('.smd-figma-scene-section--hero, .smd-home--hero')?.getBoundingClientRect();
        const slides=[...root.querySelectorAll('.smd-hero-carousel__slide')];
        const images=slides.map(slide=>{
          const img=slide.querySelector('img');
          const r=slide.getBoundingClientRect(),computed=img?getComputedStyle(img):null;
          return {id:slide.dataset.heroSlotId,width:r.width,height:r.height,
            objectFit:computed?.objectFit,objectPosition:computed?.objectPosition,
            naturalWidth:img?.naturalWidth,naturalHeight:img?.naturalHeight};
        });
        return {activeOwners:active.length,viewportWidth:innerWidth,viewportHeight:innerHeight,
          carouselWidth:frame.width,carouselHeight:frame.height,
          heroWidth:hero?.width,heroHeight:hero?.height,
          documentScrollWidth:document.documentElement.scrollWidth,
          documentClientWidth:document.documentElement.clientWidth,
          current:Number(root.dataset.heroSelectedIndex),ready:root.dataset.heroReady,
          fault:root.dataset.heroFault??null,images};
      });
      assert.equal(receipt.activeOwners,1,'Autoplay owner count');
      assert.equal(receipt.images.length,3,'Three logical slides');
      assert.deepEqual(receipt.images.map(x=>x.id),['hero-1','hero-2','hero-3']);
      assert.equal(receipt.ready,'true');
      assert.equal(receipt.fault,null);
      assert.ok(close(receipt.carouselWidth,receipt.heroWidth), 'Hero full-width owner');
      assert.ok(close(receipt.carouselHeight,receipt.heroHeight), 'Hero full-height owner');
      assert.ok(receipt.documentScrollWidth<=receipt.documentClientWidth+2,'No new horizontal overflow');
      for(const item of receipt.images){
        assert.ok(close(item.width,receipt.carouselWidth),'Slide = 100% of Hero width');
        assert.ok(close(item.height,receipt.carouselHeight),'Slide = 100% of Hero height');
        assert.equal(item.objectFit,'cover');
        assert.ok(item.naturalWidth>0 && item.naturalHeight>0,'Image loaded');
      }
      if(width===1920 || width===3440){
        const previous=receipt.current;
        await page.waitForTimeout(7200);
        const after=Number(await page.locator('.smd-hero-carousel[data-hero-owner="active"]')
          .getAttribute('data-hero-selected-index'));
        assert.notEqual(after,previous,'Autoplay must advance without keyboard/pointer input');
        receipt.autoplayAdvanced=true;
      }
      receipts.push({size:`${width}x${height}`,status:'PASS',receipt});
    } catch(error){
      receipts.push({size:`${width}x${height}`,status:'FAIL',error:String(error?.stack??error)});
      throw error;
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
  writeFileSync('hero-carousel-browser-receipt.json', JSON.stringify({contract:'SMD-HOME-HERO-CAROUSEL-R1-CF1-CF3',receipts},null,2));
}
console.log('PASS_SMD_HERO_CAROUSEL_CF1_CF3_BROWSER_GEOMETRY_AND_AUTOPLAY');
