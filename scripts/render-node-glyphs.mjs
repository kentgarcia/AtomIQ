#!/usr/bin/env node
/**
 * Offline contact sheet of the lesson-map glyphs, each on a round node face.
 * Usage: node scripts/render-node-glyphs.mjs <out-dir> [face-color]
 * Writes <out-dir>/node-glyphs.svg (open it in a browser, or convert it to PNG).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { GLYPHS, GLYPH_IDS, GLYPH_VIEWBOX } = await import(
  pathToFileURL(path.join(REPO, "components/path/node-glyphs.ts")).href
);
const out = path.resolve(process.argv[2] ?? ".");
const face = process.argv[3] ?? "#EA580C";
fs.mkdirSync(out, { recursive: true });

const shapeSvg = (s) => {
  const fill = s.fill ?? s.sw === undefined;
  return `<path d="${s.d}" fill="${fill ? "#fff" : "none"}"${fill && s.evenOdd ? ' fill-rule="evenodd"' : ""}${
    s.sw ? ` stroke="#fff" stroke-width="${s.sw}" stroke-linecap="round" stroke-linejoin="round"` : ""
  }/>`;
};
const glyphSvg = (g) => {
  const inner = g.shapes.map(shapeSvg).join("");
  return g.rotate ? `<g transform="rotate(${g.rotate} 24 24)">${inner}</g>` : inner;
};

const cell = 120;
const cols = 5;
const rows = Math.ceil(GLYPH_IDS.length / cols);
let body = "";
GLYPH_IDS.forEach((id, i) => {
  const x = (i % cols) * cell;
  const y = Math.floor(i / cols) * (cell + 18);
  body += `<circle cx="${x + 60}" cy="${y + 52}" r="40" fill="#C2410C"/><circle cx="${x + 60}" cy="${y + 46}" r="40" fill="${face}"/>`;
  body += `<svg x="${x + 60 - 24 * 1.0}" y="${y + 46 - 24}" width="48" height="48" viewBox="0 0 ${GLYPH_VIEWBOX} ${GLYPH_VIEWBOX}">${glyphSvg(GLYPHS[id])}</svg>`;
  body += `<text x="${x + 60}" y="${y + 112}" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#555">${id}</text>`;
});
const W = cols * cell;
const H = rows * (cell + 18);
fs.writeFileSync(
  path.join(out, "node-glyphs.svg"),
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#fff"/>${body}</svg>`,
);
console.log(`wrote ${path.join(out, "node-glyphs.svg")}`);
