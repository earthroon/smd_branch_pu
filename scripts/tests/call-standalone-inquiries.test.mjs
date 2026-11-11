import test from 'node:test';
import assert from 'node:assert/strict';
import {
  configAdmission,
  standaloneInquiryReadiness,
  submitStandaloneInquiry,
} from '../../server/utils/standalone-inquiries.ts';

class FakeD1 {
  constructor() { this.rows = []; this.counts = new Map(); this.migrated = true; }
  prepare(sql) {
    return {
      bind: (...args) => ({ first: async () => this.query(sql, args) }),
      first: async () => this.query(sql, []),
    };
  }
  async query(sql, params) {
    if (sql.includes('sqlite_master')) {
      return this.migrated ? { name: sql.includes("name='standalone_inquiries'") ? 'standalone_inquiries' : 'standalone_inquiry_rate_window' } : null;
    }
    if (sql.includes('SELECT id, ip_digest, body_digest')) {
      const row = this.rows.find(r => r.request_id === params[0]);
      return row ? { id: row.id, ip_digest: row.ip_digest, body_digest: row.body_digest } : null;
    }
    if (sql.includes('INSERT INTO standalone_inquiry_rate_window')) {
      const key = `${params[0]}:${params[1]}`;
      const n = (this.counts.get(key) ?? 0) + 1;
      this.counts.set(key, n);
      return { request_count: n };
    }
    if (sql.includes('INSERT INTO standalone_inquiries')) {
      const [id, request_id, ip_digest, body_digest, sender_name, phone, purpose,
        preferred_schedule, message, privacy_revision, submitted_ms, lookIp, threshold] = params;
      if (this.rows.some(row => row.ip_digest === lookIp && row.submitted_ms >= threshold)) return null;
      if (this.rows.some(row => row.request_id === request_id)) throw Error('request_id conflict');
      this.rows.push({ id, request_id, ip_digest, body_digest, sender_name, phone, purpose,
        preferred_schedule, message, privacy_revision, submitted_ms });
      return { id };
    }
    throw Error('unknown SQL: ' + sql);
  }
}
const configured = (db = new FakeD1()) => ({
  INQUIRY_DB: db,
  TURNSTILE_SECRET: 'test-only-not-a-real-secret',
  TURNSTILE_EXPECTED_HOSTNAME: 'example.invalid',
  PRIVACY_REVISION: 'approved-test-revision',
  IP_HMAC_KEY: 'this-is-a-long-test-only-hmac-secret',
});
const validBody = () => ({
  requestId: crypto.randomUUID(),
  name: 'Test Person',
  phone: '010-1234-5678',
  purpose: '',
  preferredSchedule: 'weekday evenings',
  message: 'Please contact me.',
  website_alt: '',
  consent: true,
  turnstileToken: 'test-token',
  privacyRevision: 'approved-test-revision',
});
const verification = (x = {success:true,hostname:'example.invalid',action:'inquiry'}) =>
  async () => Response.json(x);
const submit = (env, body, overrides = {}) => submitStandaloneInquiry({
  env, body, clientIp: '203.0.113.7',
  publicPrivacyRevision: 'approved-test-revision', publicTurnstileSiteKey: 'test-site-key',
  nowMs: 1_800_000_000_000, verifyFetch: verification(), ...overrides,
});

test('no DB is rejected without creating a fake receipt', async () => {
  const e = configured(); delete e.INQUIRY_DB;
  assert.deepEqual(configAdmission(e,'approved-test-revision','test-site-key'),
    {ready:false,reason:'INQUIRY_DB_UNAVAILABLE'});
  const r = await submit(e,validBody());
  assert.equal(r.status,503);
});
test('missing migration and unapproved privacy reject readiness', async () => {
  const db = new FakeD1(); db.migrated = false;
  assert.equal((await standaloneInquiryReadiness(configured(db),'approved-test-revision','test-site-key')).reason,
    'INQUIRY_DB_MIGRATION_MISSING');
  assert.equal(configAdmission(configured(),'wrong-revision','test-site-key').reason,
    'PRIVACY_POLICY_NOT_APPROVED');
});
test('successful receipt, idempotent retry and no duplicate storage', async () => {
  const db = new FakeD1(), env = configured(db), body = validBody();
  const first = await submit(env,body);
  assert.equal(first.status,201);
  assert.equal(first.body.ok,true);
  const again = await submit(env,body,{verifyFetch:verification({success:false})});
  assert.deepEqual(again,first);
  assert.equal(db.rows.length,1);
  assert.equal([...db.counts.values()][0],1);
});
test('idempotency key cannot be reused for a different body', async () => {
  const env = configured(), body = validBody();
  assert.equal((await submit(env,body)).status,201);
  assert.equal((await submit(env,{...body,name:'Changed'})).body.error,'INQUIRY_IDEMPOTENCY_CONFLICT');
});
test('new request within 30 minutes is blocked', async () => {
  const db = new FakeD1(), env = configured(db), body = validBody();
  assert.equal((await submit(env,body)).status,201);
  assert.equal((await submit(env,validBody())).body.error,'INQUIRY_COOLDOWN_30MIN');
  assert.equal(db.rows.length,1);
});
test('rejected Turnstile token and wrong action do not write D1', async () => {
  const db = new FakeD1(), env = configured(db);
  const fail = await submit(env,validBody(),{verifyFetch:verification({success:true,hostname:'example.invalid',action:'wrong'})});
  assert.equal(fail.status,403);
  assert.equal(db.rows.length,0);
});
test('unknown request fields, honeypot, wrong privacy revision are rejected', async () => {
  const env = configured(), body = validBody();
  assert.equal((await submit(env,{...body,email:'not-in-figma'})).body.error,'INQUIRY_UNSUPPORTED_FIELD');
  assert.equal((await submit(env,{...body,website_alt:'spam'})).body.error,'HONEYPOT_REJECTED');
  assert.equal((await submit(env,{...body,privacyRevision:'wrong'})).body.error,'PRIVACY_POLICY_NOT_APPROVED');
});
test('untrusted/missing client IP is never admitted', async () => {
  const result = await submit(configured(),validBody(),{clientIp:null});
  assert.equal(result.status,503);
  assert.equal(result.body.error,'CLIENT_IP_UNAVAILABLE');
});
test('overlong input is rejected, not truncated', async () => {
  const body = validBody();body.name = 'X'.repeat(81);
  assert.equal((await submit(configured(),body)).body.error,'INQUIRY_FIELDS_INVALID');
});
test('rate window is bounded independent of invalid captcha attempts', async () => {
  const db = new FakeD1(), env = configured(db);
  for(let i=0;i<10;i++) {
    const result=await submit(env,validBody(),{verifyFetch:verification({success:false})});
    assert.equal(result.status,403);
  }
  assert.equal((await submit(env,validBody())).body.error,'INQUIRY_RATE_LIMIT');
  assert.equal(db.rows.length,0);
});
