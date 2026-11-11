/** Decode the exact Chrome DevTools Protocol Runtime.evaluate response envelope.
 * A CDP method response has { result: { result: RemoteObject, exceptionDetails? } }.
 * Missing values and JavaScript evaluation faults are errors, not implicit defaults.
 */
export function readCdpEvaluateValue(response, contract) {
  const payload = response?.result;
  const exception = payload?.exceptionDetails;
  if (exception) {
    const description = exception.exception?.description ?? exception.text ?? 'unknown';
    throw new Error(`${contract}_RUNTIME_EVAL_EXCEPTION: ${description}`);
  }
  const remote = payload?.result;
  if (!remote || !Object.hasOwn(remote, 'value')) {
    throw new Error(`${contract}_RUNTIME_EVAL_VALUE_UNAVAILABLE: type=${remote?.type ?? 'missing'}`);
  }
  return remote.value;
}
