#!/usr/bin/env node
/**
 * Double-size copies of the Kenney pictures the platformer uses (docs/PLATFORMER_SPEC.md), drawn from
 * the pack's own SVGs. The pack stays in tools/platformer-art as the library (License, Vector, Sprites;
 * the rest of the pack was removed); what the game USES lives in assets/images/platformer/<group>/ (backgrounds, enemies,
 * tiles, props, hud, characters). The pack's 64 px PNGs were soft at 3x density and blurry when a battle
 * zoomed in and the seams between tiles showed, so the used ones are baked at 2x here.
 *
 * Reads the list from components/platformer/sprites.ts (every `assets/images/platformer/<group>/<name>.png`
 * it requires, except Shrodi's own sheet, which is baked by bake-shrodi-hero.mjs), finds
 * the `<name>.svg` under the pack's `Vector` and the `<name>.png` under its `Sprites` (any subfolder), and writes the 2x picture to the
 * path that was required. To use a new picture from the pack: add its `require` to sprites.ts (in the
 * right group folder) and run this.
 * Run: node scripts/bake-platformer-sprites-2x.mjs      Needs ImageMagick (`magick`).
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PACK = path.join(REPO, "tools/platformer-art");
const OUT = path.join(REPO, "assets/images/platformer");
const source = fs.readFileSync(path.join(REPO, "components/platformer/sprites.ts"), "utf8");
const files = [...new Set([...source.matchAll(/assets\/images\/platformer\/([a-z]+\/[A-Za-z0-9_.-]+\.png)/g)].map((m) => m[1]))].filter((f) => !f.includes("character_shrodi") && !f.startsWith("emotes/")); // the sheet and the emotes have their own bake scripts

/** basename -> full path, for every file of an extension under a folder of the pack. */
const index = (dir, ext) => {
  const map = new Map();
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.isDirectory()) walk(path.join(d, e.name));
      else if (e.name.endsWith(ext)) map.set(e.name, path.join(d, e.name));
    }
  };
  walk(dir);
  return map;
};
const vectors = index(path.join(PACK, "Vector"), ".svg");
const sprites = index(path.join(PACK, "Sprites"), ".png");
const png = (f) => {
  const buf = fs.readFileSync(f);
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
};
let n = 0;
for (const rel of files) {
  const name = path.basename(rel);
  const original = sprites.get(name);
  const svg = vectors.get(name.replace(/\.png$/, ".svg"));
  if (!original) throw new Error(`no ${name} under ${PACK}/Sprites`);
  if (!svg) throw new Error(`no vector source for ${name} under ${PACK}/Vector`);
  const { w, h } = png(original);
  const out = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  execFileSync("magick", ["-background", "none", "-density", String(Math.round(96 * ((w * 2) / 64))), svg, "-resize", `${w * 2}x${h * 2}!`, `PNG32:${out}`]);
  n++;
}
console.log(`wrote ${n} pictures to assets/images/platformer`);
