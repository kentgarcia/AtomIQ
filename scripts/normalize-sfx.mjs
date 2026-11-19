#!/usr/bin/env node
/**
 * One-off loudness pass for the bundled effects (docs/SFX_SPEC.md §7.4).
 *
 * expo-audio volume only goes down, so a quiet file cannot be raised at runtime. This brings each
 * file's mean level to a target by role, then keeps the peak at or under -1 dBFS (a file that cannot
 * reach its target without clipping is reported, never clipped). It is repeatable: a file already at
 * its target is left alone.
 *
 * Run: node scripts/normalize-sfx.mjs            (dry run: prints before / after)
 *      node scripts/normalize-sfx.mjs --apply    (rewrites the WAVs; needs ffmpeg)
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

import { CUES, CUE_IDS, SFX_FILES } from "../services/sfx-core.ts";

const APPLY = process.argv.includes("--apply");
const ROOT = process.cwd();
const PEAK_CEILING = -1;
/** Mean level target by the role of a file's first cue (dBFS). */
const TARGET = { tap: -22, panel: -22, feedback: -22, reward: -22, stinger: -20, voice: -28 };

const measure = (file) => {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-i", file, "-af", "volumedetect", "-f", "null", "-"], { encoding: "utf8" });
  const mean = /mean_volume: (-?[\d.]+) dB/.exec(r.stderr);
  const peak = /max_volume: (-?[\d.]+) dB/.exec(r.stderr);
  if (!mean || !peak) throw new Error(`could not measure ${file}: ${r.stderr.slice(-200)}`);
  return { mean: Number(mean[1]), peak: Number(peak[1]) };
};

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "atomiq-sfx-"));
let changed = 0;
console.log("file".padEnd(30), "target", "mean", "peak", "gain", "note");
for (const file of Object.keys(SFX_FILES)) {
  const full = path.join(ROOT, "assets", "sfx", `${file}.wav`);
  // A file shared by several cues gets the loudest target among them; a quieter cue lowers its volume
  const target = Math.max(...CUE_IDS.filter((id) => CUES[id].file === file).map((id) => TARGET[CUES[id].category]));
  const { mean, peak } = measure(full);
  let gain = target - mean;
  let note = "";
  const room = PEAK_CEILING - peak;
  if (gain > room) {
    gain = room;
    note = `short of target by ${(target - mean - room).toFixed(1)} dB (peak limit)`;
  }
  if (Math.abs(gain) < 0.5) gain = 0;
  console.log(file.padEnd(30), String(target).padStart(6), mean.toFixed(1).padStart(5), peak.toFixed(1).padStart(5), gain.toFixed(1).padStart(5), note);
  if (gain === 0 || !APPLY) continue;
  const out = path.join(tmp, "out.wav");
  const r = spawnSync("ffmpeg", ["-v", "error", "-y", "-i", full, "-af", `volume=${gain.toFixed(2)}dB`, "-ac", "1", "-ar", "44100", "-c:a", "pcm_s16le", "-map_metadata", "-1", "-f", "wav", out], { encoding: "utf8" });
  if (r.status !== 0) throw new Error(`ffmpeg failed on ${file}: ${r.stderr}`);
  fs.copyFileSync(out, full);
  changed += 1;
}
fs.rmSync(tmp, { recursive: true, force: true });
console.log(APPLY ? `\nrewrote ${changed} file(s)` : "\ndry run: nothing written (use --apply)");
