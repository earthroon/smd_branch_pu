<script setup lang="ts">
import { useContentMode } from '~/composables/useContentMode';
/** Header icon consumes the V5 publication. /privacy has no page render envelope. */
import {useSiteContent} from '~/composables/useSiteContent';
import {resolvePublishedBrandSymbol} from '~/utils/site-media-binding';
import FigmaBrandMark from '~/components/figma/FigmaBrandMark.vue';
const content=useSiteContent();
const route=useRoute();
type PrivacyBrand={schema:'SMD_BRAND_CURRENT_V1';kind:'legacy'|'published-svg';
  assetId?:string;width?:number;height?:number};
const standalone=useContentMode()==='standalone';
const isPrivacy=computed(()=>!standalone && route.path==='/privacy');
const {data:privacyBrand,error:privacyFailure,refresh:refreshPrivacyBrand}=await useAsyncData<PrivacyBrand|null>(
  'smd-header-brand-privacy',()=>useRequestFetch()<PrivacyBrand>('/api/brand/current',{cache:'no-store'}),
  {immediate:isPrivacy.value,default:()=>null});
watch(isPrivacy,active=>{if(active)void refreshPrivacyBrand();});
const failedBrandId=ref<string|null>(null);
const brandSymbol=computed(()=>{
  if(isPrivacy.value){
    if(privacyFailure.value)return {kind:'invalid' as const};
    const v=privacyBrand.value;
    if(!v)return {kind:'loading' as const};
    if(v.schema!=='SMD_BRAND_CURRENT_V1')return {kind:'invalid' as const};
    if(v.kind==='legacy')return {kind:'legacy' as const};
    if(v.kind!=='published-svg'||!/^sb_[a-f0-9]{64}$/.test(v.assetId??'')||
      !Number.isSafeInteger(v.width)||!Number.isSafeInteger(v.height)||
      Number(v.width)<1||Number(v.height)<1)return {kind:'invalid' as const};
    return {kind:'published-svg' as const,assetId:v.assetId!,
      src:`/api/media/brand/${v.assetId}`,width:v.width!,height:v.height!};
  }
  if(!content.value)return {kind:'loading' as const};
  try{return resolvePublishedBrandSymbol(content.value,content.value.publication);}
  catch{return {kind:'invalid' as const};}
});
watch(()=>brandSymbol.value.kind==='published-svg'?brandSymbol.value.assetId:null,
  id=>{if(id!==failedBrandId.value)failedBrandId.value=null;});
</script>
<template>
  <FigmaBrandMark v-if="standalone || route.path === '/'" />
  <img v-else-if="brandSymbol.kind==='published-svg' && failedBrandId!==brandSymbol.assetId"
    :src="brandSymbol.src" :width="brandSymbol.width" :height="brandSymbol.height"
    class="block shrink-0 object-contain" alt="" decoding="async"
    @error="failedBrandId=brandSymbol.assetId" />
  <span v-else-if="brandSymbol.kind==='legacy'"
    class="grid place-items-center rounded-md bg-foreground-950 font-heading text-sm font-semibold text-background-50">S</span>
  <span v-else-if="brandSymbol.kind==='invalid' || failedBrandId"
    class="grid place-items-center text-[9px] text-red-700" role="status"
    title="발행된 브랜드 SVG를 불러오지 못했습니다">로고 오류</span>
  <span v-else class="block shrink-0" aria-hidden="true"></span>
</template>
