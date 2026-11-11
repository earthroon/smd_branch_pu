/** R7 CF5 runtime browser verification, for an already running local Nuxt dev server. */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const argv = process.argv.slice(2);
const arg = key => {const i = argv.indexOf(key);return i >= 0 ? argv[i+1] : null;};
const base = arg('--url') ?? 'http://127.0.0.1:3000';
const origin = new URL(base).origin;
if (!/^https?:\/\/localhost(:\d+)?$|^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin))
  throw new Error('R7_CF5_BROWSER_LOCAL_URL_ONLY');
const output = resolve(arg('--out') ?? 'artifacts/catalogue-r7-cf5');
await mkdir(output, {recursive:true});
const browser = await chromium.launch({headless:true});
const receipt = {schema:'SMD_R7_CF5_BROWSER_R1',url:origin,results:[],status:'RUNNING'};
const assert = (truth, code) => {if (!truth) throw new Error(code);};
async function metrics(page, path) {
  const response = await page.goto(origin+path, {waitUntil:'domcontentloaded',timeout:30000});
  assert(response && response.status() === 200, `PAGE_HTTP_FAILED:${path}:${response?.status()}`);
  await page.evaluate(() => document.fonts.ready);
  const result = await page.evaluate(() => {
    const header = document.querySelector('.smd-site-header__inner');
    const logo = document.querySelector('.smd-site-header .smd-r7-brand-logo');
    const title = document.querySelector('.smd-r7-route__cover h1');
    const cover = document.querySelector('.smd-r7-home__cover,.smd-r7-route__cover');
    const r = header?.getBoundingClientRect();
    return {headerX:r?.left??null,headerWidth:r?.width??null,
      logoX:logo?.getBoundingClientRect().left??null,
      logoWidth:logo?.getBoundingClientRect().width??null,
      fontPx:title?parseFloat(getComputedStyle(title).fontSize):null,
      coverHeight:cover?.getBoundingClientRect().height??null,
      viewportHeight:innerHeight,
      horizontalOverflow:document.documentElement.scrollWidth-innerWidth,
      root:document.querySelector('.smd-r7-home')?'home':document.querySelector('.smd-r7-route')?'sub':'missing'};
  });
  assert(result.headerX!==null&&result.logoX!==null&&result.coverHeight!==null,`GEOMETRY_OWNER_MISSING:${path}`);
  assert(Math.abs(result.coverHeight-result.viewportHeight)<=2,`COVER_HEIGHT_DRIFT:${path}`);
  assert(result.horizontalOverflow<=2,`HORIZONTAL_OVERFLOW:${path}`);
  return result;
}
try {
  for (const v of [{width:1920,height:1080},{width:1440,height:900},{width:390,height:844}]) {
    const page = await browser.newPage({viewport:v});
    const home = await metrics(page,'/');
    for (const path of ['/about','/curriculum','/archive','/reviews','/faq','/contact']) {
      const sub = await metrics(page,path);
      assert(Math.abs(home.headerX-sub.headerX)<=1,`HEADER_X_DRIFT:${path}:${v.width}`);
      assert(Math.abs(home.logoX-sub.logoX)<=1,`LOGO_X_DRIFT:${path}:${v.width}`);
      const sizeMax = v.width <= 599 ? 34.2 : 62.6;
      assert(sub.fontPx!==null && sub.fontPx<=sizeMax,`SUBPAGE_TITLE_SIZE_DRIFT:${path}:${sub.fontPx}`);
      receipt.results.push({viewport:v,path,headerX:sub.headerX,logoX:sub.logoX,h1Px:sub.fontPx,status:'PASS'});
    }
    await page.close();
  }
  const page = await browser.newPage({viewport:{width:1920,height:1080},reducedMotion:'no-preference'});
  await metrics(page,'/about');
  await page.evaluate(() => {window.scrollTo(0,0); window.__r7Trace=[]; window.addEventListener('scroll',()=>window.__r7Trace.push(window.scrollY),{passive:true});});
  await page.mouse.move(900,460);
  await page.mouse.wheel(0,120);
  await page.waitForTimeout(1250);
  const spring = await page.evaluate(() => ({
    scrollY:window.scrollY,
    target:document.querySelector('.smd-r7-route > .smd-r7-sheet')?.getBoundingClientRect().top+window.scrollY,
    peak:Math.max(0,...window.__r7Trace),
    active:document.documentElement.classList.contains('smd-r7-wheel-spring-active'),
    sampleCount:window.__r7Trace.length,
  }));
  assert(Number.isFinite(spring.target), 'SPRING_TARGET_UNAVAILABLE');
  assert(Math.abs(spring.scrollY-spring.target)<=3,`SPRING_SETTLE_INVALID:${JSON.stringify(spring)}`);
  assert(spring.peak>spring.target+3,`SPRING_BOUNCE_NOT_OBSERVED:${JSON.stringify(spring)}`);
  assert(!spring.active,'SPRING_LEASE_NOT_RELEASED');
  receipt.results.push({path:'/about',viewport:{width:1920,height:1080},spring,status:'PASS'});
  await page.close();
  const reduced=await browser.newPage({viewport:{width:1920,height:1080},reducedMotion:'reduce'});
  await metrics(reduced,'/about');
  await reduced.mouse.move(900,460);
  await reduced.mouse.wheel(0,120);
  await reduced.waitForTimeout(200);
  assert(!await reduced.evaluate(()=>document.documentElement.classList.contains('smd-r7-wheel-spring-active')),'REDUCED_MOTION_SPRING_ACTIVE');
  receipt.results.push({path:'/about',prefersReducedMotion:'reduce',status:'PASS'});
  await reduced.close();
  receipt.status='PASS';
  console.log('R7_CF5_BROWSER_PASS', receipt.results.length);
} catch (error) {
  receipt.status='FAIL';
  receipt.error=String(error?.stack??error);
  console.error(receipt.error);
  process.exitCode=1;
} finally {
  await writeFile(resolve(output,'BROWSER_RECEIPT.json'),JSON.stringify(receipt,null,2));
  await browser.close();
}
