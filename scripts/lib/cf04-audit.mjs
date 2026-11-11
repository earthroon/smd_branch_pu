import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readSourceArchive } from './cf00-archive.mjs';
import { parseSourceSite, compareValue, EXPECTED_EXPORTS } from './cf00-reference.mjs';
import { asLegacySiteDataV1, legacySiteToDocumentProjectionV1 } from '../../shared/legacy-site-adapter.ts';
import { validatePageCopyV1 } from '../../shared/page-copy-contracts.ts';

export const ORIGINAL_SHA = 'dafe2bf558842066ec5dd0aa1234005880a0ad303575ae08e964a263b80ccfe3';
export const PARENT_SHA = '5e06d5f0c8a0425c21e7092e15579bb371534977eac462179a4e8f8a6f8fc866';
export const SITE_SHA = '36cb37e4d2a2356e3ebad357cdc9a2f3741e7806b3990b8773c72a43a98d169b';
export const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
export const json = (p) => JSON.parse(readFileSync(p, 'utf8'));
export const root = resolve(fileURLToPath(new URL('../../', import.meta.url)));

export function readIdentity(originalZip, parentZip) {
  const source = readSourceArchive(originalZip);
  const parent = readSourceArchive(parentZip);
  if (hash(source.archive) !== ORIGINAL_SHA || hash(parent.archive) !== PARENT_SHA ||
    hash(source.files.get('src/mocks/site.ts') ?? '') !== SITE_SHA) {
    throw new Error('CF04_PARENT_IDENTITY_MISMATCH');
  }
  const original = parseSourceSite(source.files.get('src/mocks/site.ts').toString('utf8'));
  const parentFiles = new Map([...parent.files].map(([key, bytes]) => {
    const prefix = 'SMD_ACADEMY_NUXT_CLOUDFLARE/';
    if (!key.startsWith(prefix)) throw new Error('CF04_PARENT_IDENTITY_MISMATCH: root');
    return [key.slice(prefix.length), bytes];
  }));
  return { source, parentFiles, original };
}

export function deepEqual(a, b) { return compareValue(a, b).length === 0; }

export function auditLegacy(identity, candidateRoot = root) {
  const fixture = json(join(candidateRoot, 'docs/migration/cf04/legacy-source-fixture.json'));
  const baseline = json(join(candidateRoot, 'docs/migration/cf00/content-baseline.json'));
  const current = json(join(candidateRoot, 'shared/seed-content.json'));
  const parentSeed = JSON.parse(identity.parentFiles.get('shared/seed-content.json').toString('utf8'));
  const review = json(join(candidateRoot, 'docs/migration/cf04/source-claim-review.json'));
  if (fixture.sourceSha256 !== SITE_SHA || fixture.businessClaimStatus !== 'BUSINESS_CLAIM_UNVERIFIED' ||
      !deepEqual(identity.original, fixture.original) || !deepEqual(identity.original, baseline.original) ||
      JSON.stringify(Object.keys(identity.original)) !== JSON.stringify(EXPECTED_EXPORTS)) {
    throw new Error('CF04_LEGACY_SCHEMA_DRIFT');
  }
  const projected = asLegacySiteDataV1(current);
  if (!deepEqual(identity.original, projected)) throw new Error('CF04_SOURCE_VALUE_DRIFT');
  const back = legacySiteToDocumentProjectionV1(projected);
  for (const [docKey, section] of Object.entries(back)) {
    for (const [field, value] of Object.entries(section)) {
      if (!deepEqual(current[docKey][field], value)) throw new Error(`CF04_LEGACY_PROJECTION_MISMATCH: ${docKey}.${field}`);
    }
  }
  if (parentSeed.promotion.benefits[0].desc !== review.previousDevSeedValue ||
      identity.original.promotionBenefits[0].desc !== review.originalValue ||
      current.promotion.benefits[0].desc !== review.originalValue ||
      review.reviewStatus !== 'BUSINESS_CLAIM_UNVERIFIED' || review.productionPublished !== false ||
      review.productionDraftUpdated !== false) throw new Error('CF04_BUSINESS_CLAIM_REVIEW_REQUIRED');
  const expectedSeed = structuredClone(parentSeed);
  expectedSeed.promotion.benefits[0].desc = review.originalValue;
  if (!deepEqual(expectedSeed, current)) throw new Error('CF04_UNAUTHORIZED_DEV_SEED_MUTATION');
  return { exportCount: Object.keys(projected).length, sourceDriftCount: 1, businessReview: review.reviewStatus };
}

