/** Browser-only navigation + Nuxt hydration admission.
 * SSR document presence is not a usable wheel-input readiness witness. */
export function isBenefitsPageReady(state, expectedIdentity, isTouch) {
  return typeof expectedIdentity === 'string'
    && expectedIdentity.length > 0
    && state?.documentIdentity === expectedIdentity
    && state.loaded === true
    && state.present === true
    && typeof state.introAdmission === 'string'
    && state.introAdmission !== 'NOT_MOUNTED'
    && (!isTouch || state.benefitsPhase === 'disabled');
}
