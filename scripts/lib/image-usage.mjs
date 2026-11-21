/**
 * Which bundled pictures the app really requires, and how big each is once decoded (docs/features/RENDER_COST_SPEC.md A1).
 * Metro only bundles what a `require()` names, so a file nobody requires costs nothing at run time: only the used ones count.
 * Uses ImageMagick's `identify` for the pixel size (no extra dependency).
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

export const ROOT = resolve(import.meta.dirname, "..", "..");
const SOURCE_DIRS = ["app", "components", "content", "services", "hooks", "constants", "theme", "tools/studio"];
const IMAGE_EXT = /\.(png|jpe?g|webp)$/i;

function* walk(dir) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) yield* walk(p);
    else yield p;
  }
}

/** Absolute paths of every picture a source file requires (`@/assets/...` and relative paths). */
export function usedImages() {
  const used = new Set();
  const re = /require\(\s*(['"])([^'"]+?)\1\s*\)/g;
  for (const dir of SOURCE_DIRS) {
    for (const file of walk(join(ROOT, dir))) {
      if (!/\.(ts|tsx|js|jsx|mjs)$/.test(file)) continue;
      const text = readFileSync(file, "utf8");
      for (const m of text.matchAll(re)) {
        const spec = m[2];
        if (!IMAGE_EXT.test(spec)) continue;
        const abs = spec.startsWith("@/") ? join(ROOT, spec.slice(2)) : spec.startsWith(".") ? resolve(dirname(file), spec) : null;
        if (abs && existsSync(abs)) used.add(abs);
      }
    }
  }
  return [...used].sort();
}

/** Pixel size of a picture. */
export function sizeOf(file) {
  const out = execFileSync("identify", ["-format", "%w %h", `${file}[0]`], { encoding: "utf8" }).trim();
  const [w, h] = out.split(" ").map(Number);
  return { w, h };
}

export const decodedMb = ({ w, h }) => (w * h * 4) / 1024 / 1024;

export const rel = (file) => relative(ROOT, file);
