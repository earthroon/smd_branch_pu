# SMD-SITE-MEDIA-R1-CF5A · Renderer foundation

Parent: CF1/CF2 Public 0.3.0 contract, V1–V4 legacy images and Archive R2 authority unchanged.

## Ownership

- `app/utils/site-media-policy.ts` remains the CF1 fixed-slot default/promotion policy.
- `app/utils/site-media-render.ts` validates deterministic, versioned V5 render input and computes classes from the existing slot-owned frames.
- `app/components/media/SiteImage.vue` performs native `<img>` presentation only.
- `server/utils/public-core.ts`, the publication pipeline, and R2/D1 are **not changed**.
- The required `admission: 'V5_BINDING_ADMITTED'` marker is an input contract **not** a publication/security proof. CF4 Core and CF5-B resolver must check real admission before producing the input.
- The only admitted `src` is `/api/media/image/sm_<64 lowercase hex>` as planned for CF4. CF5A does not make the endpoint available.
- Width/height are supplied by CF3's *future* validated metadata. The component does not inspect or reinterpret EXIF or decode bytes.

## Presentation modes

**natural:** intrinsic width/height attributes, `h-auto w-full max-w-full`, no fixed aspect container, no clipping, no object-cover. Image pixels are not transformed.

**contain:** slot-owned frame ratio inherited from the seven current Vue layout classes, `h-full w-full object-contain object-center`; empty frame regions show existing `background-100`. `overflow-hidden` only clips the frame boundary; a contained image is not cropped.

**legacy:** existing 12 native `<img>` tags in 10 files and all V1–V4 routes are byte-identical. No public Vue component consumes `SiteImage.vue` yet. Existing `object-cover` remains owned by the old templates. In CF5-B, V5 binding admission selects the new renderer at each actual call site.

## Loading and errors

- Home and About hero images use `loading=eager`, `fetchpriority=high`; other fixed slots use lazy/auto.
- Initial status is always `pending` on server and client. Load/error change local status only after the browser events. Errors expose `MEDIA_LOAD_FAILED` visual text without replacing the source with a Legacy URL.
- Model validation rejects unresolved/deferred slots, missing admission, invalid origin/path, invalid dimensions and invalid strings, rather than inventing default geometry.
- No viewport/date/browser API is consumed during initial render model evaluation.

## Verification and evidence limits

```
node scripts/site-media-cf1-audit.mjs
node scripts/site-media-cf5a-static.mjs
node --experimental-strip-types --test scripts/tests/site-media-cf5a-renderer.test.mjs
npx --no-install tsc -p scripts/tsconfig.site-media-cf5a.json
npm run verify:contracts
npm run test:source
npm run typecheck
npm run build
```

The Node tests verify deterministic render props and source-level Vue template constraints. They **do not** execute Vue SSR, hydration or a browser. Only the actual Nuxt build/typecheck and local browser checks can close those levels. CF5A physical witness also requires a controlled diagnostic source or an admitted CF5-B/CF4 media route; no fixture source is silently promoted into production.

CF5-A does **not** assert that V5 images are already visible on Home/Archive, or that V5 Publication is enabled. SiteMedia loading is not yet an end-to-end path.
