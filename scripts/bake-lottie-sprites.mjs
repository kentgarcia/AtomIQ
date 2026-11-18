/**
 * Bakes a Lottie animation into a sprite sheet (a WebP grid of frames), so the app can play it with
 * plain images: the same pixels on every device, with none of the native Lottie renderers' gaps
 * (track mattes, gradient fills and blend modes, which is what the quest chest is made of).
 *
 * Each frame is drawn by lottie-web in headless Chromium, on a transparent page, and cropped.
 * The playback side is `components/ui/sprite-core.ts` + `SpriteSheet.tsx`.
 *
 * Needs (not project dependencies): playwright-core and lottie-web, and a Chromium. Install them in
 * a scratch folder and pass it:
 *
 *   mkdir /tmp/bake && cd /tmp/bake && npm i playwright-core lottie-web
 *   node scripts/bake-lottie-sprites.mjs --libs /tmp/bake --chromium <path/to/chrome> \
 *        --in assets/lottie/Chest_open.lottie --out assets/images/chest/chest-open.webp
 *
 * Options: --cols 8   --cell 168 (px per frame)   --crop 40,40,420,420 (x,y,w,h of the 500 canvas; it may
 *          reach past the canvas, which is transparent: use that to put the art in the middle)
 *          --from 0 --to 37 (frames, inclusive; default the whole animation)
 *
 * Prints the sheet's frame count and grid as JSON, to copy into `sprite-sheets.ts`.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
};
const libs = arg("libs");
const chromiumPath = arg("chromium");
const input = arg("in");
const output = arg("out");
if (!libs || !chromiumPath || !input || !output) {
  console.error("usage: node scripts/bake-lottie-sprites.mjs --libs <dir> --chromium <path> --in <x.lottie|x.json> --out <x.webp>");
  process.exit(1);
}
const cols = Number(arg("cols", 8));
const cell = Number(arg("cell", 168));
const [cx, cy, cw, ch] = arg("crop", "40,40,420,420").split(",").map(Number);

const require = createRequire(path.join(path.resolve(libs), "package.json"));
const { chromium } = require("playwright-core");
const lottieSource = fs.readFileSync(require.resolve("lottie-web/build/player/lottie.min.js"), "utf8");

// A .lottie is a zip: take its animation json (v1 `animations/<id>.json` and v2 `a/<id>.json` alike)
function readAnimation(file) {
  if (file.endsWith(".json")) return JSON.parse(fs.readFileSync(file, "utf8"));
  const list = execFileSync("unzip", ["-Z1", file], { encoding: "utf8" }).split("\n").filter((n) => /\.json$/.test(n) && !/manifest\.json$/.test(n));
  return JSON.parse(execFileSync("unzip", ["-p", file, list[0]], { encoding: "utf8", maxBuffer: 1 << 28 }));
}
const data = readAnimation(input);
const from = Number(arg("from", Math.floor(data.ip)));
const to = Number(arg("to", Math.ceil(data.op) - 1));
const frames = Array.from({ length: to - from + 1 }, (_, i) => from + i);

const scale = cell / cw;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "bake-"));
const browser = await chromium.launch({ executablePath: chromiumPath, args: ["--no-sandbox"] });
// The animation sits in the middle of a larger page, so the crop may reach past its canvas (to centre the art)
const PAD = 300;
const page = await browser.newPage({ viewport: { width: 500 + 2 * PAD, height: 500 + 2 * PAD }, deviceScaleFactor: scale });
await page.setContent(`<body style="margin:0;background:transparent"><div id="a" style="width:500px;height:500px;margin:${PAD}px"></div></body>`);
await page.addScriptTag({ content: lottieSource });
await page.evaluate((d) => {
  window.anim = window.lottie.loadAnimation({ container: document.getElementById("a"), renderer: "svg", loop: false, autoplay: false, animationData: d });
}, data);
const files = [];
for (const [i, f] of frames.entries()) {
  await page.evaluate((n) => window.anim.goToAndStop(n, true), f);
  const file = path.join(tmp, `f${String(i).padStart(4, "0")}.png`);
  await page.screenshot({ path: file, omitBackground: true, clip: { x: cx + PAD, y: cy + PAD, width: cw, height: ch } });
  files.push(file);
}
await browser.close();

fs.mkdirSync(path.dirname(output), { recursive: true });
execFileSync("magick", ["montage", ...files, "-background", "none", "-tile", `${cols}x`, "-geometry", `${cell}x${cell}+0+0`, "-define", "webp:lossless=false", "-quality", "92", "-define", "webp:alpha-quality=100", output]);
fs.rmSync(tmp, { recursive: true, force: true });
console.log(JSON.stringify({ file: output, frames: frames.length, cols, rows: Math.ceil(frames.length / cols), cell, fps: data.fr }));
