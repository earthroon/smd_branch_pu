/**
 * SMD_HOME_SPECIAL_COPY_R1 local browser observation.
 * Requires a running Nuxt site and a Chrome/Edge binary. Not a Figma pixel-parity claim.
 * Usage: node scripts/figma-r2/verify-special-start-browser.mjs --url http://127.0.0.1:3129/
 */
import {spawn} from 'node:child_process';
import {existsSync, mkdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {join, resolve, dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf(name);
  return i < 0 ? fallback : argv[i + 1];
};
const url = arg('--url', 'http://127.0.0.1:3129/');
const out = resolve(arg('--out', join(root, 'artifacts/home-special-copy-r1/browser-receipt.json')));
const widths = [360, 390, 430, 699, 700, 768, 1024, 1099, 1100, 1280, 1440, 1920];
if (!/^https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?\/$/.test(url)) {
  throw new Error('SMD_HOME_SPECIAL_BROWSER_LOCAL_URL_ONLY');
}
const chromeCandidates = [
  process.env.SMD_CHROME_PATH, process.env.CHROME_PATH,
  process.env.PROGRAMFILES && join(process.env.PROGRAMFILES, 'Google/Chrome/Application/chrome.exe'),
  process.env.PROGRAMFILES && join(process.env.PROGRAMFILES, 'Microsoft/Edge/Application/msedge.exe'),
  process.env['PROGRAMFILES(X86)'] && join(process.env['PROGRAMFILES(X86)'], 'Microsoft/Edge/Application/msedge.exe'),
  '/usr/bin/chromium', '/usr/bin/google-chrome',
].filter(Boolean);
const chrome = chromeCandidates.find(existsSync);
if (!chrome) throw new Error('SMD_HOME_SPECIAL_BROWSER_CHROME_NOT_FOUND');
const directory = join(tmpdir(), `smd-home-special-copy-${randomUUID()}`);
mkdirSync(directory, {recursive: true});
const child = spawn(chrome, [
  '--headless=new', '--no-first-run', '--no-default-browser-check',
  '--disable-extensions', '--remote-debugging-port=0',
  `--user-data-dir=${directory}`, 'about:blank',
], {stdio: 'ignore'});
const sleep = ms => new Promise(done => setTimeout(done, ms));
let socket;
let sequence = 0;
const pending = new Map();
function cdp(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, {resolve, reject});
    socket.send(JSON.stringify({id, method, params}));
    setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id);
        reject(new Error(`SMD_HOME_SPECIAL_BROWSER_TIMEOUT ${method}`));
      }
    }, 18000).unref();
  });
}
async function chromePort() {
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) throw new Error(`SMD_HOME_SPECIAL_BROWSER_EXIT ${child.exitCode}`);
    const file = join(directory, 'DevToolsActivePort');
    if (existsSync(file)) return +readFileSync(file, 'utf8').split(/\r?\n/)[0];
    await sleep(100);
  }
  throw new Error('SMD_HOME_SPECIAL_BROWSER_DEVTOOLS_UNAVAILABLE');
}
const targets = [
  {
    key: 'node-18:120',
    digest: 'aa0cf32abea4c56abf9a638c26b5aa138126018515b5f677d86cc23519ba9637',
    runs: ['수강생이 스스로 작업할 수 있는 수준까지', ' \n교육하는 것을 목표로 합니다.'],
    weights: ['700', '400'], boldIndex: 0,
  },
  {
    key: 'node-18:121',
    digest: '709155109cbc3b9db7bc91ce8665a0d6ea04a4b82cd27fd42f8d0c261af336b7',
    runs: ['현장 메커니즘을 반영하여 오전 일작업과 \n프라이머 도포, 오후 필름 래핑 순으로 \n', '현장감 있게 수업', '합니다.'],
    weights: ['400', '700', '400'], boldIndex: 1,
  },
  {
    key: 'node-18:122',
    digest: '7adbf5bddc4c7fe8ae95b02c39907275eca4af4ce5702e52e1304a83b725f02f',
    runs: ['수료 후', ' 개인별 맞춤 · 취업 창업 컨설팅', '을 \n통해 필름 시장 진입을 돕습니다.'],
    weights: ['400', '700', '400'], boldIndex: 1,
  },
];
const expression = `(async () => {
  await document.fonts.ready;
  const scene = document.querySelector('.smd-home--figma-scene');
  const reflow = document.querySelector('.smd-home--semantic-reflow');
  const sceneVisible = scene && getComputedStyle(scene).display !== 'none';
  const root = sceneVisible ? scene : reflow;
  const desktop = !!sceneVisible;
  const tests = ${JSON.stringify(targets)};
  const results = tests.map(test => {
    const target = desktop ? root?.querySelector('[data-figma-text-instance="' + test.key + '"]') :
      root?.querySelector('[data-figma-text="' + test.key + '"]');
    const spans = [...(target?.querySelectorAll(desktop ? '.smd-figma-native-text__runs > span' : '.smd-home-figma-text > span') ?? [])];
    const observed = spans.map(span => ({
      text: span.textContent,
      weight: getComputedStyle(span).fontWeight,
      emphasis: span.getAttribute('data-special-emphasis') === 'true',
    }));
    const errors = [];
    if (!target) errors.push('TARGET_MISSING');
    if (target?.getAttribute(desktop ? 'data-source-text-digest' : 'data-text-digest') !== test.digest) {
      errors.push('SOURCE_DIGEST_DRIFT');
    }
    if (observed.length !== test.runs.length) errors.push('RUN_COUNT');
    test.runs.forEach((expected, index) => {
      if (observed[index]?.text !== expected) errors.push('TEXT_RUN_' + index);
      if (observed[index]?.weight !== test.weights[index]) errors.push('FONT_WEIGHT_' + index);
      if (observed[index]?.emphasis !== (index === test.boldIndex)) errors.push('EMPHASIS_' + index);
    });
    if (observed.map(r => r.text).join('') !== test.runs.join('')) errors.push('WHOLE_TEXT');
    if (desktop) {
      if (target?.getAttribute('data-ink-gate') === 'WINDOW_EXCEEDED') errors.push('INK_WINDOW_EXCEEDED');
      if (target?.getAttribute('data-ink-gate') !== 'PASS') errors.push('INK_UNVERIFIED');
    } else {
      const box = target?.closest('.smd-home__special-point-body-r2')?.getBoundingClientRect();
      if (!box) errors.push('MOBILE_CARD_BOUNDS_MISSING');
      if (box) {
        for (const span of spans) {
          const range = document.createRange();
          range.selectNodeContents(span);
          for (const rect of range.getClientRects()) {
            if (rect.width > 0 && (rect.left < box.left - 2 || rect.right > box.right + 2)) {
              errors.push('CARD_TEXT_OVERFLOW');
              break;
            }
          }
          range.detach();
        }
      }
    }
    return {key: test.key, sourceDigest: test.digest, observed, errors,
      inkGate: desktop ? target?.getAttribute('data-ink-gate') : null};
  });
  return {width: document.documentElement.clientWidth, documentWidth: document.documentElement.scrollWidth,
    desktop, fontLoaded: [...document.fonts].some(f => /Pretendard/i.test(f.family) && f.status === 'loaded'),
    results};
})()`;
try {
  const port = await chromePort();
  const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const page = pages.find(v => v.type === 'page');
  if (!page?.webSocketDebuggerUrl) throw new Error('SMD_HOME_SPECIAL_BROWSER_PAGE_MISSING');
  socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, {once: true});
    socket.addEventListener('error', reject, {once: true});
  });
  socket.addEventListener('message', ({data}) => {
    const msg = JSON.parse(data);
    if (!pending.has(msg.id)) return;
    const {resolve, reject} = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
  });
  await cdp('Page.enable');
  await cdp('Runtime.enable');
  const observations = [];
  for (const width of widths) {
    await cdp('Emulation.setDeviceMetricsOverride', {width, height: 900, deviceScaleFactor: 1, mobile: width <= 430});
    await cdp('Page.navigate', {url});
    for (let t = 0; t < 40; t++) {
      const ready = await cdp('Runtime.evaluate', {expression: 'document.readyState', returnByValue: true});
      if (ready.result?.value === 'complete') break;
      await sleep(150);
    }
    await sleep(1800);
    const evaluated = await cdp('Runtime.evaluate', {expression, awaitPromise: true, returnByValue: true});
    if (evaluated.exceptionDetails || !evaluated.result?.value) {
      throw new Error(`SMD_HOME_SPECIAL_BROWSER_OBSERVATION_FAILED ${width} ${JSON.stringify(evaluated.exceptionDetails)}`);
    }
    const value = evaluated.result.value;
    const errors = value.results.flatMap(r => r.errors.map(code => `${r.key}:${code}`));
    if (value.documentWidth > value.width + 2) errors.push('HORIZONTAL_OVERFLOW');
    if (!value.fontLoaded) errors.push('PRETENDARD_NOT_LOADED');
    if (value.desktop !== (width >= 1100)) errors.push('RESPONSIVE_OWNER_MISMATCH');
    observations.push({requestedWidth: width, ...value, errors});
    console.log(`${width}px ${errors.length === 0 ? 'PASS' : 'FAIL ' + errors.join(',')}`);
  }
  const receipt = {
    contract: 'SMD_HOME_SPECIAL_COPY_R1_BROWSER', url, widths,
    observations, browserChecksPassed: observations.every(v => v.errors.length === 0),
    sourceFigmaPixelParity: 'NOT_RUN', remoteDeployment: 'NOT_RUN',
  };
  mkdirSync(dirname(out), {recursive: true});
  writeFileSync(out, JSON.stringify(receipt, null, 2) + '\n');
  console.log(`SMD_HOME_SPECIAL_BROWSER_RECEIPT ${out}`);
  if (!receipt.browserChecksPassed) process.exitCode = 1;
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  try { socket?.close(); } catch { /* browser teardown only */ }
  child.kill();
  await sleep(250);
  rmSync(directory, {recursive: true, force: true, maxRetries: 3});
}
