#!/usr/bin/env node
/**
 * Offline contact sheet of the tour's pointing hand (components/tutorial/hand-art.ts): big, at the size it is used, leaning, on
 * the light and the dark scrim, over a stand-in button with the fingertip on it.
 * Usage: node scripts/render-tutorial-hand.mjs <out-dir>
 * Writes <out-dir>/tutorial-hand.svg; look at it: magick -density 110 <out-dir>/tutorial-hand.svg <out-dir>/tutorial-hand.png
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { HAND_SHAPES, CREASES, HAND_VIEWBOX, HAND_TIP, OUTLINE } = await import(pathToFileURL(path.join(REPO, "components/tutorial/hand-art.ts")).href);
const out = path.resolve(process.argv[2] ?? ".");
fs.mkdirSync(out, { recursive: true });

const rect = (s, grow, fill) => {
  const cx = s.x + s.w / 2;
  const cy = s.y + s.h / 2;
  const t = s.turn ? ` transform="rotate(${s.turn} ${cx} ${cy})"` : "";
  return `<rect x="${s.x - grow}" y="${s.y - grow}" width="${s.w + grow * 2}" height="${s.h + grow * 2}" rx="${s.r + grow}" fill="${fill}"${t}/>`;
};
const hand = (fill, ink) =>
  HAND_SHAPES.map((s) => rect(s, OUTLINE, ink)).join("") +
  HAND_SHAPES.map((s) => rect(s, 0, fill)).join("") +
  CREASES.map((l) => `<line x1="${l.x1}" y1="${l.y1}" x2="${l.x2}" y2="${l.y2}" stroke="${ink}" stroke-width="2" stroke-linecap="round" opacity="0.4"/>`).join("");

const cell = 220;
let body = "";
const panels = [
  { x: 0, bg: "#FFFFFF", fill: "#FFFFFF", ink: "#1F2937", scale: 3, lean: 0, label: "light, upright" },
  { x: cell, bg: "#111827", fill: "#1F2937", ink: "#F9FAFB", scale: 3, lean: -12, label: "dark, leaning" },
];
for (const p of panels) {
  body += `<rect x="${p.x}" y="0" width="${cell}" height="${cell}" fill="${p.bg}"/>`;
  const ox = p.x + cell / 2 - HAND_TIP.x * p.scale;
  const oy = 30 - HAND_TIP.y * p.scale;
  body += `<g transform="translate(${ox} ${oy}) rotate(${p.lean} ${HAND_TIP.x * p.scale} ${HAND_TIP.y * p.scale}) scale(${p.scale})">${hand(p.fill, p.ink)}</g>`;
  body += `<text x="${p.x + 10}" y="${cell - 10}" font-family="sans-serif" font-size="12" fill="${p.ink}">${p.label}</text>`;
}
// at the size it is used, fingertip on a stand-in button (the dim round it)
const bx = cell * 2;
body += `<rect x="${bx}" y="0" width="${cell}" height="${cell}" fill="#0b1220"/>`;
body += `<rect x="${bx + 40}" y="40" width="140" height="48" rx="16" fill="#58CC02" stroke="#FFFFFF" stroke-width="3"/>`;
body += `<text x="${bx + 110}" y="71" font-family="sans-serif" font-size="18" font-weight="700" text-anchor="middle" fill="#FFFFFF">Start</text>`;
const tipY = 88 - 12;
body += `<g transform="translate(${bx + 110 - HAND_TIP.x} ${tipY - HAND_TIP.y}) rotate(-12 ${HAND_TIP.x} ${HAND_TIP.y})">${hand("#FFFFFF", "#1F2937")}</g>`;
fs.writeFileSync(path.join(out, "tutorial-hand.svg"), `<svg xmlns="http://www.w3.org/2000/svg" width="${cell * 3}" height="${cell}" viewBox="0 0 ${cell * 3} ${cell}">${body}</svg>`);
console.log(`wrote ${path.join(out, "tutorial-hand.svg")}`);
