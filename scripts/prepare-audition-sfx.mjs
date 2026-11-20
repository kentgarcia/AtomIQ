#!/usr/bin/env node
/**
 * Builds the SFX lab's audio (docs/features/SFX_EXPANSION_SPEC.md §8).
 *
 * Reads every candidate file named in `components/dev/sfx-lab-data.ts`, converts it from the unused
 * library (`assets/sfx/kent-sfx/`, gitignored, 48 kHz, some stereo, some with cover art) to the
 * bundled format (16-bit PCM, mono, 44.1 kHz, no tags), levels it the way `normalize-sfx.mjs` does
 * (silence before the first sound cut, mean to the role's target, peak at or under -1 dBFS, never
 * clipped), writes it to
 * `assets/sfx/audition/<name>.wav`, and writes `components/dev/sfx-lab-sources.ts` (the `require`s
 * and lengths the lab screen needs).
 *
 * Run: node scripts/prepare-audition-sfx.mjs            (needs ffmpeg)
 *      node scripts/prepare-audition-sfx.mjs --check    (verifies the output is up to date; writes nothing)
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

import { LAB_MOMENTS, labFiles, labTargetFor } from "../components/dev/sfx-lab-data.ts";

const ROOT = process.cwd();
const CHECK = process.argv.includes("--check");
const LIBRARY = path.join(ROOT, "assets", "sfx", "kent-sfx");
const OUT_DIR = path.join(ROOT, "assets", "sfx", "audition");
const SOURCES_FILE = path.join(ROOT, "components", "dev", "sfx-lab-sources.ts");
const PEAK_CEILING = -1;
/** Silence before the first sound (below -50 dBFS) is cut, keeping 10 ms: a tap's sound should not arrive late. */
const LEAD_TRIM = "silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.01";

const ffmpeg = (args) => {
  const r = spawnSync("ffmpeg", ["-hide_banner", ...args], { encoding: "utf8" });
  if (r.error) throw new Error("ffmpeg is needed: " + r.error.message);
  return r;
};

const measure = (file) => {
  const r = ffmpeg(["-i", file, "-af", "volumedetect", "-f", "null", "-"]);
  const mean = /mean_volume: (-?[\d.]+) dB/.exec(r.stderr);
  const peak = /max_volume: (-?[\d.]+) dB/.exec(r.stderr);
  if (!mean || !peak) throw new Error(`could not measure ${file}: ${r.stderr.slice(-200)}`);
  return { mean: Number(mean[1]), peak: Number(peak[1]) };
};

/** Length in ms and the silence before the first audible sample, read from a 16-bit mono WAV. */
const inspect = (file) => {
  const buf = fs.readFileSync(file);
  let pos = 12;
  let data = null;
  while (pos + 8 <= buf.length) {
    const id = buf.toString("ascii", pos, pos + 4);
    const size = buf.readUInt32LE(pos + 4);
    if (id === "data") {
      data = buf.subarray(pos + 8, pos + 8 + size);
      break;
    }
    pos += 8 + size + (size % 2);
  }
  if (!data) throw new Error(`${file}: no data chunk`);
  const samples = data.length / 2;
  let lead = 0;
  while (lead < samples && Math.abs(data.readInt16LE(lead * 2)) < 330) lead += 1; // about -40 dBFS
  return { ms: Math.round((samples / 44100) * 1000), leadMs: Math.round((lead / 44100) * 1000) };
};

/** A file only ever played with `stopAfter` is trimmed to the longest of them (a long loop kept short). */
const trimFor = (name) => {
  let longest = 0;
  for (const m of LAB_MOMENTS) for (const v of m.variants) for (const s of v.steps) {
    if (s.file !== name) continue;
    if (s.stopAfter === undefined) return null;
    longest = Math.max(longest, s.stopAfter);
  }
  return longest ? (longest + 300) / 1000 : null;
};

const names = labFiles();
const missing = names.filter((n) => !fs.existsSync(path.join(LIBRARY, `${n}.wav`)));
if (missing.length) {
  console.error(`missing from assets/sfx/kent-sfx: ${missing.join(", ")}`);
  process.exit(1);
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "atomiq-audition-"));
const rows = [];
if (!CHECK) fs.mkdirSync(OUT_DIR, { recursive: true });

