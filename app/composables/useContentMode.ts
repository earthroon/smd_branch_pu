export function useContentMode(): 'standalone' | 'cms' {
  const mode = useRuntimeConfig().public.contentMode;
  switch (mode) {
    case 'standalone': case 'cms': return mode;
    default: throw new Error('SMD_CONTENT_MODE_INVALID');
  }
}
