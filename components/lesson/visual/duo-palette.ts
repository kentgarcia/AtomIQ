/**
 * The illustration palette for lesson figures: Duolingo-style flat colour, one bright face and
 * one darker "lip" shade per tone, drawn under the face so every shape looks like a chunky 3D
 * token. Fixed hues (theme exception EX-11): a proton is the same red in light and dark.
 * The neutral grey and the soft tints are the only values that change with the theme.
 *
 * Pure data (no imports) so Node tests can check contrast. Flat colour only: no gradients.
 */

export type DuoTone = "primary" | "accent" | "success" | "warning" | "danger" | "info" | "neutral";
export interface DuoShade {
  face: string;
  lip: string;
}

const HUES: Record<Exclude<DuoTone, "neutral">, DuoShade> = {
  /** Brand orange. */
  primary: { face: "#EA580C", lip: "#C2410C" },
  /** Fox orange (brighter, for highlights). */
  accent: { face: "#FF9600", lip: "#D97D00" },
  /** Feather green. */
  success: { face: "#58CC02", lip: "#46A302" },
  /** Bee yellow. */
  warning: { face: "#FFC800", lip: "#D9A800" },
  /** Cardinal red. */
  danger: { face: "#FF4B4B", lip: "#D93B3B" },
  /** Macaw blue. */
  info: { face: "#1CB0F6", lip: "#1899D6" },
};

const NEUTRAL: Record<"light" | "dark", DuoShade> = {
  light: { face: "#AFAFAF", lip: "#8E8E8E" },
  dark: { face: "#7A8A93", lip: "#566269" },
};

export function duoShade(tone: string | undefined, mode: "light" | "dark"): DuoShade {
  if (tone && tone in HUES) return HUES[tone as keyof typeof HUES];
  return NEUTRAL[mode];
}

export const DUO_TONES: DuoTone[] = ["primary", "accent", "success", "warning", "danger", "info", "neutral"];

/** How far the lip drops below a face, in scene units, for a shape of this size. */
export function lipFor(size: number): number {
  return Math.max(0.5, Math.min(1.4, size * 0.18));
}
