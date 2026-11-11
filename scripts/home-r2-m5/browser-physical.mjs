/** M5 staging-only physical browser harness. NEVER publishes or changes CMS data.
 * Requires: npm install --save-dev playwright && npx playwright install chromium
 * Invoke: SMD_HOME_R2_STAGING_URL=https://staging.example... node scripts/home-r2-m5/browser-physical.mjs
 * Fails closed without real staging URL / Playwright. Screenshots are evidence,
 * not Figma pixel parity unless separately compared to the original reference.
 */
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const raw=process.env.SMD_HOME_R2_STAGING_URL;
if(!raw){console.error('NOT_RUN: SMD_HOME_R2_STAGING_URL required');process.exit(2);}
let site;
try{site=new URL(raw);}catch{console.error('INVALID_STAGING_URL');process.exit(2);}
const safe=/^(localhost|127\.0\.0\.1)$/.test(site.hostname)||/(?:^|[.-])(?:staging|preview|test)(?:[.-]|$)/i.test(site.hostname);
if(!safe||!['https:','http:'].includes(site.protocol)){
 console.error('PRODUCTION_TARGET_FORBIDDEN: staging/preview/test hostname required');process.exit(2);
}
let chromium;
try{({chromium}=await import('playwright'));}catch{console.error('NOT_RUN: install playwright');process.exit(2);}
const browser=await chromium.launch({headless:true});
const sizes=[360,390,430,768,1024,1280,1440,1920,2560,3440,3840];
const expected=['hero','info-bar','special-start','training-track','benefits','methods','location','faq','consultation-cta'];
const outDir=resolve('artifacts/home-r2-m5-browser');await mkdir(outDir,{recursive:true});
const results=[];
try{
 for(const width of sizes){
  const page=await browser.newPage({viewport:{width,height:1080},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  const resp=await page.goto(new URL('/',site).href,{waitUntil:'networkidle',timeout:30000});
  const measured=await page.evaluate(()=>({
   innerWidth:window.innerWidth,scrollWidth:document.documentElement.scrollWidth,
   sections:[...document.querySelectorAll('[data-home-section]')].map(e=>e.getAttribute('data-home-section')),
   faqState:document.querySelector('[data-faq-state]')?.getAttribute('data-faq-state')??null,
   media:[...document.querySelectorAll('[data-media-slot]')].map(e=>({slot:e.getAttribute('data-media-slot'),state:e.getAttribute('data-media-state')})),
   placeholderLeaked:[...document.querySelectorAll('[data-home-section="faq"]')].some(x=>/={4,}/.test(x.textContent||'')),
  })));
  const pass=resp?.status()===200&&JSON.stringify(measured.sections)===JSON.stringify(expected)&&
   measured.scrollWidth<=width+1&&!measured.placeholderLeaked&&errors.length===0;
  await page.screenshot({path:resolve(outDir,`home-${width}.png`),fullPage:true});
  results.push({route:'/',width,status:resp?.status(),...measured,errors,pass});
  await page.close();
 }
 for(const route of ['/reviews','/faq','/about','/curriculum','/archive','/contact','/practice','/promotion']){
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  const r=await page.goto(new URL(route,site).href,{waitUntil:'domcontentloaded',timeout:30000});
  const pass=r?.status()===200;
  results.push({route,status:r?.status(),pass});
  await page.close();
 }
}finally{await browser.close();}
const allPass=results.every(x=>x.pass);
await writeFile(resolve(outDir,'browser-receipt.json'),JSON.stringify({schema:'SMD_HOME_R2_M5_BROWSER_RECEIPT_V1',targetOrigin:site.origin,
  stages:'PHYSICAL_STAGING_ONLY',allPass,results},null,2)+'\n');
console.log(JSON.stringify({allPass,total:results.length,failures:results.filter(x=>!x.pass).length,evidenceDir:outDir}));
if(!allPass)process.exitCode=1;
