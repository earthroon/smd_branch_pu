/** Local SOURCE/STATIC gate. Visual correctness requires a separate Chromium run. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const root=resolve(import.meta.dirname,'../..');
const read=path=>readFileSync(join(root,path),'utf8');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const data=await import(pathToFileURL(join(root,'app/data/home-training-mobile-r4a.ts')));
const {mobileTrainingR4A:m,assertMobileTrainingR4A}=data;
assertMobileTrainingR4A();
assert.equal(m.contract,'SMD_HOME_R2_MOBILE_R4A_TRACK_OPTICAL_FIX');
assert.equal(m.fieldDisplayText,'인테리어·유리필름');
assert.equal(m.fieldDisplayFirst+m.fieldDisplaySecond,m.fieldDisplayText);
assert.equal(m.timeline.afternoonDisplayText,'필름래핑');
const copy=(await import(pathToFileURL(join(root,'app/data/home-r2-copy.ts')))).homeFigmaText;
assert.equal(copy['node-1:478'].characters,'인테리어· 유리 필름');
assert.equal(copy['node-1:494'].characters,'필름 래핑');
const icons=(await import(pathToFileURL(join(root,'app/data/home-training-mobile-r2.ts')))).mobileTrainingR2;
for(const kind of ['duration','field','experience']) {
  const i=icons.icons[kind];
  assert.equal(sha(readFileSync(join(root,'public',i.src.slice(1)))),i.sha256,`R4A_ICON_SHA_${kind}`);
}
assert.equal(sha(readFileSync(join(root,'public',icons.arrow.src.slice(1)))),icons.arrow.sha256);
const teach=read('app/components/home/TeachSection.vue');
const flow=read('app/components/home/HomeTrainingFlowR4A.vue');
const props=[
 'v-for="fact in copy.facts"',
 'data-mobile-training-layout="three-facts-r3"',
 'smd-home__training-tracks-original-r2',
 'v-for="(part,index) in [copy.morning, copy.afternoon]"',
 '<HomeTrainingFactIcon :kind="iconByLabel[fact.label]"',
 '<HomeTrainingFlowR4A data-mobile-training-flow="r4a"',
 'smd-training-field-mobile-r4a',
 'smd-training-field-original-r4a',
 'smd-training-nobreak-r4a',
 '인테리어·<wbr /><span',
 '유리필름</span>',
];
for(const p of props)assert.ok(teach.includes(p),`R4A_STRUCTURE_MISSING ${p}`);
assert.equal((teach.match(/<HomeTrainingFlowR4A\b/g)??[]).length,1);
assert.equal((teach.match(/<HomeTrainingFactIcon\b/g)??[]).length,1);
assert.ok(!teach.includes('training-timeline-summary-r2'));
assert.ok(!teach.includes('<HomeTrainingTimelineMobile'));
assert.match(teach,/grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/);
assert.match(teach,/\.smd-home__training-tracks-original-r2\s*\{\s*display:\s*none;/);
for(const size of ['46px','49px','55px'])assert.ok(teach.includes('width: '+size),`R4A_OPTICAL_${size}`);
const nodes=[
 ['morning','node-1:492','오전'],
 ['center','node-1:499','밑작업'],
 ['afternoon','node-1:498','오후'],
 ['morning-bottom','node-1:493','밑작업'],
 ['afternoon-bottom','node-1:494','필름래핑'],
];
assert.deepEqual(nodes.map(x=>x[0]), ['morning','center','afternoon','morning-bottom','afternoon-bottom']);
for(const [kind,source,value] of nodes) {
  assert.ok(flow.includes(`data-mobile-r4a-step="${kind}"`),`R4A_FLOW_NODE_${kind}`);
  if(kind!=='afternoon-bottom')assert.equal(copy[source].characters,value,`R4A_FLOW_TEXT_${source}`);
  else assert.equal(m.timeline.afternoonDisplayText,value);
}
assert.ok(flow.includes('data-mobile-training-timeline="R4A"'));
assert.ok(flow.includes('data-source-node="node-1:501"') && flow.includes('data-source-node="node-1:555"'));
assert.ok(flow.includes('smd-training-flow-r4a__badge::after'));
assert.ok(flow.includes('grid-template-columns: 58px minmax(0, 1fr) 66px minmax(0, 1fr) 58px'));
assert.ok(!flow.includes('node-1:478')); // View-only field value belongs to TeachSection
console.log('PASS_MOBILE_R4A_SOURCE_STATIC; 3 canonical fact icons, 5 timeline nodes, source/display split, arrow SHA, mobile-only optical bounds.');
console.log('R3 browser gate is historical: R4A intentionally reintroduces a NEW approved mobile flow; actual browser and Figma pixel parity NOT_RUN.');
