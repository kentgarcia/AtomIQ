#!/usr/bin/env node
/**
 * Offline contact sheet of Shrodi: every mood at a few moments of the idle loop.
 * Usage: node scripts/render-shrodi.mjs <out-dir> [dark]
 * Writes <out-dir>/shrodi-sheet.svg (open it in a browser, or convert to PNG).
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const art = await import(pathToFileURL(path.join(REPO, "components/mascot/shrodi-art.ts")).href);
const out = path.resolve(process.argv[2] ?? ".");
const dark = process.argv[3] === "dark";
fs.mkdirSync(out, { recursive: true });

const { MOODS, POSES, SHRODI_VIEWBOX: vb, buildShrodi, frameOf, toSvg } = art;
const times = (process.argv[4] ?? "400,2700,1500").split(",").map(Number);
const cellW = vb.w * 1.5;
const cellH = vb.h * 1.5;
const bg = dark ? "#202020" : "#F7F7F7";
const label = dark ? "#CFCFCF" : "#555";
let body = "";
MOODS.forEach((mood, row) => {
  times.forEach((t, col) => {
    const x = col * cellW;
    const y = row * (cellH + 14);
    const tree = buildShrodi(`m${row}${col}`);
    body += `<svg x="${x}" y="${y}" width="${cellW}" height="${cellH}" viewBox="${vb.x} ${vb.y} ${vb.w} ${vb.h}">${toSvg(tree, frameOf(POSES[mood], t))}</svg>`;
    body += `<text x="${x + 6}" y="${y + cellH + 10}" font-family="sans-serif" font-size="11" fill="${label}">${mood} @ ${t} ms</text>`;
  });
});
const W = cellW * times.length;
const H = MOODS.length * (cellH + 14);
fs.writeFileSync(path.join(out, "shrodi-sheet.svg"), `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="${bg}"/>${body}</svg>`);
console.log(`wrote ${path.join(out, "shrodi-sheet.svg")} (${W}x${H})`);
