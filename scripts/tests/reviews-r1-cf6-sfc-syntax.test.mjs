import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const read=f=>readFileSync(new URL('../../'+f,import.meta.url),'utf8');
const paths=[
 'app/pages/reviews.vue','app/components/reviews/ReviewsBodyStage.vue',
 'app/components/reviews/ReviewsHero.vue','app/components/reviews/ReviewsFacts.vue',
 'app/components/reviews/ReviewsCategoryTabs.vue','app/components/reviews/ReviewsCard.vue',
 'app/components/reviews/ReviewsLoadMore.vue','app/components/reviews/ReviewsCta.vue',
 'app/components/feature/SiteHeader.vue','app/layouts/default.vue','app/app.vue',
];
for(const path of paths){
 test(`CF6: TS script syntax ${path}`,()=>{
  const content=read(path);
  const scripts=[...content.matchAll(/<script\s+setup\s+lang="ts"[^>]*>([\s\S]*?)<\/script>/g)];
  assert.equal(scripts.length,1,`SFC_SCRIPT_COUNT_${path}`);
  const source=ts.createSourceFile(path+'.ts',scripts[0][1],ts.ScriptTarget.ES2022,true,ts.ScriptKind.TS);
  assert.equal(source.parseDiagnostics.length,0,source.parseDiagnostics.map(x=>ts.flattenDiagnosticMessageText(x.messageText,'\n')).join('\n'));
  assert.match(content,/<template>[\s\S]*<\/template>/);
 });
}
