import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { readSourceArchive } from './cf00-archive.mjs';
import {
  ORIGINAL_ARCHIVE_SHA, PARENT_ARCHIVE_SHA, CSS_SHA, MOCK_SHA, sha256, utf8,
  EXPECTED_EXPORTS, ROUTES, sourceRole, parseSourceSite, projectLegacyContent,
  compareValue, buildPageAndSectionInventory, buildStyleAndAssetInventory,
  buildHeadInventory
} from './cf00-reference.mjs';

const PARENT_PREFIX = 'SMD_ACADEMY_NUXT_CLOUDFLARE/';
const jsonFormat = (value) => `${JSON.stringify(value, null, 2)}\n`;

export function sourceArgs(argv) {
  const options = {};
  for (let i = 0; i < argv.length; i += 2) {
    if (!argv[i]?.startsWith('--') || !argv[i + 1]) {
      throw new Error('CF00_USAGE: --original <original.zip> --candidate <R1.zip>');
    }
    const key = argv[i].slice(2);
    if (!['original', 'candidate'].includes(key) || options[key]) {
      throw new Error(`CF00_USAGE: unexpected or repeated argument ${argv[i]}`);
    }
    options[key] = argv[i + 1];
  }
  for (const key of ['original', 'candidate']) {
    if (!options[key]) throw new Error(`CF00_USAGE: missing --${key}`);
  }
  return options;
}

export function loadSources({ original, candidate }) {
  const source = readSourceArchive(original);
  const parent = readSourceArchive(candidate);
  if (sha256(source.archive) !== ORIGINAL_ARCHIVE_SHA || sha256(parent.archive) !== PARENT_ARCHIVE_SHA) {
    throw new Error('CF00_SOURCE_IDENTITY_MISMATCH: input archive hash is not the frozen source authority');
  }
  if ([...source.files.keys()].some(name => name.startsWith('SMD_ACADEMY_NUXT_CLOUDFLARE/')) ||
      [...parent.files.keys()].some(name => !name.startsWith(PARENT_PREFIX))) {
    throw new Error('CF00_SOURCE_IDENTITY_MISMATCH: input ZIP namespace mismatch');
  }
  const parentFiles = new Map([...parent.files].map(([name, bytes]) => [name.slice(PARENT_PREFIX.length), bytes]));
  if (sha256(source.files.get('src/mocks/site.ts') || '') !== MOCK_SHA ||
      sha256(source.files.get('src/index.css') || '') !== CSS_SHA ||
      sha256(parentFiles.get('app/assets/css/main.css') || '') !== CSS_SHA) {
    throw new Error('CF00_SOURCE_IDENTITY_MISMATCH: core CSS/mock identity changed');
  }
  return { source, parent, parentFiles };
}

function parentR1FileManifest(parentFiles) {
  return Object.fromEntries([...parentFiles]
    .sort(([a], [b]) => Buffer.compare(Buffer.from(a), Buffer.from(b)))
    .map(([path, bytes]) => [path, sha256(bytes)]));
}

function additionalPageLiteralInventory(original) {
  return [...original.files.entries()]
    .filter(([path]) => /^(?:src\/pages\/|src\/components\/).*\.tsx$/.test(path))
    .sort(([a], [b]) => Buffer.compare(Buffer.from(a), Buffer.from(b)))
    .map(([path, bytes]) => ({
      path,
      sha256: sha256(bytes),
      sourceTextLines: bytes.toString('utf8').split('\n')
        .flatMap((text, i) => /[\uac00-\ud7a3]/.test(text) ? [{ line: i + 1, text: text.trim() }] : [])
    }));
}

