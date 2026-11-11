<script setup lang="ts">
import { standaloneCallPurposeOptions } from '~/data/standalone-call-options';
import TurnstileWidget from './TurnstileWidget.vue';

type ReadyState = { ready: boolean; reason: string };
type SubmitReply = { ok: boolean; reference?: string; error?: string };

const config = useRuntimeConfig();
const sitekey = String(config.public.turnstileSiteKey ?? '');
const revision = String(config.public.privacyRevision ?? '');
const { data: readiness, error: readinessError, refresh: refreshReadiness } = await useFetch<ReadyState>(
  '/api/inquiries/status',
  { key: 'smd-call-standalone-inquiry-status', server: true },
);
const status = ref<'idle' | 'submitting' | 'success' | 'error'>('idle');
const formError = ref('');
const token = ref('');
const consent = ref(false);
const turnstile = ref<InstanceType<typeof TurnstileWidget> | null>(null);
const reference = ref('');
const requestId = ref('');
const form = reactive({
  name: '',
  phone: '',
  purpose: '',
  preferredSchedule: '',
  message: '',
  website_alt: '',
});

// A changed candidate cannot reuse an earlier request identity after a network failure.
watch(form, () => {
  switch (status.value) {
    case 'submitting': break;
    default: requestId.value = ''; break;
  }
}, { deep: true });
watch(consent, () => {
  switch (status.value) {
    case 'submitting': break;
    default: requestId.value = ''; break;
  }
});
const backendReady = computed(() => readiness.value?.ready === true && !readinessError.value);
const enabled = computed(() => backendReady.value && Boolean(sitekey));
const readinessText = computed(() => {
  switch (readiness.value?.reason) {
    case 'READY': return '';
    case 'INQUIRY_DB_UNAVAILABLE':
    case 'INQUIRY_DB_MIGRATION_MISSING': return '상담 접수 저장소가 아직 준비되지 않았습니다.';
    case 'PRIVACY_POLICY_NOT_APPROVED': return '개인정보 처리 정책 승인 전이므로 접수가 중단되어 있습니다.';
    case 'TURNSTILE_CONFIG_MISSING':
    case 'PUBLIC_TURNSTILE_SITEKEY_MISSING': return '상담 인증 시스템이 준비되지 않았습니다.';
    case 'RATE_LIMIT_SECRET_MISSING': return '상담 접수 제한 설정이 준비되지 않았습니다.';
    default: return '상담 접수 가능 여부를 확인할 수 없습니다.';
  }
});
const submitErrorText = (code: string) => {
  switch (code) {
    case 'INQUIRY_COOLDOWN_30MIN': return '최근 상담 접수가 확인되어 30분 이내에는 다시 접수할 수 없습니다.';
    case 'INQUIRY_RATE_LIMIT': return '요청 횟수가 제한되어 있습니다.';
    case 'TURNSTILE_REJECTED': return '인증이 만료되었거나 유효하지 않습니다. 다시 인증해 주세요.';
    case 'PRIVACY_POLICY_NOT_APPROVED': return '개인정보 처리 정책 승인이 필요합니다.';
    case 'INQUIRY_FIELDS_INVALID': return '입력 항목을 다시 확인해 주세요.';
    case 'INQUIRY_UNSUPPORTED_FIELD': return '지원하지 않는 입력 항목이 포함되어 있습니다.';
    case 'INQUIRY_STORAGE_UNAVAILABLE': return '접수 저장소에 연결하지 못했습니다.';
    default: return `문의가 접수되지 않았습니다. (${code})`;
  }
};
async function submit() {
  switch (true) {
    case status.value === 'submitting': return;
    case !backendReady.value:
      status.value = 'error'; formError.value = readinessText.value; return;
    case !consent.value:
      status.value = 'error'; formError.value = '개인정보 수집·이용 동의가 필요합니다.'; return;
    case !token.value:
      status.value = 'error'; formError.value = '자동입력 방지 인증이 필요합니다.'; return;
    default: break;
  }
  // Keep the same request ID on network failure so the backend can return a
  // previously committed receipt instead of creating a second submission.
  switch (requestId.value) {
    case '': requestId.value = crypto.randomUUID(); break;
    default: break;
  }
  status.value = 'submitting';
  formError.value = '';
  let reachedServer = false;
  try {
    const result = await $fetch<SubmitReply>('/api/inquiries', {
      method: 'POST',
      body: {
        ...form,
        requestId: requestId.value,
        consent: true,
        turnstileToken: token.value,
        privacyRevision: revision,
      },
    });
    reachedServer = true;
    switch (result.ok === true && typeof result.reference === 'string') {
      case true:
        reference.value = result.reference!;
        status.value = 'success';
        requestId.value = '';
        Object.assign(form, { name: '', phone: '', purpose: '', preferredSchedule: '', message: '', website_alt: '' });
        consent.value = false;
        return;
      case false: throw new Error('INQUIRY_NOT_ADMITTED');
    }
  } catch (err: unknown) {
    const response = err as { data?: { error?: string }; statusCode?: number };
    const code = response?.data?.error ?? 'REQUEST_FAILED';
    reachedServer = typeof response?.statusCode === 'number';
    status.value = 'error';
    formError.value = submitErrorText(code);
    // Server-rejected requests are not retried using an old consumed Turnstile token.
    switch (reachedServer) {
      case true:
        requestId.value = '';
        token.value = '';
        turnstile.value?.reset();
        break;
      case false: break;
    }
  }
}
function restart() {
  status.value = 'idle';
  formError.value = '';
  reference.value = '';
  requestId.value = '';
  token.value = '';
  turnstile.value?.reset();
}
const messageLength = computed(() => [...form.message].length);
</script>

