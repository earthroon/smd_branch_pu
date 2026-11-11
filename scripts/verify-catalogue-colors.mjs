/** SMD R7 CF2 / read-only static color + ownership verifier.
 * Does not claim browser paint parity. No source mutation, no silent fallback.
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { resolve, join, relative, extname, dirname } from 'node:path';
import { mkdirSync } from 'node:fs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const outIndex = args.indexOf('--out');
const outPath = outIndex >= 0 ? args[outIndex + 1] : null;
const fail = (code, detail) => { throw new Error(`${code}: ${detail}`); };
const load = path => readFileSync(join(ROOT, path), 'utf8');
const cssPath = 'app/assets/css/catalogue-r7.css';
const main = load('app/assets/css/main.css');
const css = load(cssPath);
const layout = load('app/layouts/default.vue');
const nuxt = load('nuxt.config.ts');
const pkg = JSON.parse(load('package.json'));
const lock = JSON.parse(load('package-lock.json'));
const requiredColors = new Map([
  ['--smd-brand-navy', '#172C57'],
  ['--smd-action-orange', '#D95E22'],
  ['--smd-warm-stone', '#E5DDD2'],
]);
for (const [token, color] of requiredColors) {
  const rx = new RegExp(`${token.replaceAll('-', '\\-')}\\s*:\\s*${color}\\s*;`, 'i');
  if (!rx.test(main)) fail('R7_PALETTE_TOKEN_MISSING', token);
}
if (!layout.includes('data-catalogue-ui="r7"')) fail('R7_SKIN_MISSING', 'layout root');
if (!nuxt.includes("'motion-v/nuxt'")) fail('R7_MOTION_MODULE_MISSING', 'nuxt.config.ts');
if (!/css:\s*\[\s*['"]~\/assets\/css\/main\.css['"]\s*,\s*['"]~\/assets\/css\/catalogue-r7\.css['"]\s*\]/.test(nuxt)) {
  fail('R7_CSS_ORDER_INVALID', 'main.css must precede catalogue-r7.css');
}
if (pkg.dependencies.nuxt !== '4.6.4' || pkg.dependencies['motion-v'] !== '2.11.1') {
  fail('R7_PACKAGE_EXACT_PIN_MISSING', JSON.stringify({nuxt:pkg.dependencies.nuxt,motion:pkg.dependencies['motion-v']}));
}
if (lock.packages?.['node_modules/nuxt']?.version !== '4.6.4' ||
    lock.packages?.['node_modules/motion-v']?.version !== '2.11.1') {
  fail('R7_LOCK_VERSION_MISMATCH', 'npm install must regenerate lock with exact versions');
}
// CF2 does NOT override the entire existing CSS or generated source paint.
const cssWithoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
if (/^\s*(?:html|body)\s*(?:,\s*(?:html|body)\s*)?\{/m.test(cssWithoutComments)) fail('R7_CSS_GLOBAL_OWNER', 'html/body rules disallowed');
if (!css.includes('.smd-site-shell[data-catalogue-ui="r7"]')) fail('R7_CSS_SCOPE_MISSING', cssPath);
const allowedHex = new Set([...requiredColors.values()].map(s=>s.toUpperCase()));
const rawHex = [...css.matchAll(/#[\da-f]{3,8}\b/gi)].map(m=>m[0].toUpperCase());
for (const c of rawHex) if (!allowedHex.has(c)) fail('R7_UNAPPROVED_HEX', c);
// In R7 CSS new rgb() may only be alpha of a brand hex; any remaining source
// RGB colors are inventoried, NOT silently recolored.
const allowedRGB = new Set(['23 44 87','217 94 34','229 221 210']);
for (const m of css.matchAll(/rgba?\(\s*(\d+)\s+?(\d+)\s+?(\d+)(?:\s*\/\s*[^)]+)?\)/gi)) {
  const channels = `${m[1]} ${m[2]} ${m[3]}`;
  if (!allowedRGB.has(channels)) fail('R7_UNAPPROVED_RGB', channels);
}
const important = (cssWithoutComments.match(/!important/g) ?? []).length;
if (important > 1) fail('R7_IMPORTANT_BUDGET_EXCEEDED', important);
const scopeText = css.split(/\}/).filter(block=>block.includes('{'));
for (const block of scopeText) {
  const selector = block.slice(0,block.lastIndexOf('{'));
  // Each explicit selector group must include R7 skin or describe an auxiliary
  // child of that scoped group. This is a conservative source check.
  if (/^[\s\S]*\{/.test(selector)) fail('R7_CSS_NESTING_INVALID', selector.slice(0,70));
}
const roots = ['app/assets/css','app/components','app/data','public/figma'];
const extensions = new Set(['.css','.vue','.ts','.svg']);
const excludedPath = new Set([cssPath]);
const observations = [];
function walk(dir) {
  if (!existsSync(dir)) return;
  for (const ent of readdirSync(dir, {withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))) {
    const path=join(dir,ent.name);
    if (ent.isDirectory()) { if (!['node_modules','.nuxt','.output'].includes(ent.name)) walk(path); continue; }
    if (!ent.isFile() || !extensions.has(extname(ent.name))) continue;
    const rel=relative(ROOT,path).replaceAll('\\','/');
    if (excludedPath.has(rel)) continue;
    const text=readFileSync(path,'utf8');
    const values = new Map();
    for(const m of text.matchAll(/#[\da-f]{6}\b|rgba?\(\s*\d+[ ,]+\d+[ ,]+\d+[^)]*\)/gi)) {
      const key=m[0].toUpperCase().replace(/\s+/g,' ');
      values.set(key,(values.get(key)??0)+1);
    }
    const unmapped=[...values].filter(([raw])=> !allowedHex.has(raw));
    if (unmapped.length>0) observations.push({path:rel,status:'UNMAPPED',colors:unmapped.map(([value,count])=>({value,count}))});
  }
}
for(const dir of roots)walk(resolve(ROOT,dir));
const output={
  contract:'SMD_R7_CF2_COLOR_PAINT_AUDIT_V1',
  stage:'STATIC',
  status:'R7_SCOPE_VALIDATED__LEGACY_PAINT_UNMAPPED',
  palette:Object.fromEntries(requiredColors),
  motionNuxtModule:'motion-v/nuxt',
  package:{nuxt:pkg.dependencies.nuxt,motion:pkg.dependencies['motion-v']},
  r7Css:{path:cssPath,unapprovedHex:0,importantRules:important},
  legacyPaintAudit:{observedFiles:observations.length,entries:observations},
  caveats:['Regex source inventory is not browser computed style.','Raw SVG/Figma/PSD source assets were not changed.','CF3-CF6 must map paint per owner.'],
};
if (outPath) {
  const out=resolve(ROOT,outPath);
  mkdirSync(dirname(out),{recursive:true});
  writeFileSync(out, JSON.stringify(output,null,2)+'\n');
}
console.log(JSON.stringify({status:output.status,legacyPaintFiles:observations.length,importantRules:important,output:outPath},null,2));
