import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  attr, directElements, getText, hasClass, loadSfc, findElements, tags,
} from './lib/cf02-template.mjs';

// The validator uses the frozen source-derived reference and a structural
// template reader. No browser, Vue compiler, or Cloudflare runtime is implied.
const defaultRoot = fileURLToPath(new URL('../', import.meta.url));
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const trimmed = (v) => String(v).replace(/\s+/g, ' ').trim();
const equalList = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const get = (node, key) => attr(node, key);
const locate = (tree, tag, token) => tags(tree, tag).find(n => trimmed(getText(n)).includes(token));
const includesAll = (source, terms) => terms.every(term => source.includes(term));
const fileNames = (dir) => {
  const results = [];
  const visit = (folder) => {
    for (const ent of readdirSync(folder, { withFileTypes: true })) {
      if (ent.isDirectory() && ['node_modules','.nuxt','.output','.git','.wrangler','coverage','dist','.data'].includes(ent.name)) continue;
      const file = join(folder, ent.name);
      if (ent.isDirectory()) visit(file);
      else if (ent.isFile()) results.push(relative(dir, file).replaceAll('\\','/'));
    }
  };
  visit(dir);
  return results;
};

export function validateCf02(root=defaultRoot, opts={}) {
  const checks=[];
  const check=(name,ok,info=null) => checks.push({name,pass: Boolean(ok),...(ok || info === null ? {} : {details:info})});
  const file=(p) => join(root,p);
  const read=(p) => readFileSync(file(p),'utf8');
  const expectedReferenceDigest = 'e037db7f44266a16ba65dfce83c425a1bc97024a57b955b7a6a1f6a56af3e888';
  check('frozen reference digest',sha(readFileSync(file('docs/migration/cf02/source-reference.json'))) === expectedReferenceDigest);
  const ref=JSON.parse(read('docs/migration/cf02/source-reference.json'));
  const parent=ref.parentFileHashes;
  const allowed=new Set(ref.allowChangedPaths);
  const modified=[];
  const suspicious=[];
  const manifestFiles=Object.keys(parent);
  const unknownFiles=fileNames(root).filter(f=>!Object.hasOwn(parent,f) && !f.startsWith('docs/migration/cf02/') && ![
    'scripts/cf02-page-static.mjs', 'scripts/lib/cf02-template.mjs', 'scripts/tests/cf02-page.test.mjs',
  ].includes(f));
  for (const [name,digest] of Object.entries(parent)) {
    const actual=existsSync(file(name)) && statSync(file(name)).isFile() ? sha(readFileSync(file(name))) : 'MISSING';
    if (actual !== digest) {
      modified.push(name);
      if (!allowed.has(name)) suspicious.push(name);
    }
  }
  check('parent file set',manifestFiles.length === 79);
  check('changed paths only approved', suspicious.length === 0 && unknownFiles.length === 0,{suspicious,unknownFiles});
  check('expected ten view edits', equalList(modified.sort(),ref.allowChangedPaths.slice().sort()),modified);
  const frozen=JSON.parse(read('docs/migration/cf00/receipt.json'));
  check('original archive identity inherited', ref.originalArchiveSha256 === frozen.sourceArchiveSha256 && ref.originalArchiveSha256 === 'dafe2bf558842066ec5dd0aa1234005880a0ad303575ae08e964a263b80ccfe3');
  check('parent CF01 archive identity', ref.parentArchiveSha256 === '3778ba4205573c2e78dd173c21e1c95e79aeb07fd5f672866bb680619d7ead20');
  check('original CSS unchanged',sha(readFileSync(file('app/assets/css/main.css'))) === 'e695e2bb90ffeb2f3b8ec5ace7ed18c20cf73362ecbccd95ac3b3ef5363054d6');
  const frozenSite=JSON.parse(read('docs/migration/cf00/content-baseline.json'));
  const cms=JSON.parse(read('shared/seed-content.json'));
  check('CF00 15 exports retained', frozenSite.exports.length === 15);
  check('teaching values source-aligned', equalList(cms.training.teachItems,frozenSite.original.teachItems));
  check('archive filters source-aligned', equalList(cms.archive.filters,frozenSite.original.archiveFilters));
  check('archive items source-aligned',equalList(cms.archive.items,frozenSite.original.archiveItems));
  check('about arrays source-aligned',equalList(cms.about.pillars,frozenSite.original.aboutPillars) && equalList(cms.about.instructorPoints,frozenSite.original.instructorPoints));
  check('promotion card/fact values source-aligned',equalList(cms.promotion.info,frozenSite.original.promotionInfo) && equalList(cms.promotion.priceCards,frozenSite.original.priceCards));
  check('known CMS benefit drift remains explicit',cms.promotion.benefits[0].desc === ref.knownDrift.current && frozenSite.original.promotionBenefits[0].desc === ref.knownDrift.source && cms.promotion.benefits[0].desc !== frozenSite.original.promotionBenefits[0].desc);
  check('remaining benefit values source-aligned',equalList(cms.promotion.benefits.slice(1),frozenSite.original.promotionBenefits.slice(1)));
  check('original marketing fixture conditions',cms.promotion.headline === ref.originalPageCopy.promotionHeadline.join('\n') && cms.promotion.totalSeats === 5);
  // Frozen from original TSX JSXText AST (56 substantive literal tokens).
  // Four promotion literals are sourced from the existing CMS snapshot rather
  // than duplicated in the Vue component. Their projection is explicitly scoped.
  for (const [path,items] of Object.entries(ref.sourceLiterals)) {
    const view=trimmed(read(path));
    for (const [index,entry] of items.entries()) {
      const cmsValue=entry.owner==='inline' ? null
        : entry.owner==='promotion.headline' ? cms.promotion.headline
        : entry.owner==='promotion.seatHeadline' ? cms.promotion.seatHeadline
        : entry.owner==='promotion.depositTerms' ? cms.promotion.depositTerms
        : null;
      const pass=entry.owner==='inline' ? view.includes(entry.text) : cmsValue !== null && trimmed(cmsValue).includes(entry.text);
      check(`original JSX text ${path} #${index}`,pass,{text:entry.text,owner:entry.owner});
    }
  }


  // Verify all source-referenced image uses structurally: a real img with
  // matching src, alt and title inside its original ratio + width frame.
  for (const [name,imageUses] of Object.entries(ref.sourceImages)) {
    const {tree}=loadSfc(file(name));
    for (const [i,image] of imageUses.entries()) {
      const matched=tags(tree,'img').find(node=>String(get(node,'src')).endsWith('/'+image.url) && get(node,'alt')===image.alt && get(node,'title')===image.title && hasClass(node,'object-top') && hasClass(node,'object-cover') && hasClass(node.parent,image.ratio) && hasClass(node.parent,'w-full'));
      check(`image ${name} #${i} attrs+frame`,Boolean(matched));
    }
  }
  const pages={};
  for (const page of ['index','about','curriculum','practice','archive','promotion','contact']) pages[page]=loadSfc(file(`app/pages/${page}.vue`));
  check('all public pages present',ref.routes.length===7 && Object.keys(pages).length===7);
  const expectedRoot={
    index:['HeroSection','StatementSection','TeachSection','PracticeBlock','ArchiveGallery','CtaBand'],
    about:['PageHero','section','section','CtaBand'],
    curriculum:['PageHero','section','section','CtaBand'],
    practice:['PageHero','section','CtaBand'],
    archive:['PageHero','ArchiveGallery','CtaBand'],
    promotion:['PageHero','section','section','CtaBand'],
    contact:['PageHero','section'],
  };
  for (const [page,sequence] of Object.entries(expectedRoot)) {
    check(`${page} root section order`,equalList(directElements(pages[page].tree).map(n=>n.tag),sequence));
  }
  const hero=loadSfc(file('app/components/home/HeroSection.vue'));
  const statement=loadSfc(file('app/components/home/StatementSection.vue'));
  const teach=loadSfc(file('app/components/home/TeachSection.vue'));
  const practiceBlock=loadSfc(file('app/components/feature/PracticeBlock.vue'));
  const grid=loadSfc(file('app/components/feature/TeachGrid.vue'));
  const archive=loadSfc(file('app/components/feature/ArchiveGallery.vue'));
  check('home source heading and responsive split',includesAll(hero.source,['인테리어필름 시공의','기본부터 실전까지.','<br />','hidden sm:block','lg:grid-cols-[1.05fr_1fr]','animation-delay:140ms']));
  check('home three facts and CMS count authority',includesAll(hero.script,['정원 ${c.value?.promotion.totalSeats','교육 기간','6주 · 48시간','현장 실무 연계']) && !hero.script.includes('promotion.filledSeats'));
  check('home source paragraph and reveal',includesAll(statement.source,[ref.originalPageCopy.statementParagraph.slice(0,24),'tracking-tight','lg:grid-cols-2',':delay="120"']));
  check('teach section text and shared grid',hasClass(locate(teach.tree,'h2','어떤 것을 배울 수 있나요.'),'tracking-tight') && tags(teach.tree,'TeachGrid').length===1 && tags(pages.curriculum.tree,'TeachGrid').length===1);
  check('practice montage original geometry',includesAll(practiceBlock.source,['ri-tools-line','aspect-[16/10]','aspect-[4/3]','tracking-tight','to="/practice"','<NuxtLink',':delay="120"']));
  const articles=tags(grid.tree,'article');
  const card=articles[0];
  const gridPicture=tags(grid.tree,'img')[0];
  const gridReveal=tags(grid.tree,'Reveal')[0];
  check('TeachGrid responsive 4 cards source',hasClass(directElements(grid.tree)[0],'lg:grid-cols-4') && get(gridReveal,'v-for')?.includes('c?.training.teachItems') && get(gridReveal,':key')==='item.num' && get(gridReveal,':delay')==='index*90' && cms.training.teachItems.length===4);
  check('TeachGrid card transition and content',card && hasClass(card,'duration-300') && hasClass(card,'hover:border-primary-300') && hasClass(locate(grid.tree,'h3','{{ item.title }}'),'tracking-tight') && hasClass(tags(grid.tree,'span').find(n=>String(getText(n)).includes('item.num')),'tracking-wide'));
  check('TeachGrid image exact props+hover',get(gridPicture,':src')==='item.image' && get(gridPicture,':alt')==='item.alt' && String(get(gridPicture,':title')).includes('인테리어필름 시공 실습') && hasClass(gridPicture,'duration-700') && hasClass(gridPicture,'group-hover:scale-[1.04]'));
  check('about 3 pillars 3 instructor points',cms.about.pillars.length===3 && cms.about.instructorPoints.length===3 && tags(pages.about.tree,'Reveal').some(n=>get(n,'v-for')?.includes('about.pillars')) && tags(pages.about.tree,'li').some(n=>String(get(n,'v-for')).includes('instructorPoints')));
  check('about typography and grids',tags(pages.about.tree,'h2').every(n=>hasClass(n,'tracking-tight')) && hasClass(locate(pages.about.tree,'h3','pillar.title'),'tracking-tight') && hasClass(tags(pages.about.tree,'div').find(n=>trimmed(getText(n))==='{{ pillar.num }}'),'tracking-[0.1em]') && pages.about.source.includes('md:grid-cols-3') && pages.about.source.includes('lg:grid-cols-2'));
  const curr=pages.curriculum;
  check('curriculum four steps original exact',equalList(parseLocalConst(curr.script,'process',['step','title','desc']),ref.pageLocal.process));
  check('curriculum step card classes',hasClass(locate(curr.tree,'h2','배우는 순서.'),'tracking-tight') && curr.source.includes('sm:grid-cols-2 lg:grid-cols-4') && curr.source.includes('gap-px overflow-hidden rounded-lg') && curr.source.includes('grid h-8 w-8') && get(tags(curr.tree,'div').find(n=>String(get(n,'v-for')).startsWith('item in process')),':key')==='item.step');
  const prac=pages.practice;
  check('practice four facilities original exact',equalList(parseLocalConst(prac.script,'facilities',['icon','title','desc']),ref.pageLocal.facilities));
  check('practice facility and grid classes',prac.source.includes('sm:grid-cols-2 lg:grid-cols-4') && prac.source.includes('bg-background-50 p-6') && prac.source.includes(':delay="index*90"'));
  const arch=archive.tree;
  const filt=tags(arch,'span').find(n=>get(n,'v-for')?.includes('archive.filters'));
  check('archive filter grouped slash+button',filt && hasClass(filt,'gap-2') && tags(filt,'button').length===1 && tags(filt,'span').some(n=>get(n,'v-if')==='index > 0') && hasClass(tags(filt,'button')[0],'nonexistent')===false && String(get(tags(filt,'button')[0],':class')).includes('duration-300'));
  check('archive six filters/source items',cms.archive.filters.length===6 && cms.archive.filters[0]==='ALL' && cms.archive.items.length===6 && archive.script.includes("ref('ALL')") && archive.script.includes("filter(i=>i.category===active.value)"));
  const archiveArticle=tags(arch,'article')[0];
  check('archive card source hover+icon',archiveArticle && hasClass(archiveArticle,'cursor-pointer') && hasClass(tags(archiveArticle,'div').find(n=>hasClass(n,'aspect-[4/3]')),'group-hover:border-primary-500/60') && tags(archiveArticle,'i').some(n=>hasClass(n,'ri-arrow-right-line') && hasClass(n,'group-hover:translate-x-1')));
  check('archive placeholders with optional CMS images only',archive.source.includes('v-if="item.image"') && archive.source.includes('v-else') && tags(arch,'a').length===0 && archive.source.includes('group-hover:text-primary-400'));
  const prom=pages.promotion;
  const seat=tags(prom.tree,'span').find(n=>get(n,'v-for')?.includes('campaignSeatAllocation'));
  check('promotion 4/2/4 CMS display lists',cms.promotion.info.length===4 && cms.promotion.priceCards.length===2 && cms.promotion.benefits.length===4 && prom.source.includes('promo?.info') && prom.source.includes('promo?.priceCards') && prom.source.includes('promo?.benefits'));
  check('promotion source headline exactly one br',tags(prom.tree,'template').some(n=>get(n,'#title')===true && tags(n,'br').length===1 && getText(n).includes('headlineLines?.[0]') && getText(n).includes('headlineLines?.[1]')) && prom.script.includes("source.split('\\n')") && prom.script.includes('HEADLINE_FORMAT_UNSUPPORTED'));
  check('promotion five tier allocation visual',seat && get(seat,'aria-hidden')==='true' && get(seat,':key')==='index' && prom.script.includes('[true, true, false, false, false]') && prom.script.includes(ref.originalPageCopy.promotionSeatLabel));
  check('promotion no occupancy-driven circle',!prom.source.slice(prom.source.indexOf('<template>')).includes('filledSeats') && !prom.source.slice(prom.source.indexOf('<template>')).includes('enrollmentStatus') && !prom.source.includes('등록 {{ promo.filledSeats }}명'));
  check('promotion seat marketing not occupied in aria',tags(prom.tree,'div').some(n=>get(n,'role')==='group' && String(get(n,'aria-label')).includes('현재 등록 인원 아님')));
  check('promotion deposit terms source semantics',tags(prom.tree,'strong').some(n=>hasClass(n,'font-semibold') && hasClass(n,'text-foreground-900') && getText(n).includes('depositPresentation?.title')) && prom.script.includes('DEPOSIT_TERMS_FORMAT_UNSUPPORTED') && prom.script.includes("source.slice(0, position) !== '얼리버드 운영 기준'"));
  check('promotion badge and pricing typography',prom.source.includes("font-label text-[11px] tracking-wide'") && prom.source.includes('font-heading text-4xl font-semibold tracking-tight') && prom.source.includes('font-label text-[11px] tracking-wide text-accent-900'));
  const contact=pages.contact;
  const contacts=tags(contact.tree,'a').find(n=>get(n,'v-for')==='channel in channels');
  check('contact channel list and grid',contacts && contact.script.includes('ri-kakao-talk-fill') && contact.script.includes('ri-phone-line') && contact.script.includes('ri-instagram-line') && contact.script.includes('ri-youtube-line') && contact.source.includes('lg:grid-cols-[1fr_1.25fr] lg:gap-14') && contact.source.includes('sm:grid-cols-2 lg:grid-cols-1'));
  check('contact hover chain restored',hasClass(contacts,'duration-300') && hasClass(tags(contacts,'span').find(n=>hasClass(n,'bg-background-100')),'group-hover:bg-primary-100') && tags(contacts,'i').some(n=>hasClass(n,'ri-arrow-right-line') && hasClass(n,'group-hover:translate-x-1') && hasClass(n,'duration-300')));
  check('contact hours and form unchanged',ref.originalPageCopy.contactHours.every(t=>contact.source.includes(t)) && tags(contact.tree,'ContactForm').length===1 && tags(contact.tree,'Reveal').some(n=>get(n,':delay')==='120'));
  check('tel target semantic deferred CF03',contact.source.includes(`:target="channel.href.startsWith('tel:')?undefined:'_blank'"`));
  check('CSS/browser custom styling not introduced',ref.allowChangedPaths.every(path=>!read(path).includes('<style')));
  check('no unknown source archive images/route destinations',!archive.source.includes('to="/archive/') && !archive.source.includes('href="/archive/'));
  if (opts.originalPath) {
    check('original supplied archive matches frozen identity',existsSync(opts.originalPath) && sha(readFileSync(opts.originalPath))===ref.originalArchiveSha256);
  }
  const failures=checks.filter(x=>!x.pass);
  return {
    contract:'SMD-NUXT-R2-CF02',
    passed: failures.length===0,
    checksPassed:checks.length-failures.length,
    checksTotal:checks.length,
    failures, checks,
    changes:modified, noTouchViolations:suspicious,
    copyParity: {pageLocal: checks.find(x=>x.name==='curriculum four steps original exact')?.pass && checks.find(x=>x.name==='practice four facilities original exact')?.pass && checks.filter(x=>x.name.startsWith('original JSX text ')).every(x=>x.pass) ? 'PASS_STATIC_LITERAL_AND_ARRAY' : 'FAIL', cmsBenefit:'BLOCKED_CF04_SEED_DRIFT', fullProduction:false},
    evidence: {source:'FROZEN_SOURCE_REFERENCE', static:failures.length===0?'PASS':'FAIL', compile:'UNKNOWN', runtime:'UNKNOWN', physical:'UNKNOWN', performance:'NOT_MEASURED',promoted:false},
  };
}

