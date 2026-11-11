# SMD-NUXT-R2-CF03 · Public interaction parity

Parent: `SMD-NUXT-R2-CF02_FULL_BAKED_UNVERIFIED.zip` (SHA-256 fixed in `source-reference.json`).

## Source delta and ownership

- **Production code change:** only `app/pages/contact.vue`: the contact channel's conditional `:target` becomes the original React `target="_blank"` on every anchor, including `tel:`. This is exact **DOM attribute parity**, **not** evidence that a device dialer launches successfully. The published `navigation.contactPhone` still determines the digits of `tel:`.
- `SiteHeader.vue`, `ArchiveGallery.vue`, `Reveal.vue`, `CtaBand.vue`, `app/error.vue` are kept byte-identical to the CF02 parent because their source interaction contracts are already present. No same-route close, auto-scroll, global router options, new archive detail routes or new Pinia state.
- Existing CF01 shell and CF02 page layout CSS remain byte-identical. `shared/seed-content.json`, CMS, D1, Worker, Turnstile, public bot, and content transport are not touched.

## Tests and evidence boundary

Run in the extracted project root:

```powershell
node .\scripts\cf03-interaction-static.mjs --original 'C:\path\project-13890572(1).zip' --parent 'C:\path\SMD_NUXT_R2_CF02_FULL_BAKED_UNVERIFIED.zip'
node --test .\scripts\tests\cf03-interaction.test.mjs
node .\scripts\cf01-layout-static.mjs
node --test .\scripts\tests\cf00-cf01.test.mjs
npm run test:source
npm install
npm run typecheck
npm run build
```

`cf03-interaction-static.mjs` verifies the immutable CF02 SHA inventory, the single surgical change, source-vs-Nuxt interaction contracts, frozen fixture identities and no unrelated changes. `cf03-interaction.test.mjs` executes component `<script setup>` **through a dependency-free reactive/observer model**, plus mutation-negative source checks. It does not mount Vue, navigate Chromium, run SSR, exercise an actual phone handler, or query production Cloudflare.

**Parent CF02 static gate note:** the CF02 verifier was written to reject *any file new after CF02*, and explicitly expects the *old* telephone target behavior. Therefore it will intentionally reject an unmodified CF03 candidate. The unchanged CF02 parent should be replayed separately; the CF03 verifier checks actual candidate preservation plus the intentional, superseding `tel:` source delta. Do not claim `CF02 static PASS on candidate` by masking the delta.

## Required browser/runtime receipt (deferred)

Requires installed Nuxt and an explicitly published **test-only** CMS fixture via the actual Worker route. Do not use silent local seed fallback. Follow CF03 specification E01–E17, preserving viewport, fixture digest, URL/href/target/rel, hydration errors and scrollY. Observe CMS unavailability as an error, unknown URL as HTTP 404 and mobile handler cleanup.

Production promotion requires compile, SSR/hydration and the required real-browser interaction matrix. Static/model markers never imply physical closure.
