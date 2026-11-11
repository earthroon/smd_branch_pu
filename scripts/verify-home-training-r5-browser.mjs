/** SMD_HOME_TRAINING_R5: real browser ink/geometry witness, not a source-level proxy.
 * Run against an existing local Nuxt server after npm install --save-dev playwright.
 * Fails closed on absent Pretendard, missing DOM, clipped value, or optical misalignment.
 */
import {mkdirSync,writeFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';

const url = process.env.SMD_VERIFY_URL ?? 'http://127.0.0.1:3129/';
const address = new URL(url);
if (!['localhost','127.0.0.1'].includes(address.hostname) || !['http:','https:'].includes(address.protocol)) {
  throw new Error('SMD_TRAINING_R5_LOCAL_BROWSER_ONLY');
}
const out = resolve(process.env.SMD_TRAINING_R5_RECEIPT ?? 'artifacts/home-training-r5/browser-receipt.json');
const cases = [[390,844],[768,1024],[1024,768],[1440,900],[1920,1080],[2560,1080]];
let playwright;
try { playwright = await import('playwright'); }
catch (error) { throw new Error('SMD_TRAINING_R5_PLAYWRIGHT_REQUIRED npm install --save-dev playwright', {cause:error}); }
const browser = await playwright.chromium.launch({headless:true});
const results = [];
try {
  for (const [width,height] of cases) {
    const page = await browser.newPage({viewport:{width,height},deviceScaleFactor:1,reducedMotion:'reduce'});
    try {
      await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
      await page.evaluate(async()=>{await document.fonts.ready;});
      const result = await page.evaluate(() => {
        const desktop=innerWidth>=1100;
        const errors=[];
        const add=(ok,code)=>{if(!ok)errors.push(code);};
        const rect=el=>{
          if(!el)return null;
          const r=el.getBoundingClientRect();
          return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height,
            centerX:(r.left+r.right)/2,centerY:(r.top+r.bottom)/2};
        };
        const ink=el=>{
          if(!el)return [];
          return Array.from(el.querySelectorAll('span')).flatMap(span=>{
            const range=document.createRange();range.selectNodeContents(span);
            const found=Array.from(range.getClientRects()).filter(r=>r.width>0&&r.height>0).map(r=>({
              left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height,
            }));range.detach();return found;
          });
        };
        const region=rects=>rects.length?{
          left:Math.min(...rects.map(r=>r.left)),right:Math.max(...rects.map(r=>r.right)),
          top:Math.min(...rects.map(r=>r.top)),bottom:Math.max(...rects.map(r=>r.bottom)),
        }:null;
        const visibleText='인테리어필름 · 유리필름';
        const root=document.querySelector(desktop?'.smd-home--figma-scene':'.smd-home--semantic-reflow');
        add(!!root&&getComputedStyle(root).display!=='none','VISIBLE_VARIANT_MISSING');
        if(!root)return {desktop,errors,missing:'ROOT'};
        const cardIds=['node-1:313','node-1:315','node-1:95'];
        if(!desktop){
          const field=root.querySelector('.smd-home--training-track .smd-training-field-mobile-r4a');
          const original=root.querySelector('.smd-home--training-track .smd-training-field-original-r4a');
          add(field?.textContent===visibleText,'SEMANTIC_COPY_DRIFT');
          add(!!field&&getComputedStyle(field).display!=='none','SEMANTIC_DISPLAY_HIDDEN');
          add(!!original&&getComputedStyle(original).display==='none','SOURCE_DUPLICATE_VISIBLE');
          const card=field?.closest('.smd-home__training-fact');
          const fieldR=rect(field),cardR=rect(card);
          add(!!cardR&&!!fieldR,'SEMANTIC_CARD_GEOMETRY_MISSING');
          if(cardR&&fieldR){
            add(fieldR.left>=cardR.left-2&&fieldR.right<=cardR.right+2,'SEMANTIC_FIELD_OVERFLOW_X');
            add(fieldR.top>=cardR.top-2&&fieldR.bottom<=cardR.bottom+2,'SEMANTIC_FIELD_OVERFLOW_Y');
          }
          return {desktop,errors,text:field?.textContent,card:cardR,field:fieldR};
        }
        const section=root.querySelector('[data-wide-section="training-track"]');
        add(!!section,'TRAINING_SCENE_MISSING');
        if(!section)return {desktop,errors,missing:'SECTION'};
        const optical=section.querySelectorAll('[data-training-optical-node]');
        add(optical.length===8,'OPTICAL_NODE_COUNT');
        const field=section.querySelector('foreignObject[data-figma-text-instance="node-1:478"]');
        add(field?.textContent===visibleText,'DESKTOP_COPY_DRIFT');
        add(field?.dataset?.trainingR5PaintWidth==='320','PAINT_WIDTH_CONTRACT');
        const figmaSvg=section.querySelector('svg.smd-figma-scene-svg');
        const svgRect=rect(figmaSvg);
        const cards=cardIds.map((id,index)=>{
          const owner=section.querySelector(`[data-figma-node="${id}"]`);
          const paintKey=index===0?'node-1:99':id;
          const paint=owner?.querySelector(`[data-figma-self-paint="${paintKey}"]`);
          const card=rect(paint);
          const iconKey=['node-1:414','node-1:477','node-1:482'][index];
          const labelKey=['node-1:102','node-1:479','node-1:484'][index];
          const valueKey=['node-1:101','node-1:478','node-1:483'][index];
          const icon=rect(owner?.querySelector(`[data-figma-node="${iconKey}"]`));
          const label=ink(owner?.querySelector(`foreignObject[data-figma-text-instance="${labelKey}"]`));
          const value=ink(owner?.querySelector(`foreignObject[data-figma-text-instance="${valueKey}"]`));
          const union=region([...(icon?[icon]:[]),...label,...value]);
          const inkValue=region(value);
          if(!card||!icon||!label.length||!value.length||!union)errors.push(`CARD_${index}_INK_MISSING`);
          else {
            add((inkValue?.left??-1)>=card.left-1.5&&(inkValue?.right??1e8)<=card.right+1.5,
              `CARD_${index}_VALUE_CLIPPED_X`);
            add((inkValue?.top??-1)>=card.top-1.5&&(inkValue?.bottom??1e8)<=card.bottom+1.5,
              `CARD_${index}_VALUE_CLIPPED_Y`);
          }
          const opticalCenterError=card&&union?(union.left+union.right)/2-card.centerX:null;
          return {id,card,icon,label:region(label),value:inkValue,opticalCenterError,
            union,iconCenterY:icon?.centerY??null};
        });
        // The optical candidates are measured rather than falsely promoted as validated.
        // <=2 px horizontal and <=3 px icon alignment are the stated acceptance goals.
        const centerErrors=cards.map(x=>x.opticalCenterError).filter(Number.isFinite);
        add(centerErrors.length===3&&centerErrors.every(x=>Math.abs(x)<=2),'OPTICAL_CENTER_GOAL_NOT_MET');
        const iconYs=cards.map(x=>x.iconCenterY).filter(Number.isFinite);
        add(iconYs.length===3&&Math.max(...iconYs)-Math.min(...iconYs)<=3,'ICON_CENTER_Y_GOAL_NOT_MET');
        if(cards.every(x=>x.card)){
          const gaps=[cards[1].card.left-cards[0].card.right,cards[2].card.left-cards[1].card.right];
          const scale=(svgRect?.width??0)/1920;
          add(Math.abs(gaps[0]-28*scale)<=2&&Math.abs(gaps[1]-29*scale)<=2,'CARD_SOURCE_GAP_DRIFT');
          add(cards.every(x=>Math.abs(x.card.width-510*scale)<=2),'CARD_SOURCE_SIZE_DRIFT');
        }
        const fieldRects=ink(field),tops=fieldRects.map(x=>x.top);
        add(tops.length>=2&&Math.max(...tops)-Math.min(...tops)<=2,'DESKTOP_FIELD_WRAPPED');
        const fontGate=field?.dataset?.fontGate??null;
        add(fontGate==='PRETENDARD_LOADED','PRETENDARD_NOT_CONFIRMED');
        return {desktop,errors,text:field?.textContent,fieldPaintWidth:field?.dataset?.trainingR5PaintWidth,
          fontGate,svgRect,cards,inkLines:fieldRects,sourceCount:section.querySelectorAll('.smd-home-training__target').length,
          diagramCount:section.querySelectorAll('.smd-home-training__diagram-part').length};
      });
      if(result.desktop){
        if(result.sourceCount!==5)result.errors.push('REVEAL_TARGET_COUNT');
        if(result.diagramCount!==14)result.errors.push('DIAGRAM_PART_COUNT');
      }
      results.push({viewport:[width,height],...result});
      console.log(`SMD_TRAINING_R5 ${width}x${height} ${result.errors.length?'FAIL '+result.errors.join(','):'BROWSER_PASS'}`);
    }catch(error){
      results.push({viewport:[width,height],errors:['BROWSER_RUNTIME_ERROR'],detail:String(error?.stack??error)});
      console.error('SMD_TRAINING_R5_BROWSER_ERROR',width,height,String(error?.stack??error));
    }finally{await page.close();}
  }
}finally{await browser.close();}
const status=results.every(r=>!r.errors.length)?'PASS':'FAIL';
const receipt={contract:'SMD_HOME_TRAINING_R5_TEXT_OPTICAL',status,url,results,
  sourceParity:'NOT_CHECKED_BY_BROWSER',visualQualification:status==='PASS'?'PHYSICAL_BROWSER':'UNKNOWN',
  fontInkNote:'Pretendard-loaded real ink required; optical map is fixed candidate, not continually adjusted.'};
mkdirSync(dirname(out),{recursive:true});writeFileSync(out,JSON.stringify(receipt,null,2)+'\n');
console.log('SMD_TRAINING_R5_BROWSER_RECEIPT',out);
if(status!=='PASS')process.exitCode=1;
