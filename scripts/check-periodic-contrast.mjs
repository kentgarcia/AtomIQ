#!/usr/bin/env node
/**
 * WCAG contrast report for periodic-table category chips, light and dark.
 *
 * For every category and mode it checks:
 *   - chip text (theme `text`) on the tinted chip fill,
 *   - secondary text (theme `textSecondary`) on the tinted chip fill,
 *   - the category border/accent hue against the page surface (non-text, 3:1).
 *
 * Run: node scripts/check-periodic-contrast.mjs   (exits 1 below the targets)
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..");

export const TEXT_TARGET = 4.5;
export const NON_TEXT_TARGET = 3;

/** `textSecondary` is assembled in theme/themes.ts (not in raw tokens). */
function readTextSecondary() {
  const src = fs.readFileSync(path.join(REPO, "theme", "themes.ts"), "utf8");
  const m = src.match(/textSecondary:\s*isLight\s*\?\s*"(#[0-9A-Fa-f]{6})"\s*:\s*"(#[0-9A-Fa-f]{6})"/);
  if (!m) throw new Error("Could not read textSecondary from theme/themes.ts");
  return { light: m[1], dark: m[2] };
}

export async function computeContrast() {
  const cc = await import(
    pathToFileURL(path.join(REPO, "components", "periodic-table", "category-colors.ts")).href
  );
  const tokens = await import(pathToFileURL(path.join(REPO, "theme", "tokens.ts")).href);
  const secondary = readTextSecondary();
  const rows = [];
  for (const mode of ["light", "dark"]) {
    const base = tokens.colors.base[mode];
    for (const category of Object.keys(cc.CATEGORY_HUES)) {
      const c = cc.resolveCategoryColors(
        category,
        mode,
        base.surface,
        base.text,
        secondary[mode],
      );
      rows.push({
        mode,
        category,
        fill: c.fill,
        text: cc.contrastRatio(c.text, c.fill),
        secondary: cc.contrastRatio(c.textSecondary, c.fill),
        accentVsSurface: cc.contrastRatio(c.accent, base.surface),
        accentVsBackground: cc.contrastRatio(c.accent, base.background),
      });
    }
  }
  return rows;
}

export function summarize(rows) {
  const min = (key) => Math.min(...rows.map((r) => r[key]));
  return {
    minText: min("text"),
    minSecondary: min("secondary"),
    minAccent: Math.min(min("accentVsSurface"), min("accentVsBackground")),
  };
}

const isMain = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (isMain) {
  const rows = await computeContrast();
  const f = (n) => n.toFixed(2).padStart(5);
  console.log("mode  category                fill     text  2nd   accent(surface)");
  for (const r of rows) {
    console.log(
      `${r.mode.padEnd(5)} ${r.category.padEnd(22)} ${r.fill}  ${f(r.text)} ${f(r.secondary)}  ${f(r.accentVsSurface)}`,
    );
  }
  const s = summarize(rows);
  console.log(
    `\nMin text ${s.minText.toFixed(2)}:1, min secondary text ${s.minSecondary.toFixed(2)}:1, min accent ${s.minAccent.toFixed(2)}:1`,
  );
  if (s.minText < TEXT_TARGET || s.minSecondary < TEXT_TARGET || s.minAccent < NON_TEXT_TARGET) {
    console.error("Contrast below target");
    process.exit(1);
  }
}
