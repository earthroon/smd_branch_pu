/** Disconnected APIs remain present for future CMS binding; never contact Core. */
export default defineEventHandler((event) => {
  const mode = useRuntimeConfig(event).public.contentMode;
  if (mode !== 'standalone' && mode !== 'cms')
    throw createError({ statusCode: 503, statusMessage: 'SMD_CONTENT_MODE_INVALID' });
  if (mode === 'standalone') {
    const path = getRequestURL(event).pathname;
    const allowed = /^\/api\/media\/standalone\/[0-9a-f-]{36}\/sm_[a-f0-9]{64}$/.test(path)
      && (getMethod(event) === 'GET' || getMethod(event) === 'HEAD');
    const manifestAllowed = path === '/api/media/standalone/manifest' && getMethod(event) === 'GET';
    if (path.startsWith('/api/') && !allowed && !manifestAllowed)
      throw createError({ statusCode: 503, statusMessage: 'SMD_CMS_DISCONNECTED' });
  }
});
