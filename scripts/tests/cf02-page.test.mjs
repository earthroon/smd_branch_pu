import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { validateCf02 } from '../cf02-page-static.mjs';
import { parseTemplate, tags } from '../lib/cf02-template.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));

function mutated(rel,from,to,expected) {
  const dir=mkdtempSync(join(tmpdir(),'smd-cf02-negative-'));
  try {
    const target=join(dir,'site');
    cpSync(root,target,{recursive:true,filter:path=>!['node_modules','.nuxt','.output','.git'].includes(path.split(/[\\/]/).at(-1))});
    const path=join(target,rel);
    const source=readFileSync(path,'utf8');
    assert(source.includes(from),`test precondition did not match: ${rel} ${from.slice(0,80)}`);
    writeFileSync(path,source.replace(from,to),'utf8');
    const report=validateCf02(target);
    assert.equal(report.passed,false,'mutated candidate must fail');
    assert(report.failures.some(x=>x.name===expected),`missing expected failure '${expected}', got ${report.failures.map(x=>x.name).join(', ')}`);
  } finally {
    rmSync(dir,{recursive:true,force:true});
  }
}

test('CF02 static gate approves only the scoped candidate',()=> {
  const report=validateCf02(root);
  assert.equal(report.passed,true,JSON.stringify(report.failures));
  assert.equal(report.checksPassed,report.checksTotal);
  assert.equal(report.copyParity.pageLocal,'PASS_STATIC_LITERAL_AND_ARRAY');
  assert.equal(report.copyParity.cmsBenefit,'BLOCKED_CF04_SEED_DRIFT');
  assert.equal(report.copyParity.fullProduction,false);
  assert.equal(report.evidence.promoted,false);
  assert.equal(report.changes.length,10);
});

test('dependency-free reader refuses mismatched DOM nesting',()=> {
  assert.throws(()=>parseTemplate('<template><section><span></section></span></template>'),/NESTING_INVALID/);
  const t=parseTemplate('<template><section><template #title><br /></template><img alt="sample" /></section></template>');
  assert.equal(tags(t,'br').length,1);
  assert.equal(tags(t,'img').length,1);
});

test('negative: hero image title removed',()=>mutated(
  'app/components/home/HeroSection.vue', 'title="인테리어필름 시공 실습"','',
  'image app/components/home/HeroSection.vue #0 attrs+frame'));

test('negative: home section order reordered',()=>mutated(
  'app/pages/index.vue','<HeroSection /><StatementSection />','<StatementSection /><HeroSection />',
  'index root section order'));

test('negative: teaching grid number style removed',()=>mutated(
  'app/components/feature/TeachGrid.vue','tracking-wide text-foreground-800','text-foreground-800',
  'TeachGrid card transition and content'));

test('negative: archive card arrow removed',()=>mutated(
  'app/components/feature/ArchiveGallery.vue','ri-arrow-right-line mt-0.5','ri-arrow-up-line mt-0.5',
  'archive card source hover+icon'));

test('negative: original practice tool description changed',()=>mutated(
  'app/pages/practice.vue','커터칼, 스퀴지 등 실습에 필요한 공구를 모두 제공합니다.','기본 도구 제공',
  'practice four facilities original exact'));

test('negative: promotion five-seat allocation changed',()=>mutated(
  'app/pages/promotion.vue','[true, true, false, false, false]','[true, false, false, false, false]',
  'promotion five tier allocation visual'));

test('negative: promotion seats use enrollmentStatus',()=>mutated(
  'app/pages/promotion.vue', 'v-for="(early,index) in campaignSeatAllocation"','v-for="(early,index) in promo?.enrollmentStatus"',
  'promotion no occupancy-driven circle'));

test('negative: promotion bold source terms removed',()=>mutated(
  'app/pages/promotion.vue','<strong class="font-semibold text-foreground-900">','<strong class="font-semibold text-foreground-800">',
  'promotion deposit terms source semantics'));

test('negative: contact hover transition removed',()=>mutated(
  'app/pages/contact.vue','group-hover:translate-x-1 group-hover:text-primary-600','group-hover:text-primary-600',
  'contact hover chain restored'));

test('negative: CF01 Header changed',()=>mutated(
  'app/components/feature/SiteHeader.vue','md:h-20','md:h-24',
  'changed paths only approved'));

test('negative: CF01 404 changed',()=>mutated(
  'app/error.vue','페이지를 찾을 수 없습니다.','404 변경됨',
  'changed paths only approved'));

test('negative: CSS original authority changed',()=>mutated(
  'app/assets/css/main.css','@tailwind base;','/* altered */\n@tailwind base;',
  'original CSS unchanged'));

test('negative: unauthorized server API mutation',()=>mutated(
  'server/api/content.get.ts','export default','// drift\nexport default',
  'changed paths only approved'));

test('negative: unauthorized CMS seed alteration',()=>mutated(
  'shared/seed-content.json','실습에 필요한 기본 준비물을 수업 첫날부터 사용합니다.','원본이 아닌 새 홍보 문구',
  'known CMS benefit drift remains explicit'));

test('negative: Turnstile ownership changed',()=>mutated(
  'app/components/contact/ContactForm.vue','<template>','<!-- drift -->\n<template>',
  'changed paths only approved'));
