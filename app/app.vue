<script setup lang="ts">
import { useContentMode } from '~/composables/useContentMode';
import {useStandaloneMediaState} from '~/composables/useStandalonePublishedMedia';
import {validateStandaloneMediaManifest} from '~/utils/standalone-media-public';
import { useSiteContent } from '~/composables/useSiteContent';
import { useHomeR2Published } from '~/composables/useHomeR2Published';
import { useSelectedCategoryPage, type SelectedPublicPageState } from '~/composables/useSelectedCategoryPage';
import type { PublicContentV2 } from '@smd/content-contracts/contracts';
import {
  STANDALONE_PREVIEW_PUBLICATION_ID, standalonePreviewPathAllowed,
  standalonePreviewContent, standalonePreviewSelected,
} from '~/utils/publicStandalonePreview';
import {
  admitHomeScaffold, resolveHomeScaffoldPath, scaffoldAdmissionCurrent, homeR2PublishedFromRender,
  type PublicRenderResult, type ScaffoldAdmission,
} from '~/utils/homeR2ScaffoldAdmission';

const route = useRoute();
const standalone = useContentMode() === 'standalone';
const requestEvent = import.meta.server ? useRequestEvent() : undefined;
const isStatic = computed(() => route.path === '/privacy');
const content = useSiteContent();
const homePublished = useHomeR2Published();
const selected = useSelectedCategoryPage();
const mediaMode = String(useRuntimeConfig().public.standaloneMediaMode ?? 'local');
const mediaSourceLockDigest = String(useRuntimeConfig().public.standaloneMediaSourceLockDigest ?? '');
const mediaActive = standalone && mediaMode === 'published';
const mediaShared = useStandaloneMediaState();
const {data: mediaEnvelope, error: mediaError, refresh: refreshStandaloneMedia} = await useAsyncData(
  'smd-standalone-media-manifest-v1', async (_app,{signal}) => {
    if (!mediaActive) return {kind:'local' as const};
    if (!/^[a-f0-9]{64}$/.test(mediaSourceLockDigest))
      throw createError({statusCode:503,statusMessage:'STANDALONE_SOURCE_LOCK_NOT_PINNED'});
    const target='/api/media/standalone/manifest';
    const response=import.meta.server
      ? await requestEvent?.fetch(target,{signal,redirect:'manual'})
      : await fetch(target,{signal,redirect:'manual'});
    if (!response || response.status!==200)
      throw createError({statusCode:503,statusMessage:'STANDALONE_MEDIA_MANIFEST_UNAVAILABLE'});
    let raw:unknown;
    try{raw=await response.json();}catch{throw createError({statusCode:503,statusMessage:'STANDALONE_MEDIA_MANIFEST_INVALID'});}
    return {kind:'published' as const,manifest:validateStandaloneMediaManifest(raw,mediaSourceLockDigest)};
  },{dedupe:'cancel'});
watch(mediaEnvelope,entry=>{
  mediaShared.value=entry?.kind==='published'?entry.manifest:null;
},{immediate:true,flush:'sync'});
const mediaRefreshing=ref(false);
if (import.meta.client && mediaActive) {
  watch(()=>route.fullPath,()=>{
    mediaRefreshing.value=true;
    void refreshStandaloneMedia().finally(()=>{mediaRefreshing.value=false;});
  });
  watch(mediaError,failure=>{
    if(failure)showError(createError({statusCode:503,statusMessage:'STANDALONE_MEDIA_MANIFEST_FAILED'}));
  });
}
if(mediaActive && mediaError.value)
  throw createError({statusCode:503,statusMessage:'STANDALONE_MEDIA_MANIFEST_FAILED'});
const mediaCurrent=computed(()=>!mediaActive || (mediaEnvelope.value?.kind==='published' &&
  mediaShared.value?.publication.id===mediaEnvelope.value.manifest.publication.id &&
  !mediaError.value && !mediaRefreshing.value));

const requestKey = computed(() => {
  switch (true) {
    case isStatic.value: return `smd-static:${route.path}`;
    case standalone && route.path === '/reviews': return 'smd-reviews-standalone:/reviews';
    case resolveHomeScaffoldPath(route.path) !== null: return `smd-scaffold:${route.path}`;
    default: return `smd-render:${route.path}`;
  }
});
type RootResult =
  | { mode: 'static'; path: string }
  | { mode: 'standalone'; path: string; kind: 'home' | 'scaffold' }
  | { mode: 'standalone'; path: '/reviews'; kind: 'reviews'; local: PublicContentV2 }
  | { mode: 'standalone'; path: string; kind: 'legacy'; local: PublicContentV2; localSelected: SelectedPublicPageState }
  | { mode: 'public'; path: string; render: PublicRenderResult }
  | { mode: 'redirect'; path: string; to: string }
  | ScaffoldAdmission;

