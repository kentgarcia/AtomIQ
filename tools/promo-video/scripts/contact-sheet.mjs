#!/usr/bin/env node
/**
 * Renders 14 keyframe stills (2 per beat) from the Film composition in ONE single
 * Remotion render pass (fast!) and stitches them into out/qa/contact-sheet.png via ImageMagick.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = path.resolve(HERE, '..');
const { REVIEW_FRAMES } = await import('../src/timeline.ts');

const framesDir = path.join(PROJECT, 'out', 'qa', 'frames');
const sheetOut = path.join(PROJECT, 'out', 'qa', 'contact-sheet.png');
fs.rmSync(framesDir, { recursive: true, force: true });
fs.mkdirSync(framesDir, { recursive: true });

const frameList = REVIEW_FRAMES.map((r) => r.frame).join(',');
console.log(`Rendering ${REVIEW_FRAMES.length} review keyframes (${frameList})...`);

execFileSync(
  'npx',
  [
    'remotion',
    'render',
    'src/index.ts',
    'Film',
    framesDir,
    '--sequence',
    `--frames=${frameList}`,
    '--image-format=png',
    '--scale=0.5',
    '--concurrency=4',
    '--log=error',
  ],
  { cwd: PROJECT, stdio: 'inherit' },
);

const rendered = fs
  .readdirSync(framesDir)
  .filter((f) => f.endsWith('.png'))
  .sort();

if (rendered.length !== REVIEW_FRAMES.length) {
  throw new Error(`Expected ${REVIEW_FRAMES.length} frames, got ${rendered.length}`);
}

// Label each tile cleanly and assemble a 2x7 contact sheet (or 4x4 grid)
const tileArgs = [];
rendered.forEach((file, idx) => {
  const meta = REVIEW_FRAMES[idx];
  const full = path.join(framesDir, file);
  tileArgs.push('-label', `f${meta.frame} · ${meta.label}`, full);
});

execFileSync(
  'magick',
  [
    'montage',
    ...tileArgs,
    '-tile',
    '2x7',
    '-geometry',
    '720x405+10+10',
    '-background',
    '#14171f',
    '-fill',
    '#ffffff',
    '-pointsize',
    '20',
    sheetOut,
  ],
  { stdio: 'inherit' },
);

console.log(`contact-sheet ok: wrote ${sheetOut}`);
