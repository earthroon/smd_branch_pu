/** SMD-CALL-R1 Standalone inquiry authority. No CMS, Publication, or SMD_CORE dependency. */
export interface StandaloneDbStatement {
  bind(...values: unknown[]): StandaloneDbStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
}
export interface StandaloneDb {
  prepare(query: string): StandaloneDbStatement;
}
export type StandaloneInquiryEnv = {
  INQUIRY_DB?: StandaloneDb;
  TURNSTILE_SECRET?: string;
  TURNSTILE_EXPECTED_HOSTNAME?: string;
  PRIVACY_REVISION?: string;
  IP_HMAC_KEY?: string;
};

export type StandaloneReadinessReason =
  | 'READY'
  | 'INQUIRY_DB_UNAVAILABLE'
  | 'INQUIRY_DB_MIGRATION_MISSING'
  | 'TURNSTILE_CONFIG_MISSING'
  | 'RATE_LIMIT_SECRET_MISSING'
  | 'PRIVACY_POLICY_NOT_APPROVED'
  | 'PUBLIC_TURNSTILE_SITEKEY_MISSING';

export type StandaloneReadiness = Readonly<{
  ready: boolean;
  reason: StandaloneReadinessReason;
}>;

export type InquiryResult = Readonly<{
  status: number;
  body: { ok: false; error: string } | { ok: true; reference: string };
}>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PHONE = /^[0-9+()\-\s]{8,24}$/;
const LENGTH_LIMIT = 4096;
const TEN_MIN = 10 * 60_000;
const THIRTY_MIN = 30 * 60_000;
const fail = (status: number, error: string): InquiryResult => ({ status, body: { ok: false, error } });
const ok = (reference: string): InquiryResult => ({ status: 201, body: { ok: true, reference } });

const inputString = (value: unknown, max: number): string | null =>
  typeof value === 'string' && value.length <= max ? value.trim() : null;

const toHex = (buffer: ArrayBuffer): string => Array.from(new Uint8Array(buffer))
  .map(value => value.toString(16).padStart(2, '0')).join('');

async function hmac(input: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return toHex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(input)));
}
async function sha256(input: string): Promise<string> {
  return toHex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input)));
}

export function configAdmission(
  env: StandaloneInquiryEnv,
  publicPrivacyRevision: string,
  publicTurnstileSiteKey: string,
): StandaloneReadiness {
  switch (true) {
    case !env.INQUIRY_DB:
      return { ready: false, reason: 'INQUIRY_DB_UNAVAILABLE' };
    case !env.TURNSTILE_SECRET || !env.TURNSTILE_EXPECTED_HOSTNAME
      || env.TURNSTILE_EXPECTED_HOSTNAME.startsWith('REPLACE'):
      return { ready: false, reason: 'TURNSTILE_CONFIG_MISSING' };
    case !env.IP_HMAC_KEY || env.IP_HMAC_KEY.length < 24:
      return { ready: false, reason: 'RATE_LIMIT_SECRET_MISSING' };
    case !env.PRIVACY_REVISION || env.PRIVACY_REVISION.startsWith('REPLACE')
      || env.PRIVACY_REVISION !== publicPrivacyRevision:
      return { ready: false, reason: 'PRIVACY_POLICY_NOT_APPROVED' };
    case !publicTurnstileSiteKey:
      return { ready: false, reason: 'PUBLIC_TURNSTILE_SITEKEY_MISSING' };
    default:
      return { ready: true, reason: 'READY' };
  }
}

/** No sensitive fields or secret values returned. D1 schema checked before enabling the form. */
export async function standaloneInquiryReadiness(
  env: StandaloneInquiryEnv,
  publicPrivacyRevision: string,
  publicTurnstileSiteKey: string,
): Promise<StandaloneReadiness> {
  const config = configAdmission(env, publicPrivacyRevision, publicTurnstileSiteKey);
  switch (config.ready) {
    case false: return config;
    case true: {
      try {
        const schema = await env.INQUIRY_DB!.prepare(
          `SELECT name FROM sqlite_master WHERE type='table' AND name='standalone_inquiries'`,
        ).first<{ name: string }>();
        const rate = await env.INQUIRY_DB!.prepare(
          `SELECT name FROM sqlite_master WHERE type='table' AND name='standalone_inquiry_rate_window'`,
        ).first<{ name: string }>();
        return schema?.name === 'standalone_inquiries' && rate?.name === 'standalone_inquiry_rate_window'
          ? { ready: true, reason: 'READY' }
          : { ready: false, reason: 'INQUIRY_DB_MIGRATION_MISSING' };
      } catch {
        return { ready: false, reason: 'INQUIRY_DB_UNAVAILABLE' };
      }
    }
  }
}

