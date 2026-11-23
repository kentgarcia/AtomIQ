#!/usr/bin/env node
/**
 * Offline contact sheet of the avatar patterns, so changes can be looked at.
 * Usage: node scripts/render-avatar-patterns.mjs <out-dir>
 * Writes <out-dir>/avatar-patterns.svg: every pattern as the shop swatch (white at 50% over a paint),
 * in a 2 x 2 repeat so the seams show. Convert to look at it:
 *   magick -density 110 <out-dir>/avatar-patterns.svg <out-dir>/avatar-patterns.png
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { PATTERN_DEFS, PATTERN_GLYPHS, TILE, tileDots, tilePlacements } = await import(pathToFileURL(path.join(REPO, "components/avatar/pattern-art.ts")).href);
const { BACKGROUND_COLORS } = await import(pathToFileURL(path.join(REPO, "components/avatar/avatar-core.ts")).href);
const { coverTones } = await import(pathToFileURL(path.join(REPO, "components/npc/npc-cover-art.ts")).href);
const out = path.resolve(process.argv[2] ?? ".");
fs.mkdirSync(out, { recursive: true });

const PAINTS = Object.values(BACKGROUND_COLORS);
const glyph = (id, color) =>
  PATTERN_GLYPHS[id]
    .map((s) => {
      if (s.t === "p") return `<path d="${s.d}" fill="${color}"/>`;
      if (s.t === "c") return `<circle cx="${s.cx}" cy="${s.cy}" r="${s.r}" fill="${color}"/>`;
      if (s.t === "r") return `<circle cx="${s.cx}" cy="${s.cy}" r="${s.r}" fill="none" stroke="${color}" stroke-width="${s.w}"/>`;
      return `<path d="${s.d}" fill="none" stroke="${color}" stroke-width="${s.w}" stroke-linecap="round" stroke-linejoin="round"/>`;
    })
    .join("");

const SW = 160;
const COLS = 4;
const pad = 14;
const rows = Math.ceil(PATTERN_DEFS.length / COLS);
const W = pad + COLS * (SW + pad);
const H = pad + rows * (SW + 30);
let body = `<rect width="${W}" height="${H}" fill="#FFFFFF"/>`;
PATTERN_DEFS.forEach((def, i) => {
  const x = pad + (i % COLS) * (SW + pad);
  const y = pad + Math.floor(i / COLS) * (SW + 30);
  const tones = coverTones(PAINTS[i % PAINTS.length]);
  const tiles = tilePlacements(def);
  const dots = tileDots(def.layout).map((d) => `<circle cx="${d.x}" cy="${d.y}" r="${d.r}" fill="${tones.shade}"/>`).join("");
  const one = dots + tiles.map((t) => `<g transform="translate(${t.x}, ${t.y}) rotate(${t.rotate}) scale(${t.size / 24}) translate(-12, -12)">${glyph(t.glyph, t.tone === "light" ? tones.light : tones.shade)}</g>`).join("");
  let tileUse = "";
  for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) tileUse += `<g transform="translate(${a * TILE}, ${b * TILE})">${one}</g>`;
  body += `<svg x="${x}" y="${y}" width="${SW}" height="${SW}" viewBox="0 0 ${TILE * 1.4} ${TILE * 1.4}"><clipPath id="k${i}"><rect width="${TILE * 1.4}" height="${TILE * 1.4}" rx="26"/></clipPath><g clip-path="url(#k${i})"><rect width="${TILE * 1.4}" height="${TILE * 1.4}" fill="${tones.base}"/>${tileUse}</g></svg>`;
  body += `<text x="${x + SW / 2}" y="${y + SW + 16}" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#4B4B4B">${def.name.replace(/&/g, "&amp;")}</text>`;
});
fs.writeFileSync(path.join(out, "avatar-patterns.svg"), `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${body}</svg>`);
console.log(`wrote ${path.join(out, "avatar-patterns.svg")} (${PATTERN_DEFS.length} patterns)`);