const { data, error, pending } = await useAsyncData<RootResult>(requestKey, async (_app, { signal }) => {
  const path = route.path;
  if (path === '/admin' || path.startsWith('/admin/'))
    throw createError({ statusCode: 404, statusMessage: 'PUBLIC_ADMIN_ROUTE_NOT_FOUND' });
  if (path === '/privacy') return { mode: 'static', path };
  if (standalone) {
    if (!standalonePreviewPathAllowed(path))
      throw createError({ statusCode: 404, statusMessage: 'PUBLIC_STANDALONE_ROUTE_NOT_FOUND' });
    switch (path) {
      case '/': return { mode: 'standalone', path, kind: 'home' };
      case '/reviews': {
        let local: PublicContentV2;
        try { local = standalonePreviewContent(); }
        catch (failure: unknown) {
          throw createError({ statusCode: 503, statusMessage: 'PUBLIC_STANDALONE_PREVIEW_SOURCE_INVALID',
            data: { causeCode: failure instanceof Error ? failure.message : 'UNKNOWN' } });
        }
        return { mode: 'standalone', path, kind: 'reviews', local };
      }
      case '/faq': return { mode: 'standalone', path, kind: 'scaffold' };
      default: {
        let local: PublicContentV2;
        try { local = standalonePreviewContent(); }
        catch (failure: unknown) {
          throw createError({ statusCode: 503, statusMessage: 'PUBLIC_STANDALONE_PREVIEW_SOURCE_INVALID',
            data: { causeCode: failure instanceof Error ? failure.message : 'UNKNOWN' } });
        }
        const localSelected = standalonePreviewSelected(path, local);
        if (localSelected?.selected.mode !== 'legacy')
          throw createError({ statusCode: 503, statusMessage: 'PUBLIC_STANDALONE_PREVIEW_IDENTITY_INVALID' });
        return { mode: 'standalone', path, kind: 'legacy', local, localSelected };
      }
    }
  }

  const scaffold = resolveHomeScaffoldPath(path);
  // A scaffold never fabricates a selected CMS page: its shared data is the *real* home publication.
  const sourcePath = scaffold === null ? path : '/';
  const target = `/api/render?path=${encodeURIComponent(sourcePath)}`;
  let response: Response;
  if (import.meta.server) {
    if (!requestEvent) throw createError({ statusCode: 503, statusMessage: 'PUBLIC_SSR_EVENT_UNAVAILABLE' });
    response = await requestEvent.fetch(target, { signal, redirect: 'manual' });
  } else {
    response = await fetch(target, { signal, redirect: 'manual' });
  }
  if (response.status === 308) {
    if (scaffold !== null) throw createError({ statusCode: 503, statusMessage: 'SMD_HOME_R2_SCAFFOLD_SOURCE_UNAVAILABLE' });
    const to = response.headers.get('location');
    if (!to || !/^\/[a-z0-9/-]+$/.test(to) || to.includes('//'))
      throw createError({ statusCode: 503, statusMessage: 'CMS_RENDER_REDIRECT_INVALID' });
    return { mode: 'redirect', path, to };
  }
  let payload: unknown;
  try { payload = await response.json(); }
  catch { throw createError({ statusCode: 503, statusMessage: scaffold === null ? 'CMS_RENDER_RESPONSE_INVALID' : 'SMD_HOME_R2_SCAFFOLD_SOURCE_UNAVAILABLE' }); }

  if (response.status !== 200 || !payload || typeof payload !== 'object') {
    const detail = payload && typeof payload === 'object' && 'error' in payload &&
      typeof payload.error === 'string' ? payload.error : 'CMS_RENDER_FAILED';
    if (scaffold !== null) {
      throw createError({ statusCode: 503, statusMessage: 'SMD_HOME_R2_SCAFFOLD_SOURCE_UNAVAILABLE', data: { sourceCode: detail } });
    }
    throw createError({ statusCode: [400, 404, 503].includes(response.status) ? response.status : 503, statusMessage: detail });
  }
  if (scaffold !== null) {
    try { return admitHomeScaffold(path, payload); }
    catch { throw createError({ statusCode: 503, statusMessage: 'SMD_HOME_R2_SCAFFOLD_SOURCE_IDENTITY_DRIFT' }); }
  }
  return { mode: 'public', path, render: payload as PublicRenderResult };
}, { dedupe: 'cancel' });

