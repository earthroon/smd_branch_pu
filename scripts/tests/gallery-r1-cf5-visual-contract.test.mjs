import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(`../../${p}`,import.meta.url),'utf8');
test('CF5: Figma 1:27 reference geometry and no 75% site-wide Gallery scale',()=>{
 const css=read('app/assets/css/gallery-r1.css');
 const frame=read('app/components/gallery/GalleryFrame2.vue');
 assert.match(frame,/data-figma-node="node-1:27"/);
 assert.match(css,/max-width: 1046px/);
 assert.match(css,/aspect-ratio: 343\.7843 \/ 305\.8026/);
 assert.match(css,/top: 10px/);
 assert.match(css,/left: 11px/);
 assert.match(css,/min-width: 48\.9702px/);
 assert.match(css,/height: 25\.3919px/);
 assert.doesNotMatch(css,/transform\s*:\s*scale\(\.75\)|zoom\s*:\s*\.75|width\s*:\s*75%/);
});
test('CF5: 1920→desktop/tablet/mobile 3/2/1, no cover default',()=>{
 const css=read('app/assets/css/gallery-r1.css');
 assert.match(css,/grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
 assert.match(css,/grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
 assert.match(css,/grid-template-columns: minmax\(0, 1fr\)/);
 assert.match(css,/@media \(max-width: 699px\)/);
 assert.match(css,/@media \(min-width: 700px\) and \(max-width: 1099px\)/);
 assert.match(css,/object-fit: contain/);
 assert.doesNotMatch(css,/object-fit: cover/);
});
test('CF5: Figma browser harness is evidence only and never self-promotes to pixel PASS',()=>{
 const harness=read('scripts/gallery-r1/verify-browser.mjs');
 assert.match(harness,/FIGMA_PIXEL_PARITY_NOT_RUN/);
 assert.match(harness,/OBSERVED_UNQUALIFIED/);
 assert.match(harness,/playbackPhysicallyObserved(?:: null|=null)/);
 assert.match(harness,/productPromotion(?:: false|=false)/);
 assert.match(harness,/SMD_GALLERY_R1_BROWSER_URL/);
 assert.match(harness,/STAGING_OR_LOCAL_URL_REQUIRED/);
});
