/** CF1 Node-only source verifier; no Nuxt runtime, archive migration or Figma live API. */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { reviewsVisualSourceLock, reviewsTokenSource, reviewsVisualQualification } from '../../app/data/reviews-r1-manifest.ts';
import { reviewsFigmaNodes, reviewsFigmaSemanticSlots, reviewsFigmaFilterBindings } from '../../app/data/reviews-r1-figma.ts';
import { REVIEW_FILTER_V1 } from '../../app/utils/reviews-contract.ts';

const root = fileURLToPath(new URL('../../', import.meta.url));
const fixture = path.join(root, 'scripts/fixtures/reviews-r1');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const fail = code => { throw new Error(code); };
const requireEqual = (actual, expected, code) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) fail(code);
};
const read = f => readFileSync(path.join(root, f), 'utf8');

/** Full source/metadata digest gate. Cannot be disabled via invocation arguments. */
/** Optional full supplied-archive bytes gate. Only claims PASS if all three paths are provided. */
export function assertReviewsOriginalArchivesV1({ psdPath, publicZipPath, reviewZipPath }) {
  if (![psdPath, publicZipPath, reviewZipPath].every(v => typeof v === 'string' && v.length > 0)) {
    fail('SMD_REVIEWS_R1_SOURCE_WITNESS_MISMATCH');
  }
  const psd = readFileSync(psdPath);
  if (psd.subarray(0, 4).toString('ascii') !== '8BPS' ||
      psd.readUInt16BE(4) !== 1 || psd.readUInt32BE(14) !== 3033 ||
      psd.readUInt32BE(18) !== 1920 || psd.readUInt16BE(22) !== 8 ||
      psd.readUInt16BE(24) !== 3 ||
      sha(psd) !== reviewsVisualSourceLock.psdSha256 ||
      sha(readFileSync(publicZipPath)) !== reviewsVisualSourceLock.publicZipSha256 ||
      sha(readFileSync(reviewZipPath)) !== reviewsVisualSourceLock.reviewZipSha256) {
    fail('SMD_REVIEWS_R1_SOURCE_WITNESS_MISMATCH');
  }
  return { originalArchiveSha256: 'PASS', psdHeader: 'PASS' };
}

export function assertReviewsVisualSourceV1() {
  const jsonl = readFileSync(path.join(fixture, 'skin.jsonl'));
  if (sha(jsonl) !== reviewsVisualSourceLock.figmaJsonlSha256) fail('SMD_REVIEWS_R1_SOURCE_WITNESS_MISMATCH');
  const records = jsonl.toString('utf8').trim().split('\n').map(line => JSON.parse(line));
  const reference = JSON.parse(readFileSync(path.join(fixture, 'figma-reference.json'), 'utf8'));
  const exportSession = JSON.parse(readFileSync(path.join(fixture, 'export-session.json'), 'utf8'));
  const packageR3 = JSON.parse(readFileSync(path.join(fixture, 'visual-package-r3.json'), 'utf8'));
  if (reference.snapshotDigest !== reviewsVisualSourceLock.figmaSnapshotDigest ||
      reference.structuralNodeCount !== reviewsVisualSourceLock.sourceNodeCount ||
      packageR3.sourceArchiveSha256 !== reviewsVisualSourceLock.figmaSourceLedgerSha256 ||
      packageR3.sourceSnapshotDigest !== reviewsVisualSourceLock.figmaSnapshotDigest ||
      packageR3.sourceWitnessDigest !== reviewsVisualSourceLock.figmaSourceWitnessDigest ||
      packageR3.visualRenderPlanDigest !== reviewsVisualSourceLock.visualRenderPlanDigest ||
      packageR3.productCommitAllowed !== false || packageR3.pixelParity !== 'NOT_RUN' ||
      packageR3.sourceNodeCount !== reviewsVisualSourceLock.sourceNodeCount ||
      exportSession.nodeCount !== reviewsVisualSourceLock.sourceNodeCount ||
      exportSession.physicalParity !== 'NOT_RUN') {
    fail('SMD_REVIEWS_R1_SOURCE_WITNESS_MISMATCH');
  }
  const result = assertReviewsLedgerDetails(records);
  assertReviewsTokenSourceV1(read('app/assets/css/main.css'),
    read('app/assets/css/home-r2-header.css'), read('tailwind.config.ts'));
  return Object.freeze({ contract: 'SMD_REVIEWS_R1_CF1_SOURCE',
    ...result, tokenConflictCount: reviewsVisualQualification.knownConflicts.length,
    pixelParity: 'NOT_RUN', productCommitAllowed: false });
}