/** Route identity must match before shared or selected projections are accepted. */
watch([data, () => route.path], ([result, path]) => {
  switch (result?.mode) {
    case 'standalone':
      if (standalone && result.path === path && standalonePreviewPathAllowed(path)) {
        homePublished.value = null;
        switch (result.kind) {
          case 'home':
          case 'scaffold':
            selected.value = null;
            content.value = null;
            return;
          case 'reviews':
            selected.value = null;
            content.value = result.local;
            return;
          case 'legacy':
            content.value = result.local;
            selected.value = result.localSelected;
            return;
        }
      }
      break;
    case 'public': {
      const r = result.render;
      if (result.path === path && r.requestedPath === path &&
          r.shared.publication.id === r.publication.id &&
          r.shared.publication.digest === r.publication.digest) {
        selected.value = { path, publicationId: r.publication.id,
          publicationDigest: r.publication.digest, selected: r.selected };
        content.value = r.shared;
        homePublished.value = homeR2PublishedFromRender(r);
        return;
      }
      break;
    }
    case 'scaffold':
      if (scaffoldAdmissionCurrent(result, path)) {
        selected.value = null; // A scaffold is not a CMS category or selected home page.
        content.value = result.render.shared;
        homePublished.value = homeR2PublishedFromRender(result.render);
        return;
      }
      break;
    default:
      break;
  }
  selected.value = null;
  content.value = null;
  homePublished.value = null;
}, { immediate: true, flush: 'sync' });

const toPublicError = (failure: { statusCode?: number; statusMessage?: string; data?: unknown }) => {
  const code = Number(failure.statusCode);
  return createError({ statusCode: [400, 404, 503].includes(code) ? code : 503,
    statusMessage: failure.statusMessage || '공개 콘텐츠를 불러오지 못했습니다.',
    ...(standalone && failure.statusMessage === 'PUBLIC_STANDALONE_PREVIEW_SOURCE_INVALID'
      ? { data: failure.data } : {}), fatal: true });
};
if (!isStatic.value && error.value) throw toPublicError(error.value);
if (data.value?.mode === 'redirect' && data.value.path === route.path)
  await navigateTo(data.value.to, { redirectCode: 308, replace: true });
if (import.meta.client) watch(data, result => {
  if (result?.mode === 'redirect' && result.path === route.path)
    void navigateTo(result.to, { replace: true, redirectCode: 308 });
});
if (import.meta.client) watch(error, failure => {
  if (!isStatic.value && failure) showError(toPublicError(failure));
});

const current = computed(() => {
  if (isStatic.value) return true;
  const r = data.value;
  switch (r?.mode) {
    case 'standalone': {
      if (!standalone || r.path !== route.path || !standalonePreviewPathAllowed(route.path) ||
          homePublished.value !== null) return false;
      switch (r.kind) {
        case 'home': return route.path === '/' && content.value === null && selected.value === null;
        case 'scaffold': return route.path === '/faq' &&
          content.value === null && selected.value === null;
        case 'reviews': {
          const c = content.value;
          return route.path === '/reviews' && selected.value === null &&
            c !== null && c.publication.id === STANDALONE_PREVIEW_PUBLICATION_ID &&
            c.publication.id === r.local.publication.id &&
            c.publication.digest === r.local.publication.digest &&
            c.publication.revision === r.local.publication.revision;
        }
        case 'legacy': {
          const c = content.value, s = selected.value, expected = r.localSelected;
          return Boolean(c && s && s.selected.mode === 'legacy' && expected.selected.mode === 'legacy' &&
            c.publication.id === STANDALONE_PREVIEW_PUBLICATION_ID &&
            c.publication.id === r.local.publication.id &&
            c.publication.digest === r.local.publication.digest &&
            s.path === route.path && expected.path === route.path &&
            s.publicationId === c.publication.id && s.publicationDigest === c.publication.digest &&
            s.selected.pageId === expected.selected.pageId);
        }
      }
    }
    case 'public':
      return Boolean(content.value && selected.value &&
        r.path === route.path && selected.value.path === route.path &&
        content.value.publication.id === selected.value.publicationId &&
        content.value.publication.digest === selected.value.publicationDigest);
    case 'scaffold':
      return scaffoldAdmissionCurrent(r, route.path) && Boolean(content.value &&
        content.value.publication.id === r.render.publication.id &&
        content.value.publication.digest === r.render.publication.digest &&
        content.value.publication.revision === r.render.publication.revision && selected.value === null);
    default: return false;
  }
});
// Unpublished local preview pages must not become indexable CMS publications.
useSeoMeta({ robots: () => standalone && current.value &&
  data.value?.mode === 'standalone' && (
    data.value.kind === 'reviews' || (data.value.kind === 'legacy' &&
    selected.value?.selected.mode === 'legacy' && selected.value.selected.seo.noindex)
  ) ? 'noindex,follow' : undefined });
</script>
<template>
  <NuxtLayout>
    <NuxtPage v-if="current && mediaCurrent" />
    <section v-else class="container-x min-h-screen pt-40 pb-20" role="status">
      <h1 class="font-heading text-2xl">{{ standalone ? '이 페이지는 연결 준비 중입니다.' : pending ? '콘텐츠를 불러오는 중입니다.' : '콘텐츠를 불러오지 못했습니다.' }}</h1>
      <p v-if="!pending && !standalone" class="mt-4 text-foreground-600">{{ error?.statusMessage || '공개 콘텐츠의 발행 상태를 확인해 주세요.' }}</p>
    </section>
  </NuxtLayout>
</template>
