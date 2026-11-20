/**
 * The colours of the phone's icon tiles: one face and one lip (the darker colour under it) per colour role of
 * the catalog (`PhoneColorRole`), all from theme roles so dark mode follows. The same recipe as the lesson map's
 * unit colours (`components/path/unit-theme.ts`); text and glyphs on every face are the lesson card's white.
 */

import { darken } from "../lesson/visual/color-math.ts";

import type { PhoneColorRole } from "../../services/phone-core.ts";

/** The theme colours the palette reads (a subset of `Theme["colors"]`). */
export interface PhonePaletteColors {
  lessonHeader: string;
  lessonCardLip: string;
  lessonHeaderText: string;
  guideLip: string;
  successDark: string;
  sky: string;
  skyLip: string;
  error: string;
  dangerDark: string;
  primary: string;
  primaryDark: string;
  cyan: string;
  coral: string;
  textMuted: string;
}

export interface PhoneTile {
  face: string;
  lip: string;
  /** The glyph's colour on the face. */
  ink: string;
}

const LIP_DARKEN = 0.2;

export function phoneTile(c: PhonePaletteColors, role: PhoneColorRole): PhoneTile {
  const ink = c.lessonHeaderText;
  switch (role) {
    case "yellow":
      return { face: c.lessonHeader, lip: c.lessonCardLip, ink };
    case "blue":
      return { face: c.guideLip, lip: darken(c.guideLip, LIP_DARKEN), ink };
    case "green":
      return { face: c.successDark, lip: darken(c.successDark, LIP_DARKEN), ink };
    case "purple":
      return { face: c.sky, lip: c.skyLip, ink };
    case "red":
      return { face: c.error, lip: c.dangerDark, ink };
    case "orange":
      return { face: c.primary, lip: c.primaryDark, ink };
    case "cyan":
      return { face: c.cyan, lip: darken(c.cyan, LIP_DARKEN), ink };
    case "coral":
      return { face: c.coral, lip: darken(c.coral, LIP_DARKEN), ink };
    case "grey":
      return { face: c.textMuted, lip: darken(c.textMuted, LIP_DARKEN), ink };
  }
}