for (const name of names) {
  const src = path.join(LIBRARY, `${name}.wav`);
  const out = path.join(OUT_DIR, `${name}.wav`);
  const target = labTargetFor(name);
  if (CHECK) {
    if (!fs.existsSync(out)) {
      console.error(`stale: assets/sfx/audition/${name}.wav is missing (run node scripts/prepare-audition-sfx.mjs)`);
      process.exit(1);
    }
    rows.push({ name, ...inspect(out), mean: NaN, peak: NaN, target, gain: 0, note: "" });
    continue;
  }
  // Pass 1: the bundled format. Pass 2: the level, measured on what will actually play.
  const trim = trimFor(name);
  const flat = path.join(tmp, "flat.wav");
  const base = ["-v", "error", "-y", "-i", src, ...(trim ? ["-t", String(trim)] : []), "-af", LEAD_TRIM, "-ac", "1", "-ar", "44100", "-c:a", "pcm_s16le", "-map_metadata", "-1", "-fflags", "+bitexact", "-flags:a", "+bitexact", "-f", "wav"];
  let r = ffmpeg([...base, flat]);
  if (r.status !== 0) throw new Error(`ffmpeg failed on ${name}: ${r.stderr}`);
  const { mean, peak } = measure(flat);
  let gain = target - mean;
  let note = "";
  const room = PEAK_CEILING - peak;
  if (gain > room) {
    note = `short of target by ${(gain - room).toFixed(1)} dB (peak limit)`;
    gain = room;
  }
  if (Math.abs(gain) < 0.5) gain = 0;
  r = ffmpeg(["-v", "error", "-y", "-i", flat, "-af", `volume=${gain.toFixed(2)}dB`, "-c:a", "pcm_s16le", "-map_metadata", "-1", "-fflags", "+bitexact", "-flags:a", "+bitexact", "-f", "wav", out]);
  if (r.status !== 0) throw new Error(`ffmpeg failed on ${name}: ${r.stderr}`);
  rows.push({ name, ...inspect(out), mean, peak, target, gain, note });
}
fs.rmSync(tmp, { recursive: true, force: true });

if (!CHECK) {
  // Drop files that are no longer named by any moment
  for (const f of fs.readdirSync(OUT_DIR)) {
    if (f.endsWith(".wav") && !names.includes(f.slice(0, -4))) fs.unlinkSync(path.join(OUT_DIR, f));
  }
  const lines = rows.map((r) => `  ${JSON.stringify(r.name)}: { source: require("../../assets/sfx/audition/${r.name}.wav"), ms: ${r.ms} },`);
  fs.writeFileSync(
    SOURCES_FILE,
    `/**
 * GENERATED by \`node scripts/prepare-audition-sfx.mjs\` from sfx-lab-data.ts. Do not edit.
 * The only \`require\`s of the audition files (docs/features/SFX_EXPANSION_SPEC.md §8): development only,
 * loaded by the SFX lab, which Metro drops from a release build.
 */
export interface LabSource {
  source: number;
  /** Length of the converted file, ms. */
  ms: number;
}

export const LAB_SOURCES: Readonly<Record<string, LabSource>> = {
${lines.join("\n")}
};
`,
  );
}

console.log("file".padEnd(40), "target", "mean", "peak", "gain", "ms".padStart(5), "lead", "note");
for (const r of rows) {
  const lead = r.leadMs > 30 ? `${r.leadMs}!` : String(r.leadMs);
  console.log(r.name.padEnd(40), String(r.target).padStart(6), Number.isNaN(r.mean) ? "   - " : r.mean.toFixed(1).padStart(5), Number.isNaN(r.peak) ? "   - " : r.peak.toFixed(1).padStart(5), r.gain.toFixed(1).padStart(5), String(r.ms).padStart(5), lead.padStart(4), r.note);
}
console.log(CHECK ? `\n${rows.length} audition files present` : `\nwrote ${rows.length} files to assets/sfx/audition and components/dev/sfx-lab-sources.ts`);
