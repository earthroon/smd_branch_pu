import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveHomeCtaTitle} from '../../app/utils/resolveHomeCtaTitle.ts';
test('old publication still renders its published promotion title',()=>{
  assert.equal(resolveHomeCtaTitle({ctaTitle:'기존 발행 CTA'}),'기존 발행 CTA');
});
test('independent slot changes only the home CTA presentation',()=>{
  const promotion={ctaTitle:'기존 프로모션 CTA',homeCtaTitle:'소수정예 9명, 대표직강'};
  assert.equal(resolveHomeCtaTitle(promotion),'소수정예 9명, 대표직강');
  assert.equal(promotion.ctaTitle,'기존 프로모션 CTA');
});
test('invalid slot is rejected rather than rendered',()=>{
  assert.throws(()=>resolveHomeCtaTitle({ctaTitle:'유효한 CTA',homeCtaTitle:'<script>'}),/CMS_HOME_CTA_COPY_SLOT_INVALID/);
});
