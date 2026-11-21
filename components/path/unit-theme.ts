/**
 * A colour theme per unit of the lesson map, as pure maths (no React), unit-tested in
 * `scripts/test-path-nodes.mjs`. Unit 1 keeps the app's lesson yellow; the units after it take
 * blue, green, purple and red in turn (and then start over), so a learner sees where one unit ends
 * and the next begins. Text on every face is the same white (the lesson card's), so the faces after
 * the yellow are the deeper blue, green, purple and red that white reads well on. Every colour comes
 * from a theme role, so dark mode follows.
 *
 * A unit that has a teacher wears the teacher's colour instead (`teacherPalette`); the sequence above is what a unit without one
 * (and the Atom Maze tutorial) falls back to.
 *
 * The nodes, the node bubble, the unit card on top and the divider between units all read the same
 * palette; locked nodes ignore it and stay in the locked grey.
 */

import { darken } from "../lesson/visual/color-math.ts";

/** The theme colours a palette is built from (a subset of the app's `Theme["colors"]`). */
export interface UnitPaletteColors {
  lessonHeader: string;
  lessonCardLip: string;
  lessonHeaderText: string;
  guideLip: string;
  successDark: string;
  sky: string;
  skyLip: string;
  error: string;
  dangerDark: string;
}

export interface UnitPalette {
  /** The face of a node, the unit card and the bubble. */
  face: string;
  /** The darker colour under a face. */
  lip: string;
  /** Text and icons on the face: the same white for every unit. */
  ink: string;
  /** Text on a plain button (the card background): the face, darkened in light mode. */
  accent: string;
}

/** How many different palettes there are before they repeat. */
export const UNIT_PALETTE_COUNT = 5;

/** How much darker the lip is than a face that has no lip colour of its own. */
const LIP_DARKEN = 0.2;
/** How much the face is darkened to read as text on a light page. */
const ACCENT_DARKEN = 0.4;

/**
 * The palette of a unit that has a teacher: the teacher's own colour (their cover: pink for Ada, yellow for Hal...) for the face and
 * its shade for the lip, so the lesson map wears the colours of whoever teaches that unit. Text is the same white as every unit's.
 */
export function teacherPalette(brand: { color: string; shade: string }, ink: string, dark: boolean): UnitPalette {
  return { face: brand.color, lip: brand.shade, ink, accent: dark ? brand.color : darken(brand.color, ACCENT_DARKEN) };
}

/** The palette of the unit at `position` (1-based, as in "Unit 2"). `dark` is dark mode. */
export function unitPalette(c: UnitPaletteColors, position: number, dark: boolean): UnitPalette {
  const index = ((Math.round(position) - 1) % UNIT_PALETTE_COUNT + UNIT_PALETTE_COUNT) % UNIT_PALETTE_COUNT;
  // After the yellow, the deeper shades: the light blue and green do not carry white text
  const base = [
    { face: c.lessonHeader, lip: c.lessonCardLip },
    { face: c.guideLip, lip: darken(c.guideLip, LIP_DARKEN) },
    { face: c.successDark, lip: darken(c.successDark, LIP_DARKEN) },
    { face: c.sky, lip: c.skyLip },
    { face: c.error, lip: c.dangerDark },
  ][index];
  return { face: base.face, lip: base.lip, ink: c.lessonHeaderText, accent: dark ? base.face : darken(base.face, ACCENT_DARKEN) };
}
