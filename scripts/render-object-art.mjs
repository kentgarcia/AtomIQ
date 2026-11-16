#!/usr/bin/env node
/**
 * Offline contact sheet of the lesson object art, so changes can be looked at.
 * Usage: node scripts/render-object-art.mjs <out-dir>
 * Writes <out-dir>/object-art.svg: every picture on a lesson answer card (sized as measured in the
 * duolingo-object-style skill), at 48 px, and as a one-colour silhouette. Convert to look at it:
 *   magick -density 130 <out-dir>/object-art.svg <out-dir>/object-art.png
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { OBJECT_ART, ART_IDS, ART_NAMES } = await import(pathToFileURL(path.join(REPO, "components/lesson/visual/object-art.ts")).href);
const out = path.resolve(process.argv[2] ?? ".");
fs.mkdirSync(out, { recursive: true });

const f = (n) => Math.round(n * 100) / 100;
const shape = (s, recolor) => {
  const op = s.opacity === undefined ? "" : ` fill-opacity="${s.opacity}"`;
  if (s.t === "rect") return `<rect x="${f(s.x)}" y="${f(s.y)}" width="${f(s.w)}" height="${f(s.h)}" rx="${f(s.r)}" fill="${recolor ?? s.fill}"${op}/>`;
  if (s.t === "circle") return `<circle cx="${f(s.cx)}" cy="${f(s.cy)}" r="${f(s.r)}" fill="${recolor ?? s.fill}"${op}/>`;
  if (s.t === "path") return `<path d="${s.d}" fill="${recolor ?? s.fill}"${op}/>`;
  return `<path d="${s.d}" fill="none" stroke="${recolor ?? s.stroke}" stroke-width="${s.width}" stroke-linecap="round" stroke-linejoin="round"/>`;
};
const art = (id, recolor) => OBJECT_ART[id].map((s) => shape(s, recolor)).join("");

const CARD = { w: 142, h: 180, lip: 3, gap: 19 };
const COLS = 5;
const pad = 14;
const rows = Math.ceil(ART_IDS.length / COLS);
const rowH = CARD.h + CARD.lip + pad;
const W = COLS * (CARD.w + CARD.gap) + pad;
const H = rows * rowH + 2 * 70 + 2 * pad;
let body = `<rect width="${W}" height="${H}" fill="#FFFFFF"/>`;
ART_IDS.forEach((id, i) => {
  const x = pad + (i % COLS) * (CARD.w + CARD.gap);
  const y = pad + Math.floor(i / COLS) * rowH;
  const size = CARD.w * 0.64;
  const cx = x + CARD.w / 2;
  const cy = y + CARD.h * 0.4;
  body += `<rect x="${x}" y="${y + CARD.lip}" width="${CARD.w}" height="${CARD.h}" rx="16" fill="#E5E5E5"/><rect x="${x + 1}" y="${y + 1}" width="${CARD.w - 2}" height="${CARD.h - 2}" rx="15" fill="#FFFFFF" stroke="#E5E5E5" stroke-width="2"/>`;
  body += `<g transform="translate(${cx - size / 2} ${cy - size / 2}) scale(${size / 100})">${art(id)}</g>`;
  body += `<text x="${cx}" y="${y + CARD.h * 0.82 + 14}" text-anchor="middle" font-family="sans-serif" font-size="15" fill="#4B4B4B">${ART_NAMES[id].replace(/^an? |^the /, "")}</text>`;
});
let y = pad + rows * rowH + 6;
for (const recolor of [undefined, "#4B4B4B"]) {
  body += `<text x="${pad}" y="${y + 12}" font-family="sans-serif" font-size="12" fill="#777777">${recolor ? "silhouette" : "48 px"}</text>`;
  ART_IDS.forEach((id, i) => (body += `<g transform="translate(${pad + 56 + (i % 12) * 56} ${y + Math.floor(i / 12) * 54}) scale(0.48)">${art(id, recolor)}</g>`));
  y += 2 * 54 + 8;
}
fs.writeFileSync(path.join(out, "object-art.svg"), `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H + 120}" viewBox="0 0 ${W} ${H + 120}">${body}</svg>`);
console.log(`wrote ${path.join(out, "object-art.svg")} (${ART_IDS.length} pictures)`);
