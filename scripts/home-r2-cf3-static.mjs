import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { buildSourceFreeze, verifyUntouchedFiles } from './lib/home-r2-source.mjs';
import { TEXT_HEADER_AUTHORIZED_DIGESTS } from './lib/home-r2-text-header-authority.mjs';
import { buildHomeCf3Visual } from './lib/home-r2-cf3-visual.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=name=>readFileSync(resolve(root,name),'utf8');
const figma=buildSourceFreeze(root),visual=buildHomeCf3Visual(root);
assert.equal(figma.slots.length,8);
assert.equal(visual.lineCount,15);
assert.equal(visual.textCount,76);
assert.equal(visual.witness.clipBlockers.direct.length,2);
assert.equal(visual.witness.clipBlockers.propagatedCount,30);
for(const [path,wanted] of Object.entries(visual.outputs))assert.equal(read(path),wanted,`derived visual drift ${path}`);
assert.ok(verifyUntouchedFiles(root,TEXT_HEADER_AUTHORIZED_DIGESTS)>=21);
const css=read('app/assets/css/home-r2.css');
const index=read('app/pages/index.vue');
for(const ref of ['--home-hero-max: 1398px','--home-special-max: 1050px','--home-benefits-max: 1050px',
 '--home-methods-max: 1516px','--home-faq-max: 1510px','minmax(0,1fr)'])assert.ok(css.includes(ref),ref);
for(const size of ['76px','80px','125px'])assert.ok(css.includes(`--home-header-offset:${size}`),size);
assert.match(css, /@media \(min-width:1380px\) and \(max-width:1599px\)\s*\{\s*\.smd-home\s*\{--home-header-offset:125px;\}/);

for(const kind of ['hero','info-bar','special-start','training-track','benefits','methods','location','faq','consultation-cta']){
 const code=read(`app/components/home/${{hero:'HeroSection','info-bar':'HomeInfoBar','special-start':'StatementSection','training-track':'TeachSection',benefits:'HomeBenefits',methods:'HomeMethods',location:'HomeLocation',faq:'HomeFaq','consultation-cta':'HomeConsultationCta'}[kind]}.vue`);
 assert.match(code,/<HomeFigmaText\b/);
 assert.ok(code.includes(`data-home-section="${kind}"`));
 assert.ok(code.includes(`smd-home--${kind}`));
}
// V-R1 supersession: desktop JSONL scene and tablet/mobile semantic reflow share source authority.
assert.match(index,/class="smd-home smd-home--figma-scene"/);
assert.match(index,/class="smd-home smd-home--semantic-reflow"/);
assert.match(index,/figma-r2-scene\.css/);
assert.match(index,/home-r2\.css/);
assert.doesNotMatch(css,/\.container-x\s*\{|max-w-content\s*:/);
const media=read('app/components/home/HomeMediaFrame.vue');
assert.match(media,/sourceFrameRect\[2\].*sourceFrameRect\[3\]/);
assert.match(media,/sourceRadii\.map/);
assert.match(media,/<img v-if="image"/);
assert.match(media,/resolveHomeR2PublicImage/);
const faq=read('app/components/home/HomeFaq.vue');
assert.match(faq,/node-1:25.*node-1:26.*node-1:27.*node-1:28.*node-1:29/s);
assert.match(faq,/pending-cms-copy/);
assert.match(faq,/<details\b/);
assert.doesNotMatch(faq,/={10,}|<button\b/);
const text=read('app/components/home/HomeFigmaText.vue');
assert.match(text,/data-text-digest/);assert.match(text,/run\.characters/);assert.match(text,/run\.style/);
const line=read('app/components/home/HomeFigmaLine.vue');
assert.match(line,/data-original-node-kind="LINE"/);
assert.match(line, /:style="\{ height: `\$\{weight\}px` \}"/);

assert.match(line,/CANDIDATE_NOT_PIXEL_VERIFIED/);
assert.equal(visual.witness.physicalPixelParity,'NOT_RUN');
console.log('PASS_SMD_HOME_R2_CF3_SOURCE_STATIC_CANDIDATE');
