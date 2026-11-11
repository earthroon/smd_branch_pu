import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isBenefitsPageReady } from '../figma-r2/home-benefits-browser-readiness.mjs';

const baseline = {
  documentIdentity:'fresh', loaded:true, present:true,
  introAdmission:'ADMITTED', benefitsPhase:'unarmed',
};

test('reject previous page identity even when DOM is loaded', () => {
  assert.equal(isBenefitsPageReady(baseline,'next',false),false);
});
test('reject SSR DOM before Vue onMounted', () => {
  assert.equal(isBenefitsPageReady({...baseline,introAdmission:'NOT_MOUNTED'},'fresh',false),false);
});
test('reject missing DOM or incomplete document', () => {
  assert.equal(isBenefitsPageReady({...baseline,present:false},'fresh',false),false);
  assert.equal(isBenefitsPageReady({...baseline,loaded:false},'fresh',false),false);
});
test('accept mounted desktop even if Benefits is not armed yet', () => {
  assert.equal(isBenefitsPageReady(baseline,'fresh',false),true);
});
test('touch must reach explicit disabled state', () => {
  assert.equal(isBenefitsPageReady(baseline,'fresh',true),false);
  assert.equal(isBenefitsPageReady({...baseline,benefitsPhase:'disabled'},'fresh',true),true);
});
