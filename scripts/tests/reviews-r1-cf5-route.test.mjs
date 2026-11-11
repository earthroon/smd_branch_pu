import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {homeHeaderNavigationV2, homeHeaderTargetStatus, assertHomeHeaderNavigationV2} from '../../app/data/home-r2-navigation.ts';
import {admitReviewCategoryQuery, reviewNavigationCompletionIsCurrent, reviewFilterChangeIntent} from '../../app/utils/reviews-view.ts';
import {STANDALONE_PREVIEW_PUBLICATION_ID, publicExternalActionsAllowed} from '../../app/utils/publicExternalActionPolicy.ts';
import {resolveHomeScaffoldPath} from '../../app/utils/homeR2ScaffoldAdmission.ts';
const read=f=>readFileSync(new URL('../../'+f,import.meta.url),'utf8');

test('CF5: Header source remains unchanged, mode-aware Status differs only for Standalone reviews',()=>{
 assert.doesNotThrow(assertHomeHeaderNavigationV2);
 for(const item of homeHeaderNavigationV2.items){
  const oldStatus=item.targetStatus;
  const standalone=homeHeaderTargetStatus(item,'standalone');
  const cms=homeHeaderTargetStatus(item,'cms');
  assert.equal(cms,oldStatus==='scaffold'?'scaffold':'ready');
  assert.equal(standalone,item.id==='reviews'?'ready':cms);
 }
 assert.equal(resolveHomeScaffoldPath('/reviews'),'/reviews');
 assert.equal(resolveHomeScaffoldPath('/faq'),'/faq');
 const header=read('app/components/feature/SiteHeader.vue');
 assert.equal((header.match(/:data-target-status="homeHeaderTargetStatus\(item, headerContentMode\)"/g)??[]).length,2);
 assert.match(header,/:aria-current="active\(item\.to\)/);
});

test('CF5: Standalone root binds unpublished shared Footer while CMS remains on scaffold admission',()=>{
 const app=read('app/app.vue');
 assert.match(app,/smd-reviews-standalone:\/reviews/);
 assert.match(app,/case '\/reviews':\s*\{/);
 assert.match(app,/kind: 'reviews', local/);
 assert.match(app,/case 'reviews':\s*selected\.value = null;\s*content\.value = result\.local/);
 assert.match(app,/c\.publication\.id === STANDALONE_PREVIEW_PUBLICATION_ID/);
 assert.match(app,/case 'scaffold': return route\.path === '\/faq'/);
 assert.match(app,/admitHomeScaffold\(path, payload\)/);
 assert.match(app,/selected\.value = null; \/\/ A scaffold is not a CMS category/);
 assert.equal(publicExternalActionsAllowed({publication:{id:STANDALONE_PREVIEW_PUBLICATION_ID}}),false);
 const layout=read('app/layouts/default.vue');
 assert.equal((layout.match(/<SiteHeader\s*\/>/g)??[]).length,1);
 assert.equal((layout.match(/<SiteFooter\s*\/>/g)??[]).length,1);
 assert.match(layout,/data-page-skin/);
 assert.match(layout,/route\.path === '\/reviews'/);
});

test('CF5: Reviews page consumes canonical URL admission; bad/repeated category is HTTP 400',()=>{
 const page=read('app/pages/reviews.vue');
 assert.match(page,/admitReviewCategoryQuery\(route\.query\)/);
 assert.match(page,/statusCode: initial\.statusCode/);
 assert.match(page,/await navigateTo\('\/reviews', \{ replace: true, redirectCode: 308 \}\)/);
 assert.match(page,/reviewFilterChangeIntent\(activeFilter\.value, requested\)/);
 assert.match(page,/reviewLoadMore\(currentInteraction\.value, activeFilter\.value, visible\.value\.total\)/);
 assert.match(page,/reviewRebaseInteraction\(interaction\.value, digest\)/);
 assert.match(page,/reviewNavigationCompletionIsCurrent\(/);
 assert.match(page,/data-cms-scaffold-only="true"/);
 assert.match(page,/noindex,follow/);
 const checks=[
  [{},'admitted','all'],[{category:'glass-film'},'admitted','glass-film'],
  [{category:'all'},'canonicalize','all'],
  [{category:['all','all']},'rejected',null],
  [{category:['glass-film']},'rejected',null],
  [{category:'UNKNOWN'},'rejected',null],
 ];
 for(const [query,kind,filter] of checks){
  const actual=admitReviewCategoryQuery(query);
  assert.equal(actual.kind,kind);
  if(filter!==null)assert.equal(actual.filter,filter);
  if(kind==='rejected')assert.equal(actual.statusCode,400);
 }
 assert.equal(reviewFilterChangeIntent('all','all').kind,'noop');
 assert.deepEqual(reviewFilterChangeIntent('all','glass-film').query,{category:'glass-film'});
 assert.equal(reviewNavigationCompletionIsCurrent(2,2,{category:'glass-film'},{category:'glass-film'}),true);
 assert.equal(reviewNavigationCompletionIsCurrent(1,2,{category:'glass-film'},{category:'glass-film'}),false);
});
