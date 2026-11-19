#!/usr/bin/env node
/**
 * Offline contact sheet of the blog illustrations, so changes can be looked at.
 * Usage: node scripts/render-blog-art.mjs <out-dir>
 * Writes <out-dir>/blog-art.svg: every scene at reader size (about 340 x 200), as a square card
 * cover (64 px, the crop a blog card takes) and at 48 px. Convert to look at it:
 *   magick -density 110 <out-dir>/blog-art.svg <out-dir>/blog-art.png
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { BLOG_SCENES, BLOG_SCENE_IDS, viewBoxFor } = await import(pathToFileURL(path.join(REPO, "components/feed/blog-art.ts")).href);
const { OBJECT_ART } = await import(pathToFileURL(path.join(REPO, "components/lesson/visual/object-art.ts")).href);
const out = path.resolve(process.argv[2] ?? ".");
fs.mkdirSync(out, { recursive: true });

const f = (n) => Math.round(n * 100) / 100;
const shape = (s) => {
  const op = s.opacity === undefined ? "" : ` fill-opacity="${s.opacity}"`;
  if (s.t === "rect") return `<rect x="${f(s.x)}" y="${f(s.y)}" width="${f(s.w)}" height="${f(s.h)}" rx="${f(s.r)}" fill="${s.fill}"${op}/>`;
  if (s.t === "circle") return `<circle cx="${f(s.cx)}" cy="${f(s.cy)}" r="${f(s.r)}" fill="${s.fill}"${op}/>`;
  if (s.t === "path") return `<path d="${s.d}" fill="${s.fill}"${op}/>`;
  if (s.t === "line") return `<path d="${s.d}" fill="none" stroke="${s.stroke}" stroke-width="${s.width}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const rot = s.rotate ? ` rotate(${s.rotate} 50 50)` : "";
  return `<g transform="translate(${s.x} ${s.y}) scale(${s.size / 100})${rot}">${OBJECT_ART[s.id].map(shape).join("")}</g>`;
};
const scene = (id) => BLOG_SCENES[id].shapes.map(shape).join("");
const view = (id, x, y, w, h, box) => {
  const vb = viewBoxFor(w / h, BLOG_SCENES[id].focusX);
  const k = w / vb.w;
  return `<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="${f(vb.x)} ${f(vb.y)} ${f(vb.w)} ${f(vb.h)}"><clipPath id="c${id}${w}"><rect x="${f(vb.x)}" y="${f(vb.y)}" width="${f(vb.w)}" height="${f(vb.h)}" rx="${box / k}"/></clipPath><g clip-path="url(#c${id}${w})">${scene(id)}</g></svg>`;
};

const pad = 16;
const RW = 340;
const RH = 200;
const W = pad * 3 + RW * 2;
const rowH = RH + 88 + pad;
const H = BLOG_SCENE_IDS.length === 0 ? 100 : Math.ceil(BLOG_SCENE_IDS.length / 2) * rowH + pad;
let body = `<rect width="${W}" height="${H}" fill="#FFFFFF"/>`;
BLOG_SCENE_IDS.forEach((id, i) => {
  const x = pad + (i % 2) * (RW + pad);
  const y = pad + Math.floor(i / 2) * rowH;
  body += view(id, x, y, RW, RH, 24);
  body += view(id, x, y + RH + 12, 64, 64, 14);
  body += view(id, x + 84, y + RH + 28, 48, 48, 10);
  body += `<text x="${x + 150}" y="${y + RH + 50}" font-family="sans-serif" font-size="14" fill="#4B4B4B">${id}</text>`;
});
fs.writeFileSync(path.join(out, "blog-art.svg"), `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${body}</svg>`);
console.log(`wrote ${path.join(out, "blog-art.svg")} (${BLOG_SCENE_IDS.length} scenes)`);
