#!/usr/bin/env node
/**
 * Pads the shortest bundled effects with silence up to `MIN_SFX_MS` (docs/features/PERFORMANCE_AND_SOUND_SPEC.md §12.1).
 *
 * `react-native-audio-api` could not decode any file shorter than about 30 ms ("Cannot decode audio data: unsupported or
 * invalid audio format") on the first Android development build, though the files are valid 16-bit mono 44.1 kHz WAVs, and
 * a file of 43 ms decoded fine. So no bundled effect may be shorter than `MIN_SFX_MS`. The sound itself is not touched: the
 * file only gets zeros after it, and its entry in `SFX_FILES` (services/sfx-core.ts) is updated to the new length.
 *
 * Run: node scripts/pad-short-sfx.mjs            (dry run: lists what would change)
 *      node scripts/pad-short-sfx.mjs --apply    (rewrites the WAVs and their SFX_FILES lines)
 * Repeatable: a file that is long enough is left alone.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";


const ROOT = process.cwd();
const APPLY = process.argv.includes("--apply");
const { SFX_FILES, MIN_SFX_MS } = await import(pathToFileURL(path.join(ROOT, "services", "sfx-core.ts")).href);

const RATE = 44100;
const BYTES_PER_SAMPLE = 2;

/** Just the length of a 16-bit mono 44.1 kHz WAV (check-sfx.mjs has the full reader, but it runs its checks when imported). */
const readWav = (buffer) => {
  let pos = 12;
  while (pos + 8 <= buffer.length) {
    const size = buffer.readUInt32LE(pos + 4);
    if (buffer.toString("ascii", pos, pos + 4) === "data") return { ms: Math.round((size / (RATE * BYTES_PER_SAMPLE)) * 1000) };
    pos += 8 + size + (size % 2);
  }
  throw new Error("no data chunk");
};


/** The whole file again: a plain 44-byte header, the original samples, then silence up to `targetMs`. */
const padded = (buffer, targetMs) => {
  let pos = 12;
  let data = null;
  while (pos + 8 <= buffer.length) {
    const id = buffer.toString("ascii", pos, pos + 4);
    const size = buffer.readUInt32LE(pos + 4);
    if (id === "data") data = buffer.subarray(pos + 8, pos + 8 + size);
    pos += 8 + size + (size % 2);
  }
  if (!data) throw new Error("no data chunk");
  const bytes = Math.max(data.length, Math.ceil((targetMs / 1000) * RATE) * BYTES_PER_SAMPLE);
  const header = Buffer.alloc(44);
  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(36 + bytes, 4);
  header.write("WAVEfmt ", 8, "ascii");
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * BYTES_PER_SAMPLE, 28);
  header.writeUInt16LE(BYTES_PER_SAMPLE, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36, "ascii");
  header.writeUInt32LE(bytes, 40);
  return Buffer.concat([header, data, Buffer.alloc(bytes - data.length)]);
};

let coreSource = fs.readFileSync(path.join(ROOT, "services", "sfx-core.ts"), "utf8");
let changed = 0;
for (const file of Object.keys(SFX_FILES)) {
  const full = path.join(ROOT, "assets", "sfx", `${file}.wav`);
  const buffer = fs.readFileSync(full);
  const wav = readWav(buffer);
  if (wav.ms >= MIN_SFX_MS) continue;
  const out = padded(buffer, MIN_SFX_MS);
  const ms = readWav(out).ms;
  console.log(`${file.padEnd(28)} ${String(wav.ms).padStart(3)} ms -> ${ms} ms`);
  changed += 1;
  if (!APPLY) continue;
  fs.writeFileSync(full, out);
  const line = new RegExp(`(["']${file.replace("/", "\\/")}["']:\\s*)\\d+`);
  if (!line.test(coreSource)) throw new Error(`no SFX_FILES line for ${file}`);
  coreSource = coreSource.replace(line, `$1${ms}`);
}
if (APPLY && changed > 0) fs.writeFileSync(path.join(ROOT, "services", "sfx-core.ts"), coreSource);
console.log(APPLY ? `\npadded ${changed} file(s)` : `\ndry run: ${changed} file(s) would be padded (use --apply)`);
