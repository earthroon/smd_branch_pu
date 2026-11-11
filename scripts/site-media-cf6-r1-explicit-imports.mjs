/** CF6-R1: deterministic explicit-import boundary for project-owned composables. */
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {resolve,relative,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const own={
  useSiteContent:'~/composables/useSiteContent',
  useSelectedCategoryPage:'~/composables/useSelectedCategoryPage',
  usePublishedSiteMedia:'~/composables/usePublishedSiteMedia',
};
function visit(folder){
  return readdirSync(folder,{withFileTypes:true}).flatMap(ent=>{
    const full=resolve(folder,ent.name);
    return ent.isDirectory()?visit(full):ent.isFile()&&/\.(?:vue|ts)$/.test(ent.name)?[full]:[];
  });
}
let checked=0,imports=0;
for(const full of visit(resolve(root,'app'))){
  const rel=relative(root,full).replaceAll('\\','/');
  const contents=readFileSync(full,'utf8');
  for(const [name,module] of Object.entries(own)){
    if(rel===`app/composables/${name}.ts`)continue;
    if(!contents.includes(`${name}(`))continue;
    const pattern=new RegExp(`\\bimport\\s*\\{[^}]*\\b${name}\\b[^}]*\\}\\s*from\\s*['\"]${module.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}['\"]`);
    assert.match(contents,pattern,`CF6_R1_EXPLICIT_IMPORT_MISSING ${rel} ${name}`);
    assert.ok(existsSync(resolve(root,`app/composables/${name}.ts`)),`CF6_R1_COMPOSABLE_MISSING ${name}`);
    imports++;
  }
  checked++;
}
assert.ok(imports>=30,`CF6_R1_IMPORT_COUNT_DRIFT ${imports}`);
console.log(`PASS_SMD_SITE_MEDIA_R1_CF6_R1_PUBLIC_IMPORTS scanned=${checked} imports=${imports}`);
