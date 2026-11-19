/**
 * Pure colour helpers for figure shading (no imports, so Node tests can use them).
 * Used to derive a same-hue rim from a theme colour: shapes are flat, with one shade
 * step darker at the edge instead of a black outline (duolingo-character-style).
 */

function parse(hex: string): [number, number, number] | null {
  if (!/^#[0-9A-Fa-f]{6}/.test(hex)) return null;
  const h = hex.slice(1, 7);
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

const toHex = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, "0");

/** Move `hex` toward black by `amount` (0 to 1). Anything that is not #RRGGBB comes back unchanged. */
export function darken(hex: string, amount: number): string {
  const rgb = parse(hex);
  if (!rgb) return hex;
  const k = 1 - amount;
  return `#${toHex(rgb[0] * k)}${toHex(rgb[1] * k)}${toHex(rgb[2] * k)}`;
}

/** Move `hex` toward white by `amount` (0 to 1). Anything that is not #RRGGBB comes back unchanged. */
export function lighten(hex: string, amount: number): string {
  const rgb = parse(hex);
  if (!rgb) return hex;
  return `#${toHex(rgb[0] + (255 - rgb[0]) * amount)}${toHex(rgb[1] + (255 - rgb[1]) * amount)}${toHex(rgb[2] + (255 - rgb[2]) * amount)}`;
}

function channel(v: number): number {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

export function luminanceOf(hex: string): number {
  const rgb = parse(hex);
  if (!rgb) return 0;
  return 0.2126 * channel(rgb[0]) + 0.7152 * channel(rgb[1]) + 0.0722 * channel(rgb[2]);
}

export function contrastBetween(a: string, b: string): number {
  const la = luminanceOf(a);
  const lb = luminanceOf(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** How much darker the rim of a flat shape is in light mode (tuned so every tone reaches 3:1 on the figure's surface). */
export const RIM_DARKEN = 0.32;
