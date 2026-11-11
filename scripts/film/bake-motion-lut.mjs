import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

// Deliberately separate from FILM-SPEED-R3's 97-sample position/velocity shape.
// This is an unpromoted, pointer-rate *candidate*, not a replacement speed curve.
const sourcePath = 'app/data/home-film-speed.json';
const outputPath = 'app/data/home-film-rate-lut.json';
const sourceBytes = readFileSync(sourcePath);
const source = JSON.parse(sourceBytes.toString('utf8'));
const parentSpeedSha256 = createHash('sha256').update(sourceBytes).digest('hex');
const admittedParent = 'd3ce450cabe2f3d959ce2685499d171ded14e4208e56d039805825504e423e33';

if (source.revision !== 'FILM-SPEED-R3' || source.base !== 193.2 ||
    source.enterMs !== 600 || source.leaveMs !== 1400 || source.startMs !== 1100 ||
    source.samples?.length !== 97 || parentSpeedSha256 !== admittedParent) {
  throw new Error('FILM_MOTION_LUT_REVISION_MISMATCH: SPEED-R3 parent source changed');
}

// CANDIDATE policy, pending held-out pointer traces and browser C0/C1 qualification.
const edges = [0, 24, 48, 96, 192, 384, 768, 1536, 3072, 1000000];
const rates = [0.84, 0.88, 0.92, 0.96, 1.0, 1.04, 1.08, 1.12, 1.16];
const bins = [
  { direction: 0, lower: 0, upper: 0, profileId: 'pointer-idle', rate: 1 },
  ...[-1, 1].flatMap(direction => rates.map((rate, index) => ({
    direction, lower: edges[index], upper: edges[index + 1],
    profileId: 'pointer-rate-candidate-v1', rate,
  }))),
];
const witness = source.samples.map(s => [s.t, s.blend, s.integral]);
const positionVelocityWitnessDigest = createHash('sha256')
  .update(JSON.stringify(witness)).digest('hex');
const payload = {
  contract: 'FILM-R13-RESTORE-CF3',
  revision: 'FILM-R13-RESTORE-CF3-RATE-CANDIDATE-V1',
  parentSpeedRevision: 'FILM-SPEED-R3',
  parentSpeedSha256,
  unit: 'css-px-per-second',
  status: 'CANDIDATE_NOT_PHYSICALLY_ADMITTED',
  policy: {
    emaTauMs: 160, minDtMs: 4, maxDtMs: 160,
    idleResetMs: 240, coalesceMs: 16, hysteresisFraction: 0.08,
  },
  bins,
  hysteresis: { enter: edges.slice(1), leave: edges.slice(1) },
  positionVelocityWitnessDigest,
};
const contentSha256 = createHash('sha256').update(JSON.stringify(payload)).digest('hex');
const bytes = `${JSON.stringify({ ...payload, contentSha256 }, null, 2)}\n`;

switch (process.argv[2] ?? '--check') {
  case '--write': writeFileSync(outputPath, bytes); console.log(`BAKED ${outputPath} ${contentSha256}`); break;
  case '--check': {
    const committed = readFileSync(outputPath, 'utf8');
    if (committed !== bytes) throw new Error('FILM_MOTION_LUT_STALE: run node scripts/film/bake-motion-lut.mjs --write');
    console.log('PASS_FILM_R13_RESTORE_CF3_LUT_DETERMINISTIC');
    break;
  }
  default: throw new Error('FILM_MOTION_LUT_INVALID_COMMAND: expected --write or --check');
}
