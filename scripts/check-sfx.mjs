#!/usr/bin/env node
/**
 * SFX gate (docs/features/SFX_SPEC.md §9). Fails when:
 *  - a bundled file has no cue, or a catalog file is missing on disk;
 *  - a WAV is not 16-bit PCM, mono, 44.1 kHz, carries a chunk over 1 KB besides its audio
 *    (a cover image sneaking back in), or its length differs from the catalog's `ms`;
 *  - source outside services/sfx.ts requires assets/sfx, anything imports the unused library
 *    (kent-sfx), or expo-audio is imported outside services/sfx.ts and services/media.ts;
 *
 * Run: npm run check:sfx        (option for tests: --root <dir>)
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const args = process.argv.slice(2);
const rootArg = args.indexOf("--root");
const ROOT = rootArg >= 0 ? path.resolve(args[rootArg + 1]) : process.cwd();
const SFX_DIR = path.join(ROOT, "assets", "sfx");
const SOURCE_EXT = /\.(ts|tsx|js|jsx|mjs)$/;
const SKIP_DIRS = new Set(["node_modules", ".git", ".expo", "dist", "web-build", "scripts", "docs", "content"]);

const problems = [];
const fail = (message) => problems.push(message);

/** Parse a RIFF/WAVE header: format fields, the audio length and the size of every other chunk. */
export function readWav(buffer) {
  if (buffer.length < 12 || buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WAVE") {
    throw new Error("not a RIFF/WAVE file");
  }
  let fmt = null;
  let dataBytes = 0;
  const extra = [];
  let pos = 12;
  while (pos + 8 <= buffer.length) {
    const id = buffer.toString("ascii", pos, pos + 4);
    const size = buffer.readUInt32LE(pos + 4);
    if (id === "fmt ") {
      fmt = {
        format: buffer.readUInt16LE(pos + 8),
        channels: buffer.readUInt16LE(pos + 10),
        rate: buffer.readUInt32LE(pos + 12),
        bits: buffer.readUInt16LE(pos + 22),
      };
    } else if (id === "data") dataBytes = size;
    else extra.push({ id, size });
    pos += 8 + size + (size % 2);
  }
  if (!fmt) throw new Error("no fmt chunk");
  const ms = Math.round((dataBytes / (fmt.rate * fmt.channels * (fmt.bits / 8))) * 1000);
  return { ...fmt, ms, extra };
}

function* walk(dir, match) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) yield* walk(full, match);
    } else if (match.test(entry.name)) yield full;
  }
}

const { SFX_FILES, MIN_SFX_MS } = await import(pathToFileURL(path.join(ROOT, "services", "sfx-core.ts")).href);
const rel = (p) => path.relative(ROOT, p).split(path.sep).join("/");

// Catalog <-> disk
const onDisk = new Set();
for (const full of walk(SFX_DIR, /\.(wav|mp3|ogg|m4a)$/i)) {
  const r = rel(full).replace(/^assets\/sfx\//, "");
  if (r.startsWith("kent-sfx/")) continue; // the unused library stays out of the bundle
  onDisk.add(r.replace(/\.[^.]+$/, ""));
  if (!r.endsWith(".wav")) fail(`assets/sfx/${r}: only .wav is bundled (one format, iOS-safe)`);
}
for (const file of Object.keys(SFX_FILES)) if (!onDisk.has(file)) fail(`catalog file "${file}" is missing: assets/sfx/${file}.wav`);
for (const file of onDisk) if (!(file in SFX_FILES)) fail(`assets/sfx/${file}.wav has no entry in SFX_FILES (services/sfx-core.ts)`);

// WAV format and length
for (const [file, ms] of Object.entries(SFX_FILES)) {
  const full = path.join(SFX_DIR, `${file}.wav`);
  if (!fs.existsSync(full)) continue;
  let wav;
  try {
    wav = readWav(fs.readFileSync(full));
  } catch (error) {
    fail(`${file}.wav: ${error.message}`);
    continue;
  }
  if (wav.format !== 1 || wav.bits !== 16) fail(`${file}.wav: must be 16-bit PCM (got format ${wav.format}, ${wav.bits}-bit)`);
  if (wav.channels !== 1) fail(`${file}.wav: must be mono (got ${wav.channels} channels)`);
  if (wav.rate !== 44100) fail(`${file}.wav: must be 44.1 kHz (got ${wav.rate})`);
  for (const chunk of wav.extra) if (chunk.size > 1024) fail(`${file}.wav: "${chunk.id}" chunk is ${chunk.size} bytes (cover art or tags?)`);
  if (wav.ms < MIN_SFX_MS) fail(`${file}.wav: is ${wav.ms} ms, under ${MIN_SFX_MS} ms: audio-api cannot decode a file that short (run node scripts/pad-short-sfx.mjs --apply)`);
  if (Math.abs(wav.ms - ms) > 15) fail(`${file}.wav: is ${wav.ms} ms but SFX_FILES says ${ms} ms`);
}

// Source rules
const allowedRequire = new Set(["services/sfx.ts"]);
const allowedAudio = new Set(["services/sfx-backend-expo-audio.ts", "services/media.ts", "services/media-core.ts"]);
// The audio-api engine: Android only, one file, loaded through a guarded require (docs/features/PERFORMANCE_AND_SOUND_SPEC.md §12.1)
const allowedAudioApi = new Set(["services/sfx-backend-audio-api.ts"]);
for (const full of walk(ROOT, SOURCE_EXT)) {
  const r = rel(full);
  const text = fs.readFileSync(full, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
  if (/kent-sfx/.test(text)) fail(`${r}: refers to the unused SFX library (kent-sfx)`);
  if (/assets\/sfx\//.test(text) && !allowedRequire.has(r)) fail(`${r}: requires an effect file; call playSfx("group.name") instead`);
  if (/from\s+["']expo-audio["']/.test(text) && !allowedAudio.has(r)) fail(`${r}: imports expo-audio; effects go through services/sfx.ts and its engines (services/sfx-backend-expo-audio.ts)`);
  if (/(from\s+|require\(\s*|import\(\s*)["']react-native-audio-api["']/.test(text) && !allowedAudioApi.has(r)) fail(`${r}: imports react-native-audio-api; only services/sfx-backend-audio-api.ts may, through its guarded require`);
  if (r === "services/sfx-backend-audio-api.ts" && /^\s*import\s+(?!type\b)[^;]*from\s+["']react-native-audio-api["']/m.test(text)) fail(`${r}: a plain import of react-native-audio-api would load its native module in Expo Go; use the guarded require in loadAudioApi and \`import type\` only`);
  if (/^services\/(sfx-core|sfx-backend-core|sfx-diag)\.ts$/.test(r) && /from\s+["'](expo-audio|react-native|react-native-audio-api)["']/.test(text)) fail(`${r}: must stay framework-free (node --test runs it)`);
}

if (problems.length) {
  console.error(`check:sfx failed (${problems.length}):\n` + problems.map((p) => `  - ${p}`).join("\n"));
  process.exit(1);
}
console.log(`check:sfx ok: ${Object.keys(SFX_FILES).length} files, format, catalog and source rules`);
