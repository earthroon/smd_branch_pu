// SMD-NUXT-R2-CF03 source/structure admission.
// Static only: no Nuxt mount, browser, HTTP response, or physical telephony is observed.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseTemplate, tags, attr, loadSfc } from './lib/cf02-template.mjs';

const here = fileURLToPath(new URL('../', import.meta.url));
const pinnedReferenceSha256 = '9f29bbd778bad3314e2907e36b05e97f8f921ef2a8892e5eb987d4e186829f53';
const sha = value => createHash('sha256').update(value).digest('hex');
const equal = (a,b) => JSON.stringify(a) === JSON.stringify(b);
const get = (tree,name) => tags(tree,name);
const sourceContains = (text,all) => all.every(t => text.includes(t));
const fileInventory = root => {
  const paths=[];
  const visit = dir => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (['node_modules','.nuxt','.output','.git','.wrangler','coverage','dist','.data'].includes(entry.name)) continue;
      const full=join(dir,entry.name);
      if (entry.isDirectory()) visit(full);
      else if (entry.isFile()) paths.push(relative(root,full).replaceAll('\\','/'));
    }
  };
  visit(root);
  return paths.sort();
};

export function validateCf03(root=here, { originalPath=null, parentPath=null }={}) {
  root=resolve(root);
  const checks=[];
  const check=(name,pass,details=null) => checks.push({name, pass: Boolean(pass),...(pass || details===null?{}:{details})});
  const read=rel=>readFileSync(join(root,rel));
  const text=rel=>read(rel).toString('utf8');
  const refPath='docs/migration/cf03/source-reference.json';
  const refBytes=read(refPath);
  check('frozen CF03 reference SHA256',sha(refBytes)===pinnedReferenceSha256);
  const ref=JSON.parse(refBytes);
  const parent=ref.parentFileHashes;
  const expectedParent=new Set(Object.keys(parent));
  const allowedNew=new Set(ref.allowedNewFiles);
  const parentChanged=[];
  const unknown=[];
  const missing=[];
  const inventory=fileInventory(root);
  for (const [name,digest] of Object.entries(parent)) {
    const p=join(root,name);
    if (!existsSync(p)||!statSync(p).isFile()) {missing.push(name); continue;}
    if(sha(read(name))!==digest)parentChanged.push(name);
  }
  for (const name of inventory) {
    if(!expectedParent.has(name) && !allowedNew.has(name)) unknown.push(name);
  }
  check('parent CF02 file inventory frozen 85',Object.keys(parent).length===85);
  check('exact CF03 allowed new files',equal(inventory.filter(name=>!expectedParent.has(name)),ref.allowedNewFiles.slice().sort()),inventory.filter(name=>!expectedParent.has(name)));
  check('no missing parent source',missing.length===0,missing);
  check('exactly one parent file changed',equal(parentChanged.sort(),['app/pages/contact.vue']),parentChanged);
  check('no out-of-scope file modifications',parentChanged.every(name=>ref.allowedModifiedParentPaths.includes(name))&&unknown.length===0,{parentChanged,unknown});
  check('original site baseline inherited',ref.originalArchiveSha256==='dafe2bf558842066ec5dd0aa1234005880a0ad303575ae08e964a263b80ccfe3');
  check('parent CF02 full digest inherited',ref.parentArchiveSha256==='43b8119d25b9717849d8a7e0174e51d0b8699932a23f7e6d232982995e6e5caf');
  check('source CSS byte parity preserved',sha(read('app/assets/css/main.css'))==='e695e2bb90ffeb2f3b8ec5ace7ed18c20cf73362ecbccd95ac3b3ef5363054d6');
  if (originalPath) {
    check('supplied original ZIP identity',existsSync(originalPath)&&sha(readFileSync(originalPath))===ref.originalArchiveSha256);
  }
  if (parentPath) {
    check('supplied parent full ZIP identity',existsSync(parentPath)&&sha(readFileSync(parentPath))===ref.parentArchiveSha256);
  }

  const original=JSON.parse(text('docs/migration/cf00/content-baseline.json')).original;
  const routeFixture=JSON.parse(text('scripts/tests/fixtures/cf03-route-navigation.json'));
  const archiveFixture=JSON.parse(text('scripts/tests/fixtures/cf03-archive-categories.json'));
  const seven=['/','/about','/curriculum','/practice','/archive','/promotion','/contact'];
  check('seven public paths ordered',equal(ref.routes,seven)&&equal(routeFixture.paths,seven));
  check('seven public route files exist',seven.every(path=>existsSync(join(root,'app/pages',path==='/'?'index.vue':`${path.slice(1)}.vue`))));
  check('no invented archive detail route',!inventory.some(f=>/^app\/pages\/archive\//.test(f)) && !inventory.filter(f=>f.startsWith('app/') && f.endsWith('.vue')).some(f=>/\b(?:to|href)=['\"]\/archive\//.test(text(f))));
  check('original navigation 3 left + 3 right',original.leftNav.length===3&&original.rightNav.length===3&&equal(ref.headerNav,[...original.leftNav,...original.rightNav]));
  check('frozen navigation fixture order',equal(routeFixture.navigation.left,original.leftNav)&&equal(routeFixture.navigation.right,original.rightNav));
  check('frozen external hrefs',routeFixture.external.kakao===original.KAKAO_URL&&routeFixture.external.instagram===original.INSTAGRAM_URL&&routeFixture.external.youtube===original.YOUTUBE_URL);
  check('CMS seed remains published-data authority',!text('app/composables/useSiteContent.ts').includes('seed-content')&&text('app/app.vue').includes("$fetch<PublicContent>('/api/content')"));

  const h=loadSfc(join(root,'app/components/feature/SiteHeader.vue'));
  const a=loadSfc(join(root,'app/components/feature/ArchiveGallery.vue'));
  const r=loadSfc(join(root,'app/components/feature/Reveal.vue'));
  const c=loadSfc(join(root,'app/components/feature/CtaBand.vue'));
  const footer=loadSfc(join(root,'app/components/feature/SiteFooter.vue'));
  const contact=loadSfc(join(root,'app/pages/contact.vue'));
  const error=loadSfc(join(root,'app/error.vue'));
  const headerNuxt=get(h.tree,'NuxtLink');
  const archiveArticle=get(a.tree,'article')[0];
  const archiveButton=get(a.tree,'button').find(n=>String(attr(n,'@click')).includes('active'));
  const contactAnchor=get(contact.tree,'a').find(n=>attr(n,'v-for')==='channel in channels');

  check('header path exact equality',/route\.path\s*===\s*to/.test(h.script));
  check('header path watcher closes drawer',/watch\(\(\)\s*=>\s*route\.path,\s*\(\)\s*=>\s*\{\s*open\.value\s*=\s*false;\s*\}\)/.test(h.script));
  check('header 16 pixel strict scroll',/window\.scrollY\s*>\s*16/.test(h.script));
  check('header passive scroll listener',/window\.addEventListener\('scroll',\s*onScroll,\s*\{\s*passive:\s*true\s*\}\)/.test(h.script));
  check('header scroll cleanup',/onUnmounted\(\(\)\s*=>\s*\{[\s\S]*?removeEventListener\('scroll',\s*onScroll\)/.test(h.script));
  check('drawer lock stores exact prior overflow',sourceContains(h.script,['bodyOverflowBeforeDrawer = document.body.style.overflow',"document.body.style.overflow = 'hidden'",'document.body.style.overflow = bodyOverflowBeforeDrawer']));
  check('drawer lock release on unmount',/onUnmounted\([\s\S]*?releaseDrawerLock\(\)/.test(h.script));
  check('drawer responds to reactive open',/watch\(open,\s*setDrawerLock,\s*\{\s*flush:\s*'sync'\s*\}\)/.test(h.script));
  check('mobile drawer original aria+transition',h.source.includes(':aria-expanded="open"')&&h.source.includes("open ? 'max-h-[420px]' : 'max-h-0 border-t-transparent'"));
  check('header six navigation link bindings',headerNuxt.length===4 && headerNuxt.filter(n=>attr(n,'v-for')).length===3 && h.source.includes('content?.navigation.leftNav')&&h.source.includes('content?.navigation.rightNav')&&h.source.includes('v-for="item in nav"'));
  check('header external CTA retains anchor attributes',get(h.tree,'a').length===2 && get(h.tree,'a').every(n=>attr(n,'target')==='_blank'&&attr(n,'rel')==='noopener noreferrer'));
  check('header internal links never manually suppressed',!h.script.includes('preventDefault')&&!h.script.includes('router.push')&&!h.source.includes('@click.prevent'));
  check('footer internal navigation uses NuxtLink',get(footer.tree,'NuxtLink').length>=2 && footer.script.includes('content.value?.navigation.leftNav')&&footer.script.includes('content.value?.navigation.rightNav'));
  check('external links are native anchors',get(footer.tree,'a').length>=1&&get(footer.tree,'a').every(n=>attr(n,'target')==='_blank'&&attr(n,'rel')==='noopener noreferrer'));

  check('archive filter defaults ALL',/const active\s*=\s*ref\('ALL'\)/.test(a.script));
  check('archive filter exact category equality',/\.filter\(i\s*=>\s*i\.category\s*===\s*active\.value\)/.test(a.script));
  check('archive filter maintains items order',a.script.includes("active.value==='ALL'") && !/\.sort\(|\.reverse\(/.test(a.script));
  check('archive native button click and selected aria',archiveButton&&attr(archiveButton,'type')==='button'&&attr(archiveButton,'@click')==='active=filter'&&attr(archiveButton,':aria-pressed')==='active===filter');
  check('archive card has no invented navigation',archiveArticle&&get(archiveArticle,'a').length===0&&get(archiveArticle,'NuxtLink').length===0&&!('@click' in archiveArticle.attrs));
  check('archive original filter fixture',equal(ref.archiveFilters,original.archiveFilters)&&equal(archiveFixture.filters,original.archiveFilters));
  check('archive frozen item order+counts',equal(archiveFixture.sourceItems,original.archiveItems)&&equal(ref.archiveCounts,archiveFixture.frozenCountByFilter));
  check('archive delay is filtered index*80',a.source.includes(':delay="index*80"')&&a.source.includes(':key="item.title"'));
  check('archive existing empty state retained',a.source.includes(archiveFixture.emptyMessage));

  check('Reveal starts hidden in SSR',r.script.includes('const visible = ref(false);')&&r.source.includes("visible ? 'translate-y-0 opacity-100' : 'translate-y-7 opacity-0'"));
  check('Reveal observer options frozen',r.script.includes('threshold: 0.14')&&r.script.includes("rootMargin: '0px 0px -40px 0px'"));
  check('Reveal one-time unobserve',r.script.includes('observer?.unobserve(entry.target)'));
  check('Reveal cleanup disconnect',r.script.includes('observer?.disconnect()')&&r.script.includes('disposed = true;'));
  check('Reveal late callback guard',r.script.includes('!disposed && entry.isIntersecting'));
  check('Reveal no-IO fallback',r.script.includes("!('IntersectionObserver' in window)")&&r.script.includes('visible.value = true;'));
  check('Reveal transition+delay frozen',r.source.includes('duration-[850ms]')&&r.source.includes('ease-[cubic-bezier(0.22,1,0.36,1)]')&&r.source.includes('transitionDelay: `${props.delay}ms`'));

  check('CTA internal NuxtLink vs external anchor branches',get(c.tree,'NuxtLink').length===1&&get(c.tree,'a').length===1&&c.source.includes('v-if="external"')&&c.source.includes('v-else'));
  check('CTA external native safe link',get(c.tree,'a').every(n=>attr(n,'target')==='_blank'&&attr(n,'rel')==='noopener noreferrer'&&attr(n,':href')==='content?.navigation.kakaoUrl'));
  check('CTA internal route owns to',get(c.tree,'NuxtLink').every(n=>attr(n,':to')==='to')&&c.script.includes("to: '/contact'"));
  check('contact published phone to digits URI',contact.script.includes("c.value?.navigation.contactPhone")&&contact.script.includes("replace(/[^\\d]/g,'')")&&!contact.script.includes('0505-738-2101'));
  check('contact source tel target restored',contactAnchor&&attr(contactAnchor,'target')==='_blank'&&attr(contactAnchor,'rel')==='noopener noreferrer'&&!(':target' in contactAnchor.attrs));
  check('contact external URL sources published',sourceContains(contact.script,['c.value?.navigation.kakaoUrl','c.value?.navigation.instagramUrl','c.value?.navigation.youtubeUrl']));
  const parentTel=ref.sourceInteraction.contactTelTargetCf02;
  const exactParentContact = contact.source.replace('target="_blank"',`:target="${parentTel}"`);
  check('contact target is single surgical diff',sha(Buffer.from(exactParentContact))===parent['app/pages/contact.vue']);
  check('phone frozen URI derived from original',ref.sourceInteraction.phoneUri==='tel:'+original.CONTACT_PHONE.replace(/[^0-9]/g,'')&&routeFixture.phone.href===ref.sourceInteraction.phoneUri&&routeFixture.phone.target==='_blank');

  check('404 has two NuxtLink recovery routes',get(error.tree,'NuxtLink').length===2 && ['/', '/contact'].every(dest=>get(error.tree,'NuxtLink').some(n=>attr(n,'to')===dest && String(attr(n,'@click')).includes('clearError'))));
  check('404 server HTTP status preserved',error.script.includes('setResponseStatus(event, effectiveStatus.value)'));
  check('CMS unavailable fails closed',text('app/app.vue').includes('throw toPublicContentError(error.value)')&&text('app/app.vue').includes('observed === 404')&&error.script.includes('? upstream : 503'));
  check('global router scroll policy not invented',!inventory.includes('app/router.options.ts')&&!text('app/components/feature/SiteHeader.vue').includes('window.scrollTo('));
  check('public FAQ overlay not promoted',!text('app/layouts/default.vue').includes('InquiryBot'));
  check('original form and worker files byte retained',parentChanged.every(x=>!x.startsWith('workers/')&&!x.startsWith('server/')&&!x.startsWith('app/components/contact/')));
  check('original publicity layout untouched',parentChanged.every(x=>!x.startsWith('app/pages/')||x==='app/pages/contact.vue'));

  const failures=checks.filter(check=>!check.pass);
  return {
    contract:'SMD-NUXT-R2-CF03',
    static:{passed:checks.length-failures.length,total:checks.length,status:failures.length?'FAIL':'PASS'},
    pass:failures.length===0,
    failures,
    checks,
    scope:{parentFiles:Object.keys(parent).length,modifiedParentFiles:parentChanged,unapprovedFiles:unknown,missingParentFiles:missing},
    telTargetPolicy:'RESTORE_ORIGINAL_TARGET_BLANK',
    evidence:{source:'CONFIRMED',static:failures.length?'FAIL':'PASS',compile:'UNKNOWN',ssr:'UNKNOWN',hydration:'UNKNOWN',browser:'UNKNOWN',performance:'NOT_MEASURED',promoted:false}
  };
}

const invoked=process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(invoked) {
  const arg=(flag)=>{const index=process.argv.indexOf(flag);return index<0?null:process.argv[index+1]};
  try {
    const result=validateCf03(arg('--root')??here,{originalPath:arg('--original'),parentPath:arg('--parent')});
    console.log(JSON.stringify(result,null,2));
    console.log(`${result.pass?'PASS':'FAIL'}_SMD_NUXT_R2_CF03_INTERACTION_STATIC ${result.static.passed}/${result.static.total}`);
    if(!result.pass)process.exitCode=1;
  }catch(e){console.error('FAIL_SMD_NUXT_R2_CF03_STATIC_FATAL',String(e));process.exitCode=1;}
}
