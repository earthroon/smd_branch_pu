/** CF4: Public-only scaffolds. Never create or forge CMS category pages. */
import type { RenderResponseV3, RenderResponseV4, RenderResponseV5 } from '@smd/content-contracts/contracts';
import type {HomeR2PublicProjectionV1} from './home-r2-v6-public';
export type RenderResponseV6Candidate = Omit<RenderResponseV5,'schema'> & {schema:'SMD_RENDER_RESPONSE_V6';homeR2:HomeR2PublicProjectionV1};

export type PublicRenderResult = RenderResponseV3 | RenderResponseV4 | RenderResponseV5 | RenderResponseV6Candidate;

/** Select only a validated V6 projection. The server's versioned envelope validator
 * remains responsible for verifying the payload before this typed helper is called.
 * V3 has no schema field, so guard its presence before reading it.
 */
export function homeR2PublishedFromRender(render: PublicRenderResult): HomeR2PublicProjectionV1 | null {
  return 'schema' in render && render.schema === 'SMD_RENDER_RESPONSE_V6'
    ? render.homeR2
    : null;
}
export type ScaffoldPath = '/reviews' | '/faq';
export type ScaffoldAdmission = Readonly<{
  mode: 'scaffold';
  routePath: ScaffoldPath;
  sourcePath: '/';
  render: PublicRenderResult;
}>;

export function resolveHomeScaffoldPath(path: string): ScaffoldPath | null {
  switch (path) {
    case '/reviews': return '/reviews';
    case '/faq': return '/faq';
    default: return null;
  }
}

type JsonRecord = Record<string, unknown>;
function record(v: unknown): v is JsonRecord { return !!v && typeof v === 'object' && !Array.isArray(v); }
function currentPublication(v: unknown): v is JsonRecord {
  return record(v) && typeof v.id === 'string' && v.id.length > 0 &&
    typeof v.digest === 'string' && /^[a-f0-9]{64}$/i.test(v.digest) &&
    Number.isSafeInteger(v.revision) && Number(v.revision) > 0 &&
    typeof v.at === 'string' && v.at.length > 0;
}
function samePublication(a: JsonRecord, b: JsonRecord): boolean {
  return a.id === b.id && a.digest === b.digest &&
    a.revision === b.revision && a.at === b.at;
}
function sourceCurrent(render: unknown): render is PublicRenderResult {
  if (!record(render) || render.requestedPath !== '/' || render.resolvedPath !== '/' ||
      !record(render.selected) || render.selected.mode !== 'legacy' ||
      render.selected.pageId !== 'home' || render.selected.templateKind !== 'legacy-home-v1' ||
      !currentPublication(render.publication) || !record(render.shared) ||
      !currentPublication(render.shared.publication) ||
      !samePublication(render.publication, render.shared.publication)) return false;
  // A current V5 publication must also bind its media projection to the same head.
  if (render.schema === 'SMD_RENDER_RESPONSE_V5' || render.schema === 'SMD_RENDER_RESPONSE_V6') {
    const media = render.shared.siteMedia;
    return (render.schema!=='SMD_RENDER_RESPONSE_V6'||
      (record(render.homeR2)&&render.homeR2.publicationId===render.publication.id &&
        render.homeR2.publicationDigest===render.publication.digest)) &&
      record(media) && media.schema === 'SMD_SITE_MEDIA_PUBLIC_PROJECTION_V1' &&
      media.publicationId === render.publication.id &&
      media.publicationDigest === render.publication.digest;
  }
  return render.schema === 'SMD_RENDER_RESPONSE_V4' || render.schema === undefined;
}

export function admitHomeScaffold(path: string, candidate: unknown): ScaffoldAdmission {
  const routePath = resolveHomeScaffoldPath(path);
  if (routePath === null) throw new Error('SMD_HOME_R2_SCAFFOLD_PATH_INVALID');
  if (!sourceCurrent(candidate)) throw new Error('SMD_HOME_R2_SCAFFOLD_SOURCE_IDENTITY_DRIFT');
  return { mode: 'scaffold', routePath, sourcePath: '/', render: candidate };
}

/** Prevent old async completions from hydrating a different URL or publication. */
export function scaffoldAdmissionCurrent(value: ScaffoldAdmission | null, currentPath: string): boolean {
  return value !== null && resolveHomeScaffoldPath(currentPath) === value.routePath &&
    value.sourcePath === '/' && sourceCurrent(value.render);
}