/** Inspect a decoded ledger. Independent test fixtures exercise precise negative errors. */
export function assertReviewsLedgerDetails(records) {
  const meta = records.find(record => record?.kind === 'meta');
  if (!meta || meta.schema !== 9 || meta.rootFrameId !== '4:200' ||
      meta.treeContract !== 'FNS-SCHEMA9-TREE-SSOT-R2A-FRAME-CLIP-R1') {
    fail('SMD_REVIEWS_R1_SOURCE_WITNESS_MISMATCH');
  }
  requireEqual(meta.referenceViewport, [1920,3033], 'SMD_REVIEWS_R1_COORDINATE_DRIFT');
  const nodes = records.filter(record => record?.kind === 'node');
  if (nodes.length !== reviewsVisualSourceLock.sourceNodeCount) fail('SMD_REVIEWS_R1_NODE_MISSING');
  const index = new Map();
  const siblings = new Set();
  for (const node of nodes) {
    if (index.has(node.nodeKey)) fail('SMD_REVIEWS_R1_NODE_DUPLICATE');
    index.set(node.nodeKey, node);
    const location = `${node.parent ?? 'ROOT'}|${node.order}`;
    if (siblings.has(location)) fail('SMD_REVIEWS_R1_NODE_DUPLICATE');
    siblings.add(location);
  }
  const rootNode = index.get(reviewsVisualSourceLock.rootNode);
  if (!rootNode || rootNode.parent !== null) fail('SMD_REVIEWS_R1_NODE_MISSING');
  requireEqual(rootNode.rectLocal, [0,0,1920,3033], 'SMD_REVIEWS_R1_COORDINATE_DRIFT');
  for (const node of nodes) {
    if (node.parent !== null && !index.has(node.parent)) fail('SMD_REVIEWS_R1_NODE_MISSING');
    if (!Array.isArray(node.rectLocal) || node.rectLocal.length !== 4 ||
        !node.rectLocal.every(Number.isFinite) ||
        !Array.isArray(node.transformLocal) || node.transformLocal.length !== 6 ||
        !node.transformLocal.every(Number.isFinite)) fail('SMD_REVIEWS_R1_COORDINATE_DRIFT');
  }
  const nativeText = new Map(records.filter(record => record?.kind === 'native-text')
    .map(record => [record.target, record]));
  const paintSources = new Map(records.filter(record => record?.kind === 'node-paint-source-v9-r2a')
    .map(record => [record.target, record]));
  const worldCache = new Map();
  const worldFor = (key, trail = new Set()) => {
    if (worldCache.has(key)) return worldCache.get(key);
    if (trail.has(key)) fail('SMD_REVIEWS_R1_COORDINATE_DRIFT');
    trail.add(key);
    const node = index.get(key);
    if (!node) fail('SMD_REVIEWS_R1_NODE_MISSING');
    const [x, y] = node.rectLocal;
    const [,,,,tx,ty] = node.transformLocal;
    const parentWorld = node.parent === null ? [0,0] : worldFor(node.parent, trail);
    const world = [parentWorld[0] + x + tx, parentWorld[1] + y + ty];
    worldCache.set(key, world);
    trail.delete(key);
    return world;
  };
  for (const [key, expected] of Object.entries(reviewsFigmaNodes)) {
    const found = index.get(key);
    if (!found) fail('SMD_REVIEWS_R1_NODE_MISSING');
    for (const property of ['figmaNodeId','nodeKey','nodeKind','parent','order','rectLocal','transformLocal','sourcePaint']) {
      const code = property === 'rectLocal' || property === 'transformLocal' ?
        'SMD_REVIEWS_R1_COORDINATE_DRIFT' : 'SMD_REVIEWS_R1_NODE_MISSING';
      requireEqual(found[property], expected[property], code);
    }
    requireEqual(worldFor(key), expected.worldTopLeft, 'SMD_REVIEWS_R1_COORDINATE_DRIFT');
    if ('text' in expected) {
      const actualText = nativeText.get(key);
      if (!actualText) fail('SMD_REVIEWS_R1_TEXT_SOURCE_DRIFT');
      for (const [a,b] of [['characters','characters'],['textDigest','textDigest']]) {
        requireEqual(actualText[a], expected.text[b], 'SMD_REVIEWS_R1_TEXT_SOURCE_DRIFT');
      }
      for (const field of ['fontName','fontSize','lineHeight','letterSpacing']) {
        requireEqual(actualText.nodeProperties[field], expected.text[field], 'SMD_REVIEWS_R1_TEXT_SOURCE_DRIFT');
      }
    }
    if ('paintQualification' in expected) {
      const actualPaint = paintSources.get(key);
      if (!actualPaint || actualPaint.status !== expected.paintQualification.status ||
          (actualPaint.reasonCode ?? null) !== expected.paintQualification.reasonCode) {
        fail('SMD_REVIEWS_R1_SOURCE_WITNESS_MISMATCH');
      }
    }
  }
  for (const keys of Object.values(reviewsFigmaSemanticSlots)) {
    for (const key of keys) if (!index.has(key)) fail('SMD_REVIEWS_R1_NODE_MISSING');
  }
  for (const [filter, binding] of Object.entries(reviewsFigmaFilterBindings)) {
    if (binding.label !== REVIEW_FILTER_V1[filter].label ||
        nativeText.get(binding.textNode)?.characters !== binding.label ||
        !index.has(binding.backgroundNode)) fail('SMD_REVIEWS_R1_TEXT_SOURCE_DRIFT');
  }
  const expectSolid = (target, rgb) => {
    const fill = paintSources.get(target)?.fills?.find(p => p.paintType === 'SOLID');
    if (!fill || !Array.isArray(fill.rgba) || !rgb.every((value, i) =>
      Math.abs(fill.rgba[i] * 255 - value) < 0.0001)) {
      fail('SMD_REVIEWS_R1_TOKEN_SOURCE_DRIFT');
    }
  };
  expectSolid('node-4:327', [23, 44, 87]);
  expectSolid('node-4:342', [217, 94, 34]);
  for (const key of ['node-4:325', 'node-4:323', 'node-4:321',
    'node-4:312', 'node-4:274', 'node-4:236']) {
    const paint = paintSources.get(key);
    if (paint?.status !== 'blocked' || paint.reasonCode !== 'FNS_NODE_PAINT_EXECUTION_UNQUALIFIED') {
      fail('SMD_REVIEWS_R1_SOURCE_WITNESS_MISMATCH');
    }
  }
  return { nodeCount: nodes.length, bindingCount: Object.keys(reviewsFigmaNodes).length,
    blockedPaintCasesPreserved: true, nodeIdentityStatus: 'PASS' };
}

