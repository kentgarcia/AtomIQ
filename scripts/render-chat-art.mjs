#!/usr/bin/env node
/**
 * Offline contact sheet of the chat reactions and stickers, big and at the sizes they are used (reaction badge, button, sticker).
 * Usage: node scripts/render-chat-art.mjs <out-dir>
 * Writes <out-dir>/chat-art.svg; look at it: magick -density 110 <out-dir>/chat-art.svg <out-dir>/chat-art.png
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { CHAT_ART, CHAT_ART_NAMES, CHAT_REACTION_IDS, CHAT_STICKER_IDS } = await import(pathToFileURL(path.join(REPO, "components/phone/chat-art.ts")).href);
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
const ids = [...CHAT_REACTION_IDS, ...CHAT_STICKER_IDS];
const size = 120;
const cols = 7;
const W = cols * (size + 24) + 24;
const H = Math.ceil(ids.length / cols) * (size + 80) + 24;
let body = `<rect width="${W}" height="${H}" fill="#FFFFFF"/>`;
ids.forEach((id, i) => {
  const x = 24 + (i % cols) * (size + 24);
  const y = 24 + Math.floor(i / cols) * (size + 80);
  const k = size / 100;
  body += `<g transform="translate(${x} ${y})"><rect width="${size}" height="${size}" rx="16" fill="#F0F4F7"/><g transform="scale(${k})">${CHAT_ART[id].map(shape).join("")}</g>`;
  body += `<g transform="translate(8 ${size + 8}) scale(0.28)">${CHAT_ART[id].map(shape).join("")}</g><g transform="translate(46 ${size + 8}) scale(0.4)">${CHAT_ART[id].map(shape).join("")}</g>`;
  body += `<text x="${size / 2}" y="${size + 62}" font-family="sans-serif" font-size="12" font-weight="700" text-anchor="middle" fill="#4B4B4B">${CHAT_ART_NAMES[id]}</text></g>`;
});
fs.writeFileSync(path.join(out, "chat-art.svg"), `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${body}</svg>`);
console.log(`wrote ${path.join(out, "chat-art.svg")} (${ids.length} pictures)`);
