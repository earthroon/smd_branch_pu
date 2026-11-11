#!/usr/bin/env node
/** SMD R7 CF3 actual Nuxt SSR/hydration/browser proof.
 * Builds a temporary detached Git worktree, without editing product app/pages/index.vue.
 * Never publishes a new route, changes the original worktree, or uses production CMS.
 */
import { chromium } from 'playwright';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, mkdtempSync, rmSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { setTimeout as delay } from 'node:timers/promises';

const repo = process.cwd();
const pagePath = join(repo,'app/pages/index.vue');
const portArg=process.argv.find(arg=>arg.startsWith('--port='));
const port=portArg?Number(portArg.slice('--port='.length)):47863;
if (!Number.isSafeInteger(port)||port<1024||port>65535)throw new Error('R7_CF3_BROWSER_PORT_INVALID');
const base = `http://127.0.0.1:${port}`;
const output = join(repo,'artifacts/catalogue-r7-cf3');
const proofToken=createHash('sha256').update(`${Date.now()}:${process.pid}`).digest('hex').slice(0,16);
const fixture = `<script setup lang="ts">\nimport CatalogueFixture from '~/components/catalogue/CatalogueFixture.vue';\nuseSeoMeta({robots:'noindex,nofollow',title:'R7 CF3 DEV PROOF ONLY'});\n</script>\n<template><div data-r7-isolated-proof="${proofToken}"><CatalogueFixture /></div></template>\n`;
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const runGit = args => {
  const res = spawnSync('git',args,{cwd:repo,encoding:'utf8',windowsHide:true});
  if(res.status!==0)throw new Error(`R7_CF3_GIT_FAILURE: git ${args.join(' ')} ${res.stderr??''}`);
  return (res.stdout??'').trim();
};
const initialHash = hash(readFileSync(pagePath));
if (runGit(['branch','--show-current']) !== 'feat/smd-interior-catalogue-r7' ||
    !runGit(['rev-parse','--short=7','HEAD']).startsWith('8d92ae7')) {
  throw new Error('R7_CF3_BASELINE_MISMATCH');
}
if(runGit(['status','--porcelain','--','app/pages/index.vue'])!==''){
  throw new Error('R7_CF3_PRODUCT_PAGE_NOT_CLEAN');
}
if(!existsSync(join(repo,'app/components/catalogue/CatalogueFixture.vue'))){
  throw new Error('R7_CF3_FIXTURE_COMPONENT_MISSING');
}
mkdirSync(output,{recursive:true});
let child=null,browser=null;
let log='';
let isolatedRoot=null;
let tempBase=null;
const receipt={schema:'SMD_R7_CF3_BROWSER_RECEIPT_V1',status:'RUNNING',
  time:new Date().toISOString(),gitHead:runGit(['rev-parse','HEAD']),
  originalIndexSha256:initialHash,
  screens:[],ssr:null,hydration:null,restore:null,errors:[]};
