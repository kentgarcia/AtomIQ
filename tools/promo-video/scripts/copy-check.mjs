#!/usr/bin/env node
/**
 * Cinetic-style copy quality gate for AtomIQ promo video:
 * - Zero marketing buzzwords
 * - Concise lines (<= 7 words per entry)
 * - Comfortable mute-first reading speed (<= 3.5 words/sec overall & per beat)
 */
const { COPY, DURATION_FRAMES, FPS } = await import('../src/timeline.ts');

const BANNED = [
  'revolutionize',
  'revolutionary',
  'unlock your potential',
  'next-gen',
  'game-changer',
  'seamless',
  'synergy',
  'cutting-edge',
  'supercharge',
  'reimagine',
  'elevate',
  'empower',
];

const errors = [];
let totalWords = 0;

for (const entry of COPY) {
  const words = entry.text.trim().split(/\s+/).filter(Boolean);
  totalWords += words.length;
  const lower = entry.text.toLowerCase();

  for (const bad of BANNED) {
    if (lower.includes(bad)) {
      errors.push(`[${entry.id}] banned buzzword "${bad}" in "${entry.text}"`);
    }
  }
  if (words.length > 7) {
    errors.push(`[${entry.id}] too many words (${words.length} > 7): "${entry.text}"`);
  }
  const durSec = (entry.to - entry.from) / FPS;
  const wps = words.length / Math.max(durSec, 0.25);
  if (entry.role !== 'stamp' && wps > 3.5) {
    errors.push(`[${entry.id}] reading speed too fast (${wps.toFixed(2)} wps > 3.5): "${entry.text}"`);
  }
}

const totalSec = DURATION_FRAMES / FPS;
const avgWps = totalWords / totalSec;
if (avgWps > 3.5) {
  errors.push(`Overall reading speed too fast (${avgWps.toFixed(2)} wps > 3.5)`);
}

if (errors.length) {
  console.error('copy-check FAILED:\n' + errors.map((e) => `  - ${e}`).join('\n'));
  process.exit(1);
}

console.log(
  `copy-check ok: ${COPY.length} entries, ${totalWords} words over ${totalSec.toFixed(1)}s (${avgWps.toFixed(2)} words/sec), 0 buzzwords`,
);