export function auditPageCopy(identity, candidateRoot = root) {
  const values = validatePageCopyV1(json(join(candidateRoot, 'docs/migration/cf04/page-copy.source.json')));
  const sourceMap = json(join(candidateRoot, 'docs/migration/cf04/source-field-map.json'));
  if (sourceMap.originArchiveSha256 !== ORIGINAL_SHA) throw new Error('CF04_PAGE_COPY_SOURCE_IDENTITY_MISMATCH');
  const flattened = (input, path = '') => {
    if (Array.isArray(input)) return input.flatMap((v, i) => flattened(v, `${path}[${i}]`));
    if (input && typeof input === 'object') return Object.entries(input).flatMap(([key, v]) => flattened(v, path ? `${path}.${key}` : key));
    return [{ path, value: input }];
  };
  const leaves = flattened(values);
  const map = new Map(sourceMap.fields.map((field) => [field.path, field]));
  if (leaves.length !== sourceMap.fieldCount || map.size !== leaves.length) throw new Error('CF04_PAGE_COPY_INCOMPLETE');
  for (const { path, value } of leaves) {
    const item = map.get(path);
    if (!item) throw new Error(`CF04_PAGE_COPY_FIELD_WITHOUT_SOURCE: ${path}`);
    if (hash(value) !== item.valueSha256) throw new Error(`CF04_PAGE_COPY_SOURCE_DRIFT: ${path}`);
    const bytes = identity.source.files.get(item.sourcePath);
    if (!bytes || hash(bytes) !== item.sourceSha256) throw new Error(`CF04_PAGE_COPY_SOURCE_MISSING: ${path}`);
    const raw = bytes.toString('utf8');
    const pattern = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replaceAll(' ', '\\s+');
    const match = new RegExp(pattern).exec(raw) ?? (value.includes('&')
      ? new RegExp(value.replaceAll('&', '&amp;').replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replaceAll(' ', '\\s+')).exec(raw)
      : null);
    if (!match || raw.slice(0, match.index).split('\n').length !== item.sourceLine) {
      throw new Error(`CF04_PAGE_COPY_SOURCE_WITNESS_INVALID: ${path}`);
    }
  }
  const options = json(join(candidateRoot, 'shared/seed-content.json')).promotion.courseOptions;
  if (JSON.stringify(values.form.courseLabels.map((v) => v.value)) !== JSON.stringify(options) ||
      values.form.courseLabels[0].value === values.form.courseLabels[0].label) {
    throw new Error('CF04_FORM_VALUE_DRIFT');
  }
  return { leafCount: leaves.length, pageCount: 7, sourceFileCount: new Set(sourceMap.fields.map((f) => f.sourcePath)).size };
}

export function auditPreservation(identity, candidateRoot = root) {
  const candidate = resolve(candidateRoot);
  const files = [];
  function walk(dir) {
    for (const child of readdirSync(dir, { withFileTypes: true })) {
      const target = join(dir, child.name);
      if (child.isSymbolicLink()) throw new Error('CF04_PARENT_MUTATION: symbolic link');
      if (child.isDirectory()) walk(target);
      else if (child.isFile()) files.push(relative(candidate, target).replaceAll('\\', '/'));
    }
  }
  walk(candidate);
  const modified = [];
  for (const [name, before] of identity.parentFiles) {
    const target = join(candidate, name);
    if (!existsSync(target)) throw new Error(`CF04_PARENT_MUTATION: removed ${name}`);
    const after = readFileSync(target);
    if (!after.equals(before)) modified.push(name);
  }
  if (JSON.stringify(modified) !== JSON.stringify(['shared/seed-content.json'])) {
    throw new Error(`CF04_PARENT_MUTATION: unexpected modifications ${modified}`);
  }
  const allowed = (name) => name.startsWith('docs/migration/cf04/') ||
    name === 'shared/legacy-site-adapter.ts' || name === 'shared/page-copy-contracts.ts' ||
    name === 'workers/smd-core/migrations/0003_cf04_import_staging.sql' ||
    name === 'workers/smd-core/src/import-staging.ts' ||
    name === 'scripts/lib/cf04-audit.mjs' || name.startsWith('scripts/cf04-') ||
    /^scripts\/tests\/cf04-[^/]+\.test\.mjs$/.test(name);
  const additions = files.filter((name) => !identity.parentFiles.has(name));
  const forbidden = additions.filter((name) => !allowed(name));
  if (forbidden.length) throw new Error(`CF04_SCOPE_VIOLATION: added ${forbidden.join(',')}`);
  for (const immutable of ['workers/smd-core/migrations/0001_base.sql',
     'workers/smd-core/migrations/0002_seed.sql','shared/contracts.ts',
     'server/api/content.get.ts','workers/smd-core/src/content.ts','workers/smd-core/src/index.ts']) {
    if (!readFileSync(join(candidate, immutable)).equals(identity.parentFiles.get(immutable))) {
      throw new Error(`CF04_PARENT_MUTATION: ${immutable}`);
    }
  }
  return { parentFileCount: identity.parentFiles.size, changedParent: modified, additions: additions.length,
    untouchedCount: identity.parentFiles.size - modified.length };
}

