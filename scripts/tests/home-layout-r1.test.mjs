import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHomeWideLayout, homeWideGapCss, homeWideRenderedWidth } from '../../app/utils/homeWideLayoutMath.ts';
import { createHomeInfoLayout } from '../../app/utils/homeInfoLayoutMath.ts';

const root = resolve(import.meta.dirname, '../..');
const source = file => readFileSync(resolve(root, file), 'utf8');
const scene = JSON.parse(source('app/data/figma-r2-scene.generated.ts').split('= {',2)[1].replace(/;\s*$/, '').replace(/^/, '{'));
const ids = ['special-start','training-track','benefits','methods','location','faq','consultation-cta'];
const infoItems = [
  {index:0,iconKey:'node-1:320',textKey:'node-1:154'},
  {index:1,iconKey:'node-1:395',textKey:'node-1:400',iconOpticalY:19},
  {index:2,iconKey:'node-1:411',textKey:'node-1:404'},
  {index:3,iconKey:'node-18:26',textKey:'node-18:58'},
];
const near = (x,y,eps=1e-6) => assert.ok(Math.abs(x-y)<eps,`expected ${x}≈${y}`);

test('CF1 source-derived wide plan: exact body order and 75% Y positions',()=>{
  const plan=createHomeWideLayout(scene.sections,ids);
  assert.deepEqual(plan.map(s=>s.id),ids);
  assert.deepEqual(plan.map(s=>s.targetTopY),[0,800.25,1468.5,2535,3426.75,4447.5,5358]);
  assert.deepEqual(plan.map(s=>s.targetHeight),[800.25,668.25,1066.5,900,1009.5,899.25,645]);
  near(plan.at(-1).targetTopY+plan.at(-1).targetHeight,6003);
});

test('CF1 source gaps: preserve -11 and +15 as signed 75% offsets',()=>{
  const plan=createHomeWideLayout(scene.sections,ids);
  assert.equal(plan.find(x=>x.id==='location').sourceGapBefore,-11);
  assert.equal(plan.find(x=>x.id==='faq').sourceGapBefore,15);
  assert.equal(plan.find(x=>x.id==='consultation-cta').sourceGapBefore,15);
  near(plan.find(x=>x.id==='location').targetGapBefore,-8.25);
  near(plan.find(x=>x.id==='faq').targetGapBefore,11.25);
  assert.equal(homeWideGapCss(-11),'max(-0.4296875vw, -8.25px)');
  assert.equal(homeWideGapCss(15),'min(0.5859375vw, 11.25px)');
});

test('CF1 wide visual width scales with viewport up to original 1920px cap',()=>{
  near(homeWideRenderedWidth(1380),1035);
  near(homeWideRenderedWidth(1920),1440);
  near(homeWideRenderedWidth(2560),1440);
  near(homeWideRenderedWidth(3440),1440);
  near(homeWideRenderedWidth(3840),1440);
  assert.throws(()=>homeWideRenderedWidth(0),/WIDTH_INVALID/);
});

test('CF1 rejects bad structural input instead of guessing',()=>{
  assert.throws(()=>createHomeWideLayout(scene.sections,['missing']),/SOURCE_GEOMETRY_INVALID/);
  assert.throws(()=>createHomeWideLayout(scene.sections,['benefits','benefits']),/BODY_IDS_INVALID/);
  assert.throws(()=>createHomeWideLayout(scene.sections,['location','methods']),/SOURCE_ORDER_INVALID/);
  assert.throws(()=>homeWideGapCss(NaN),/GAP_NONFINITE/);
});

test('CF3 compact info bar derives 253.8px from Figma icon/text heights',()=>{
  const p=createHomeInfoLayout(scene.nodes,'node-1:134','node-18:118',infoItems);
  near(p.barHeight,253.8);
  near(p.iconBottomY,137.9);
  near(p.textTopY,153.9);
  assert.equal(Object.keys(p.nodeTransforms).length,7);
  assert.equal(p.fileIcon.sourceKey,'node-18:26');
  assert.equal(p.fileIcon.scale,.7);
  assert.equal(p.nodeTransforms['node-1:395'].scale,.7);
  assert.equal(p.nodeTransforms['node-1:400'].scale,.9);
});

