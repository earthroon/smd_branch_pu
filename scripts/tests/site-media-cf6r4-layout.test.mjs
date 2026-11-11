import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=readFileSync(new URL('../../app/components/feature/PracticeBlock.vue',import.meta.url),'utf8');
test('CF6R4 Practice main V5 occupies two grid columns',()=>{
 assert.match(src,/<SiteImage v-if="siteImage_0\?\.kind==='v5'" class="col-span-2 min-w-0"/);
 assert.match(src,/<div class="col-span-2 aspect-\[16\/10\]/);
});
test('CF6R4 secondary image, fact card and legacy branch remain',()=>{
 assert.match(src,/home\.practiceTeaser\.secondaryImage/);
 assert.match(src,/siteImage_1\?\.kind==='legacy'/);
 assert.match(src,/pages\?\.home\.practiceTeaser\.factLabel/);
});
