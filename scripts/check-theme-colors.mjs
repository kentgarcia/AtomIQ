#!/usr/bin/env node
/**
 * Theme color compliance check.
 *
 * Fails when UI source introduces a hardcoded neutral surface/text/border,
 * a module-level color-bearing StyleSheet, a duplicated light/dark palette,
 * or applies alpha to a literal color instead of a resolved theme role.
 *
 * Brand/accent/art hues are intentionally allowed; the reviewed exception
 * register below documents the few remaining invariant treatments.
 *
 * Run: npm run check:theme-colors
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const SCAN_DIRS = ["app", "components"];
const SKIP_DIRS = new Set(["node_modules", ".git", ".expo", "dist"]);

/** File-level reviewed exceptions: invariant artwork / brand treatments. */
const FILE_EXCEPTIONS = new Map([
  [
    "components/lesson/visual/duo-palette.ts",
    "EX-11: lesson illustration palette (Duolingo-style face and lip per tone), same hues in light and dark.",
  ],
  [
    "components/lesson/visual/object-art.ts",
    "EX-13: lesson object art (flat Duolingo-style pictures of things, official palette families), same hues in light and dark.",
  ],
  [
    "components/feed/blog-art.ts",
    "EX-13: blog illustrations (flat scenes composed of the lesson object art and its official palette families), same hues in light and dark.",
  ],
  [
    "components/lab/shield-art.ts",
    "EX-15: Radiation Shield Lab picture (shield materials and the three kinds of radiation, flat face and lip), same hues in light and dark.",
  ],
  [
    "components/npc/npc-palette.ts",
    "EX-12: NPC teacher palette (official Duolingo-style colours, skin and hair trios, muted ramp), same in light and dark.",
  ],
]);

/** Line-level reviewed exceptions. Key: repo-relative path -> reason. */
const LINE_EXCEPTIONS = new Map([
  // (none) — tab chrome now derives entirely from useTheme().
]);

/**
 * Light-only tinted surface literals. These are surfaces in disguise and must
 * come from theme.colors (creamTint / successSurface / warningSurface / ...).
 */
const LIGHT_SURFACE_LITERALS = new Set([
  "#fff3e0",
  "#fff8e1",
  "#ffe8cc",
  "#fff5ed",
  "#fffaf0",
  "#fef3c7",
  "#fef9c3",
  "#fef2f2",
  "#fee2e2",
  "#dcfce7",
  "#f0f9ff",
  "#e0f2fe",
  "#f5f5f5",
  "#f8fafc",
  "#fbfbfb",
]);

/**
 * Retired chrome roles (docs/completed/NEUTRAL_THEME_ORANGE_ACCENT_SPEC.md): pages sit on
 * plain `background`, orange is the only accent, indigo/warm header colors are gone.
 */
const RETIRED_IDENTIFIERS =
  /\b(?:pageGradient(?:Top|Bottom)|creamTint|creamBorder|amberSurface(?:Strong)?|amberText|amberBorder|palettes\.amber|accents\.indigo)\b/;
const RETIRED_LITERALS = new Set([
  "#5e72e4", "#4c63d2", "#9e87f5", "#8b9cf0", "#3b4bb8", // indigo brand
  "#ffca5f", "#ffdd8d", "#ffe0b2", "#fff3e0", "#724d06", // warm header / cream
  "#172b4d", "#213356", "#26365a", "#1a2d4a", "#334a70", // navy dark surfaces
]);

const COLOR_RE =
  /#[0-9A-Fa-f]{3,8}\b|rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+(?:\s*,\s*[\d.]+)?\s*\)/g;

const SURFACE_PROPS = new Set([
  "backgroundColor",
  "borderColor",
  "borderTopColor",
  "borderBottomColor",
  "borderLeftColor",
  "borderRightColor",
  "borderStartColor",
  "borderEndColor",
  "shadowColor",
  "textShadowColor",
  "tintColor",
  "placeholderTextColor",
  "selectionColor",
  "underlineColorAndroid",
  "trackColor",
  "thumbColor",
]);

const TEXT_PROPS = new Set(["color", "textDecorationColor"]);

function walk(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (/\.(tsx?|jsx?)$/.test(entry.name)) out.push(full);
  }
  return out;
}

function parseHex(value) {
  let hex = value.slice(1);
  if (hex.length === 3 || hex.length === 4) {
    hex = hex
      .slice(0, 3)
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (hex.length !== 6 && hex.length !== 8) return null;
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
    a: hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1,
  };
}

function parseRgb(value) {
  const match = value.match(/rgba?\(([^)]*)\)/i);
  if (!match) return null;
  const parts = match[1].split(",").map((part) => Number(part.trim()));
  if (parts.length < 3 || parts.some(Number.isNaN)) return null;
  return {
    r: parts[0],
    g: parts[1],
    b: parts[2],
    a: parts.length > 3 ? parts[3] : 1,
  };
}

function parseColor(value) {
  return value.startsWith("#") ? parseHex(value) : parseRgb(value);
}

function isNeutral(rgb) {
  if (!rgb) return false;
  const max = Math.max(rgb.r, rgb.g, rgb.b);
  const min = Math.min(rgb.r, rgb.g, rgb.b);
  // Low saturation: white/black/grays. The 30 threshold keeps warm creams
  // out of this bucket (they are handled by LIGHT_SURFACE_LITERALS).
  return max - min <= 30;
}

function normalize(value) {
  return value.toLowerCase().replace(/\s+/g, "");
}

