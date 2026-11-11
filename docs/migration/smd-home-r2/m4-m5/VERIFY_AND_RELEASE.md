# Public Home R2 · M4/M5 candidate verification

From `smd-public/` run:

```powershell
node scripts/home-r2-m5-verify.mjs
npm ci
npm run typecheck
npm run build
```

`node scripts/home-r2-m5-verify.mjs` can run without internet by extracting the already pinned `@smd/content-contracts` 0.7.0 tarball into `node_modules` for the model tests only. It is NOT a replacement for `npm ci` or Nuxt build.

After a staging deployment with an enabled, trusted V6 Core PublicSurface:

```powershell
npm install --save-dev playwright
npx playwright install chromium
$env:SMD_HOME_R2_STAGING_URL='https://your-staging-host.example'
node scripts/home-r2-m5/browser-physical.mjs
```

Review all 11 width screenshots, old category pages, two scaffold routes, access conditions, R2 images, FAQ disclosure and SSR/CSR. Check a public V6 publication and then rollback to V5. Never point these tests at production.

## Qualification state

`LOCAL MODEL PASS` only. Full Nuxt build, browser and actual worker deployment have NOT been completed. Default runtime remains V5. No image substitution and no silent publication on CMS Draft save.
