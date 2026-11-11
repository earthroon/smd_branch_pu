# Uploaded source audit (`project-13890572(1).zip`)

**Direct inspection:** 59 ZIP entries, 85,866 bytes uncompressed, 24 `.tsx` sources, 9 `.ts` sources (including configurations), app rooted at `src/`.

- `package.json` contained React 19, React Router 7, i18next, Vite 8, Tailwind 3; Firebase, Supabase, Stripe and Recharts were declared dependencies but had no identifiable use in the site's provided `src/` file set.
- `src/router/config.tsx`: `/`, `/about`, `/curriculum`, `/practice`, `/archive`, `/promotion`, `/contact`, 404.
- `src/mocks/site.ts`: static navigation, external channels, teaching items, archive filters/items, pillars, promotion and prices.
- `src/components/feature/ArchiveGallery.tsx`: local React filter state; archive cards are placeholders with icon, not photos.
- `src/pages/promotion/page.tsx`: `const seats=[true,true,false,false,false]`; this is not live enrollment evidence.
- `src/pages/contact/components/ContactForm.tsx`: direct fetch to `readdy.ai/api/form/...`; client honeypot and client success state, no owned backend.
- `src/i18n/index.ts`: browser locale detection configured with `lng:'en'`; no actual locale translation leaf files in provided ZIP.
- `index.html`: canonical still pointed to GitHub Pages and favicon to `vite.svg`, neither should be reused for new custom domain deployment.
- Image URLs point to `smd-2026.github.io/smdacademy/images/...`; image binary files are not in the ZIP.

## Explicit semantic deltas

1. Contact submission endpoint changed from third-party Readdy to Worker D1. No dual write.
2. CMS initial import is draft-only and requires explicit publishing.
3. Seats are `UNKNOWN`, not derived from the original static `true` booleans.
4. Original JSON includes one promotional detail specifying individual physical tools. In new public data that detail is neutralized to generic practice supplies; the claim about delivery of a starter kit remains unchanged.
5. Bot fallback distinguishes `matched`, `ambiguous` and `unmatched`, without generating a fictional answer.
6. `/privacy` and `/admin` are additional routes; `/privacy` is a non-approved draft and contact collection is blocked until revision admission.
7. New site uses Nuxt 4 with Vue 3. SSR deployment and Cloudflare service binding are planned; no claim of visual pixel parity.

## Not performed

- No npm dependency installation or Nuxt/Vue compilation (registry unavailable in this environment).
- No production build, browser test, Cloudflare deployment or D1 remote migration.
- No R2 asset upload, Zero Trust policy creation or real webhook delivery.
- No proof of contact reception from a real browser or actual human-facing FAQ coverage.
