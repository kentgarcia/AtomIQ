#!/usr/bin/env node
/**
 * Offline contact sheet of the teacher profile covers, so changes can be looked at.
 * Usage: node scripts/render-npc-covers.mjs <out-dir>
 * Writes <out-dir>/npc-covers.svg: every teacher's cover at phone width (about 360 x 116). Convert:
 *   magick -density 110 <out-dir>/npc-covers.svg <out-dir>/npc-covers.png
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const url = (p) => pathToFileURL(path.join(REPO, p)).href;
const { GLYPHS, glyphsFor, coverLayout, coverTones, coverViewBox, COVER_W, COVER_H } = await import(url("components/npc/npc-cover-art.ts"));
const { NPC_ROSTER } = await import(url("components/npc/npc-roster.ts"));
const out = path.resolve(process.argv[2] ?? ".");
fs.mkdirSync(out, { recursive: true });

const glyph = (id, color) =>
  GLYPHS[id]
    .map((s) => {
      if (s.t === "p") return `<path d="${s.d}" fill="${color}"/>`;
      if (s.t === "c") return `<circle cx="${s.cx}" cy="${s.cy}" r="${s.r}" fill="${color}"/>`;
      if (s.t === "r") return `<circle cx="${s.cx}" cy="${s.cy}" r="${s.r}" fill="none" stroke="${color}" stroke-width="${s.w}"/>`;
      return `<path d="${s.d}" fill="none" stroke="${color}" stroke-width="${s.w}" stroke-linecap="round" stroke-linejoin="round"/>`;
    })
    .join("");

const W = 360;
const H = 116;
const pad = 14;
let body = `<rect width="${W + 2 * pad}" height="${NPC_ROSTER.length * (H + 40) + pad}" fill="#FFFFFF"/>`;
NPC_ROSTER.forEach((npc, i) => {
  const tones = coverTones(npc.spec.outfit);
  const lay = coverLayout(glyphsFor(npc.id));
  const vb = coverViewBox(W / H);
  const y = pad + i * (H + 40);
  body += `<text x="${pad}" y="${y + 12}" font-family="sans-serif" font-size="13" fill="#4B4B4B">${npc.name}: ${npc.title}</text>`;
  body += `<svg x="${pad}" y="${y + 20}" width="${W}" height="${H}" viewBox="${vb.x} ${vb.y} ${vb.w} ${vb.h}"><clipPath id="k${i}"><rect x="${vb.x}" y="${vb.y}" width="${vb.w}" height="${vb.h}" rx="${24 * (vb.w / W)}"/></clipPath><g clip-path="url(#k${i})"><rect x="0" y="0" width="${COVER_W}" height="${COVER_H}" fill="${tones.base}"/>`;
  for (const d of lay.dots) body += `<circle cx="${d.x}" cy="${d.y}" r="${d.r}" fill="${tones.shade}"/>`;
  for (const g of lay.glyphs) body += `<g transform="translate(${g.x} ${g.y}) scale(${g.size / 24}) rotate(${g.rotate} 12 12)">${glyph(g.glyph, g.tone === "light" ? tones.light : tones.shade)}</g>`;
  body += `</g></svg>`;
});
fs.writeFileSync(path.join(out, "npc-covers.svg"), `<svg xmlns="http://www.w3.org/2000/svg" width="${W + 2 * pad}" height="${NPC_ROSTER.length * (H + 40) + pad}">${body}</svg>`);
console.log(`wrote ${path.join(out, "npc-covers.svg")}`);