function parseLocalConst(source,name,keys) {
  const pattern=new RegExp(`const\\s+${name}\\s*=\\s*\\[([\\s\\S]*?)\\];`);
  const arr=pattern.exec(source)?.[1]??'';
  const records=[];
  for (const match of arr.matchAll(/\{([^{}]+)\}/g)) {
    const pairs=Object.fromEntries([...match[1].matchAll(/(\w+)\s*:\s*'([^']*)'/g)].map(x=>[x[1],x[2]]));
    records.push(Object.fromEntries(keys.map(key=>[key,pairs[key]])));
  }
  return records;
}

const invoked=process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url);
if (invoked) {
  const flag=(name)=>{
    const index=process.argv.indexOf(name);
    return index>=0 ? process.argv[index+1] : undefined;
  };
  try {
    const report=validateCf02(flag('--root') ? resolve(flag('--root')) : defaultRoot,{originalPath:flag('--original')});
    console.log(JSON.stringify(report,null,2));
    console.log(`${report.passed?'PASS':'FAIL'}_SMD_NUXT_R2_CF02_PAGE_STATIC ${report.checksPassed}/${report.checksTotal}`);
    if (!report.passed) process.exitCode=1;
  } catch (error) {
    console.error(`FAIL_SMD_NUXT_R2_CF02_PAGE_STATIC_FATAL ${String(error)}`);
    process.exitCode=1;
  }
}
