/** SMD Mobile Vue3 R3 source and static gate. Never mutate original R2 receipts. */
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const root=resolve(import.meta.dirname,'../..');
const txt=path=>readFileSync(join(root,path),'utf8');
const sha=data=>createHash('sha256').update(data).digest('hex');
const data=await import(pathToFileURL(join(root,'app/data/home-training-mobile-r2.ts')));
const {mobileTrainingR2:m}=data;
const witness=JSON.parse(txt('app/data/home-mobile-calendar-witness-r2.json'));
assert.equal(m.contract,'SMD_HOME_R2_TRAINING_MOBILE_VIEW_R2');
assert.equal(m.sourceSnapshotDigest,'5e877e46cc1bad3e7985a553163120c59c9b9d0f731a66d575e781fa5c60146f');
assert.equal(witness.sourceSnapshotDigest,m.sourceSnapshotDigest);
const copy=await import(pathToFileURL(join(root,'app/data/home-r2-copy.ts')));
const records=copy.homeFigmaText;
for(const [label,value,expectedLabel,expectedValue] of [
 ['node-1:102','node-1:101','교육기간','6주· 총 42시간'],
 ['node-1:479','node-1:478','교육분야','인테리어· 유리 필름'],
 ['node-1:484','node-1:483','현장 경험','2회 이상'],
]){
 assert.equal(records[label]?.characters,expectedLabel,`R3_LABEL_DRIFT ${label}`);
 assert.equal(records[value]?.characters,expectedValue,`R3_VALUE_DRIFT ${value}`);
}
const comp=txt('app/data/home-r2-composition.ts');
const segment=comp.slice(comp.indexOf('training: {'),comp.indexOf('benefits: {'));
assert.equal((segment.match(/label: textRef\('node-1:(102|479|484)'\)/g)||[]).length,3);
assert.equal((segment.match(/value: textRef\('node-1:(101|478|483)'\)/g)||[]).length,3);
for(const [kind,key] of [['duration','node-1:414'],['field','node-1:477'],['experience','node-1:482']]){
 assert.equal(m.icons[kind].sourceNode,key,`R3_ICON_SOURCE_DRIFT ${kind}`);
 assert.equal(sha(readFileSync(join(root,'public',m.icons[kind].src.slice(1)))),m.icons[kind].sha256,`R3_ASSET_SHA_DRIFT ${kind}`);
}
assert.equal(witness.leaves.length,26);
assert.equal(witness.derivedSha256,m.icons.duration.sha256);
assert.equal(sha(readFileSync(join(root,'public/figma-r2/derived/calendar-mobile-r2.svg'))),witness.derivedSha256);
const teach=txt('app/components/home/TeachSection.vue');
const special=txt('app/components/home/StatementSection.vue');
const icon=txt('app/components/home/HomeTrainingFactIcon.vue');
const timeline=txt('app/components/home/HomeTrainingTimelineMobile.vue');
assert.match(teach,/data-mobile-training-layout="three-facts-r3"/);
assert.match(teach,/v-for="fact in copy\.facts"/);
assert.match(teach,/data-mobile-training-fact="fact\.label"/);
assert.match(teach,/<HomeTrainingFactIcon :kind="iconByLabel\[fact\.label\]"\s*\/>/);
for(const token of ['node-1:102','node-1:479','node-1:484','smd-home__training-tracks-original-r2',
  'v-for="(part,index) in [copy.morning, copy.afternoon]"', '<HomeFigmaLine']) assert.ok(teach.includes(token),`R3_ORIGINAL_OWNER_MISSING ${token}`);
for(const token of ['data-home-derived="training-timeline-summary-r2"','derived-summary',
 '<HomeTrainingTimelineMobile','import HomeTrainingTimelineMobile','smd-home__training-fact--summary-r2',
 'smd-home__training-timeline-mobile-r2']) assert.ok(!teach.includes(token),`R3_EXTRA_OWNER_REMAINS ${token}`);
assert.match(teach,/@media\s*\(max-width:\s*699px\)/);
assert.match(teach,/grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/);
assert.match(teach,/\.smd-home--training-track\s+\.smd-home__training-tracks-original-r2\s*\{\s*display:\s*none;\s*\}/);
assert.match(teach,/smd-training-fact-r2__value\s+:deep\(\.smd-home-figma-text\s*>\s*span\)/);
assert.doesNotMatch(teach,/line-clamp|text-overflow:\s*ellipsis|\.smd-home--training-track\s*\{\s*overflow-x:\s*hidden/);
assert.match(special,/smd-home__special-point-body-r2/);
assert.match(icon,/data-training-icon=/);
assert.match(timeline,/node-1:499/);
assert.match(timeline,/data-source-arrow="node-1:501"/);
assert.match(timeline,/data-source-arrow="node-1:555"/);
console.log('PASS_MOBILE_R3_SOURCE_STATIC; original 3 facts, 3 asset SHA, original tablet timeline, no mobile summary/timeline mount.');
console.log('R2_STATIC_BROWSER_GATES_ARE_HISTORICAL; Windows full typecheck/build and actual browser remain required.');
