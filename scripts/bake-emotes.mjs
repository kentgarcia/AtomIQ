#!/usr/bin/env node
/**
 * Bakes the speech-bubble emotes the platformer uses from Kenney's Emotes sheet (CC0; the vector sheet
 * is kept in `assets/images/platformer/emotes/source` with its license; style 1: a rounded square
 * balloon with a tail) into `assets/images/platformer/emotes/<name>.png`, 4x (128 x 152 px).
 * Needs ImageMagick (`magick`).
 *
 * The sheet is 10 columns by 3 rows of balloons, left to right, top to bottom, in the order of NAMES.
 * To use another one, add its name to USE and a `require` to `EMOTE_SPRITES` in `sprites.ts`, then run
 * `node scripts/bake-emotes.mjs`.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "assets/images/platformer/emotes");
const NAMES = ["blank", "dots1", "dots2", "dots3", "heartBroken", "heart", "hearts", "exclamations", "exclamation", "question", "sleep", "sleeps", "bars", "faceHappy", "faceSad", "faceAngry", "alert", "star", "stars", "music", "drop", "drops", "anger", "cash", "swirl", "cross", "circle", "idea", "laugh", "cloud"];
const USE = ["exclamation", "question", "anger", "heartBroken", "heart", "faceHappy", "faceSad", "star", "stars", "swirl", "laugh", "idea", "sleep", "dots3"];

// The sheet has no size of its own: give it one wide enough for all ten columns
const svg = readFileSync(path.join(root, "assets/images/platformer/emotes/source/emotes_vector.svg"), "utf8").replace("<svg ", '<svg width="520" height="160" viewBox="0 0 520 160" ');
const tmp = mkdtempSync(path.join(tmpdir(), "emotes-"));
writeFileSync(path.join(tmp, "sheet.svg"), svg);
const sheet = path.join(tmp, "sheet.png");
execFileSync("magick", ["-background", "none", "-density", "384", path.join(tmp, "sheet.svg"), `PNG32:${sheet}`]);
for (const name of USE) {
  const i = NAMES.indexOf(name);
  if (i < 0) throw new Error(`unknown emote ${name}`);
  const x = 80 + (i % 10) * 160;
  const y = 80 + Math.floor(i / 10) * 160;
  execFileSync("magick", [sheet, "-crop", `128x152+${x}+${y}`, "+repage", `PNG32:${path.join(out, `${name}.png`)}`]);
}
console.log(`wrote ${USE.length} emotes to ${path.relative(root, out)}`);
