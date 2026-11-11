/** CF6 read-only Worker target gate. No deploy, no account mutation, no false success. */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const expected = 'smd-aca-pu';
const args = process.argv.slice(2);
const i = args.indexOf('--config');
if (args.some((arg,index) => index === i + 1 ? false : arg !== '--config') ||
    (i !== -1 && !args[i+1])) throw new Error('SMD_REVIEWS_R1_VERIFY_TARGET_ARGUMENT_INVALID');
const filename = resolve(i === -1 ? 'wrangler.toml' : args[i+1]);
const source = readFileSync(filename,'utf8');
// Only root configuration name is authoritative. Names under env sections do not override it here.
const root = source.split(/^\s*\[/m)[0];
const names = [...root.matchAll(/^\s*name\s*=\s*"([^"]+)"\s*$/gm)];
if (names.length !== 1) throw new Error('DEPLOY_CONFIG_NAME_AMBIGUOUS');
const actual = names[0][1];
if (actual !== expected) {
 console.error(JSON.stringify({contract:'SMD_REVIEWS_R1_CF6_DEPLOY_TARGET',expected,actual,
  status:'BLOCKED',code:'DEPLOY_TARGET_MISMATCH',file:filename}));
 process.exitCode = 2;
} else {
 console.log(JSON.stringify({contract:'SMD_REVIEWS_R1_CF6_DEPLOY_TARGET',expected,actual,
  status:'CONFIG_NAME_PASS',account:'NOT_VERIFIED',bindings:'NOT_VERIFIED',deploy:'NOT_RUN'}));
}
