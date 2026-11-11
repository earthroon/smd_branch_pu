<script setup lang="ts">
const props=defineProps<{sitekey:string}>();
const token=defineModel<string>({default:''});
const host=ref<HTMLElement|null>(null);
let widgetId:string|number|undefined;
type TurnstileApi={render(element:HTMLElement,options:{sitekey:string;action:string;callback:(token:string)=>void;'expired-callback':()=>void;'error-callback':()=>void}):string|number;reset(id?:string|number):void;remove(id:string|number):void};
const getApi=():TurnstileApi|undefined=>(window as Window & {turnstile?:TurnstileApi}).turnstile;
function reset(){token.value='';if(widgetId!==undefined)getApi()?.reset(widgetId);}
defineExpose({reset});
onMounted(()=>{
  if(!props.sitekey || !host.value)return;
  const render=()=>{
    const api=getApi();
    if(!api || !host.value || widgetId!==undefined)return;
    widgetId=api.render(host.value,{sitekey:props.sitekey,action:'inquiry',callback:(next)=>token.value=next,
      'expired-callback':()=>token.value='', 'error-callback':()=>token.value=''});
  };
  if(getApi()){render();return;}
  const existing=document.querySelector<HTMLScriptElement>('script[data-smd-turnstile]');
  if(existing){existing.addEventListener('load',render,{once:true});return;}
  const script=document.createElement('script');
  script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
  script.async=true;script.defer=true;script.dataset.smdTurnstile='1';
  script.addEventListener('load',render,{once:true});document.head.appendChild(script);
});
onBeforeUnmount(()=>{if(widgetId!==undefined)getApi()?.remove(widgetId);});
</script>
<template>
  <div>
    <div v-if="!sitekey" role="status" class="rounded-md border border-background-300 bg-background-100 p-3 text-sm text-foreground-600">사이트 인증 키가 구성되지 않아 문의를 접수할 수 없습니다.</div>
    <div v-else ref="host" aria-label="자동입력 방지 인증" />
  </div>
</template>
