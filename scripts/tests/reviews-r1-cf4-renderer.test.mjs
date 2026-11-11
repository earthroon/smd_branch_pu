import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { reviewsCardFigmaSlots, reviewsCardPaintQualification } from '../../app/data/reviews-r1-card-figma.ts';
import { reviewsFigmaNodes, reviewsFigmaFilterBindings } from '../../app/data/reviews-r1-figma.ts';
import { reviewsVisualQualification } from '../../app/data/reviews-r1-manifest.ts';
import { REVIEW_FILTER_ORDER, REVIEW_FILTER_V1 } from '../../app/utils/reviews-contract.ts';

const read = file => readFileSync(new URL('../../'+file, import.meta.url),'utf8');
const ledger = read('scripts/fixtures/reviews-r1/skin.jsonl').trim().split('\n').map(JSON.parse);
const nodeMap = new Map(ledger.filter(x=>x.kind==='node').map(x=>[x.nodeKey,x]));
const paintMap = new Map(ledger.filter(x=>x.kind==='node-paint-source-v9-r2a').map(x=>[x.target,x]));
const textMap = new Map(ledger.filter(x=>x.kind==='native-text').map(x=>[x.target,x]));

test('CF4: three immutable Figma card slots and subparts have original node identity, blocked outlines',()=>{
 assert.equal(reviewsCardFigmaSlots.length,3);
 assert.deepEqual(reviewsCardFigmaSlots.map(s=>s.card),['node-4:312','node-4:274','node-4:236']);
 assert.equal(reviewsCardPaintQualification.figmaStroke,'NOT_QUALIFIED');
 for(const slot of reviewsCardFigmaSlots) {
  for(const key of Object.values(slot)) assert.ok(nodeMap.has(key),key);
  assert.equal(paintMap.get(slot.card).status,'blocked');
  for(const key of [slot.title,slot.body,slot.author,slot.course,slot.badgeText])
   assert.ok(textMap.has(key),key);
  assert.equal(textMap.get(slot.title).characters,'제목'); // Never promoted as a public ReviewEntry.
 }
});

test('CF4: semantic DOM components consume CF1+CF3 authorities, not a second filter implementation',()=>{
 const body=read('app/components/reviews/ReviewsBodyStage.vue');
 const tabs=read('app/components/reviews/ReviewsCategoryTabs.vue');
 const card=read('app/components/reviews/ReviewsCard.vue');
 const more=read('app/components/reviews/ReviewsLoadMore.vue');
 assert.match(body,/reviewVisibleItems\(props\.projection, props\.activeFilter, props\.interaction\)/);
 assert.match(body,/:key="entry\.id"/);
 assert.match(body,/v-if="!visible\.empty"/);
 assert.match(body,/v-else[^>]*role="status"|role="status"[^>]*v-else/);
 assert.match(tabs,/REVIEW_FILTER_ORDER/);
 assert.match(tabs,/REVIEW_FILTER_V1/);
 assert.match(tabs,/reviewTabAccessibility\(filter, active\)/);
 assert.match(tabs,/reviewKeyboardTabIntent\(props\.active, event\.key\)/);
 assert.match(tabs,/role="tablist"/);
 assert.match(card,/:data-review-entry-id="entry\.id"/);
 assert.match(card,/REVIEW_FILTER_V1\[entry\.category\]\.label/);
 assert.doesNotMatch(card,/fetch\(|useAsyncData|<NuxtLink/);
 assert.match(more,/v-if="hasMore"/);
 assert.match(more,/type="button"/);
 for(const file of ['ReviewsBodyStage.vue','ReviewsHero.vue','ReviewsFacts.vue','ReviewsCategoryTabs.vue','ReviewsCard.vue','ReviewsLoadMore.vue','ReviewsCta.vue']){
  const code=read('app/components/reviews/'+file);
  assert.doesNotMatch(code,/<SiteHeader|<SiteFooter|localStorage|Math\.random|<iframe|useAsyncData/);
 }
});

test('CF4: Figma title/CTA and four filter text nodes remain byte-derived, no fake testimonials',()=>{
 const hero=read('app/components/reviews/ReviewsHero.vue');
 const cta=read('app/components/reviews/ReviewsCta.vue');
 const source=read('app/data/reviews-r1-source.ts');
 assert.match(hero,/reviewsFigmaNodes\['node-4:353'\]\.text\.characters/);
 assert.match(cta,/reviewsFigmaNodes\['node-4:346'\]\.text\.characters/);
 assert.match(cta,/<NuxtLink[^>]*to="\/curriculum"/);
 assert.equal(reviewsFigmaNodes['node-4:346'].text.characters,'YOUR NEXT CHAPTE');
 assert.equal(reviewsFigmaNodes['node-4:353'].paintQualification.status,'blocked');
 assert.equal(reviewsVisualQualification.productCommitAllowed,false);
 for(const filter of REVIEW_FILTER_ORDER){
  const binding=reviewsFigmaFilterBindings[filter];
  assert.equal(textMap.get(binding.textNode).characters,REVIEW_FILTER_V1[filter].label);
  assert.ok(nodeMap.has(binding.backgroundNode));
 }
 assert.match(source,/entries:\s*\[\]/);
 assert.doesNotMatch(source,/김○준 수강생|본문/);
});

test('CF4: 3/2/1 responsive candidates, design tokens, natural content and source blocked paints',()=>{
 const css=read('app/assets/css/reviews-r1.css');
 assert.match(css,/--reviews-navy:\s*var\(--smd-brand-navy\)/);
 assert.match(css,/--reviews-orange:\s*var\(--smd-action-orange\)/);
 assert.match(css,/--reviews-panel:\s*var\(--smd-surface-panel\)/);
 assert.match(css,/grid-template-columns:\s*repeat\(3/);
 assert.match(css,/@media \(min-width: 700px\) and \(max-width: 1099px\)/);
 assert.match(css,/grid-template-columns:\s*repeat\(2/);
 assert.match(css,/@media \(max-width: 699px\)/);
 assert.match(css,/grid-template-columns:\s*minmax\(0,1fr\)/);
 assert.match(css,/overflow-x:\s*auto/);
 assert.match(css,/focus-visible/);
 assert.match(css,/prefers-reduced-motion/);
 assert.doesNotMatch(css,/scale\(\.75\)|height:\s*3033px|object-fit:\s*cover/);
 assert.match(read('app/components/reviews/ReviewsCta.vue'),/data-source-paint-status="blocked"/);
});
