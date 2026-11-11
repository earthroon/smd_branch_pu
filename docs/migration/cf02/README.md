# SMD-NUXT-R2-CF02 · Original Seven-Page Source-View Parity

Parent: `SMD-NUXT-R2-CF00-CF01` full-baked ZIP SHA-256 `3778ba4205573c2e78dd173c21e1c95e79aeb07fd5f672866bb680619d7ead20`.
Original React ZIP SHA-256: `dafe2bf558842066ec5dd0aa1234005880a0ad303575ae08e964a263b80ccfe3`.

## Code changes

Ten **existing** Vue files have page-local, source-derived changes. The other three of the 13 pair mapping (`app/pages/index.vue`, `app/components/home/TeachSection.vue`, `app/pages/archive.vue`) are **byte-identical** to CF01. CF01 common shell, CSS, Tailwind, CMS schema/seed, Worker APIs, Pinia and inquiry transport are unchanged.

- Home: original image width/title metadata, practice montage, tracking.
- Teaching grid: original article hover timing, number/heading typography.
- About/Curriculum/Practice: image titles, source grids/text; exact facility tools description.
- Archive: slash/button grouping, six source placeholder visuals, arrow and hover affordances, without inventing article links or thumbnail photos.
- Promotion: explicit two-line CMS headline projection; five **marketing tier allocation** circles (2 early, 3 general) independent of operational occupancy; `<strong>` deposit prefix using a strictly validated source delimiter; original card typography.
- Contact: original channel hover/arrow style, exact hours and 1/1.25 grid. Existing `tel:` anchor target behavior intentionally deferred to CF03.

**Declared semantic difference:** the original tier-allocation graphic is restored as a marketing visual, not current sold/occupied seat data. `filledSeats` and `enrollmentStatus` are unmodified in source schema and seed. The campaign must be revalidated by an operator before public publishing.

## Source and test fixtures

`source-reference.json` was constructed from the original ZIP's frozen TSX, CF00 source manifests and CF01 parent files. It pins hashes for all 79 parent files, the ten authorized changed paths, 56 original nonempty JSX literal text fragments (four explicitly mapped to CMS promotion fields), source image metadata and the four learning/facility records. It does not claim external images have been downloaded or physically compared.

A dependency-free structural Vue-template reader in `scripts/lib/cf02-template.mjs` checks static structure only. It is not the Vue compiler or a browser DOM; passing it does not imply rendering parity.

## Commands

```powershell
# From the extracted project root.
node .\scripts\cf01-layout-static.mjs
node .\scripts\cf02-page-static.mjs --original 'C:\path\project-13890572(1).zip'
node --test .\scripts\tests\cf00-cf01.test.mjs
node --test .\scripts\tests\cf02-page.test.mjs
npm run test:source

# Requires network access or a previously provisioned node_modules/lockfile.
npm install
npm run typecheck
npm run build
```

The CF00 verifier's byte-hash check **must run on the extracted CF01 parent**, not on this legitimately modified CF02 output. Use `cf02-page-static.mjs` for the CF02 no-touch/parent-source check; it checks all unchanged CF01 bytes.

## Unresolved, deliberately not hidden

- `promotionBenefits[0].desc`: CF01 CMS seed differs from the React source. Correct only under CF04's source-schema migration (not in a CF02 Vue view).
- Current contact form includes Turnstile/consent controls added after the original design; strict source form DOM equality is exempt, not declared PASS.
- Phone `tel:` target semantics, archive filter interaction, and CTA/browser navigation behavior remain CF03 work.
- Nuxt compiler, SSR/hydration and reference-vs-candidate browser style/geometry comparison are not demonstrated by these static checks.
- External images are references only, not byte-frozen media files; no R2 transfer in CF02.

## Evidence level

SOURCE BAKED; STATIC gate observed; COMPILE BLOCKED if dependencies unavailable; RUNTIME/PHYSICAL UNKNOWN; PERFORMANCE NOT MEASURED; PRODUCT PROMOTION FALSE. See `receipt.json` for actual observed results.
