#!/usr/bin/env node
/**
 * Offline contact sheet of the pictures in Shrodi's tour chat, big and at the width they show in a thread (about 240 px).
 * Usage: node scripts/render-tour-art.mjs <out-dir>
 * Writes <out-dir>/tour-art.svg; look at it: magick -density 110 <out-dir>/tour-art.svg <out-dir>/tour-art.png
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { TOUR_ART, TOUR_ART_NAMES, TOUR_PICTURE_IDS } = await import(pathToFileURL(path.join(REPO, "components/phone/tour-art.ts")).href);
const out = path.resolve(process.argv[2] ?? ".");
fs.mkdirSync(out, { recursive: true });

const f = (n) => Math.round(n * 100) / 100;
const shape = (s) => {
  const op = s.opacity === undefined ? "" : ` fill-opacity="${s.opacity}"`;
  if (s.t === "rect") return `<rect x="${f(s.x)}" y="${f(s.y)}" width="${f(s.w)}" height="${f(s.h)}" rx="${f(s.r)}" fill="${s.fill}"${op}/>`;
  if (s.t === "circle") return `<circle cx="${f(s.cx)}" cy="${f(s.cy)}" r="${f(s.r)}" fill="${s.fill}"${op}/>`;
  if (s.t === "path") return `<path d="${s.d}" fill="${s.fill}"${op}/>`;
  return `<path d="${s.d}" fill="none" stroke="${s.stroke}" stroke-width="${s.width}" stroke-linecap="round" stroke-linejoin="round"/>`;
};
const k = 2;
const w = 200 * k;
const h = 120 * k;
const cols = 2;
const W = cols * (w + 24) + 24;
const H = Math.ceil(TOUR_PICTURE_IDS.length / cols) * (h + 56) + 24;
let body = `<rect width="${W}" height="${H}" fill="#F0F4F7"/>`;
TOUR_PICTURE_IDS.forEach((id, i) => {
  const x = 24 + (i % cols) * (w + 24);
  const y = 24 + Math.floor(i / cols) * (h + 56);
  body += `<g transform="translate(${x} ${y})"><g transform="scale(${k})">${TOUR_ART[id].map(shape).join("")}</g>`;
  body += `<text x="0" y="${h + 22}" font-family="sans-serif" font-size="14" font-weight="700" fill="#4B4B4B">${id}: ${TOUR_ART_NAMES[id]}</text></g>`;
});
fs.writeFileSync(path.join(out, "tour-art.svg"), `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${body}</svg>`);
console.log(`wrote ${path.join(out, "tour-art.svg")} (${TOUR_PICTURE_IDS.length} pictures)`);
