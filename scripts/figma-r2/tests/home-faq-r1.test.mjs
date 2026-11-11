/** SMD_HOME_FAQ_R1: source-copy, state ownership, alignment and CSS boundary tests.
 * Does not claim browser runtime/physical parity. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { HOME_FAQ_APPROVED_COPY_R1, resolveHomeFaqRows } from '../../../app/data/homeFaqApprovedCopy.ts';
import { faqAlignmentTarget, faqScrollEase, homeFaqSceneMinimums } from '../../../app/utils/homeFaqLayout.ts';

const root=resolve(import.meta.dirname,'../../..');
const read=(path)=>readFileSync(resolve(root,path),'utf8');
const ids=['home.faq.01','home.faq.02','home.faq.03','home.faq.04'];

test('four FAQ IDs and exact user-approved questions remain ordered',()=>{
  assert.deepEqual(HOME_FAQ_APPROVED_COPY_R1.map(r=>r.id),ids);
  assert.deepEqual(HOME_FAQ_APPROVED_COPY_R1.map(r=>r.question),[
    'Q. 국비 지원이 가능한가요?',
    'Q. 어떤 교육을 목표로 하나요?',
    'Q. 수료 후 어떤 지원을 받을 수 있나요?',
    'Q. 현장 경험도 포함되나요?',
  ]);
});
test('approved answers preserve original characters and explicit two-paragraph third answer',()=>{
  const rows=resolveHomeFaqRows([]);
  assert.equal(rows.length,4);
  assert.deepEqual(rows.map(r=>r.paragraphs),[
    ['A. SMD아카데미는 사설 학원으로, 별도의 국비 지원은 제공하지 않습니다.'],
    ['A. 현업 시공사의 실전에 가까운 수업을 통해 전문 기술자를 양성하는 것을 목표로 합니다.'],
    ['A. 수강생의 상황에 맞는 취업·창업 컨설팅을 제공합니다.',
      '우수 수료생에게는 소망디자인협의 고정 시공 인력으로 일할 기회를 제공합니다.'],
    ['A. 교육 과정에서 2회 이상의 현장 경험 기회를 제공합니다.'],
  ]);
  assert.ok(rows.every(row=>row.authority==='USER_APPROVED_QA_R1'));
});
test('current published rows win by ID with an explicit per-row authority; no ambiguous merge',()=>{
  const rows=resolveHomeFaqRows([{id:ids[1],question:'CMS 질문',answer:'CMS 문단 1\n\nCMS 문단 2',visible:true}]);
  assert.equal(rows[1].question,'CMS 질문');
  assert.deepEqual(rows[1].paragraphs,['CMS 문단 1','CMS 문단 2']);
  assert.equal(rows[1].authority,'CMS_PUBLICATION_V1');
  assert.equal(rows[0].authority,'USER_APPROVED_QA_R1');
  assert.equal(rows.length,4);
});
test('unknown, duplicated or empty published rows are rejected, never silently substituted',()=>{
  assert.throws(()=>resolveHomeFaqRows([{id:'other',question:'q',answer:'a',visible:true}]),/SMD_HOME_FAQ_PUBLISHED_ROW_INVALID/);
  assert.throws(()=>resolveHomeFaqRows([
    {id:ids[0],question:'q',answer:'a',visible:true},
    {id:ids[0],question:'q',answer:'a',visible:true},
  ]),/SMD_HOME_FAQ_PUBLISHED_ROW_INVALID/);
  assert.throws(()=>resolveHomeFaqRows([{id:ids[0],question:'',answer:'a',visible:true}]),/SMD_HOME_FAQ_PUBLISHED_ROW_INVALID/);
});
test('center alignment excludes sticky header in its center math',()=>{
  const result=faqAlignmentTarget({scrollY:600,itemTop:270,itemHeight:220,viewportHeight:900,headerHeight:100,documentHeight:4000,safeGap:16});
  assert.equal(result.mode,'center');
  assert.equal(result.targetY,480);
  assert.equal(result.clamped,false);
});
test('tall answer uses header-safe top alignment instead of invisible vertical center',()=>{
  const result=faqAlignmentTarget({scrollY:600,itemTop:270,itemHeight:1200,viewportHeight:900,headerHeight:100,documentHeight:4000,safeGap:16});
  assert.equal(result.mode,'top-for-tall-item');
  assert.equal(result.targetY,754);
});
test('document scrolling boundaries are respected',()=>{
  assert.deepEqual(faqAlignmentTarget({scrollY:0,itemTop:10,itemHeight:80,viewportHeight:900,headerHeight:100,documentHeight:1000,safeGap:16}),
    {targetY:0,mode:'center',clamped:true});
  const result=faqAlignmentTarget({scrollY:800,itemTop:600,itemHeight:100,viewportHeight:900,headerHeight:100,documentHeight:1800,safeGap:16});
  assert.equal(result.targetY,900);assert.equal(result.clamped,true);
});
test('invalid alignment dimensions are rejected rather than ignored',()=>{
  assert.throws(()=>faqAlignmentTarget({scrollY:0,itemTop:0,itemHeight:0,viewportHeight:900,headerHeight:100,documentHeight:4000,safeGap:16}),/SMD_HOME_FAQ_ALIGNMENT_GEOMETRY_INVALID/);
  assert.throws(()=>faqAlignmentTarget({scrollY:0,itemTop:0,itemHeight:80,viewportHeight:900,headerHeight:900,documentHeight:4000,safeGap:16}),/SMD_HOME_FAQ_ALIGNMENT_GEOMETRY_INVALID/);
});
test('wide FAQ height is derived from source section + global 75% layout scale',()=>{
  const heights=homeFaqSceneMinimums({sourceHeight:1199,targetHeight:899.25});
  assert.equal(heights['--smd-faq-scene-height-desktop'],'62.447916667vw');
  assert.equal(heights['--smd-faq-scene-height-wide'],'min(46.8359375vw, 899.25px)');
  assert.throws(()=>homeFaqSceneMinimums({sourceHeight:1199,targetHeight:1199}),/SMD_HOME_FAQ_WIDE_ROW_GEOMETRY_INVALID/);
});
test('scroll easing is monotonic, clamped and finite',()=>{
  assert.equal(faqScrollEase(-2),0);assert.equal(faqScrollEase(2),1);
  assert.ok(faqScrollEase(.25)>0&&faqScrollEase(.25)<faqScrollEase(.75));
  assert.throws(()=>faqScrollEase(Number.NaN),/SMD_HOME_FAQ_SCROLL_PROGRESS_INVALID/);
});
test('exactly one desktop semantic FAQ owner replaces fixed SVG FAQ; other scenes unchanged',()=>{
  const stage=read('app/components/home/HomeBodyStage.vue');
  assert.match(stage,/<HomeFaq v-if="row\.id === 'faq'" wide\s*\/>/);
  assert.match(stage,/<FigmaSceneSection v-else :section-id="row\.id"\s*\/>/);
  assert.match(stage,/homeFaqSceneMinimums\(row\)/);
  assert.match(stage,/data-methods-contract="SMD_HOME_METHODS_REVEAL_R1"/);
});
test('FAQ uses one controlled expanded ID, native button and distinct labelled answer region',()=>{
  const component=read('app/components/home/HomeFaq.vue');
  assert.match(component,/expandedId = ref<HomeFaqId \| null>\(null\)/);
  assert.match(component,/expandedId\.value = expandedId\.value === id \? null : id/);
  assert.match(component,/:aria-expanded="expandedId === row\.id"/);
  assert.match(component,/:aria-controls=/);
  assert.match(component,/v-show="expandedId === row\.id"/);
  assert.match(component,/role="region" :aria-labelledby=/);
  assert.match(component,/generation\.value !== token/);
  assert.match(component,/:data-faq-content-authority="contentAuthority"/);
});
test('FAQ CSS consumes existing Home tokens; avoids absolute positions and clip caps',()=>{
  const css=read('app/assets/css/home-faq.css');
  assert.match(css,/var\(--home-faq-max\)/);
  assert.match(css,/var\(--foreground-950\)/);
  assert.match(css,/var\(--font-body\)/);
  assert.match(css,/var\(--type-body-leading\)/);
  assert.match(css,/--smd-faq-scene-height-wide/);
  assert.doesNotMatch(css,/\.smd-home--faq\s*\{[^}]*position:\s*(absolute|fixed)|overflow:\s*hidden/);
  assert.match(read('app/pages/index.vue'),/home-faq\.css/);
});
