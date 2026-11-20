#!/usr/bin/env node
/**
 * Offline contact sheet of the Atom Scanner scenes, with each target's hit box outlined, so changes can be looked at.
 * Usage: node scripts/render-scan-scenes.mjs <out-dir>
 * Writes <out-dir>/scan-scenes.svg; convert to look at it: magick -density 90 <out-dir>/scan-scenes.svg <out-dir>/scan-scenes.png
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { SCAN_SCENES } = await import(pathToFileURL(path.join(REPO, "components/scanner/scan-scenes.ts")).href);
const { OBJECT_ART } = await import(pathToFileURL(path.join(REPO, "components/lesson/visual/object-art.ts")).href);
const { WORLD, VIEW_UNITS_WIDE, BLEED } = await import(pathToFileURL(path.join(REPO, "components/scanner/scanner-core.ts")).href);
const out = path.resolve(process.argv[2] ?? ".");
fs.mkdirSync(out, { recursive: true });

const f = (n) => Math.round(n * 100) / 100;
const shape = (s) => {
  const op = s.opacity === undefined ? "" : ` fill-opacity="${s.opacity}"`;
  if (s.t === "band") return `<rect x="${-BLEED}" y="${f(s.y)}" width="${WORLD.w + BLEED * 2}" height="${f(s.h)}" fill="${s.fill}"${op}/>`;
  if (s.t === "rect") return `<rect x="${f(s.x)}" y="${f(s.y)}" width="${f(s.w)}" height="${f(s.h)}" rx="${f(s.r)}" fill="${s.fill}"${op}/>`;
  if (s.t === "circle") return `<circle cx="${f(s.cx)}" cy="${f(s.cy)}" r="${f(s.r)}" fill="${s.fill}"${op}/>`;
  if (s.t === "path") return `<path d="${s.d}" fill="${s.fill}"${op}/>`;
  if (s.t === "line") return `<path d="${s.d}" fill="none" stroke="${s.stroke}" stroke-width="${s.width}" stroke-linecap="round" stroke-linejoin="round"/>`;
  if (s.t === "group") return `<g transform="translate(${s.x} ${s.y}) scale(${s.size / 100})">${s.shapes.map(shape).join("")}</g>`;
  return `<g transform="translate(${s.x} ${s.y}) scale(${s.size / 100})">${OBJECT_ART[s.id].map(shape).join("")}</g>`;
};

const k = 1.5;
const pad = 16;
const W = WORLD.w * k + pad * 2;
const rowH = WORLD.h * k + 40;
let body = `<rect width="${W}" height="${SCAN_SCENES.length * rowH + pad}" fill="#FFFFFF"/>`;
SCAN_SCENES.forEach((sc, i) => {
  const y = pad + i * rowH;
  body += `<g transform="translate(${pad} ${y}) scale(${k})"><clipPath id="c${i}"><rect width="${WORLD.w}" height="${WORLD.h}" rx="10"/></clipPath><g clip-path="url(#c${i})">${sc.backdrop.map(shape).join("")}`;
  for (const p of sc.places) body += `<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" fill="none" stroke="#FF4B4B" stroke-width="0.8" stroke-dasharray="3 2"/>`;
  // the 190-unit window the learner sees when the reticle is on the first thing
  const first = sc.places[0];
  const cx = first.x + first.w / 2;
  body += `<rect x="${f(cx - VIEW_UNITS_WIDE / 2)}" y="0" width="${VIEW_UNITS_WIDE}" height="${WORLD.h}" fill="none" stroke="#1CB0F6" stroke-width="0.8"/></g></g>`;
  body += `<text x="${pad}" y="${y + WORLD.h * k + 20}" font-family="sans-serif" font-size="14" fill="#4B4B4B">${sc.id} (${sc.places.length} things)</text>`;
});
fs.writeFileSync(path.join(out, "scan-scenes.svg"), `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${SCAN_SCENES.length * rowH + pad}">${body}</svg>`);
console.log(`wrote ${path.join(out, "scan-scenes.svg")}`);
