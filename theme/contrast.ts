/**
 * WCAG contrast helpers — framework-free so they run under `node --test`.
 *
 * Use `pickReadableText(background, [candidates])` whenever text sits on a
 * brand/accent surface whose lightness is not known at author time (selected
 * options, tinted chips, active speaker buttons). Never hard-code "#FFF".
 */

export type Rgb = { r: number; g: number; b: number };

/** Parse #rgb, #rgba, #rrggbb, #rrggbbaa, rgb() or rgba(). Alpha is ignored. */
export const parseColor = (input: string): Rgb | null => {
  const value = input.trim().toLowerCase();

  const hex = /^#([0-9a-f]{3,8})$/.exec(value);
  if (hex) {
    let h = hex[1];
    if (h.length === 3 || h.length === 4) {
      h = h
        .split("")
        .map((c) => c + c)
        .join("");
    }
    if (h.length !== 6 && h.length !== 8) return null;
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
    };
  }

  const fn = /^rgba?\(\s*(\d+)\s*[, ]\s*(\d+)\s*[, ]\s*(\d+)/.exec(value);
  if (fn) {
    return { r: Number(fn[1]), g: Number(fn[2]), b: Number(fn[3]) };
  }
  return null;
};

const channel = (c: number): number => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
};

export const relativeLuminance = ({ r, g, b }: Rgb): number =>
  0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);

/** WCAG contrast ratio, 1..21. Returns 1 when a colour cannot be parsed. */
export const contrastRatio = (a: string, b: string): number => {
  const ca = parseColor(a);
  const cb = parseColor(b);
  if (!ca || !cb) return 1;
  const la = relativeLuminance(ca);
  const lb = relativeLuminance(cb);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
};

/** WCAG AA for body text. */
export const AA_TEXT = 4.5;
/** WCAG AA for large text and UI components/icons. */
export const AA_LARGE = 3;

/**
 * Of `candidates`, the colour with the highest contrast against `background`.
 * Ties keep the earlier candidate.
 */
export const pickReadableText = (
  background: string,
  candidates: readonly string[] = ["#FFFFFF", "#000000"],
): string => {
  let best = candidates[0];
  let bestRatio = -1;
  for (const candidate of candidates) {
    const ratio = contrastRatio(candidate, background);
    if (ratio > bestRatio + 1e-9) {
      best = candidate;
      bestRatio = ratio;
    }
  }
  return best;
};
