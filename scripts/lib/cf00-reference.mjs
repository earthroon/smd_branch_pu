import { createHash } from 'node:crypto';

export const ORIGINAL_ARCHIVE_SHA = 'dafe2bf558842066ec5dd0aa1234005880a0ad303575ae08e964a263b80ccfe3';
export const PARENT_ARCHIVE_SHA = '737dcedb80b4f911ccbae81bc52d3378fb8bd031ad23120a50de8739f344cec8';
export const CSS_SHA = 'e695e2bb90ffeb2f3b8ec5ace7ed18c20cf73362ecbccd95ac3b3ef5363054d6';
export const MOCK_SHA = '36cb37e4d2a2356e3ebad357cdc9a2f3741e7806b3990b8773c72a43a98d169b';
export const EXPECTED_EXPORTS = [
  'SITE_NAME', 'KAKAO_URL', 'INSTAGRAM_URL', 'YOUTUBE_URL', 'CONTACT_PHONE',
  'leftNav', 'rightNav', 'teachItems', 'archiveFilters', 'archiveItems',
  'aboutPillars', 'instructorPoints', 'promotionInfo', 'priceCards', 'promotionBenefits'
];
export const ROUTES = [
  ['/', 'src/pages/home/page.tsx', 'app/pages/index.vue'],
  ['/about', 'src/pages/about/page.tsx', 'app/pages/about.vue'],
  ['/curriculum', 'src/pages/curriculum/page.tsx', 'app/pages/curriculum.vue'],
  ['/practice', 'src/pages/practice/page.tsx', 'app/pages/practice.vue'],
  ['/archive', 'src/pages/archive/page.tsx', 'app/pages/archive.vue'],
  ['/promotion', 'src/pages/promotion/page.tsx', 'app/pages/promotion.vue'],
  ['/contact', 'src/pages/contact/page.tsx', 'app/pages/contact.vue'],
  ['*', 'src/pages/NotFound.tsx', 'app/error.vue']
];
export const CF01_CHANGED = [
  'app/app.vue', 'app/layouts/default.vue',
  'app/components/feature/SiteHeader.vue', 'app/components/feature/SiteFooter.vue',
  'app/components/feature/CtaBand.vue', 'app/components/feature/Reveal.vue'
];
export const CF01_NEW = [
  'app/error.vue', 'scripts/cf00-freeze.mjs', 'scripts/cf00-verify.mjs',
  'scripts/cf01-layout-static.mjs', 'scripts/lib/cf00-archive.mjs',
  'scripts/lib/cf00-reference.mjs'
];
export const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
export const utf8 = (archive, name) => {
  const bytes = archive.files.get(name);
  if (!bytes) throw new Error(`CF00_SOURCE_IDENTITY_MISMATCH: missing ${name}`);
  return bytes.toString('utf8');
};

export function sourceRole(path) {
  if (path === 'src/mocks/site.ts') return 'SOURCE_CONTENT_SSOT';
  if (path === 'src/index.css' || path === 'tailwind.config.ts') return 'DESIGN_SSOT';
  if (path === 'index.html') return 'HTML_HEAD';
  if (path === 'src/router/config.tsx') return 'ROUTE_SSOT';
  if (path.startsWith('src/pages/')) return 'PAGE_SOURCE';
  if (path.startsWith('src/components/')) return 'COMPONENT_SOURCE';
  return 'PROJECT_SOURCE';
}

