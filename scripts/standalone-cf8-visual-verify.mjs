/** CF8 physical-browser comparison: two deployment origins, identical viewports.
 * Requires Playwright from Public node_modules. Emits observed receipts, does not deploy.
 */
import {createRequire} from 'node:module';
import {writeFileSync,mkdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
const args=process.argv.slice(2),arg=k=>{const i=args.indexOf(k);return i<0?null:args[i+1]??null;};
const before=arg('--before-origin'),after=arg('--after-origin');
if(!before||!after)throw Error('CF8_REQUIRED --before-origin --after-origin');
const checkOrigin=raw=>{const url=new URL(raw);
  if(!['http:','https:'].includes(url.protocol)||url.pathname!=='/'||url.search||url.hash||url.username||url.password)
    throw Error('CF8_ORIGIN_INVALID');
  if(url.protocol==='http:'&&!['localhost','127.0.0.1','[::1]'].includes(url.hostname))throw Error('CF8_INSECURE_ORIGIN');
  return url.origin;
};
const oldOrigin=checkOrigin(before),newOrigin=checkOrigin(after);
let chromium;
try{chromium=createRequire(import.meta.url)('playwright').chromium;}
catch{throw Error('CF8_PLAYWRIGHT_NOT_INSTALLED');}
const viewports=[360,390,430,768,1024,1440,1920,2560,3440,3840];
const routes=['/','/about','/curriculum'];
const browser=await chromium.launch({headless:true});
async function capture(origin,path,width){
  const page=await browser.newPage({viewport:{width,height:1000},deviceScaleFactor:1,reducedMotion:'reduce'});
  try{
    const response=await page.goto(new URL(path,origin),{waitUntil:'networkidle',timeout:45000});
    if(!response||response.status()!==200)throw Error(`CF8_ROUTE_FAILED ${origin}${path} http=${response?.status()}`);
    await page.evaluate(async()=>{await document.fonts.ready;
      await Promise.all(Array.from(document.querySelectorAll('img')).map(i=>i.decode().catch(()=>{})));});
    const geometry=await page.evaluate(()=>Array.from(document.querySelectorAll('[data-source-layer],[data-film-image-id],[data-media-slot]'))
      .map(el=>{const rect=el.getBoundingClientRect();return {owner:
        el.getAttribute('data-source-layer')??el.getAttribute('data-film-image-id')??el.getAttribute('data-media-slot'),
        width:rect.width,height:rect.height,x:rect.x,y:rect.y};}));
    const images=await page.evaluate(()=>Array.from(document.images).map(img=>({src:img.currentSrc,
      naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight,complete:img.complete})));
    return {status:200,geometry,images,png:(await page.screenshot({fullPage:true,animations:'disabled'})).toString('base64')};
  } finally{await page.close();}
}
async function delta(a,b){
  const page=await browser.newPage();
  try{return await page.evaluate(async ([b64a,b64b])=>{
    const bmp=async x=>createImageBitmap(await (await fetch('data:image/png;base64,'+x)).blob());
    const [aa,bb]=await Promise.all([bmp(b64a),bmp(b64b)]);
    if(aa.width!==bb.width||aa.height!==bb.height)return {sameGeometry:false,changedPixels:null,maxChannelDelta:null};
    const canvas=document.createElement('canvas');canvas.width=aa.width;canvas.height=aa.height;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)throw Error('CF8_CANVAS_REQUIRED');
    ctx.drawImage(aa,0,0);const aData=ctx.getImageData(0,0,aa.width,aa.height).data;
    ctx.clearRect(0,0,aa.width,aa.height);ctx.drawImage(bb,0,0);const bData=ctx.getImageData(0,0,bb.width,bb.height).data;
    let changed=0,maxDelta=0;
    for(let i=0;i<aData.length;i+=4){
      let pixel=false;for(let c=0;c<4;c++){const d=Math.abs(aData[i+c]-bData[i+c]);maxDelta=Math.max(d,maxDelta);if(d!==0)pixel=true;}
      if(pixel)changed++;
    }
    return {sameGeometry:true,width:aa.width,height:aa.height,changedPixels:changed,maxChannelDelta:maxDelta};
  },[a,b]);}finally{await page.close();}
}
const receipts=[];let failures=0;
try{
  for(const path of routes)for(const width of viewports){
    const [left,right]=await Promise.all([capture(oldOrigin,path,width),capture(newOrigin,path,width)]);
    const pairs=new Map(left.geometry.map(x=>[x.owner,x]));
    const rectDrift=right.geometry.filter(x=>{const p=pairs.get(x.owner);return !p||
      ['width','height','x','y'].some(k=>Math.abs(p[k]-x[k])>0.5);});
    const diff=await delta(left.png,right.png);
    const sourceImagesOk=right.images.every(img=>img.complete&&img.naturalWidth>0&&img.naturalHeight>0);
    const ok=rectDrift.length===0&&diff.sameGeometry&&diff.changedPixels===0&&sourceImagesOk;
    if(!ok)failures++;
    receipts.push({path,width,ok,rectDrift,sourceImagesOk,diff,
      originalImageCount:left.images.length,stagingImageCount:right.images.length});
  }
}finally{await browser.close();}
const out=resolve(arg('--out')??'CF8_VISUAL_RECEIPT.json');
mkdirSync(dirname(out),{recursive:true});
writeFileSync(out,JSON.stringify({schema:'SMD_STANDALONE_CF8_VISUAL_RECEIPT_V1',
  beforeOrigin:oldOrigin,afterOrigin:newOrigin,results:receipts,failures,
  visualQualification:failures===0?'EXACT_SCREENSHOT_AND_GEOMETRY_IN_TESTED_VIEWPORTS':'FAILED'},null,2)+'\n');
console.log(JSON.stringify({viewports:receipts.length,failures,out}));
if(failures)process.exitCode=2;
