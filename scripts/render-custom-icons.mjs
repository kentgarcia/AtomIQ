#!/usr/bin/env node
/**
 * Offline contact sheet of the custom icons (components/ui/custom-icons.ts): each one large, at its
 * real 24 px size, and next to an Iconsax Bold icon of the same job for comparison where one is given.
 * Usage: node scripts/render-custom-icons.mjs <out-dir> [colour]
 * Writes <out-dir>/custom-icons.svg (open it in a browser, or convert it to PNG with ImageMagick).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { CUSTOM_ICONS, CUSTOM_ICON_NAMES } = await import(pathToFileURL(path.join(REPO, "components/ui/custom-icons.ts")).href);
const out = path.resolve(process.argv[2] ?? ".");
const color = process.argv[3] ?? "#1d2b3a";
fs.mkdirSync(out, { recursive: true });

const shapes = (icon, fill) =>
  icon.shapes
    .map((s) => `<path d="${s.d}" fill="${fill}"${s.evenOdd ? ' fill-rule="evenodd"' : ""}${s.opacity != null ? ` fill-opacity="${s.opacity}"` : ""}/>`)
    .join("");

const COLS = 6;
const cellW = 150;
const cellH = 190;
const rows = Math.ceil(CUSTOM_ICON_NAMES.length / COLS);
let body = "";
CUSTOM_ICON_NAMES.forEach((name, i) => {
  const x = (i % COLS) * cellW;
  const y = Math.floor(i / COLS) * cellH;
  const icon = CUSTOM_ICONS[name];
  body += `<g transform="translate(${x} ${y})">
    <rect x="6" y="6" width="${cellW - 12}" height="${cellH - 12}" rx="14" fill="#f4f6f8"/>
    <rect x="${cellW / 2 - 52}" y="14" width="104" height="104" fill="#fff" stroke="#e1e5ea" stroke-dasharray="3 3"/>
    <g transform="translate(${cellW / 2 - 48} 18) scale(4)">${shapes(icon, color)}</g>
    <g transform="translate(${cellW / 2 - 12} 128)">${shapes(icon, color).replace(/^/, "")}</g>
    <text x="${cellW / 2}" y="${cellH - 20}" font-family="sans-serif" font-size="11" text-anchor="middle" fill="#445">${name}</text>
  </g>`;
});
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${COLS * cellW}" height="${rows * cellH}" viewBox="0 0 ${COLS * cellW} ${rows * cellH}"><rect width="100%" height="100%" fill="#fff"/>${body}</svg>`;
fs.writeFileSync(path.join(out, "custom-icons.svg"), svg);
console.log(path.join(out, "custom-icons.svg"));
