/** SMD-HEADER-BRAND-R1: source static boundary only; not Nuxt SSR/R2 physical proof. */
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const text=p=>readFileSync(join(root,p),'utf8');
const has=(p,s)=>assert.ok(text(p).includes(s),`${p}: expected ${s}`);
const artifact=JSON.parse(text('vendor/content-contracts/RELEASE.json'));
assert.equal(artifact.version,'0.7.0');
assert.ok(existsSync(join(root,'vendor/content-contracts',artifact.tarball)));
has('app/components/feature/SiteHeader.vue','<HeaderBrandSymbol />');
has('app/components/feature/SiteHeader.vue','SMD ACADEMY');
has('app/components/feature/SiteHeader.vue','to="/"');
const brand='app/components/feature/HeaderBrandSymbol.vue';
has(brand,'resolvePublishedBrandSymbol');
has(brand,'/api/brand/current');
has(brand,':src="brandSymbol.src"');
has(brand,"brandSymbol.kind==='legacy'");
has(brand,'failedBrandId');
assert.ok(!text(brand).includes('<svg'),'inline SVG is forbidden');
has('app/utils/site-media-binding.ts','resolvePublishedBrandSymbol');
has('server/utils/site-media-v5-render.ts',"value.mimeType==='image/svg+xml'");
has('server/utils/public-core.ts','/v5\\/brand\\/current');
for(const path of ['server/api/brand/current.get.ts','server/api/media/brand/[assetId].get.ts','server/api/media/brand/[assetId].head.ts']){
 assert.ok(existsSync(join(root,path)),path);
}
has('server/api/media/brand/[assetId].get.ts','coreMediaResponse');
has('server/api/media/brand/[assetId].head.ts',"'HEAD'");
console.log('PASS_SMD_HEADER_BRAND_R1_PUBLIC_STATIC');