function findProperty(lines, lineIndex) {
  // Look at this line and up to two lines above for the style property.
  for (let i = lineIndex; i >= Math.max(0, lineIndex - 2); i--) {
    const match = lines[i].match(/([A-Za-z][A-Za-z0-9]*)\s*:\s*[^;]*$/);
    if (match) return match[1];
  }
  return null;
}

function isAllowlistedLine(relPath, line) {
  if (/theme-allow\b/i.test(line)) return true;
  if (LINE_EXCEPTIONS.has(relPath)) return true;
  return FILE_EXCEPTIONS.has(relPath);
}

function scanFile(file) {
  const relPath = path.relative(ROOT, file).split(path.sep).join("/");
  const source = fs.readFileSync(file, "utf8");
  const lines = source.split(/\r?\n/);
  const violations = [];

  if (FILE_EXCEPTIONS.has(relPath) || LINE_EXCEPTIONS.has(relPath)) {
    return violations;
  }

  // 1. Module-level color-bearing StyleSheet outside the theme system.
  lines.forEach((line, index) => {
    const sheet =
      /^(?:export\s+)?const\s+\w+\s*=\s*StyleSheet\.create\s*\(/.exec(line) ||
      /^(?:export\s+)?const\s+\w+\s*=\s*StyleSheet\.create\s*\({/.exec(line);
    if (sheet) {
      const body = lines.slice(index, index + 80).join("\n");
      if (/(?:backgroundColor|color|borderColor|shadowColor)\s*:/.test(body)) {
        violations.push({
          file: relPath,
          line: index + 1,
          message:
            "module-level color-bearing StyleSheet — move styles into a theme-aware factory or theme token",
        });
      }
    }
  });

  // 2. Duplicated full light/dark palettes.
  lines.forEach((line, index) => {
    if (/\bisDark\s*\?\s*\{/.test(line)) {
      const body = lines.slice(index, index + 18).join("\n");
      const count = (body.match(/#[0-9A-Fa-f]{3,8}|rgba?\(/g) || []).length;
      if (count >= 5) {
        violations.push({
          file: relPath,
          line: index + 1,
          message:
            "duplicated light/dark palette — consume theme.colors or theme.palettes instead",
        });
      }
    }
  });

  // 3. Alpha applied to a literal instead of a resolved role.
  lines.forEach((line, index) => {
    if (/withAlpha\(\s*["'`]#/.test(line)) {
      violations.push({
        file: relPath,
        line: index + 1,
        message:
          "withAlpha() applied to a color literal — apply it to a mode-aware theme color",
      });
    }
  });

  // 3b. Retired warm/cream/gradient/indigo roles and literals.
  lines.forEach((line, index) => {
    if (/theme-allow\b/i.test(line)) return;
    const trimmed = line.trim();
    if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) return;
    if (RETIRED_IDENTIFIERS.test(line)) {
      violations.push({
        file: relPath,
        line: index + 1,
        message:
          "retired theme role — use background / surfaceSoft / border / primarySurface / primaryBorder",
      });
    }
    for (const raw of line.match(COLOR_RE) || []) {
      if (RETIRED_LITERALS.has(normalize(raw))) {
        violations.push({
          file: relPath,
          line: index + 1,
          message: `retired indigo/warm/navy color ${raw} — orange is the only accent; surfaces use theme roles`,
        });
      }
    }
  });

  // 4. Hardcoded neutral / light-surface literals in color-bearing props.
  lines.forEach((line, index) => {
    if (isAllowlistedLine(relPath, line)) return;
    if (/theme-allow\b/i.test(line)) return;
    // Ignore comments.
    const trimmed = line.trim();
    if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) {
      return;
    }

    const matches = line.match(COLOR_RE);
    if (!matches) return;

    const prop = findProperty(lines, index);
    const inSurfaceProp = prop ? SURFACE_PROPS.has(prop) : false;
    const inTextProp = prop ? TEXT_PROPS.has(prop) : false;

    for (const raw of matches) {
      const color = normalize(raw);
      const rgb = parseColor(color);
      if (!rgb) continue;

      const isWhite = rgb.r === 255 && rgb.g === 255 && rgb.b === 255;
      const isSurfaceLiteral = LIGHT_SURFACE_LITERALS.has(color);
      const neutral = isNeutral(rgb);

      if (!neutral && !isSurfaceLiteral) continue;

      if (inTextProp) {
        // White/very light text is a valid on-color role; neutral dark text
        // and light-only tints are not.
        if (isWhite) continue;
        if (neutral && rgb.r > 180) continue; // light muted text on dark art
        violations.push({
          file: relPath,
          line: index + 1,
          message: `hardcoded neutral text color ${raw} — use theme.colors.text / textMuted / textFaint`,
        });
        continue;
      }

      if (inSurfaceProp || isSurfaceLiteral) {
        // A translucent black shadow is still a literal; require theme shadow.
        violations.push({
          file: relPath,
          line: index + 1,
          message: `hardcoded neutral/surface color ${raw} in ${prop ?? "style"} — use a theme color role`,
        });
      }
    }
  });

  return violations;
}

const files = SCAN_DIRS.flatMap((dir) => walk(path.join(ROOT, dir)));
const violations = files.flatMap(scanFile);

if (violations.length > 0) {
  console.error(`\nTheme color check failed: ${violations.length} violation(s)\n`);
  for (const violation of violations) {
    console.error(`${violation.file}:${violation.line}  ${violation.message}`);
  }
  console.error(
    "\nUse theme.colors / theme.palettes from @/theme, or annotate an intentional\n" +
      "art/inverse usage with `// theme-allow: <reason>`.\n" +
      "Reviewed file exceptions live in scripts/check-theme-colors.mjs.\n",
  );
  process.exit(1);
}

console.log(`Theme color check passed (${files.length} files scanned).`);