/** A single synchronous admission result. No request body is logged. */
export async function submitStandaloneInquiry(args: {
  body: unknown;
  env: StandaloneInquiryEnv;
  clientIp: string | null;
  publicPrivacyRevision: string;
  publicTurnstileSiteKey: string;
  nowMs?: number;
  verifyFetch?: typeof fetch;
}): Promise<InquiryResult> {
  const { body, env, clientIp, publicPrivacyRevision, publicTurnstileSiteKey } = args;
  const readiness = await standaloneInquiryReadiness(env, publicPrivacyRevision, publicTurnstileSiteKey);
  switch (readiness.ready) {
    case false: return fail(503, readiness.reason);
    case true: break;
  }

  switch (true) {
    case !clientIp || !/^[0-9a-fA-F:.]{2,64}$/.test(clientIp):
      return fail(503, 'CLIENT_IP_UNAVAILABLE');
    case !body || typeof body !== 'object' || Array.isArray(body):
      return fail(400, 'INQUIRY_FIELDS_INVALID');
    default: break;
  }
  const b = body as Record<string, unknown>;
  const allowedKeys = new Set([
    'requestId', 'name', 'phone', 'purpose', 'preferredSchedule', 'message',
    'website_alt', 'consent', 'turnstileToken', 'privacyRevision',
  ]);
  switch (true) {
    case Object.keys(b).some(key => !allowedKeys.has(key)):
      return fail(400, 'INQUIRY_UNSUPPORTED_FIELD');
    case new TextEncoder().encode(JSON.stringify(body)).byteLength > LENGTH_LIMIT:
      return fail(413, 'INQUIRY_BODY_TOO_LARGE');
    case typeof b.website_alt === 'string' && b.website_alt.trim().length > 0:
      return fail(400, 'HONEYPOT_REJECTED');
    default: break;
  }

  const requestId = inputString(b.requestId, 64);
  const name = inputString(b.name, 80);
  const phone = inputString(b.phone, 24);
  const purpose = inputString(b.purpose, 120);
  const schedule = inputString(b.preferredSchedule, 120);
  const message = inputString(b.message, 500);
  const token = inputString(b.turnstileToken, 2048);
  const revision = inputString(b.privacyRevision, 128);
  switch (true) {
    case !requestId || !UUID.test(requestId):
    case !name || name.length > 80:
    case !phone || !PHONE.test(phone):
    case purpose === null || schedule === null || message === null:
    case !token || !revision:
      return fail(400, 'INQUIRY_FIELDS_INVALID');
    case b.consent !== true || revision !== env.PRIVACY_REVISION:
      return fail(503, 'PRIVACY_POLICY_NOT_APPROVED');
    default: break;
  }

  try {
    const digest = await hmac(`standalone-inquiry|${clientIp}`, env.IP_HMAC_KEY!);
    const canonicalPayload = JSON.stringify({ name, phone, purpose, schedule, message, revision });
    const payloadDigest = await sha256(canonicalPayload);
    const db = env.INQUIRY_DB!;
    const prior = await db.prepare(`SELECT id, ip_digest, body_digest FROM standalone_inquiries WHERE request_id=?`)
      .bind(requestId).first<{ id: string; ip_digest: string; body_digest: string }>();
    switch (true) {
      case prior !== null && prior.ip_digest === digest && prior.body_digest === payloadDigest:
        return ok(prior!.id);
      case prior !== null:
        return fail(409, 'INQUIRY_IDEMPOTENCY_CONFLICT');
      default: break;
    }
    const now = args.nowMs ?? Date.now();
    const bucket = Math.floor(now / TEN_MIN);
    const count = await db.prepare(`INSERT INTO standalone_inquiry_rate_window(subject_key, window_key, request_count)
      VALUES(?,?,1) ON CONFLICT(subject_key,window_key) DO UPDATE SET request_count=request_count+1
      RETURNING request_count`).bind(digest, bucket).first<{ request_count: number }>();
    switch (true) {
      case !count || count.request_count > 10:
        return fail(429, 'INQUIRY_RATE_LIMIT');
      default: break;
    }

    let verified = false;
    try {
      const post = new FormData();
      post.append('secret', env.TURNSTILE_SECRET!);
      post.append('response', token!);
      const response = await (args.verifyFetch ?? fetch)(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        { method: 'POST', body: post },
      );
      switch (response.ok) {
        case false: return fail(503, 'TURNSTILE_SERVICE_UNAVAILABLE');
        case true: break;
      }
      const verification = await response.json() as { success?: boolean; hostname?: string; action?: string };
      verified = verification.success === true
        && verification.hostname === env.TURNSTILE_EXPECTED_HOSTNAME
        && verification.action === 'inquiry';
    } catch {
      return fail(503, 'TURNSTILE_SERVICE_UNAVAILABLE');
    }
    switch (verified) {
      case false: return fail(403, 'TURNSTILE_REJECTED');
      case true: break;
    }

    const id = crypto.randomUUID();
    const inserted = await db.prepare(`INSERT INTO standalone_inquiries
      (id, request_id, ip_digest, body_digest, sender_name, phone, purpose, preferred_schedule,
       message, privacy_revision, submitted_ms, status)
      SELECT ?,?,?,?,?,?,?,?,?,?,?,'new'
      WHERE NOT EXISTS (
        SELECT 1 FROM standalone_inquiries WHERE ip_digest=? AND submitted_ms>=?
      ) RETURNING id`)
      .bind(id, requestId, digest, payloadDigest, name, phone, purpose, schedule, message,
        revision, now, digest, now - THIRTY_MIN).first<{ id: string }>();
    switch (inserted) {
      case null: return fail(429, 'INQUIRY_COOLDOWN_30MIN');
      default: return ok(inserted.id);
    }
  } catch {
    // Includes D1 constraint races / database failures. Never claim the write succeeded.
    return fail(503, 'INQUIRY_STORAGE_UNAVAILABLE');
  }
}
