/**
 * Presentation URL only. Canonical image sources, slot identity, SHA and media
 * publication semantics stay unchanged. Does not rewrite /api or remote URLs.
 * Nuxt app.baseURL is '/' on the Cloudflare product and '/smd_branch_pu/' on Pages.
 */
export function usePublicStaticAssetUrl(): (source: string) => string {
  const prefix = useRuntimeConfig().app.baseURL.replace(/\/+$/, '');
  return (source: string): string => {
    switch (/^\/(?:media|about|curriculum|figma|figma-r2)\//.test(source)) {
      case true: return `${prefix}${source}`;
      case false: return source;
    }
  };
}