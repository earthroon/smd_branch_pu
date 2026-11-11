# Verification receipt · SMD-NUXT-R1

## Tests actually executed in artifact authoring environment

- ZIP inspected safely and source mapped.
- `node --test --experimental-strip-types workers/smd-core/tests/*.test.mjs`: 25/25 PASS (lookup, CMS schema, and SQLite model fixtures).
- SQL migrations loaded via Node 22 `node:sqlite` in-memory model: 0001 and 0002 parse/execute PASS.
- SQLite fixture: five documents imported as **draft only**; four answer rows, eleven lookup rows materialized.
- Atomic CMS publication trigger: synthetic UPDATE created audit receipt PASS.
- Atomic inquiry trigger: synthetic inquiry created notification outbox row PASS. Cooldown SQL and notification lease state models also PASS.
- Offline TypeScript source parsing/transpilation: 44 `.ts`/Vue script sections, 0 syntax diagnostics. Relative TypeScript imports resolved within the bundle; seven required public route files present. This does NOT imply typecheck or Vue template compilation.

## Must remain UNKNOWN

| Evidence tier | Status | Why |
|---|---|---|
| SOURCE | CANDIDATE BAKED | Files physically written |
| STATIC UNIT / SQLITE MODEL | 25/25 PASS | `node:test` with `node:sqlite`, not Cloudflare D1 |
| TYPESCRIPT SYNTAX | PASS | Parser only, not dependent type system |
| NUXT SFC COMPILATION | UNKNOWN | `npm install` unavailable; Nuxt dependencies not present |
| CLOUDFLARE COMPILE | UNKNOWN | Wrangler not executed |
| WORKER/D1 RUNTIME | UNKNOWN | No deployed binding or HTTP test |
| ACCESS PHYSICAL | UNKNOWN | Zero Trust policy not configured |
| TURNSTILE PHYSICAL | UNKNOWN | No real token validation |
| WEBHOOK DELIVERY | UNKNOWN | No external destination configured |
| VISUAL PARITY | UNKNOWN | Browser rendering not run |
| PERFORMANCE | NOT MEASURED | No baseline measurements |

**No fake PASS markers.** Public production promotion remains **false** until the unknown gates above are exercised on actual runtime.
