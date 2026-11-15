/**
 * Element category colors.
 *
 * Category hues are brand/accent colors (see THEME_EXCEPTION_REGISTER §4).
 * Everything neutral is derived from the active theme: a chip fill is the
 * theme surface tinted with the hue, and its text is the theme text role. That
 * keeps text/background contrast independent of the hue in both modes
 * (verified by `scripts/test-periodic-table.mjs`).
 *
 * This file is framework-free (no React Native, no path aliases) so Node
 * tests can import it directly.
 */

export type CategoryKey =
  | "alkali-metal"
  | "alkaline-earth-metal"
  | "transition-metal"
  | "post-transition-metal"
  | "metalloid"
  | "reactive-nonmetal"
  | "noble-gas"
  | "lanthanide"
  | "actinide"
  | "unknown";

export type ColorMode = "light" | "dark";

/** Hue per category and mode. Dark hues are lighter so borders stay visible. */
export const CATEGORY_HUES: Record<CategoryKey, Record<ColorMode, string>> = {
  "alkali-metal": { light: "#DC2626", dark: "#F87171" },
  "alkaline-earth-metal": { light: "#EA580C", dark: "#FB923C" },
  "transition-metal": { light: "#2563EB", dark: "#60A5FA" },
  "post-transition-metal": { light: "#0D9488", dark: "#2DD4BF" },
  metalloid: { light: "#4D7C0F", dark: "#A3E635" },
  "reactive-nonmetal": { light: "#A16207", dark: "#FACC15" },
  "noble-gas": { light: "#7C3AED", dark: "#A78BFA" },
  lanthanide: { light: "#DB2777", dark: "#F472B6" },
  actinide: { light: "#4F46E5", dark: "#818CF8" },
  unknown: { light: "#64748B", dark: "#94A3B8" },
};

/** How much of the hue is mixed into the surface for a chip fill. */
export const FILL_TINT: Record<ColorMode, number> = { light: 0.2, dark: 0.2 };

interface Rgb {
  r: number;
  g: number;
  b: number;
}

export function parseHex(hex: string): Rgb {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

const toHex = (n: number): string =>
  Math.round(Math.max(0, Math.min(255, n)))
    .toString(16)
    .padStart(2, "0");

/** Linear mix of `top` over `bottom` (`amount` of top). Returns `#RRGGBB`. */
export function mixHex(bottom: string, top: string, amount: number): string {
  const a = parseHex(bottom);
  const b = parseHex(top);
  return `#${toHex(a.r + (b.r - a.r) * amount)}${toHex(a.g + (b.g - a.g) * amount)}${toHex(
    a.b + (b.b - a.b) * amount,
  )}`.toUpperCase();
}

const channel = (v: number): number => {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
};

export function relativeLuminance(hex: string): number {
  const { r, g, b } = parseHex(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG 2.x contrast ratio between two opaque `#RRGGBB` colors. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

export interface CategoryChipColors {
  /** Chip fill: theme surface tinted with the category hue. */
  fill: string;
  /** Chip border / legend dot / accent stripe (the pure hue). */
  accent: string;
  /** Primary text on `fill` (theme text role). */
  text: string;
  /** Secondary text on `fill` (theme textSecondary role). */
  textSecondary: string;
}

export function resolveCategoryColors(
  category: CategoryKey,
  mode: ColorMode,
  surface: string,
  text: string,
  textSecondary: string,
): CategoryChipColors {
  const accent = CATEGORY_HUES[category][mode];
  return {
    fill: mixHex(surface, accent, FILL_TINT[mode]),
    accent,
    text,
    textSecondary,
  };
}
