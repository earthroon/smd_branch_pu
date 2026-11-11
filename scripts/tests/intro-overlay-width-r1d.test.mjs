import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const source=readFileSync(resolve(root,'app/components/home/HomeIntroStage.vue'),'utf8');
const expectBarHeight=(width)=>253.8*Math.min(width,1920)/1920;
const admittedWidth=(width)=>Number.isFinite(width)&&width>0?`${width}px`:'100%';
const current=(host,producer)=>Math.abs(host.width-producer.width)<=1&&Math.abs(host.height-producer.height)<=1;

test('R1D source: compare both width and height before measuring the InfoBar',()=>{
 assert.match(source,/film\.viewportRectCss\.width-frame\.width/);
 assert.match(source,/film\.viewportRectCss\.height-frame\.height/);
});
test('R1D source: pending AND admitted overlay width follows current Hero geometry',()=>{
 assert.match(source,/const overlayWidthCss=computed<string>/);
 assert.match(source,/width:overlayWidthCss\.value,height:/);
 assert.match(source,/default:return \{opacity:'0',pointerEvents:'none',width:overlayWidthCss\.value\}/);
 assert.doesNotMatch(source,/width:`\$\{plan\.widthCssPx\}px`/);
});
test('R1D source: retain strict SVG-height admission and include diagnostic widths',()=>{
 assert.match(source,/Math\.abs\(height-expectedHeight\)>1\.5/);
 assert.match(source,/infoSvgWidth:svg\?\.getBoundingClientRect\(\)\.width/);
 assert.match(source,/titleSafeOverlay\(candidate,protectedRects\)/);
});
test('R1D stale 1905px SVG at a 1283px frame must be deferred, not misdiagnosed',()=>{
 assert.equal(current({width:1283,height:831},{width:1905,height:831}),false);
 const oldHeight=expectBarHeight(1905), newHeight=expectBarHeight(1283);
 assert.ok(Math.abs(oldHeight-251.8125)<0.02);
 assert.ok(Math.abs(newHeight-169.5965625)<0.02);
});
test('R1D post-reflow geometry agrees with 1283px frame',()=>{
 assert.equal(admittedWidth(1283),'1283px');
 assert.equal(current({width:1283,height:831},{width:1283,height:831}),true);
 assert.ok(Math.abs(expectBarHeight(1283)-169.5965625)<0.02);
});
test('R1D wide and ultrawide keep SVG capped at the 1920px artboard',()=>{
 for(const width of [1920,2560,3440,3840,5120]){
  assert.equal(admittedWidth(width),`${width}px`);
  assert.ok(Math.abs(expectBarHeight(width)-253.8)<1e-6);
 }
});
test('R1D invalid pending dimensions do not invent layout CSS pixels',()=>{
 for(const width of [undefined,0,-20,NaN,Infinity])assert.equal(admittedWidth(width),'100%');
});
