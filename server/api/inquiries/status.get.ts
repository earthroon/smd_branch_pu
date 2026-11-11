import {
  standaloneInquiryReadiness,
  type StandaloneInquiryEnv,
} from '../../utils/standalone-inquiries';

export default defineEventHandler(async (event) => {
  setHeader(event, 'cache-control', 'no-store');
  const publicConfig = useRuntimeConfig(event).public;
  switch (publicConfig.contentMode) {
    case 'standalone': break;
    default: return { ready: false, reason: 'STANDALONE_MODE_REQUIRED' };
  }
  const bindings = (event.context as {
    cloudflare?: { env?: StandaloneInquiryEnv };
  }).cloudflare?.env ?? {};
  return await standaloneInquiryReadiness(
    bindings,
    String(publicConfig.privacyRevision ?? ''),
    String(publicConfig.turnstileSiteKey ?? ''),
  );
});
