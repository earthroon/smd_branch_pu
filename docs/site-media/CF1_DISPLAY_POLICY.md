# SMD-SITE-MEDIA-R1 · CF1 image presentation policy

**Inventory:** `image-slot-inventory.v1.json` covers 12 current Vue `<img>` tags in 10 files.
**Source audit:** `node scripts/site-media-cf1-audit.mjs` re-scans current Vue source
and fails if an image tag appears/disappears or its source/legacy `object-cover` changes.

Seven fixed V5 candidate slots default to `natural`. Other image producers are deferred:
- `training.teachItems[].image`: missing stable per-item ID contract.
- Archive item and YouTube poster: remains under Archive V2 authority.
- `cms.image-card[blockId]`: current V4 pages=PageCopyV1, V3 block tree not merged.
- V3 archive category image: historical category routing differs from V4.

The policy helper in `app/utils/site-media-policy.ts` is **not attached** to production
Vue components in CF1. This prevents visual changes to historical Publication V1–V4.
CF5 must explicitly consume this policy after a V5 binding and physically check
Natural/Contain, image dimensions, SSR/hydration and mobile layout.