export function assertReviewsTokenSourceV1(mainCss, headerCss, tailwind) {
  for (const name of ['brandNavy', 'actionOrange', 'panelSurface']) {
    const token = reviewsTokenSource[name];
    if (!mainCss.includes(`${token.cssVariable}: ${token.value}`)) {
      fail('SMD_REVIEWS_R1_TOKEN_SOURCE_DRIFT');
    }
  }
  if (!mainCss.includes("--font-ui: 'Pretendard Variable'")) fail('SMD_REVIEWS_R1_TOKEN_SOURCE_DRIFT');
  if (!headerCss.includes('--smd-header-height: 80px') ||
      !headerCss.includes('--smd-desktop-header-height: 93.75px') ||
      !headerCss.includes('--smd-header-height: 76px')) fail('SMD_REVIEWS_R1_TOKEN_SOURCE_DRIFT');
  if (!/maxWidth\s*:\s*\{[\s\S]*?content\s*:\s*["']1280px["']/.test(tailwind)) {
    fail('SMD_REVIEWS_R1_TOKEN_SOURCE_DRIFT');
  }
  return true;
}

const invokedAsScript = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedAsScript) {
  const result = assertReviewsVisualSourceV1();
  const flags = process.argv.slice(2);
  if (flags.length) {
    const args = new Map();
    for (let i = 0; i < flags.length; i += 2) {
      if (!['--psd', '--public-zip', '--review-zip'].includes(flags[i]) ||
          !flags[i + 1] || args.has(flags[i])) {
        fail('SMD_REVIEWS_R1_SOURCE_WITNESS_MISMATCH');
      }
      args.set(flags[i], flags[i + 1]);
    }
    const archive = assertReviewsOriginalArchivesV1({ psdPath: args.get('--psd'),
      publicZipPath: args.get('--public-zip'), reviewZipPath: args.get('--review-zip') });
    process.stdout.write(`${JSON.stringify({ ...result, ...archive })}\n`);
  } else {
    process.stdout.write(`${JSON.stringify({ ...result, originalArchiveSha256: 'NOT_RUN' })}\n`);
  }
}
