// Contact sheet for the phone's wallpapers: node scripts/render-wallpapers.mjs <outdir>
// Writes <outdir>/wallpapers.svg: the five wallpapers side by side, each with a ghost grid of app icons on it (as on the phone).
// Convert to a picture with: magick -density 110 wallpapers.svg wallpapers.png
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const outDir = process.argv[2];
if (!outDir) {
  console.error("usage: node scripts/render-wallpapers.mjs <outdir>");
  process.exit(1);
}
const imp = (p) => import(pathToFileURL(path.resolve(p)).href);
const { WALLPAPERS, WALLPAPER_FRAME } = await imp("components/phone/wallpaper-art.ts");
const { OBJECT_ART } = await imp("components/lesson/visual/object-art.ts");

const attrs = (s) => (s.opacity === undefined ? "" : ` fill-opacity="${s.opacity}"`);
function shape(s) {
  switch (s.t) {
    case "rect":
      return `<rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" rx="${s.r}" fill="${s.fill}"${attrs(s)}/>`;
    case "circle":
      return `<circle cx="${s.cx}" cy="${s.cy}" r="${s.r}" fill="${s.fill}"${attrs(s)}/>`;
    case "path":
      return `<path d="${s.d}" fill="${s.fill}"${attrs(s)}/>`;
    case "line":
      return `<path d="${s.d}" fill="none" stroke="${s.stroke}" stroke-width="${s.width}" stroke-linecap="round" stroke-linejoin="round"/>`;
    case "group":
      return `<g transform="translate(${s.x} ${s.y}) scale(${s.size / 100})">${s.shapes.map(shape).join("")}</g>`;
    default:
      return `<g transform="translate(${s.x} ${s.y}) scale(${s.size / 100})">${OBJECT_ART[s.id].map(shape).join("")}</g>`;
  }
}

const { w, h } = WALLPAPER_FRAME;
const gap = 12;
const list = Object.values(WALLPAPERS);
const ghost = [];
// four columns of rounded squares, three rows, as the phone's grid sits near the top
for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) ghost.push(`<rect x="${6 + c * 23.5}" y="${22 + r * 25}" width="17" height="17" rx="4.6" fill="#fff" fill-opacity="0.55"/>`);
const total = list.length * (w + gap) + gap;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${h + gap * 2}" width="${total * 4}" height="${(h + gap * 2) * 4}">
<rect width="${total}" height="${h + gap * 2}" fill="#ffffff"/>
${list
  .map(
    (wp, i) => `<g transform="translate(${gap + i * (w + gap)} ${gap})"><svg x="0" y="0" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" overflow="hidden"><clipPath id="c${i}"><rect width="${w}" height="${h}" rx="6"/></clipPath><g clip-path="url(#c${i})">${wp.shapes.map(shape).join("")}${ghost.join("")}</g></svg></g>`,
  )
  .join("\n")}
</svg>
`;
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "wallpapers.svg"), svg);
console.log(`wrote ${path.join(outDir, "wallpapers.svg")}`);