test('CF3 icon widths retain source ratios and text centers stay aligned',()=>{
  const p=createHomeInfoLayout(scene.nodes,'node-1:134','node-18:118',infoItems);
  const originalWidths=[120,157,115,98];
  const expected=[84,109.9,80.5,68.6];
  infoItems.forEach((item,index)=>{
    const icon=index===3?p.fileIcon:p.nodeTransforms[item.iconKey];
    const text=p.nodeTransforms[item.textKey];
    near(icon.targetWidth,expected[index]);
    near(icon.targetWidth,originalWidths[index]*.7);
    near(icon.targetX+icon.targetWidth/2,text.targetX+text.targetWidth/2+(index===3?scene.nodes['node-18:118'].rect[0]:0));
    const groupY=scene.nodes['node-18:118'].rect[1];
    near(icon.targetY+icon.targetHeight+(index===3?0:groupY),p.iconBottomY+(index===1?19:0));
    near(text.targetY+groupY,p.textTopY);
    near(text.targetHeight,54.9);
  });
});

test('CF3 invalid info binding rejects rather than changing source',()=>{
  assert.throws(()=>createHomeInfoLayout(scene.nodes,'node-1:134','node-18:118',infoItems.slice(1)),/SOURCE_GROUP_INVALID/);
  assert.throws(()=>createHomeInfoLayout(scene.nodes,'node-1:134','node-18:118',[...infoItems.slice(0,3),{index:3,iconKey:'unknown',textKey:'node-18:58'}]),/NODE_BINDING_INVALID/);
});

test('CF2 / CF3 source maintains Header, intro timing and generated original bytes',()=>{
  const index=source('app/pages/index.vue');
  const section=source('app/components/figma/FigmaSceneSection.vue');
  const node=source('app/components/figma/FigmaSceneNode.vue');
  const bodyCss=source('app/assets/css/home-body-compact.css');
  assert.match(index,/<HomeIntroStage\b[^>]*\/>/);
  assert.match(index,/<HomeBodyStage\b[^>]*\/>/);
  assert.match(bodyCss,/\.smd-home-body-stage \.smd-figma-scene-svg/);
  assert.match(bodyCss,/width:75%/);
  assert.match(bodyCss,/max-width:1440px/);
  assert.match(section,/homeInfoLayout.barHeight/);
  assert.match(section,/<FigmaR4UserFileIcon \/>/);
  assert.match(node,/homeInfoLayout.nodeTransforms/);
  assert.match(node,/:transform="translate"/);
  const timing=source('app/utils/homeIntroTimeline.ts');
  for (const value of ['barDurationMs: 430','barToIconDelayMs: 30','iconStaggerMs: 60','iconDurationMs: 350','postRevealSettleMs: 120','wheelQuietMs: 220']) assert.ok(timing.includes(value));
  assert.ok(!bodyCss.includes('scale(0.75)'));
});

test('optical Y only moves the helmet and leaves scene source immutable',()=>{
  const base=infoItems.map(({iconOpticalY,...item})=>item);
  const original=createHomeInfoLayout(scene.nodes,'node-1:134','node-18:118',base);
  const optical=createHomeInfoLayout(scene.nodes,'node-1:134','node-18:118',infoItems);
  for(const [index,item] of infoItems.entries()){
    const a=original.nodeTransforms[item.iconKey]??original.fileIcon;
    const b=optical.nodeTransforms[item.iconKey]??optical.fileIcon;
    near(b.targetY-a.targetY,index===1?19:0);
    near(b.targetX,a.targetX);
    near(b.targetWidth,a.targetWidth);
    near(b.targetHeight,a.targetHeight);
    assert.deepEqual(optical.nodeTransforms[item.textKey],original.nodeTransforms[item.textKey]);
  }
  for(const delta of [NaN,Infinity,33,-33])
    assert.throws(()=>createHomeInfoLayout(scene.nodes,'node-1:134','node-18:118',infoItems.map((x,i)=>i===1?{...x,iconOpticalY:delta}:x)),/OPTICAL_Y_INVALID/);
  assert.match(source('app/assets/css/home-info-compact.css'),/foreignObject\[data-figma-text-instance="node-18:59"\]/);
  assert.match(source('app/assets/css/home-info-compact.css'),/width: max-content/);
});
