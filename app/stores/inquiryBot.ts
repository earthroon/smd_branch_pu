import { defineStore } from 'pinia';
import type { BotAnswer } from '@smd/content-contracts/contracts';
export type ChatLine = { id:string;from:'visitor'|'bot'|'system';text:string;handoff?:{label:string;href:string} };
export const useInquiryBotStore=defineStore('inquiry-bot',()=>{
  const lines=ref<ChatLine[]>([]);
  const busy=ref(false);
  const lastError=ref<string|null>(null);
  function append(from:ChatLine['from'],text:string,handoff?:ChatLine['handoff']){
    lines.value.push({id:crypto.randomUUID(),from,text,handoff});
    if(lines.value.length>40)lines.value.splice(0,lines.value.length-40);
  }
  async function ask(message:string){
    const input=message.trim();
    if(!input || input.length>250 || busy.value)return;
    append('visitor',input);busy.value=true;lastError.value=null;
    try {
      const response=await $fetch<BotAnswer>('/api/bot/ask',{method:'POST',body:{message:input}});
      switch(response.status){
        case 'matched': append('bot',response.answer??'');break;
        case 'ambiguous': append('bot','질문에 서로 다른 안내 항목이 포함되어 있습니다. 한 가지씩 질문하거나 상담을 이용해 주세요.',response.handoff??undefined);break;
        case 'unmatched': append('bot','현재 등록된 공식 안내에서 일치하는 답변을 찾지 못했습니다.',response.handoff??undefined);break;
      }
    }catch(e:unknown){
      const code=(e as {data?:{error?:string}}).data?.error??'BOT_SERVICE_UNAVAILABLE';
      lastError.value=code;
      append('system',`응답을 제공하지 못했습니다. (${code})`);
    }finally{busy.value=false;}
  }
  function clear(){lines.value=[];lastError.value=null;}
  return {lines,busy,lastError,ask,clear};
});
