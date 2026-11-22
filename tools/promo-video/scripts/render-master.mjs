#!/usr/bin/env node
/**
 * Renders the final 1920x1080 @ 60 fps BT.709 H.264 master MP4 (muted via Remotion
 * to avoid AAC priming offset, then muxed cleanly with public/audio/soundtrack.wav via ffmpeg).
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = path.resolve(HERE, '..');
const OUT_DIR = path.join(PROJECT, 'out');
const VIDEO_MUTED = path.join(OUT_DIR, 'atomiq-promo-16x9-muted.mp4');
const AUDIO_WAV = path.join(PROJECT, 'public', 'audio', 'soundtrack.wav');
const FINAL_MP4 = path.join(OUT_DIR, 'atomiq-promo-16x9.mp4');

fs.mkdirSync(OUT_DIR, { recursive: true });
if (!fs.existsSync(AUDIO_WAV)) {
  throw new Error(`Missing soundtrack: ${AUDIO_WAV} (run npm run audio first)`);
}

console.log('1/2 Rendering 1920x1080 @ 60fps master video (muted)...');
execFileSync(
  'npx',
  [
    'remotion',
    'render',
    'src/index.ts',
    'Film',
    VIDEO_MUTED,
    '--muted',
    '--codec=h264',
    '--pixel-format=yuv420p',
    '--crf=18',
    '--x264-preset=medium',
    '--image-format=jpeg',
    '--jpeg-quality=95',
    '--color-space=bt709',
    '--concurrency=4',
  ],
  { cwd: PROJECT, stdio: 'inherit' },
);

console.log('2/2 Muxing -14 LUFS AAC audio track with ffmpeg...');
execFileSync(
  'ffmpeg',
  [
    '-y',
    '-loglevel',
    'error',
    '-i',
    VIDEO_MUTED,
    '-i',
    AUDIO_WAV,
    '-c:v',
    'copy',
    '-c:a',
    'aac',
    '-b:a',
    '192k',
    '-ar',
    '48000',
    '-movflags',
    '+faststart',
    '-shortest',
    FINAL_MP4,
  ],
  { stdio: 'inherit' },
);

fs.unlinkSync(VIDEO_MUTED);

const probe = execFileSync(
  'ffprobe',
  [
    '-v',
    'error',
    '-show_entries',
    'format=duration,size:stream=codec_type,codec_name,width,height,r_frame_rate,pix_fmt,sample_rate,channels',
    '-of',
    'default=noprint_wrappers=1',
    FINAL_MP4,
  ],
  { encoding: 'utf8' },
);
console.log(`\nrender-master ok: ${FINAL_MP4}\n${probe}`);
