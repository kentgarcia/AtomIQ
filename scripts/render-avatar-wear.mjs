#!/usr/bin/env node
/**
 * Offline contact sheet of what the avatar can wear: head, eye and ear accessories and clothes, each on the avatar.
 * Usage: node scripts/render-avatar-wear.mjs <out-dir> [section]   (section: headwear | eyewear | earwear | outfit)
 * Writes <out-dir>/avatar-wear-<section>.svg for each section. Convert to look at it:
 *   magick -density 80 <out-dir>/avatar-wear-headwear.svg <out-dir>/avatar-wear-headwear.png
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const load = async (p) => (await import(pathToFileURL(path.join(REPO, p)).href));
const { AVATAR_OPTIONS, DEFAULT_AVATAR, avatarSpec, avatarBackground } = await load("components/avatar/avatar-core.ts");
const { buildNpc, toSvg, NPC_VIEWBOX, treeParts, partToSvg } = await load("components/npc/npc-art.ts");
const out = path.resolve(process.argv[2] ?? ".");
fs.mkdirSync(out, { recursive: true });

const SECTIONS = { headwear: "headwear", eyewear: "eyewear", earwear: "earwear", outfit: "outfit" };
const only = process.argv[3];
const CELL = 190;
const COLS = 5;

for (const [name, key] of Object.entries(SECTIONS)) {
  if (only && only !== name) continue;
  const ids = AVATAR_OPTIONS[key];
  const rows = Math.ceil(ids.length / COLS);
  const cells = ids.map((id, i) => {
    const config = { ...DEFAULT_AVATAR, hairStyle: name === "headwear" ? "classic" : DEFAULT_AVATAR.hairStyle, [key]: id };
    const form = { eyewear: "face", earwear: "ears", outfit: "chest" }[name] ?? "avatar";
    const vb = NPC_VIEWBOX[form];
    const tree = buildNpc(avatarSpec(config), "idle", form);
    const x = (i % COLS) * CELL + 8;
    const y = Math.floor(i / COLS) * (CELL + 22) + 8;
    return `<g transform="translate(${x} ${y})"><clipPath id="c${i}"><rect width="${CELL - 16}" height="${CELL - 16}" rx="16"/></clipPath><g clip-path="url(#c${i})"><rect width="${CELL - 16}" height="${CELL - 16}" fill="${avatarBackground(config)}"/><svg width="${CELL - 16}" height="${CELL - 16}" viewBox="${vb.x} ${vb.y} ${vb.w} ${vb.h}">${treeParts(tree).map(partToSvg).join("")}</svg></g><text x="${(CELL - 16) / 2}" y="${CELL + 2}" font-family="sans-serif" font-size="13" text-anchor="middle" fill="#333">${id}</text></g>`;
  });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${COLS * CELL}" height="${rows * (CELL + 22) + 16}"><rect width="100%" height="100%" fill="#fff"/>${cells.join("")}</svg>`;
  fs.writeFileSync(path.join(out, `avatar-wear-${name}.svg`), svg);
}
