export default defineNuxtConfig({
  compatibilityDate: '2026-10-12',
  devtools: { enabled: false },
  modules: ['@pinia/nuxt', 'motion-v/nuxt'],
  postcss: { plugins: { tailwindcss: {}, autoprefixer: {} } },
  css: ['~/assets/css/main.css', '~/assets/css/catalogue-r7.css', '~/assets/css/catalogue-r7-home.css', '~/assets/css/catalogue-r7-routes.css'],
  nitro: {
    preset: process.env.GITHUB_PAGES === '1'
      ? 'github_pages'
      : 'cloudflare-module',
    prerender: process.env.GITHUB_PAGES === '1'
      ? {
          crawlLinks: false,
          concurrency: 1,
          routes: [
            '/',
            '/about',
            '/curriculum',
            '/archive',
            '/reviews',
            '/faq',
            '/contact',
            '/practice',
            '/promotion',
            '/privacy'
          ],
          ignore: ['/videos']
        }
      : undefined
  },
  app: {
    head: {
      htmlAttrs: { lang: 'ko' },
      title: 'SMD 아카데미 | 인테리어필름 시공 실무 교육',
      meta: [
        { name: 'description', content: '인테리어필름 시공 실습 중심 교육기관 SMD 아카데미.' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' }
      ],
      link: [
        { rel: 'stylesheet', href: 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css' },
        { rel: 'stylesheet', href: 'https://cdnjs.cloudflare.com/ajax/libs/remixicon/4.5.0/remixicon.min.css' }
      ]
    }
  },
  runtimeConfig: { public: { standaloneMediaMode: process.env.NUXT_PUBLIC_STANDALONE_MEDIA_MODE || 'local',
    standaloneMediaSourceLockDigest: process.env.NUXT_PUBLIC_STANDALONE_MEDIA_SOURCE_LOCK_DIGEST || '',
    contentMode: 'standalone', turnstileSiteKey: process.env.NUXT_PUBLIC_TURNSTILE_SITE_KEY || '', privacyRevision: process.env.NUXT_PUBLIC_PRIVACY_REVISION || '', siteOrigin: process.env.NUXT_PUBLIC_SITE_ORIGIN || '' } },
  routeRules: {
    '/api/inquiries': { headers: { 'cache-control': 'no-store' } },
    '/api/bot/**': { headers: { 'cache-control': 'no-store' } }
  }
});
