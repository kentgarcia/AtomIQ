#!/usr/bin/env node
/**
 * Offline contact sheet of the phone's app icons (face, lip and picture), so changes can be looked at.
 * Usage: node scripts/render-app-icons.mjs <out-dir>
 * Writes <out-dir>/app-icons.svg; convert to look at it: magick -density 110 <out-dir>/app-icons.svg <out-dir>/app-icons.png
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { APP_ICON_ART, APP_ICON_TILE, ICON_TILES } = await import(pathToFileURL(path.join(REPO, "components/phone/app-icon-art.ts")).href);
const { PHONE_APPS } = await import(pathToFileURL(path.join(REPO, "services/phone-core.ts")).href);
const out = path.resolve(process.argv[2] ?? ".");
fs.mkdirSync(out, { recursive: true });

// Light-mode tile colours, as phone-palette.ts gives them
const TILES = {
  yellow: ["#FFC800", "#E6A800"], blue: ["#1CB0F6", "#1899D6"], green: ["#46A302", "#378300"], purple: ["#9069CD", "#6F4EA1"],
  red: ["#FF4B4B", "#D93B3B"], orange: ["#FF9600", "#DA7C00"], cyan: ["#00CDE7", "#00A4BA"], coral: ["#FF8A80", "#CC6E66"], grey: ["#767676", "#5E5E5E"],
};
const f = (n) => Math.round(n * 100) / 100;
const shape = (s, face, lip) => {
  const c = (v) => (v === "$face" ? face : v === "$lip" ? lip : v);
  const op = s.opacity === undefined ? "" : ` fill-opacity="${s.opacity}"`;
  if (s.t === "rect") return `<rect x="${f(s.x)}" y="${f(s.y)}" width="${f(s.w)}" height="${f(s.h)}" rx="${f(s.r)}" fill="${c(s.fill)}"${op}/>`;
  if (s.t === "circle") return `<circle cx="${f(s.cx)}" cy="${f(s.cy)}" r="${f(s.r)}" fill="${c(s.fill)}"${op}/>`;
  if (s.t === "path") return `<path d="${s.d}" fill="${c(s.fill)}"${op}/>`;
  return `<path d="${s.d}" fill="none" stroke="${c(s.stroke)}" stroke-width="${s.width}" stroke-linecap="round" stroke-linejoin="round"/>`;
};

const size = 120;
const cols = 4;
const apps = PHONE_APPS.filter((a) => APP_ICON_ART[a.id]);
const W = cols * (size + 30) + 30;
const H = Math.ceil(apps.length / cols) * (size + 56) + 30;
let body = `<rect width="${W}" height="${H}" fill="#F0F4F7"/>`;
apps.forEach((a, i) => {
  const x = 30 + (i % cols) * (size + 30);
  const y = 30 + Math.floor(i / cols) * (size + 56);
  const own = APP_ICON_TILE[a.id];
  const [face, lip] = own ? [ICON_TILES[own].face, ICON_TILES[own].lip] : TILES[a.color];
  const k = size / 100;
  body += `<g transform="translate(${x} ${y})"><clipPath id="t${i}"><rect width="${size}" height="${size}" rx="${size * 0.27}"/></clipPath><rect y="5" width="${size}" height="${size}" rx="${size * 0.27}" fill="${lip}"/><rect width="${size}" height="${size}" rx="${size * 0.27}" fill="${face}"/>`;
  body += `<g clip-path="url(#t${i})"><g transform="scale(${k})">${APP_ICON_ART[a.id].map((s) => shape(s, face, lip)).join("")}</g></g>`;
  body += `<text x="${size / 2}" y="${size + 28}" font-family="sans-serif" font-size="13" font-weight="700" text-anchor="middle" fill="#4B4B4B">${a.name}</text></g>`;
});
fs.writeFileSync(path.join(out, "app-icons.svg"), `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${body}</svg>`);
console.log(`wrote ${path.join(out, "app-icons.svg")} (${apps.length} icons)`);