<template>
  <section class="smd-call" data-call-contract="SMD_CALL_STANDALONE_R1">
    <div class="smd-call__body">
      <header class="smd-call__intro">
        <h1 data-source-node="130:609">맞춤형 교육 상담을 받아보세요.</h1>
        <p data-source-node="130:608">수강 목적과 현재 수준을 고려하여 적합한 교육 과정을 안내해 드립니다.</p>
      </header>

      <div class="smd-call__card" :class="{ 'smd-call__card--ready': enabled }" data-source-node="130:607">
        <div v-if="status === 'success'" class="smd-call__success" role="status">
          <h2>상담 신청이 접수되었습니다.</h2>
          <p>접수번호: {{ reference }}</p>
          <button type="button" class="smd-call__secondary-button" @click="restart">새 문의 작성</button>
        </div>
        <template v-else>
          <form id="contact-form" class="smd-call__form" @submit.prevent="submit">
            <div class="smd-call__field smd-call__field--name">
              <label for="call-name" data-source-node="130:606">이름 <span class="smd-call__required" aria-label="필수">*</span></label>
              <input id="call-name" v-model.trim="form.name" name="name" type="text" required maxlength="80"
                autocomplete="name" placeholder="이름을 입력해주세요." data-source-node="130:604" />
            </div>
            <div class="smd-call__field smd-call__field--phone">
              <label for="call-phone" data-source-node="130:603">연락처 <span class="smd-call__required" aria-label="필수">*</span></label>
              <input id="call-phone" v-model.trim="form.phone" name="phone" type="tel" required maxlength="24"
                autocomplete="tel" placeholder="010-0000-0000" data-source-node="130:601" />
            </div>
            <div class="smd-call__field smd-call__field--purpose">
              <label for="call-purpose" data-source-node="130:600">수강 목적</label>
              <select id="call-purpose" v-model="form.purpose" name="purpose" :disabled="standaloneCallPurposeOptions.length === 0"
                data-source-node="130:599">
                <option value="">선택해주세요.</option>
                <option v-for="option in standaloneCallPurposeOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
              </select>
              <p v-if="standaloneCallPurposeOptions.length === 0" class="smd-call__config-note">수강 목적 선택지는 운영 확정 전입니다.</p>
            </div>
            <div class="smd-call__field smd-call__field--schedule">
              <label for="call-schedule" data-source-node="130:594">교육 희망 일정</label>
              <input id="call-schedule" v-model.trim="form.preferredSchedule" name="preferredSchedule" maxlength="120"
                placeholder="예 : 2027년 1월 중 / 주말 수업 희망" data-source-node="130:593" />
            </div>
            <div class="smd-call__field smd-call__field--message">
              <label for="call-message" data-source-node="130:589">문의 내용</label>
              <textarea id="call-message" v-model.trim="form.message" name="message" maxlength="500" rows="6"
                placeholder="궁금한 점이나 전달하고 싶은 내용을 입력해주세요." data-source-node="130:588" />
              <span class="smd-call__counter" aria-live="polite" data-source-node="130:581">{{ messageLength }}/500</span>
            </div>
            <input v-model="form.website_alt" name="website_alt" type="text" tabindex="-1" autocomplete="off"
              aria-hidden="true" class="form-hp-field" />
            <div class="smd-call__consent" data-source-node="130:592">
              <label>
                <input v-model="consent" type="checkbox" required name="consent" data-source-node="130:580" />
                <span data-source-node="130:584">개인정보 수집·이용에 동의합니다. <strong>(필수)</strong></span>
              </label>
              <NuxtLink to="/privacy">내용보기</NuxtLink>
            </div>
            <div v-if="enabled" class="smd-call__turnstile">
              <TurnstileWidget ref="turnstile" v-model="token" :sitekey="sitekey" />
            </div>
            <div v-if="status === 'error'" role="alert" class="smd-call__error">{{ formError }}</div>
            <div v-if="!enabled" class="smd-call__blocked" role="status">
              {{ readinessText }}
              <button type="button" class="smd-call__retry" @click="refreshReadiness()">연결 상태 다시 확인</button>
            </div>
            <button type="submit" :disabled="status === 'submitting' || !enabled" class="smd-call__submit"
              data-source-node="130:591">{{ status === 'submitting' ? '전송 중...' : '교육 상담 신청하기' }}</button>
          </form>
          <div class="smd-call__channels">
            <span class="smd-call__secondary-button smd-call__secondary-button--disabled" aria-label="카카오톡 상담 링크 미설정" data-source-node="130:579">카카오톡 상담하기</span>
            <span class="smd-call__secondary-button smd-call__secondary-button--disabled" aria-label="전화 상담 번호 미설정" data-source-node="130:578">전화 문의하기</span>
          </div>
        </template>
      </div>
    </div>
  </section>
</template>

<style src="~/assets/css/contact-standalone.css"></style>
