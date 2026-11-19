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
const { PATTERN_DEFS, PATTERN_GLYPHS, TILE, tilePlacements } = await import(pathToFileURL(path.join(REPO, "components/avatar/pattern-art.ts")).href);
const out = path.resolve(process.argv[2] ?? ".");
fs.mkdirSync(out, { recursive: true });

const PAINTS = ["#1CB0F6", "#58CC02", "#CE82FF", "#FF9600", "#FF4B4B", "#FFC800"];
const glyph = (id) =>
  PATTERN_GLYPHS[id]
    .map((s) => {
      if (s.t === "p") return `<path d="${s.d}"/>`;
      if (s.t === "c") return `<circle cx="${s.cx}" cy="${s.cy}" r="${s.r}"/>`;
      if (s.t === "r") return `<circle cx="${s.cx}" cy="${s.cy}" r="${s.r}" fill="none" stroke="#FFFFFF" stroke-width="${s.w}"/>`;
      return `<path d="${s.d}" fill="none" stroke="#FFFFFF" stroke-width="${s.w}" stroke-linecap="round" stroke-linejoin="round"/>`;
    })
    .join("");

const SW = 150;
const COLS = 4;
const pad = 14;
const rows = Math.ceil(PATTERN_DEFS.length / COLS);
const W = pad + COLS * (SW + pad);
const H = pad + rows * (SW + 30);
let body = `<rect width="${W}" height="${H}" fill="#FFFFFF"/>`;
PATTERN_DEFS.forEach((def, i) => {
  const x = pad + (i % COLS) * (SW + pad);
  const y = pad + Math.floor(i / COLS) * (SW + 30);
  const tiles = tilePlacements(def);
  const one = tiles.map((t) => `<g transform="translate(${t.x} ${t.y}) scale(${t.size / 24}) rotate(${t.rotate}) translate(-12 -12)">${glyph(t.glyph)}</g>`).join("");
  let tileUse = "";
  for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) tileUse += `<g transform="translate(${a * TILE} ${b * TILE})">${one}</g>`;
  body += `<svg x="${x}" y="${y}" width="${SW}" height="${SW}" viewBox="0 0 ${TILE * 2} ${TILE * 2}"><clipPath id="k${i}"><rect width="${TILE * 2}" height="${TILE * 2}" rx="26"/></clipPath><g clip-path="url(#k${i})"><rect width="${TILE * 2}" height="${TILE * 2}" fill="${PAINTS[i % PAINTS.length]}"/><g fill="#FFFFFF" opacity="0.5">${tileUse}</g></g></svg>`;
  body += `<text x="${x + SW / 2}" y="${y + SW + 16}" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#4B4B4B">${def.name}</text>`;
});
fs.writeFileSync(path.join(out, "avatar-patterns.svg"), `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${body}</svg>`);
console.log(`wrote ${path.join(out, "avatar-patterns.svg")} (${PATTERN_DEFS.length} patterns)`);
