#!/usr/bin/env node
/**
 * Mixes public/audio/bgm-124bpm.wav + all frame-exact SFX_CUES from src/timeline.ts
 * into public/audio/soundtrack.wav (48kHz stereo, normalized to -14 LUFS / -1.5 dBTP).
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = path.resolve(HERE, '..');
const PUB = path.join(PROJECT, 'public');

// Read timeline via tsx-free ESM? Run via node --experimental-strip-types or tsx:
const { FPS, DURATION_FRAMES, SFX_CUES } = await import('../src/timeline.ts');

const bgm = path.join(PUB, 'audio', 'bgm-124bpm.wav');
const outRaw = path.join(PUB, 'audio', 'soundtrack-raw.wav');
const outNorm = path.join(PUB, 'audio', 'soundtrack.wav');

if (!fs.existsSync(bgm)) {
  throw new Error(`Missing BGM file: ${bgm} (run npm run gen-music first)`);
}

const inputs = ['-i', bgm];
const filters = [
  // BGM sits cleanly under SFX (~ -9 dB relative to SFX hits)
  '[0:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,volume=-7dB[bgm]',
];

const mixLabels = ['[bgm]'];

SFX_CUES.forEach((cue, i) => {
  const sfxPath = path.join(PUB, 'sfx', cue.file);
  if (!fs.existsSync(sfxPath)) {
    throw new Error(`Missing SFX file: ${sfxPath}`);
  }
  inputs.push('-i', sfxPath);
  const idx = i + 1;
  const delayMs = Math.round((cue.frame / FPS) * 1000);
  const gain = cue.gainDb ?? 0;
  const rate = cue.rate ?? 1.0;

  let chain = `[${idx}:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo`;
  if (rate !== 1.0) {
    chain += `,asetrate=${Math.round(48000 * rate)},aresample=48000`;
  }
  chain += `,volume=${gain}dB,adelay=${delayMs}|${delayMs}[s${idx}]`;
  filters.push(chain);
  mixLabels.push(`[s${idx}]`);
});

const durationSec = (DURATION_FRAMES / FPS).toFixed(3);
filters.push(
  `${mixLabels.join('')}amix=inputs=${mixLabels.length}:duration=longest:dropout_transition=0:normalize=0,atrim=0:${durationSec},apad=whole_dur=${durationSec},alimiter=limit=0.95[mix]`,
);

execFileSync(
  'ffmpeg',
  [
    '-y',
    '-loglevel',
    'error',
    ...inputs,
    '-filter_complex',
    filters.join(';'),
    '-map',
    '[mix]',
    '-ar',
    '48000',
    '-ac',
    '2',
    '-c:a',
    'pcm_s16le',
    outRaw,
  ],
  { stdio: 'inherit' },
);

// Two-pass loudnorm measurement for exact -14 LUFS, -1.5 dBTP
const measure = execFileSync(
  'ffmpeg',
  [
    '-i',
    outRaw,
    '-af',
    'loudnorm=I=-14:TP=-1.5:LRA=9:print_format=json',
    '-f',
    'null',
    '-',
  ],
  { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
);
void measure;

// Capture stderr for loudnorm JSON
let loudJson = null;
try {
  const res = execFileSync(
    'bash',
    [
      '-c',
      `ffmpeg -i "${outRaw}" -af loudnorm=I=-14:TP=-1.5:LRA=9:print_format=json -f null - 2>&1`,
    ],
    { encoding: 'utf8' },
  );
  const m = res.match(/\{[\s\S]*?"input_i"[\s\S]*?\}/);
  if (m) loudJson = JSON.parse(m[0]);
} catch {
  // fallback to single-pass loudnorm
}

const normFilter = loudJson
  ? `loudnorm=I=-14:TP=-1.5:LRA=9:measured_I=${loudJson.input_i}:measured_TP=${loudJson.input_tp}:measured_LRA=${loudJson.input_lra}:measured_thresh=${loudJson.input_thresh}:offset=${loudJson.target_offset}:linear=true`
  : 'loudnorm=I=-14:TP=-1.5:LRA=9';

execFileSync(
  'ffmpeg',
  [
    '-y',
    '-loglevel',
    'error',
    '-i',
    outRaw,
    '-af',
    `${normFilter},atrim=0:${durationSec}`,
    '-ar',
    '48000',
    '-ac',
    '2',
    '-c:a',
    'pcm_s16le',
    outNorm,
  ],
  { stdio: 'inherit' },
);

fs.unlinkSync(outRaw);

// Verify final loudness
const checkOut = execFileSync(
  'bash',
  [
    '-c',
    `ffmpeg -i "${outNorm}" -af loudnorm=I=-14:TP=-1.5:LRA=9:print_format=json -f null - 2>&1`,
  ],
  { encoding: 'utf8' },
);
const finalM = checkOut.match(/\{[\s\S]*?"input_i"[\s\S]*?\}/);
const stats = finalM ? JSON.parse(finalM[0]) : {};
console.log(
  `mix-audio ok: ${SFX_CUES.length} SFX cues + BGM -> ${path.relative(PROJECT, outNorm)} (I=${stats.input_i ?? '?'} LUFS, TP=${stats.input_tp ?? '?'} dBTP)`,
);
