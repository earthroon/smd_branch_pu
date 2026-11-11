import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

// SPEED-R3 is a byte-frozen parent. Re-running the historical floating-point
// baker is NOT an admissible part of this restore's build pipeline.
const source = readFileSync('app/data/home-film-speed.json');
const digest = createHash('sha256').update(source).digest('hex');
if (digest !== 'd3ce450cabe2f3d959ce2685499d171ded14e4208e56d039805825504e423e33') {
  throw new Error(`FILM_SPEED_R3_SOURCE_DRIFT: ${digest}`);
}
const curve = JSON.parse(source.toString('utf8'));
if (curve.revision !== 'FILM-SPEED-R3' || curve.base !== 193.2 ||
    curve.enterMs !== 600 || curve.leaveMs !== 1400 || curve.startMs !== 1100 ||
    curve.samples.length !== 97) throw new Error('FILM_SPEED_R3_SCHEMA_DRIFT');
console.log('PASS_FILM_SPEED_R3_FROZEN_SOURCE');
