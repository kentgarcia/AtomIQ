/**
 * Keeps every Nth frame of a sprite sheet (docs/features/RENDER_COST_SPEC.md A1): a sheet is one picture whose decoded size is its whole
 * grid, so a glow that plays at 25 fps costs twice what it needs to at 12.5. Prints the new frame count, grid and fps for `chest-sheets.ts`.
 * Run: node scripts/thin-sprite-sheet.mjs --in <sheet.webp> --cols 8 --cell 168 --frames 104 --fps 25 --keep 2 --out <sheet.webp>
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
};
const input = arg("in");
const output = arg("out", input);
const cols = Number(arg("cols"));
const cell = Number(arg("cell"));
const frames = Number(arg("frames"));
const fps = Number(arg("fps"));
const keep = Number(arg("keep", 2));
if (!input || !cols || !cell || !frames || !fps) {
  console.error("usage: node scripts/thin-sprite-sheet.mjs --in <sheet> --cols N --cell PX --frames N --fps N [--keep 2] [--out <sheet>]");
  process.exit(1);
}
const dir = mkdtempSync(join(tmpdir(), "thin-"));
try {
  execFileSync("magick", [input, "-crop", `${cell}x${cell}`, "+repage", "+adjoin", join(dir, "f%04d.png")]);
  const all = readdirSync(dir).filter((n) => n.startsWith("f")).sort();
  const kept = all.slice(0, frames).filter((_, i) => i % keep === 0).map((n) => join(dir, n));
  execFileSync("magick", ["montage", ...kept, "-tile", `${cols}x`, "-geometry", `${cell}x${cell}+0+0`, "-background", "none", "-quality", "85", "-define", "webp:method=6", output]);
  console.log(JSON.stringify({ frames: kept.length, cols, fps: fps / keep, rows: Math.ceil(kept.length / cols) }));
} finally {
  rmSync(dir, { recursive: true, force: true });
}