function tokeniseData(text) {
  const regex = /\s+|\b(?:export|const|true|false|null)\b|[A-Za-z_$][\w$]*|(?:'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*")|[{}\[\]:,;=]|-?\d+(?:\.\d+)?/gy;
  const tokens = [];
  let offset = 0;
  while (offset < text.length) {
    regex.lastIndex = offset;
    const match = regex.exec(text);
    if (!match || match.index !== offset) throw new Error(`CF00_CONTENT_SHAPE_DRIFT: unsupported token at ${offset}`);
    offset = regex.lastIndex;
    if (!/^\s+$/.test(match[0])) tokens.push(match[0]);
  }
  return tokens;
}

function unquote(raw) {
  if (raw.startsWith('"')) return JSON.parse(raw);
  const chars = raw.slice(1, -1);
  return chars.replace(/\\(u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2}|.)/g, (_match, code) => {
    if (code.startsWith('u')) return String.fromCodePoint(parseInt(code.slice(1), 16));
    if (code.startsWith('x')) return String.fromCodePoint(parseInt(code.slice(1), 16));
    const escapes = { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', v: '\v', 0: '\0', "'": "'", '"': '"', '\\': '\\' };
    if (!(code in escapes)) throw new Error(`CF00_CONTENT_SHAPE_DRIFT: unknown string escape ${code}`);
    return escapes[code];
  });
}

// Strict data-only parser: refuses executable expressions, calls, imports, spread and computed fields.
export function parseSourceSite(text) {
  const tokens = tokeniseData(text);
  let index = 0;
  const take = (expected) => {
    const token = tokens[index++];
    if (expected !== undefined && token !== expected) {
      throw new Error(`CF00_CONTENT_SHAPE_DRIFT: expected ${expected}, received ${token}`);
    }
    return token;
  };
  const peek = () => tokens[index];
  const parseValue = () => {
    const token = take();
    if (token === '[') {
      const values = [];
      while (peek() !== ']') {
        values.push(parseValue());
        if (peek() === ',') take(',');
        else if (peek() !== ']') throw new Error('CF00_CONTENT_SHAPE_DRIFT: expected array separator');
      }
      take(']');
      return values;
    }
    if (token === '{') {
      const fields = {};
      while (peek() !== '}') {
        const rawKey = take();
        const key = /^[\"']/.test(rawKey) ? unquote(rawKey) : rawKey;
        if (!/^[A-Za-z_$][\w$]*$/.test(key) || Object.hasOwn(fields, key)) {
          throw new Error('CF00_CONTENT_SHAPE_DRIFT: invalid/duplicate object property');
        }
        take(':');
        fields[key] = parseValue();
        if (peek() === ',') take(',');
        else if (peek() !== '}') throw new Error('CF00_CONTENT_SHAPE_DRIFT: expected object separator');
      }
      take('}');
      return fields;
    }
    if (token === 'true') return true;
    if (token === 'false') return false;
    if (token === 'null') return null;
    if (/^-?\d+(?:\.\d+)?$/.test(token)) return Number(token);
    if (/^['"]/.test(token)) return unquote(token);
    throw new Error(`CF00_CONTENT_SHAPE_DRIFT: executable or unsupported value: ${token}`);
  };
  const result = {};
  while (index < tokens.length) {
    take('export');
    take('const');
    const name = take();
    if (!EXPECTED_EXPORTS.includes(name) || Object.hasOwn(result, name)) {
      throw new Error(`CF00_CONTENT_SHAPE_DRIFT: unexpected/duplicate export ${name}`);
    }
    take('=');
    result[name] = parseValue();
    take(';');
  }
  if (JSON.stringify(Object.keys(result)) !== JSON.stringify(EXPECTED_EXPORTS)) {
    throw new Error('CF00_CONTENT_SHAPE_DRIFT: export order changed');
  }
  return result;
}

export function projectLegacyContent(mock) {
  return {
    SITE_NAME: mock.navigation.siteName,
    KAKAO_URL: mock.navigation.kakaoUrl,
    INSTAGRAM_URL: mock.navigation.instagramUrl,
    YOUTUBE_URL: mock.navigation.youtubeUrl,
    CONTACT_PHONE: mock.navigation.contactPhone,
    leftNav: mock.navigation.leftNav,
    rightNav: mock.navigation.rightNav,
    teachItems: mock.training.teachItems,
    archiveFilters: mock.archive.filters,
    archiveItems: mock.archive.items,
    aboutPillars: mock.about.pillars,
    instructorPoints: mock.about.instructorPoints,
    promotionInfo: mock.promotion.info,
    priceCards: mock.promotion.priceCards,
    promotionBenefits: mock.promotion.benefits
  };
}

export function compareValue(original, projected, path = '') {
  if (typeof original !== typeof projected || (original === null) !== (projected === null) || Array.isArray(original) !== Array.isArray(projected)) {
    return [{ path, source: original, candidate: projected, type: 'TYPE_DRIFT' }];
  }
  if (original && typeof original === 'object') {
    const keys = new Set([...Object.keys(original), ...Object.keys(projected)]);
    return [...keys].flatMap((key) => {
      const child = Array.isArray(original) ? `${path}[${key}]` : `${path}${path ? '.' : ''}${key}`;
      return compareValue(original[key], projected[key], child);
    });
  }
  return Object.is(original, projected) ? [] : [{ path, source: original, candidate: projected, type: 'VALUE_DRIFT' }];
}

export function buildPageAndSectionInventory(original) {
  return ROUTES.map(([path, source, candidate]) => {
    const file = utf8(original, source);
    const sections = [...file.matchAll(/<(section|PageHero|CtaBand|HeroSection|StatementSection|TeachSection|TeachGrid|PracticeBlock|ArchiveGallery|ContactForm|h[1-6])\b/g)]
      .map((m) => ({ tag: m[1], line: file.slice(0, m.index).split('\n').length }));
    return {
      path, source, target: candidate,
      originalSha256: sha256(original.files.get(source)),
      sectionsAndHeadingsInSourceOrder: sections,
      sourceTextLines: file.split('\n').flatMap((text, i) => /[\uac00-\ud7a3]/.test(text) ? [{ line: i + 1, text: text.trim() }] : [])
    };
  });
}

export function buildStyleAndAssetInventory(original, r1) {
  const css = utf8(original, 'src/index.css');
  const tailwind = utf8(original, 'tailwind.config.ts');
  const originalFiles = [...original.files];
  const assets = [];
  for (const [path, bytes] of originalFiles) {
    if (!/\.(?:tsx|ts|html|css)$/.test(path)) continue;
    const lines = bytes.toString('utf8').split('\n');
    for (let i = 0; i < lines.length; i += 1) {
      const matches = [...lines[i].matchAll(/https?:\/\/[^\s'"<>}]+/g)];
      for (const hit of matches) {
        if (/\.(?:png|jpe?g|webp|svg|gif)(?:[?#]|$)/i.test(hit[0])) {
          assets.push({ url: hit[0], sourcePath: path, line: i + 1, sourceContext: lines[i].trim(), bytesAvailable: false, imageSha256: null, nativeDimensions: null, cropIdentity: null });
        }
      }
    }
  }
  return {
    sourceCssSha256: sha256(original.files.get('src/index.css')),
    candidateCssSha256: sha256(r1.files.get('app/assets/css/main.css')),
    originalTailwindSha256: sha256(original.files.get('tailwind.config.ts')),
    candidateTailwindSha256: sha256(r1.files.get('tailwind.config.ts')),
    cssVariables: [...css.matchAll(/--([a-z][a-z0-9-]*)\s*:/g)].map(m => m[1]),
    fontCssDeclarations: css.split('\n').filter(line => /--font-(?:heading|body|label)|@import/.test(line)).map(line => line.trim()),
    sourceCssClasses: [...css.matchAll(/\.(container-x|eyebrow|link-arrow|btn-primary|btn-ghost|form-hp-field)\b/g)].map(m => m[1]),
    tailwindSourceConfig: tailwind,
    imageReferences: assets,
    imageBinaryCountInOriginal: [...original.files.keys()].filter(p => /\.(?:png|jpe?g|webp|svg|gif)$/i.test(p)).length,
    assetAcquisition: 'NOT_ATTEMPTED',
    pixelIdentity: 'UNKNOWN'
  };
}

export function buildHeadInventory(original) {
  const html = utf8(original, 'index.html');
  const head = html.match(/<head>([\s\S]*?)<\/head>/i)?.[1];
  if (!head) throw new Error('CF00_SOURCE_IDENTITY_MISMATCH: original HTML head missing');
  const parsedAttributes = (tag) => Object.fromEntries([...tag.matchAll(/([a-zA-Z][a-zA-Z0-9:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map(m => [m[1], m[2] ?? m[3]]));
  const tags = [...head.matchAll(/<(meta|link)\b[^>]*>/gi)].map(m => ({ tag: m[1].toLowerCase(), attributes: parsedAttributes(m[0]), raw: m[0] }));
  const title = head.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? null;
  return {
    sourceHtmlSha256: sha256(original.files.get('index.html')),
    sourceTitle: title,
    headTags: tags,
    missingFavicon: { href: '/vite.svg', existsInOriginalArchive: original.files.has('vite.svg') },
    deploymentCanonicalStatus: 'HISTORICAL_UNVERIFIED',
    lastModifiedStatus: 'HISTORICAL_FIXED_VALUE_UNVERIFIED',
    promotionToNuxtHead: 'CF10_DEFERRED'
  };
}
