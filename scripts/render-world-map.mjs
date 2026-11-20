// Contact sheet for the world map: node scripts/render-world-map.mjs <outdir>
// Writes <outdir>/world-map.svg (land, ocean and a pin at ten known places to check the projection).
// Convert to a picture with: magick -density 110 world-map.svg world-map.png
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const outDir = process.argv[2];
if (!outDir) {
  console.error("usage: node scripts/render-world-map.mjs <outdir>");
  process.exit(1);
}
const { WORLD_MAP, project } = await import(
  pathToFileURL(path.resolve("components/map/world-art.ts")).href
);

const PLACES = [
  ["Paris", 2.35, 48.86],
  ["Tokyo", 139.7, 35.7],
  ["Sydney", 151.2, -33.9],
  ["New York", -74, 40.7],
  ["Cape Town", 18.42, -33.92],
  ["Rio de Janeiro", -43.2, -22.9],
  ["Moscow", 37.62, 55.75],
  ["Cairo", 31.24, 30.04],
  ["Chicago", -87.63, 41.88],
  ["Oak Ridge", -84.31, 35.93],
];

const { width, height, land } = WORLD_MAP;
const pins = PLACES.map(([name, lon, lat]) => {
  const { x, y } = project(lon, lat);
  return `<g><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5" fill="#FF4B4B"/><title>${name}</title></g>`;
}).join("\n  ");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <rect width="${width}" height="${height}" fill="#BAF2FE"/>
  <g fill="#A5ED6E">
${land.map((d) => `    <path d="${d}"/>`).join("\n")}
  </g>
  ${pins}
</svg>
`;
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "world-map.svg"), svg);
console.log(`wrote ${path.join(outDir, "world-map.svg")}`);
