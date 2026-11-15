import { withAlpha, type Theme } from "@/theme";
import type { ActivityLevel } from "@/services/activity-core";

export interface LevelStyle {
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
  borderStyle: "solid" | "dashed";
  /** Colour of the level numeral drawn inside the cell. */
  glyphColor: string;
}

/**
 * Intensity colours derive from one brand hue (the orange accent already used
 * on the streak screen) via alpha, so they follow light/dark automatically.
 * Colour is never the only signal: each level also has a distinct border
 * treatment (dashed -> thin -> medium -> thick -> heavy) and a level numeral.
 */
export const levelStyleFor = (theme: Theme, level: ActivityLevel): LevelStyle => {
  const hue = theme.mode === "dark" ? theme.accents.orange.primaryLight : theme.accents.orange.primary;
  const strong = theme.accents.orange.primaryDark;
  const onFill = theme.mode === "dark" ? theme.colors.background : theme.colors.onPrimary;
  switch (level) {
    case 1:
      return { backgroundColor: withAlpha(hue, 0.28), borderColor: withAlpha(hue, 0.55), borderWidth: 1, borderStyle: "solid", glyphColor: theme.colors.text };
    case 2:
      return { backgroundColor: withAlpha(hue, 0.5), borderColor: withAlpha(hue, 0.8), borderWidth: 1, borderStyle: "solid", glyphColor: theme.colors.text };
    case 3:
      return { backgroundColor: withAlpha(hue, 0.78), borderColor: strong, borderWidth: 1.5, borderStyle: "solid", glyphColor: onFill };
    case 4:
      return { backgroundColor: hue, borderColor: strong, borderWidth: 2, borderStyle: "solid", glyphColor: onFill };
    default:
      return { backgroundColor: theme.colors.surfaceSoft, borderColor: theme.colors.borderStrong, borderWidth: 1, borderStyle: "dashed", glyphColor: theme.colors.textFaint };
  }
};
