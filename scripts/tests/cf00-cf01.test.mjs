import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  EXPECTED_EXPORTS, parseSourceSite, compareValue, projectLegacyContent,
  ORIGINAL_ARCHIVE_SHA, PARENT_ARCHIVE_SHA
} from '../lib/cf00-reference.mjs';

const reference = JSON.parse(readFileSync(fileURLToPath(new URL('../../docs/migration/cf00/content-baseline.json', import.meta.url)), 'utf8'));
const originals = reference.original;
const serialize = (value) => JSON.stringify(value);
const sourceText = Object.entries(originals).map(([name, value]) => `export const ${name} = ${serialize(value)};`).join('\n');

test('CF00 frozen export list: exactly 15 in order', () => {
  assert.equal(EXPECTED_EXPORTS.length, 15);
  assert.deepEqual(Object.keys(originals), EXPECTED_EXPORTS);
  assert.deepEqual(parseSourceSite(sourceText), originals);
});

test('CF00 data parser denies executable initializers', () => {
  const malicious = sourceText.replace('export const SITE_NAME = "SMD 아카데미";', 'export const SITE_NAME = process.exit(0);');
  assert.throws(() => parseSourceSite(malicious), /CF00_CONTENT_SHAPE_DRIFT/);
});

test('CF00 parser denies unrecognized exports and duplicate keys', () => {
  assert.throws(() => parseSourceSite(`${sourceText}\nexport const MYSTERY = 1;`), /CF00_CONTENT_SHAPE_DRIFT/);
  assert.throws(() => parseSourceSite(sourceText.replace('"label":"아카데미 소개"', '"label":"아카데미 소개","label":"중복"')), /CF00_CONTENT_SHAPE_DRIFT/);
});

test('CF00 mismatch detector distinguishes value, type and null-shape drift', () => {
  assert.deepEqual(compareValue({ a: 1 }, { a: 2 }).map(v => v.type), ['VALUE_DRIFT']);
  assert.deepEqual(compareValue({ a: 1 }, { a: '1' }).map(v => v.type), ['TYPE_DRIFT']);
  assert.deepEqual(compareValue({ a: {} }, { a: null }).map(v => v.type), ['TYPE_DRIFT']);
});

test('CF00 frozen references retain 8 routes and isolated SEO record', () => {
  const routes = JSON.parse(readFileSync(fileURLToPath(new URL('../../docs/migration/cf00/route-section-manifest.json', import.meta.url))));
  const head = JSON.parse(readFileSync(fileURLToPath(new URL('../../docs/migration/cf00/head-manifest.json', import.meta.url))));
  assert.equal(routes.routeCount, 8);
  assert.equal(routes.sourceRoutes[7].source, 'src/pages/NotFound.tsx');
  assert.equal(head.missingFavicon.existsInOriginalArchive, false);
  assert.equal(head.deploymentCanonicalStatus, 'HISTORICAL_UNVERIFIED');
});

test('CF00 source and R1 input identities remain pinned', () => {
  const receipt = JSON.parse(readFileSync(fileURLToPath(new URL('../../docs/migration/cf00/receipt.json', import.meta.url))));
  assert.equal(receipt.sourceArchiveSha256, ORIGINAL_ARCHIVE_SHA);
  assert.equal(receipt.r1ArchiveSha256, PARENT_ARCHIVE_SHA);
  assert.equal(receipt.evidence.promoted, false);
  assert.equal(receipt.cf00.browserReferenceCaptured, null);
});

test('CF00 explicitly keeps original vs R1 content delta unmodified', () => {
  const receipt = JSON.parse(readFileSync(fileURLToPath(new URL('../../docs/migration/cf00/receipt.json', import.meta.url))));
  assert.deepEqual(receipt.cf00.documentedR1ValueDrifts.map(e => e.path), ['promotionBenefits[0].desc']);
  assert.equal(reference.original.promotionBenefits.length, 4);
});
