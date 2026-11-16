/**
 * Tone -> theme role mapping for visual lesson blocks.
 *
 * Illustration hues come from theme roles (brand accents + status roles);
 * outlines, labels and surfaces always come from neutral theme roles so the
 * figure stays legible in light and dark mode.
 */

import { withAlpha, type Theme } from "@/theme";

import { RIM_DARKEN, darken } from "./color-math";
import type { VisualTone } from "@/content/types";

export function toneColor(theme: Theme, tone: VisualTone | undefined): string {
  const c = theme.colors;
  switch (tone) {
    case "primary":
      return c.primary;
    case "accent":
      return c.link; // brand orange
    case "success":
      return c.success;
    case "warning":
      return c.warning;
    case "danger":
      return c.danger;
    case "info":
      return c.info;
    default:
      return c.textMuted;
  }
}

/**
 * The edge of a flat shape, and the colour of toned lines: the tone itself, one shade
 * step darker in light mode so even a yellow keeps a 3:1 edge on the figure's surface.
 * In dark mode the bright fill already stands out, so the edge is the fill.
 */
export function toneRim(theme: Theme, tone: VisualTone | undefined): string {
  const fill = toneColor(theme, tone);
  return theme.mode === "dark" ? fill : darken(fill, RIM_DARKEN);
}

/** Soft (tinted) version of a tone, for backgrounds behind labels. */
export function toneSoft(theme: Theme, tone: VisualTone | undefined): string {
  return withAlpha(toneColor(theme, tone), theme.mode === "dark" ? 0.28 : 0.2);
}

function channel(v: number): number {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

export function luminance(hex: string): number {
  const h = hex.replace("#", "").slice(0, 6);
  if (h.length !== 6) return 0;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

/** The better-contrasting of two candidate foregrounds on `bg`. */
export function pickOnColor(bg: string, light: string, dark: string): string {
  return contrastRatio(bg, light) >= contrastRatio(bg, dark) ? light : dark;
}
