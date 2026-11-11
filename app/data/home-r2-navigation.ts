/** CF4 Public view contract. CMS NavigationDocumentV1 and Publication V5 remain immutable. */
import { homeFigmaText } from './home-r2-copy.ts';
import { assertHomeHeaderBrandR1 } from './home-r2-brand-display.ts';
import { homeR2Source } from './home-r2-manifest.ts';

export type HeaderItemV2 = Readonly<{
  id: 'about' | 'curriculum' | 'archive' | 'reviews' | 'faq';
  kind: 'route';
  label: string;
  sourceNodeKey: string;
  to: '/about' | '/curriculum' | '/archive' | '/reviews' | '/faq';
  targetStatus: 'existing' | 'scaffold';
}>;
export type HomeHeaderNavigationV2 = Readonly<{
  contract: 'SMD_HOME_HEADER_NAV_V2';
  sourceSnapshotDigest: string;
  items: readonly HeaderItemV2[];
  cta: Readonly<{
    id: 'consultation';
    label: '상담신청';
    sourceNodeKey: 'node-1:19';
    action: 'published-kakao-url';
  }>;
}>;

export const homeHeaderNavigationV2 = {
  contract: 'SMD_HOME_HEADER_NAV_V2',
  sourceSnapshotDigest: homeR2Source.sourceSnapshotDigest,
  items: [
    { id: 'about', kind: 'route', label: homeFigmaText['node-1:17'].characters, sourceNodeKey: 'node-1:17', to: '/about', targetStatus: 'existing' },
    { id: 'curriculum', kind: 'route', label: homeFigmaText['node-1:15'].characters, sourceNodeKey: 'node-1:15', to: '/curriculum', targetStatus: 'existing' },
    { id: 'archive', kind: 'route', label: homeFigmaText['node-1:14'].characters, sourceNodeKey: 'node-1:14', to: '/archive', targetStatus: 'existing' },
    { id: 'reviews', kind: 'route', label: homeFigmaText['node-1:13'].characters, sourceNodeKey: 'node-1:13', to: '/reviews', targetStatus: 'scaffold' },
    { id: 'faq', kind: 'route', label: homeFigmaText['node-1:12'].characters, sourceNodeKey: 'node-1:12', to: '/faq', targetStatus: 'scaffold' },
  ],
  cta: {
    id: 'consultation',
    label: homeFigmaText['node-1:19'].characters,
    sourceNodeKey: 'node-1:19',
    action: 'published-kakao-url',
  },
} as const satisfies HomeHeaderNavigationV2;

const expected = [
  ['about', 'node-1:17', '아카데미소개', '/about', 'existing'],
  ['curriculum', 'node-1:15', '교육과정', '/curriculum', 'existing'],
  ['archive', 'node-1:14', '수강갤러리', '/archive', 'existing'],
  ['reviews', 'node-1:13', '수강후기', '/reviews', 'scaffold'],
  ['faq', 'node-1:12', 'Q&A', '/faq', 'scaffold'],
] as const;

export function assertHomeHeaderNavigationV2(): void {
  assertHomeHeaderBrandR1();
  const nav = homeHeaderNavigationV2;
  const fail = (): never => { throw new Error('SMD_HOME_R2_HEADER_NAV_SCHEMA_INVALID'); };
  if (nav.contract !== 'SMD_HOME_HEADER_NAV_V2' || nav.sourceSnapshotDigest !== homeR2Source.sourceSnapshotDigest || nav.items.length !== expected.length) fail();
  const ids = new Set<string>();
  const paths = new Set<string>();
  nav.items.forEach((item, index) => {
    const [id, sourceNodeKey, label, to, targetStatus] = expected[index]!;
    if (item.id !== id || item.kind !== 'route' || item.sourceNodeKey !== sourceNodeKey ||
        item.label !== label || item.to !== to || item.targetStatus !== targetStatus ||
        ids.has(item.id) || paths.has(item.to)) fail();
    ids.add(item.id); paths.add(item.to);
  });
  if (nav.cta.id !== 'consultation' || nav.cta.sourceNodeKey !== 'node-1:19' ||
      nav.cta.label !== '상담신청' || nav.cta.action !== 'published-kakao-url' ||
      homeFigmaText['node-1:11'].characters !== 'SMD 아카데미') fail();
}

/** Standalone-only navigation. The CMS V2 path remains byte-semantic compatible. */
export const homeHeaderNavigationV3 = {
  ...homeHeaderNavigationV2,
  contract: 'SMD_HOME_HEADER_NAV_V3',
  cta: { ...homeHeaderNavigationV2.cta, action: 'internal-route', to: '/contact' },
} as const;

export function assertHomeHeaderNavigationV3(): void {
  assertHomeHeaderNavigationV2();
  const cta = homeHeaderNavigationV3.cta;
  if (homeHeaderNavigationV3.contract !== 'SMD_HOME_HEADER_NAV_V3' ||
      cta.sourceNodeKey !== 'node-1:19' || cta.label !== '상담신청' ||
      cta.action !== 'internal-route' || cta.to !== '/contact') {
    throw new Error('SMD_HOME_HEADER_NAV_V3_SCHEMA_INVALID');
  }
}

/** Only the published, current navigation document may supply the action URL. */
export function validPublishedKakaoUrl(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 2048) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'open.kakao.com' &&
      /^\/o\/[a-zA-Z0-9]+\/?$/.test(url.pathname) && !url.username && !url.password &&
      !url.search && !url.hash ? value : null;
  } catch { return null; }
}

/** CF5 runtime availability projection. Figma source nav and CMS status are unchanged. */
export function homeHeaderTargetStatus(
  item: HeaderItemV2, mode: 'standalone' | 'cms',
): 'ready' | 'scaffold' {
  switch (item.id) {
    case 'reviews': return mode === 'standalone' ? 'ready' : 'scaffold';
    default: return item.targetStatus === 'existing' ? 'ready' : 'scaffold';
  }
}
