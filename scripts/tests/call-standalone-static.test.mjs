import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const testsDir = dirname(fileURLToPath(import.meta.url));
const top = resolve(testsDir,'../..');
const sourceRoot = existsSync(join(top,'files/app/components/contact/StandaloneContactPage.vue'))
  ? join(top,'files') : top;
const read = p => readFileSync(join(sourceRoot,p),'utf8');
const single = (s,p) => (s.match(p)||[]).length;

test('standalone page uses only contact body, no new shared header/footer owner', () => {
  const s=read('app/components/contact/StandaloneContactPage.vue');
  assert.match(s,/class="smd-call"/);
  assert.doesNotMatch(s,/<SiteHeader|<SiteFooter|<header\s+class="smd-site-header"|<footer/);
  assert.match(s,/data-source-node="130:609"/);
  assert.match(s,/data-source-node="130:608"/);
  assert.match(s,/data-source-node="130:591"/);
  assert.match(s,/autocomplete="name"/);
  assert.match(s,/autocomplete="tel"/);
  assert.match(s,/<TurnstileWidget/);
  assert.match(s,/\$fetch<SubmitReply>\('\/api\/inquiries'/);
  assert.doesNotMatch(s,/useSiteContent|SMD_CORE|publication|CMS/i);
});
test('Figma sources are not rewritten as fake public contact options',()=>{
  const s=read('app/data/standalone-call-options.ts');
  assert.match(s,/standaloneCallPurposeOptions/);
  assert.match(s,/= \[\];/);
});
test('page-local token scope and shared header offset are preserved',()=>{
  const s=read('app/assets/css/contact-standalone.css');
  assert.match(s,/\.smd-call \{/);
  assert.match(s,/padding-top: var\(--smd-header-height\)/);
  assert.match(s,/var\(--smd-action-orange\)/);
  assert.match(s,/#c2c2c2/);
  assert.match(s,/\.smd-call__card--ready/);
  assert.doesNotMatch(s,/(^|\n)\s*:root\s*\{/);
  assert.doesNotMatch(s,/\.smd-site-header__|\.smd-site-footer/);
});
test('independent backend does not touch CMS or impersonate success',()=>{
  const s=read('server/utils/standalone-inquiries.ts');
  assert.match(s,/INQUIRY_DB_UNAVAILABLE/);
  assert.match(s,/PRIVACY_POLICY_NOT_APPROVED/);
  assert.match(s,/TURNSTILE_REJECTED/);
  assert.match(s,/INQUIRY_COOLDOWN_30MIN/);
  assert.match(s,/INQUIRY_IDEMPOTENCY_CONFLICT/);
  assert.doesNotMatch(s.replace(/^\/\*\*[\s\S]*?\*\//,''),/SMD_CORE|Publication|AdminSurface|CmsSlot|cms\/|fakeReceipt/i);
});
test('standalone D1 migration has unique request identity and bounded rate window',()=>{
  const s=read('migrations/standalone-inquiries/0001.sql');
  assert.match(s,/request_id TEXT NOT NULL UNIQUE/);
  assert.match(s,/PRIMARY KEY \(subject_key, window_key\)/);
  assert.match(s,/privacy_revision TEXT NOT NULL/);
});
test('status endpoint never returns configured secrets',()=>{
  const s=read('server/api/inquiries/status.get.ts');
  assert.match(s,/standaloneInquiryReadiness/);
  assert.match(s,/cache-control', 'no-store'/);
  assert.doesNotMatch(s,/(return|json)\s*\{[^}]*TURNSTILE_SECRET/);
});
