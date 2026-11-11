import { coreRequest, sameOrigin } from '../utils/public-core';
import { submitStandaloneInquiry, type StandaloneInquiryEnv } from '../utils/standalone-inquiries';

export default defineEventHandler(async (event) => {
  sameOrigin(event);
  switch (useRuntimeConfig(event).public.contentMode) {
    case 'standalone': {
      const contentType = getHeader(event, 'content-type')?.split(';', 1)[0]?.trim();
      switch (contentType) {
        case 'application/json': break;
        default: throw createError({ statusCode: 415, statusMessage: 'INQUIRY_CONTENT_TYPE_INVALID' });
      }
      const declaredLength = Number(getHeader(event, 'content-length') ?? '0');
      if (declaredLength > 4096) throw createError({ statusCode: 413, statusMessage: 'INQUIRY_BODY_TOO_LARGE' });
      const body = await readBody(event);
      const cloudflare = (event.context as {
        cloudflare?: { env?: StandaloneInquiryEnv };
      }).cloudflare;
      const publicConfig = useRuntimeConfig(event).public;
      const result = await submitStandaloneInquiry({
        body,
        env: cloudflare?.env ?? {},
        clientIp: cloudflare?.env ? getHeader(event, 'cf-connecting-ip') ?? null : null,
        publicPrivacyRevision: String(publicConfig.privacyRevision ?? ''),
        publicTurnstileSiteKey: String(publicConfig.turnstileSiteKey ?? ''),
      });
      setResponseStatus(event, result.status);
      setHeader(event, 'cache-control', 'no-store');
      return result.body;
    }
    case 'cms':
      return await coreRequest(event, '/v1/inquiries', 'POST', await readBody(event));
    default:
      throw createError({ statusCode: 503, statusMessage: 'SMD_CONTENT_MODE_INVALID' });
  }
});