export function generateManifests(loaded) {
  const { source, parentFiles } = loaded;
  const site = parseSourceSite(utf8(source, 'src/mocks/site.ts'));
  const candidateSeed = JSON.parse(parentFiles.get('shared/seed-content.json').toString('utf8'));
  const projected = projectLegacyContent(candidateSeed);
  const drifts = compareValue(site, projected);
  if (drifts.length !== 1 || drifts[0].path !== 'promotionBenefits[0].desc' || drifts[0].type !== 'VALUE_DRIFT') {
    throw new Error(`CF00_CONTENT_VALUE_DRIFT: mismatch register differs from audited original: ${JSON.stringify(drifts)}`);
  }
  const sourceManifest = [...source.files.entries()]
    .sort(([a], [b]) => Buffer.compare(Buffer.from(a), Buffer.from(b)))
    .map(([relativePath, bytes]) => ({
      relativePath, sizeBytes: bytes.length, sha256: sha256(bytes),
      role: sourceRole(relativePath), sourceArchiveSha256: ORIGINAL_ARCHIVE_SHA
    }));
  const contentBaseline = {
    contract: 'SMD-NUXT-R2-CF00-CONTENT-V1',
    source: 'src/mocks/site.ts',
    sourceSha256: MOCK_SHA,
    exports: EXPECTED_EXPORTS,
    arrayCounts: Object.fromEntries(['leftNav','rightNav','teachItems','archiveFilters','archiveItems','aboutPillars','instructorPoints','promotionInfo','priceCards','promotionBenefits']
      .map(name => [name, site[name].length])),
    original: site,
    additionalPageLiteralInventory: additionalPageLiteralInventory(source)
  };
  const routeSection = {
    contract: 'SMD-NUXT-R2-CF00-ROUTES-V1',
    sourceRouteConfigSha256: sha256(source.files.get('src/router/config.tsx')),
    routeCount: ROUTES.length,
    sourceRoutes: buildPageAndSectionInventory(source),
    originalBasePathAuthority: 'VITE_BASE_PATH_OR_DEFAULT_SLASH',
    effectiveReferenceBasePath: 'NOT_PHYSICALLY_RESOLVED',
    browserRouteParity: 'UNKNOWN'
  };
  const styleAssets = {
    contract: 'SMD-NUXT-R2-CF00-STYLE-ASSETS-V1',
    ...buildStyleAndAssetInventory(source, { files: parentFiles })
  };
  const head = { contract: 'SMD-NUXT-R2-CF00-HEAD-V1', ...buildHeadInventory(source) };
  const receipt = {
    contract: 'SMD-NUXT-R2-CF00-CF01',
    sourceArchiveSha256: ORIGINAL_ARCHIVE_SHA,
    r1ArchiveSha256: PARENT_ARCHIVE_SHA,
    parentFileHashes: parentR1FileManifest(parentFiles),
    cf00: {
      manifestVerified: null,
      originalFileCount: sourceManifest.length,
      contentExportCount: EXPECTED_EXPORTS.length,
      routeCount: ROUTES.length,
      sourceCssMatchesCandidate: true,
      documentedR1ValueDrifts: drifts,
      browserReferenceCaptured: null
    },
    cf01: {
      changedFiles: [],
      semanticDeltas: ['public FAQ overlay deferred until CF08'],
      noTouchViolations: [],
      layoutStatic: null,
      nuxtTypecheck: null,
      nuxtBuild: null,
      ssrRuntime: null,
      browserVisual: null,
      hydration: null,
      notFoundHttpStatus: null,
      errorVsCmsFailureDistinguished: null
    },
    evidence: {
      source: 'ARCHIVE_SOURCE_BYTES_CONFIRMED',
      static: 'UNKNOWN_UNTIL_VERIFY',
      compile: 'UNKNOWN',
      runtime: 'UNKNOWN',
      physical: 'UNKNOWN',
      performance: 'NOT_MEASURED',
      promoted: false
    }
  };
  return {
    'source-manifest.json': { contract: 'SMD-NUXT-R2-CF00-SOURCE-V1', originalArchiveSha256: ORIGINAL_ARCHIVE_SHA, r1ArchiveSha256: PARENT_ARCHIVE_SHA, files: sourceManifest },
    'content-baseline.json': contentBaseline,
    'route-section-manifest.json': routeSection,
    'style-asset-manifest.json': styleAssets,
    'head-manifest.json': head,
    'receipt.json': receipt
  };
}

export function freezeArtifacts(dir, manifests) {
  mkdirSync(dir, { recursive: true });
  for (const [name, object] of Object.entries(manifests)) {
    const file = join(dir, name);
    const text = jsonFormat(object);
    if (existsSync(file) && readFileSync(file, 'utf8') !== text) {
      throw new Error(`CF00_BASELINE_REWRITE_PROHIBITED: ${name}; frozen reference must not be silently overwritten`);
    }
    if (!existsSync(file)) writeFileSync(file, text, { flag: 'wx' });
  }
}

export function verifyArtifacts(dir, manifests) {
  for (const [name, object] of Object.entries(manifests)) {
    const file = join(dir, name);
    if (!existsSync(file) || readFileSync(file, 'utf8') !== jsonFormat(object)) {
      throw new Error(`CF00_SOURCE_IDENTITY_MISMATCH: frozen ${name} not reproducible`);
    }
  }
}
