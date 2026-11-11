<script setup lang="ts">
import {useSiteContent} from '~/composables/useSiteContent';
import { publicExternalActionsAllowed } from '~/utils/publicExternalActionPolicy';
import TurnstileWidget from './TurnstileWidget.vue';
const config=useRuntimeConfig();
const sitekey=String(config.public.turnstileSiteKey||'');
const form=reactive({name:'',phone:'',email:'',course:'',message:'',website_alt:''});
const consent=ref(false);
const token=ref('');
const status=ref<'idle'|'submitting'|'success'|'error'>('idle');
const formError=ref('');
const turnstile=ref<InstanceType<typeof TurnstileWidget>|null>(null);
const inputClass='w-full rounded-md border border-background-300 bg-background-50 px-4 py-3 text-sm text-foreground-900 transition-colors placeholder:text-foreground-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200';
const labelClass='mb-2 block font-label text-xs uppercase tracking-[0.16em] text-foreground-600';
const c=useSiteContent();
const pages=computed(()=>c.value?.pages);
const submissionAllowed=computed(()=>publicExternalActionsAllowed(c.value));
const courses=computed(()=>c.value?.promotion.courseOptions??[]);
const labels=computed(()=>new Map(pages.value?.form.courseLabels.map(item=>[item.value,item.label])??[]));
async function submit(){
  if(status.value==='submitting')return;
  if(!submissionAllowed.value){status.value='error';formError.value='상담 접수 운영 승인 전입니다.';return;}
  if(!sitekey || !token.value){status.value='error';formError.value='자동입력 방지 인증을 완료해 주세요.';return;}
  if(!consent.value){status.value='error';formError.value='상담 목적의 개인정보 수집 동의가 필요합니다.';return;}
  status.value='submitting';formError.value='';
  try {
    const result=await $fetch<{ok:boolean;reference:string}>('/api/inquiries',{
      method:'POST',body:{...form,turnstileToken:token.value,consent:true,privacyRevision:config.public.privacyRevision}
    });
    if(!result.ok)throw new Error('INQUIRY_NOT_ADMITTED');
    status.value='success';
    Object.assign(form,{name:'',phone:'',email:'',course:'',message:'',website_alt:''});
    consent.value=false;
  } catch (e:unknown) {
    status.value='error';
    const result=e as {data?:{error?:string};statusCode?:number};
    const code=result.data?.error||'REQUEST_FAILED';
    formError.value=code==='INQUIRY_COOLDOWN_30MIN'?'30분 이내에는 다시 접수할 수 없습니다.':
      code==='TURNSTILE_REJECTED'?'인증이 만료되었거나 유효하지 않습니다. 다시 확인해 주세요.':
      code==='PRIVACY_POLICY_NOT_APPROVED'?'상담 접수 정책이 아직 구성되지 않았습니다. 카카오톡 채널을 이용해 주세요.':
      `문의가 접수되지 않았습니다. (${code})`;
  } finally { token.value='';turnstile.value?.reset(); }
}
</script>
<template>
  <div v-if="status==='success'" class="rounded-lg border border-secondary-200 bg-secondary-50 p-8 text-center" role="status"><div class="mx-auto grid h-12 w-12 place-items-center rounded-full bg-secondary-500 text-background-50"><i class="ri-check-line text-2xl"/></div><h3 class="mt-5 font-heading text-xl font-semibold text-foreground-950">{{ pages?.form.successHeading }}</h3><p class="mt-2 text-sm text-foreground-600">{{ pages?.form.successDescription }}</p><button type="button" class="btn-ghost mt-6" @click="status='idle'">새 문의 작성</button></div>
  <form v-else id="contact-form" class="rounded-lg border border-background-200 bg-background-50 p-6 md:p-8" @submit.prevent="submit">
    <div class="grid grid-cols-1 gap-5 sm:grid-cols-2"><div><label for="cf-name" :class="labelClass">{{ pages?.form.name.label }}</label><input id="cf-name" v-model.trim="form.name" name="name" type="text" required maxlength="80" :placeholder="pages?.form.name.placeholder" :class="inputClass" /></div><div><label for="cf-phone" :class="labelClass">{{ pages?.form.phone.label }}</label><input id="cf-phone" v-model.trim="form.phone" name="phone" type="tel" required maxlength="24" :placeholder="pages?.form.phone.placeholder" :class="inputClass" /></div></div>
    <div class="mt-5"><label for="cf-email" :class="labelClass">{{ pages?.form.email.label }}</label><input id="cf-email" v-model.trim="form.email" name="email" type="email" required maxlength="254" :placeholder="pages?.form.email.placeholder" :class="inputClass" /></div>
    <div class="mt-5"><label for="cf-course" :class="labelClass">{{ pages?.form.course.label }}</label><select id="cf-course" v-model="form.course" name="course" required :class="inputClass"><option value="" disabled>{{ pages?.form.course.placeholder }}</option><option v-for="course in courses" :key="course" :value="course">{{ labels.get(course)??course }}</option></select></div>
    <div class="mt-5"><label for="cf-message" :class="labelClass">{{ pages?.form.message.label }}</label><textarea id="cf-message" v-model.trim="form.message" name="message" rows="5" maxlength="500" required :placeholder="pages?.form.message.placeholder" :class="[inputClass,'resize-none']" /><div class="mt-1.5 text-right text-xs text-foreground-500">{{ form.message.length }} / 500</div></div>
    <input v-model="form.website_alt" name="website_alt" type="text" tabindex="-1" autocomplete="off" aria-hidden="true" class="form-hp-field" />
    <div v-if="submissionAllowed" class="mt-5"><TurnstileWidget ref="turnstile" v-model="token" :sitekey="sitekey" /></div>
    <label class="mt-5 flex items-start gap-2 text-xs leading-relaxed text-foreground-600"><input v-model="consent" type="checkbox" required class="mt-0.5" /><span>상담 접수를 위한 이름, 연락처, 이메일, 문의 내용의 수집·이용에 동의합니다. <NuxtLink to="/privacy" class="underline">개인정보 처리 안내</NuxtLink></span></label>
    <div v-if="status==='error'" class="mt-5 rounded-md border border-primary-200 bg-primary-50 px-4 py-3 text-sm text-primary-800" role="alert">{{ formError }}</div>
    <button type="submit" :disabled="status==='submitting'||!sitekey||!submissionAllowed" class="btn-primary mt-6 w-full py-3 disabled:opacity-60">{{ status==='submitting'?'전송 중...':(pages?.form.submitLabel??'') }}</button>
    <p class="mt-3 text-center text-xs text-foreground-500">{{ submissionAllowed ? '실제 상담 접수 전 개인정보 처리 정책의 운영 승인이 필요합니다.' : '현재 공개 프리뷰에서는 상담 접수를 사용할 수 없습니다.' }}</p>
  </form>
</template>