function writeReceipt(){writeFileSync(join(output,'BROWSER_RECEIPT.json'),JSON.stringify(receipt,null,2)+'\n');}
const overlayPaths = [
  'app/assets/css/catalogue-r7.css',
  'app/data/catalogue-r7-sheet-plan.ts',
  'app/components/catalogue/CatalogueSheet.vue',
  'app/components/catalogue/CatalogueSheetHeader.vue',
  'app/components/catalogue/CatalogueMedia.vue',
  'app/components/catalogue/CatalogueHomeMedia.vue',
  'app/components/catalogue/CatalogueFixture.vue',
];
function runGitWrite(args) {
  const r=spawnSync('git',args,{cwd:repo,encoding:'utf8',windowsHide:true});
  if(r.status!==0)throw new Error(`R7_CF3_ISOLATED_GIT_FAILED: git ${args.join(' ')} ${r.stderr??''}`);
}
function createIsolatedFixture(){
  if(!existsSync(join(repo,'node_modules/nuxt/package.json'))){
    throw new Error('R7_CF3_NODE_MODULES_MISSING');
  }
  tempBase=mkdtempSync(join(tmpdir(),'smd-r7-cf3-proof-'));
  isolatedRoot=join(tempBase,'repo');
  runGitWrite(['worktree','add','--detach',isolatedRoot,'HEAD']);
  for(const path of overlayPaths){
    const src=join(repo,path),dst=join(isolatedRoot,path);
    if(!existsSync(src))throw new Error(`R7_CF3_OVERLAY_MISSING: ${path}`);
    mkdirSync(dirname(dst),{recursive:true});
    copyFileSync(src,dst);
  }
  writeFileSync(join(isolatedRoot,'app/pages/index.vue'),fixture,'utf8');
  console.log('R7_CF3_ISOLATED_NPM_CI');
  const npmBin=process.platform==='win32'?'cmd.exe':'npm';
  const npmArgs=process.platform==='win32'?['/d','/s','/c','npm ci']:['ci'];
  const installed=spawnSync(npmBin,npmArgs,{cwd:isolatedRoot,encoding:'utf8',
    maxBuffer:64*1024*1024,windowsHide:true});
  if(installed.status!==0||installed.error){
    throw new Error(`R7_CF3_ISOLATED_NPM_CI_FAILED: ${installed.error?.message??installed.status} ${String(installed.stderr??'').slice(-1500)}`);
  }
}
function removeIsolatedFixture(){
  if(!isolatedRoot)return;
  runGitWrite(['worktree','remove','--force',isolatedRoot]);
  if(tempBase)rmSync(tempBase,{recursive:true,force:true});
  isolatedRoot=null;
  receipt.restore='ISOLATED_WORKTREE_REMOVED';
  if(hash(readFileSync(pagePath))!==initialHash) {
    throw new Error('R7_CF3_PRODUCT_PAGE_CHANGED_EXTERNALLY');
  }
}
async function stopDev(){
  if(!child)return;
  const pid=child.pid;
  if(process.platform==='win32' && pid){
    spawnSync('taskkill',['/PID',String(pid),'/T','/F'],{windowsHide:true,encoding:'utf8'});
  }else{
    try{process.kill(-pid,'SIGTERM')}catch{try{child.kill('SIGTERM')}catch{}}
  }
  await delay(700);
  child=null;
}
async function waitReady(){
  for(let i=0;i<100;i++){
    if(child?.exitCode!==null)throw new Error(`R7_CF3_DEV_SERVER_EXITED: ${log.slice(-2500)}`);
    try{
      const res=await fetch(base,{signal:AbortSignal.timeout(1200)});
      const body=await res.text();
      if(res.status===200 && body.includes(`data-r7-isolated-proof=\"${proofToken}\"`))return body;
      if(res.status===200 && i>=8 && !body.includes(proofToken))
        throw new Error('R7_CF3_BROWSER_PORT_OCCUPIED');
      if(res.status>=500 && i>10)throw new Error(`R7_CF3_DEV_SSR_${res.status}: ${body.slice(0,700)}`);
    }catch(e){if(/R7_CF3_DEV_SSR|R7_CF3_BROWSER_PORT_OCCUPIED/.test(String(e)))throw e;}
    await delay(550);
  }
  throw new Error(`R7_CF3_DEV_START_TIMEOUT: ${log.slice(-2500)}`);
}
function assert(condition,code,context=''){
  if(!condition)throw new Error(`${code}: ${context}`);
}
try{
  // Nuxt sees a fixture ONLY inside a detached temporary Git worktree.
  createIsolatedFixture();
  const nuxtPackage=JSON.parse(readFileSync(join(isolatedRoot,'node_modules/nuxt/package.json'),'utf8'));
  const bin=typeof nuxtPackage.bin==='string' ? nuxtPackage.bin : nuxtPackage.bin?.nuxt;
  if(!bin)throw new Error('R7_CF3_NUXT_BIN_UNAVAILABLE');
  child=spawn(process.execPath,[join(isolatedRoot,'node_modules/nuxt',bin),'dev','--host','127.0.0.1','--port',String(port)],
    {cwd:isolatedRoot,env:{...process.env,NUXT_PUBLIC_CONTENT_MODE:'standalone'},
      detached:process.platform!=='win32',stdio:['ignore','pipe','pipe'],windowsHide:true});
  child.on('error',error=>{log=(log+'\nSPAWN_ERROR: '+error.message).slice(-32000)});
  for (const stream of [child.stdout,child.stderr])stream.on('data',chunk=>{log=(log+chunk.toString()).slice(-32000)});
  const html=await waitReady();
  assert(html.includes('id="r7-special-heading"') && html.includes('id="r7-benefits-heading"'),
    'R7_CF3_SSR_TEXT_MISSING');
  receipt.ssr='SSR_TWO_SHEETS_PRESENT';
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:1920,height:1080},deviceScaleFactor:1});
  const page=await context.newPage();
  const hydrationErrors=[];
  page.on('console',msg=>{
    if(msg.type()==='error' && /hydration|mismatch/i.test(msg.text()))hydrationErrors.push(msg.text());
  });
  page.on('pageerror',error=>hydrationErrors.push(error.message));
  await page.goto(base,{waitUntil:'domcontentloaded',timeout:45000});
  await page.locator('[data-catalogue-proof="DEV_PREVIEW_ONLY"]').waitFor({timeout:45000});
  await page.evaluate(()=>document.fonts.ready);
  await delay(600);
  const measured=await page.evaluate(()=>{
    const sheets=[...document.querySelectorAll('[data-catalogue-sheet]')];
    return {innerWidth,innerHeight,scrollWidth:document.documentElement.scrollWidth,
      sections:sheets.map(sheet=>{
        const core=sheet.querySelector('.smd-r7-sheet__core');
        const heading=document.getElementById(sheet.getAttribute('aria-labelledby'));
        const rect=sheet.getBoundingClientRect(),top=sheet.querySelector('.smd-r7-sheet__top');
        const status=[...sheet.querySelectorAll('[data-catalogue-media-state]')].map(el=>({
          key:el.getAttribute('data-catalogue-media-key'),state:el.getAttribute('data-catalogue-media-state')}));
        return {id:sheet.dataset.catalogueSheet,fit:sheet.dataset.sheetFit,height:rect.height,
          coreClientHeight:core?.clientHeight,coreScrollHeight:core?.scrollHeight,
          headingVisible:Boolean(heading&&heading.getBoundingClientRect().width>0),
          headerHeight:top?.getBoundingClientRect().height,medias:status,
          textClipping:[...sheet.querySelectorAll('h2,h3,.smd-r7-proof__body')].some(el=>
            ['hidden','clip'].includes(getComputedStyle(el).overflowY) && el.scrollHeight>el.clientHeight+1)
        };
      })};
  });
  assert(measured.sections.length===2,'R7_CF3_DUPLICATE_VISIBLE_OWNER',JSON.stringify(measured));
  assert(measured.sections[0].id==='special-start'&&measured.sections[1].id==='benefits',
    'R7_CF3_SHEET_ORDER_INVALID');
  assert(measured.scrollWidth<=1921,'R7_CF3_SHEET_GEOMETRY_OVERFLOW',JSON.stringify(measured));
  for (const section of measured.sections){
    assert(Math.abs(section.height-1080)<=1,'R7_CF3_SHEET_HEIGHT_INVALID',JSON.stringify(section));
    assert(section.coreScrollHeight<=section.coreClientHeight+1 && !section.textClipping,
      'R7_CF3_SHEET_GEOMETRY_OVERFLOW',JSON.stringify(section));
    assert(section.headingVisible,'R7_CF3_HEADING_MISSING',section.id);
  }
  assert(measured.sections[0].medias.length===1 && measured.sections[1].medias.length===4,
    'R7_CF3_MEDIA_SLOT_COUNT_INVALID');
  assert(hydrationErrors.length===0,'R7_CF3_HYDRATION_DRIFT',hydrationErrors.join(';'));
  receipt.hydration='NO_MISMATCH_OBSERVED';
  receipt.screens.push({viewport:'1920x1080',...measured});
  await page.locator('[data-catalogue-sheet="special-start"]').screenshot({path:join(output,'preview-special-start-1920x1080.png')});
  await page.locator('[data-catalogue-sheet="benefits"]').screenshot({path:join(output,'preview-benefits-1920x1080.png')});
  for (const [width,height] of [[3440,1440],[1440,900],[1100,750],[768,1024],[390,844],[320,568],[960,540]]){
    await page.setViewportSize({width,height}); await delay(140);
    const data=await page.evaluate(()=>({
      overflow:document.documentElement.scrollWidth-innerWidth,
      sheets:[...document.querySelectorAll('[data-catalogue-sheet]')].map(el=>({
        id:el.dataset.catalogueSheet,height:el.getBoundingClientRect().height,
        scroll:el.scrollHeight,client:el.clientHeight,
        overflowX:el.scrollWidth-el.clientWidth,
      }))
    }));
    assert(data.overflow<=1 && data.sheets.every(s=>s.overflowX<=1),
      'R7_CF3_RESPONSIVE_HORIZONTAL_OVERFLOW',`${width}x${height}: ${JSON.stringify(data)}`);
    receipt.screens.push({viewport:`${width}x${height}`,data});
  }
  // Negative fixture: long CMS-like copy must grow in flow mode, never clip.
  await page.setViewportSize({width:390,height:844});
  const longTextResult=await page.evaluate(()=>{
    const paragraph=document.querySelector('[data-catalogue-sheet="special-start"] .smd-r7-proof__body');
    if(!paragraph)throw new Error('R7_CF3_LONG_TEXT_TARGET_MISSING');
    paragraph.textContent='내용이 긴 경우에도 지면 아래로 자연스럽게 이어져야 합니다. '.repeat(65);
    const sheet=document.querySelector('[data-catalogue-sheet="special-start"]');
    const core=sheet.querySelector('.smd-r7-sheet__core');
    return {sheetHeight:sheet.getBoundingClientRect().height,
      coreHeight:core.clientHeight,coreScrollHeight:core.scrollHeight,
      horizontalOverflow:document.documentElement.scrollWidth-innerWidth};
  });
  assert(longTextResult.horizontalOverflow<=1 &&
    longTextResult.coreScrollHeight<=longTextResult.coreHeight+1 &&
    longTextResult.sheetHeight>844,
    'R7_CF3_LONG_TEXT_FLOW_FAILED',JSON.stringify(longTextResult));
  receipt.longTextFlow='PASS';
  const noJs=await browser.newContext({viewport:{width:1920,height:1080},javaScriptEnabled:false,reducedMotion:'reduce'});
  const staticPage=await noJs.newPage();
  await staticPage.goto(base,{waitUntil:'domcontentloaded',timeout:45000});
  assert(await staticPage.locator('[data-catalogue-sheet]').count()===2,'R7_CF3_NO_JS_SSR_MISSING');
  await noJs.close();
  await context.close();
  receipt.status='BROWSER_PASS';
  console.log('R7_CF3_NUXT_BROWSER_PASS');
}catch(error){
  receipt.status='BROWSER_FAIL';
  receipt.errors.push(String(error?.stack??error));
  console.error('R7_CF3_BROWSER_HOLD:',error?.message??error);
  process.exitCode=1;
}finally{
  if(browser)await browser.close().catch(()=>{});
  await stopDev();
  try{removeIsolatedFixture()}catch(error){receipt.restore='FAILED';receipt.errors.push(String(error));receipt.status='BROWSER_FAIL';process.exitCode=1;console.error(error)}
  writeReceipt();
  console.log('Browser receipt:',join(output,'BROWSER_RECEIPT.json'));
}
