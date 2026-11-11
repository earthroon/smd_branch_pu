import {chromium} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const idx=process.argv.indexOf('--url');
const base=new URL(idx>=0?(process.argv[idx+1]??'http://127.0.0.1:3000'):'http://127.0.0.1:3000');
const out=resolve('artifacts/catalogue-r7-routes');mkdirSync(out,{recursive:true});
const routes=['/','/about','/curriculum','/archive','/reviews','/faq','/contact'];
const sizes=[{width:1920,height:1080},{width:3440,height:1440},{width:390,height:844}];
const receipt={schema:'SMD_R7_ROUTE_BROWSER_R2',base:base.origin,status:'RUNNING',checks:[],errors:[]};
const browser=await chromium.launch({headless:true});
try{
 for(const size of sizes){
  const context=await browser.newContext({viewport:size});
  for(const route of routes){
   const page=await context.newPage();const captured=[];
   page.on('pageerror',error=>captured.push(error.message));
   const response=await page.goto(new URL(route,base).href,{waitUntil:'domcontentloaded',timeout:30000});
   await page.evaluate(()=>document.fonts.ready);
   await page.locator('.smd-r7-route__cover-image,.smd-hero-carousel__slide[data-hero-layer-state="active"] img').first().evaluate(async el => {
     if(el instanceof HTMLImageElement && typeof el.decode === 'function') await el.decode().catch(()=>{});
   }).catch(()=>{});
   const observed=await page.evaluate(()=>{
    const root=document.querySelector('.smd-r7-home,.smd-r7-route');
    const cover=document.querySelector('.smd-r7-home__cover,.smd-r7-route__cover');
    const logo=document.querySelector('.smd-r7-brand-logo');
    const heroImage=document.querySelector('.smd-r7-route__cover-image,.smd-hero-carousel__slide[data-hero-layer-state="active"] img');
    return {path:location.pathname,hasOwner:!!root,coverHeight:cover?.getBoundingClientRect().height??0,
      viewportHeight:innerHeight,horizontalOverflow:document.documentElement.scrollWidth-innerWidth,
      logo:logo instanceof HTMLImageElement&&getComputedStyle(logo).display!=='none'&&logo.getBoundingClientRect().width>100,
      imageReady:heroImage instanceof HTMLImageElement&&heroImage.complete&&heroImage.naturalWidth>0,
      sheetCount:document.querySelectorAll('.smd-r7-sheet').length,
      viewportSheetOverflows:[...document.querySelectorAll('.smd-r7-sheet[data-sheet-fit="viewport"]')]
        .filter(sheet=>getComputedStyle(sheet).height!=='auto' && sheet.scrollHeight>sheet.clientHeight+4)
        .map(sheet=>sheet.getAttribute('data-catalogue-sheet'))};
   });
   const ok=(response?.status()===200)&&observed.hasOwner&&observed.logo&&
    Math.abs(observed.coverHeight-observed.viewportHeight)<=2&&observed.horizontalOverflow<=1&&
    observed.imageReady&&observed.viewportSheetOverflows.length===0&&observed.sheetCount>0&&captured.length===0;
   const id=(route==='/'?'home':route.slice(1));
   await page.screenshot({path:resolve(out,`${size.width}x${size.height}-${id}.png`),fullPage:false});
   receipt.checks.push({route,size,status:response?.status(),...observed,pageErrors:captured,pass:ok});
   console.log(`${ok?'PASS':'FAIL'} ${route} ${size.width}x${size.height}`,JSON.stringify(observed));
   if(!ok)receipt.errors.push(`${route}@${size.width}:HTTP/GEOMETRY/LOGO/SSR`);
   if(route==='/archive'&&size.width===1920){
    const tabs=page.locator('.smd-gallery-tabs [role="tab"]');
    if(await tabs.count()>=2){ await tabs.nth(1).click();
      if(await tabs.nth(1).getAttribute('aria-selected')!=='true')receipt.errors.push('ARCHIVE_FILTER_FAILED'); }
    else receipt.errors.push('ARCHIVE_TABS_MISSING');
   }
   if(route==='/reviews'&&size.width===1920){
    const tabs=page.locator('.smd-reviews-tabs [role="tab"]');
    if(await tabs.count()<2)receipt.errors.push('REVIEWS_TABS_MISSING');
   }
   if(route==='/contact'&&size.width===1920){
    if(await page.locator('.smd-call__field,form').count()===0)receipt.errors.push('CONTACT_FORM_MISSING');
   }
   if(route==='/curriculum'&&size.width===1920){
    const tab=page.locator('.smd-r7-route__week-tabs [role="tab"]').nth(5);
    await tab.click();
    const selected=await tab.getAttribute('aria-selected');
    if(selected!=='true')receipt.errors.push('CURRICULUM_WEEK6_TAB_FAILED');
   }
   await page.close();
  }
  await context.close();
 }
 receipt.status=receipt.errors.length?'FAIL':'PASS';
}finally{await browser.close();writeFileSync(resolve(out,'RECEIPT.json'),JSON.stringify(receipt,null,2)+'\n');}
console.log(`R7_ROUTE_BROWSER_${receipt.status} ${out}`);
if(receipt.status!=='PASS')process.exitCode=1;
