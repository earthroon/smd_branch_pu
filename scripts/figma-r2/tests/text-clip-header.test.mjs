import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {figmaScene} from '../../../app/data/figma-r2-scene.generated.ts';
import {HOME_HEADER_BRAND_R1,assertHomeHeaderBrandR1} from '../../../app/data/home-r2-brand-display.ts';
import {deriveFigmaTextPaintWindow, figmaRunMaxFontPx} from '../../../app/utils/figma-native-text-paint.ts';

const root=resolve(import.meta.dirname,'../../..');
const read=(p)=>readFileSync(resolve(root,p),'utf8');
const training=['node-1:102','node-1:479','node-1:484'];
const info=['node-1:155','node-1:401','node-1:405','node-18:59'];

test('brand display override is isolated from immutable JSONL and preserves Figma source',()=>{
 assertHomeHeaderBrandR1();
 assert.equal(HOME_HEADER_BRAND_R1.displayText,'SMD아카데미');
 assert.equal(HOME_HEADER_BRAND_R1.fontWeight,700);
 assert.equal(figmaScene.texts['node-1:11'].characters,'SMD 아카데미');
 assert.match(read('app/components/feature/SiteHeader.vue'),/const brand = HOME_HEADER_BRAND_R1\.displayText/);
 assert.match(read('app/data/home-r2-navigation.ts'),/assertHomeHeaderBrandR1/);
});
test('Pretendard Bold header is not forced into a 1.1 line box',()=>{
 const css=read('app/assets/css/home-r2-header.css');
 const m=css.match(/\.smd-site-header__brand-label\s*\{([^}]+)\}/);
 assert.ok(m);assert.match(m[1],/font-weight:\s*700/);
 assert.match(m[1],/line-height:\s*1\.35/);
 assert.match(m[1],/font-family:\s*var\(--font-ui\)/);
});
test('source text 76 nodes / 89 runs are unchanged',()=>{
 assert.equal(Object.keys(figmaScene.texts).length,76);
 assert.equal(Object.values(figmaScene.texts).reduce((n,v)=>n+v.runs.length,0),89);
 for(const t of Object.values(figmaScene.texts)){
  assert.equal(t.runs.map(run=>run.characters).join(''),t.characters);
 }
});
test('training card source 32px text gets taller paint bounds without moving source rect',()=>{
 for(const key of training){
  const n=figmaScene.nodes[key]; const t=figmaScene.texts[key];
  assert.equal(n.rect[3],27); assert.equal(figmaRunMaxFontPx(t.runs),32);
  const win=deriveFigmaTextPaintWindow(n.rect[2],n.rect[3],t.runs);
  assert.ok(win.y<0 && win.height>27 && win.x<0,`${key}: foreignObject ink window`);
  assert.equal(win.sourceWidth,n.rect[2]);assert.equal(win.sourceHeight,27);
  assert.equal(win.x+win.contentX,0);
  assert.equal(win.y+win.contentY,0);
 }
});
test('four info bar values are distinct source texts with safe paint height',()=>{
 for(const key of info){
  const n=figmaScene.nodes[key], t=figmaScene.texts[key];
  assert.equal(n.rect[3],27);assert.equal(figmaRunMaxFontPx(t.runs),29);
  const p=deriveFigmaTextPaintWindow(n.rect[2],n.rect[3],t.runs);
  assert.ok(p.height>27 && p.width>n.rect[2]);
 }
});
test('paint growth only expands viewport and does not move text origin',()=>{
 const t=figmaScene.texts['node-1:102'],n=figmaScene.nodes['node-1:102'];
 const base=deriveFigmaTextPaintWindow(n.rect[2],27,t.runs);
 const expanded=deriveFigmaTextPaintWindow(n.rect[2],27,t.runs,{left:4,right:12,top:5,bottom:21});
 assert.equal(base.x+base.contentX,0);assert.equal(expanded.x+expanded.contentX,0);
 assert.equal(expanded.y+expanded.contentY,0);
 assert.equal(expanded.width,base.width+16);
 assert.equal(expanded.height,base.height+26);
});
test('invalid glyph bounds are rejected, no hidden size fallback',()=>{
 assert.throws(()=>deriveFigmaTextPaintWindow(0,27,[]),/SMD_FIGMA_TEXT_SOURCE_RECT_INVALID/);
 assert.throws(()=>figmaRunMaxFontPx([{style:{fontSize:'auto'}}]),/SMD_FIGMA_TEXT_FONT_SIZE_INVALID/);
 assert.throws(()=>deriveFigmaTextPaintWindow(162,27,figmaScene.texts['node-1:102'].runs,{left:600,right:0,top:0,bottom:0}),/SMD_FIGMA_TEXT_SOURCE_RECT_INVALID/);
});
test('foreignObject expands bounds and reports actual range/font status',()=>{
 const s=read('app/components/figma/FigmaNativeText.vue');
 assert.match(s,/:x="paint\.x" :y="paint\.y" :width="paint\.width" :height="paint\.height"/);
 assert.match(s,/:data-source-rect=/);
 assert.match(s,/:data-ink-gate="inkGate"/);
 assert.match(s,/document\.fonts\.ready/);
 assert.match(s,/document\.createRange\(\)/);
 assert.match(s,/data-source-text-digest="original\.digest"/);
 assert.match(read('app/assets/css/figma-r2-scene.css'),/\.smd-figma-native-text-foreign \{ overflow: visible; \}/);
});
test('original Figma assets, scene metadata and CMS remain outside the patch',()=>{
 assert.equal(figmaScene.sourceSnapshotDigest,'5e877e46cc1bad3e7985a553163120c59c9b9d0f731a66d575e781fa5c60146f');
 assert.equal(figmaScene.originalQualification,'BLOCKED');
 assert.equal(figmaScene.blockers.length,32);
 assert.equal(Object.keys(figmaScene.assets).length,31);
 assert.equal(figmaScene.operations.length,165);
});
