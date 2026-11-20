/**
 * The pictures on the phone's app icons: the way an iPhone's icons put one bold, simple picture on a coloured rounded square,
 * drawn in the lesson object style (project skill `duolingo-object-style`: flat colour, no outlines or gradients, rounded
 * shapes, light from the upper left, the side facing away one step darker, a pale bar for shine on glossy things only). Pure
 * data with no framework imports, so Node tests can check it and `scripts/render-app-icons.mjs` can draw a contact sheet.
 *
 * The set is drawn after iOS's: not every tile is a colour with a white picture. Some tiles are white (`light`: a colourful picture
 * on a pale tile, Contacts, Notes, Books) and some are dark (`dark`: AtomDex), the rest take their colour from the catalog; pictures are
 * big (they fill about 70 to 80% of the tile) and several colours at once, glass is a translucent layer (`opacity`) over another, and a
 * few run to the tile's edge (the tile clips them to its rounded corners): the yellow top of the notepad, the map, the index tabs.
 * Every picture is one 100 x 100 frame. Shapes are
 * `ArtShape`s from the object art. A colour of `$face` or `$lip` is the tile's own face or lip colour (which follows the theme),
 * so a detail can be "cut out" of a white picture and show the tile through it; every other colour is a fixed hue from the
 * object art's families, the same in light and dark mode (theme exception EX-13).
 */

import {
  ANCHOVY,
  BEE,
  COFFEE,
  CRUMB,
  EEL,
  FOX,
  LEAF,
  PLUM,
  RED,
  SEA,
  SKIN,
  SNOW,
  circle,
  line,
  on,
  path,
  pill,
  poly,
  rect,
  type ArtShape,
} from "../lesson/visual/object-art.ts";
import { darken } from "../lesson/visual/color-math.ts";

export const FACE = "$face";
export const LIP = "$lip";

/** Which apps have a tile of their own instead of the catalog's colour: a white one with a colourful picture, or a dark one. */
export type IconTile = "light" | "dark";
export const APP_ICON_TILE: Readonly<Record<string, IconTile>> = {
  contacts: "light",
  "field-notes": "light",
  library: "light",
};

/** The face and lip of a white or a dark tile (fixed hues, the same in light and dark mode, theme exception EX-13). */
export const ICON_TILES: Readonly<
  Record<IconTile, { face: string; lip: string; ink: string }>
> = {
  light: { face: SNOW, lip: ANCHOVY[2], ink: EEL[1] },
  dark: { face: EEL[2], lip: darken(EEL[2], 0.4), ink: SNOW },
};

/** A rounded gear: `teeth` teeth round (cx, cy), tips at `outer`, roots at `inner`. */
function gear(
  cx: number,
  cy: number,
  outer: number,
  inner: number,
  teeth: number,
  fill: string,
): ArtShape {
  const pts: [number, number][] = [];
  const step = 360 / teeth;
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    pts.push(
      on(cx, cy, inner, a - step * 0.34),
      on(cx, cy, outer, a - step * 0.2),
      on(cx, cy, outer, a + step * 0.2),
      on(cx, cy, inner, a + step * 0.34),
    );
  }
  return poly(pts, 2.5, fill);
}

const SHIELD = "M50 8L87 22V50Q87 77 50 94Q13 77 13 50V22Z";

export const APP_ICON_ART: Readonly<Record<string, readonly ArtShape[]>> = {
  // Chats: one big speech bubble with three dots
  // (the bubble and its tail together are centred in the tile, no shadow)
  chats: [
    rect(12, 12, 76, 58, 27, SNOW),
    poly(
      [
        [22, 62],
        [14, 88],
        [46, 66],
      ],
      5,
      SNOW,
    ),
    circle(32, 41, 6.5, FACE),
    circle(50, 41, 6.5, FACE),
    circle(68, 41, 6.5, FACE),
  ],

  // Contacts (white tile): a person in colour and the coloured index tabs down the edge, like the contacts book
  contacts: [
    rect(88, 10, 20, 13, 6.5, RED[1]),
    rect(88, 27, 20, 13, 6.5, BEE[1]),
    rect(88, 44, 20, 13, 6.5, LEAF[1]),
    rect(88, 61, 20, 13, 6.5, SEA[1]),
    rect(88, 78, 20, 13, 6.5, PLUM[1]),
    path("M10 104Q10 62 46 62Q82 62 82 104Z", SEA[2]),
    path("M6 104Q6 62 42 62Q78 62 78 104Z", SEA[1]),
    circle(42, 36, 16, SKIN[1]),
  ],

  // AtomDex: the book is the tile itself (its colour is the cover, a darker spine down the left), a big coloured atom on the cover
  atomdex: [
    rect(0, 0, 16, 100, 0, LIP),
    rect(16, 0, 3, 100, 0, SNOW, 0.35),
    pill(34, 84, 46, 7, SNOW, 0.9),
    line("M82 46A24 24 0 1 0 34 46A24 24 0 1 0 82 46Z", SNOW, 5),
    circle(58, 46, 10, BEE[1]),
    circle(78, 32, 6.5, RED[1]),
    circle(41, 63, 6.5, LEAF[1]),
  ],

  // Daily Fact: a big glass bulb, glowing, with a ribbed base
  "daily-fact": [
    path(
      "M54 9A30 30 0 0 1 70 61V67H38V61A30 30 0 0 1 54 9Z",
      ANCHOVY[2],
      0.55,
    ),
    path("M50 9A30 30 0 0 1 66 61V67H34V61A30 30 0 0 1 50 9Z", SNOW, 0.92),
    path("M50 21A20 20 0 0 1 60 57V63H40V57A20 20 0 0 1 50 21Z", CRUMB[0]),
    line("M42 39L50 49L58 39M50 49V61", LIP, 4),
    pill(35, 19, 6, 16, SNOW),
    rect(36, 68, 28, 8, 4, LIP),
    rect(38, 78, 24, 8, 4, LIP),
    rect(45, 87, 10, 5, 2.5, EEL[1]),
  ],

  // Settings: a big gear with a rim, three spokes and a hub, like iOS's
  settings: [
    gear(53, 53, 44, 36, 12, ANCHOVY[2]),
    gear(50, 50, 44, 36, 12, SNOW),
    circle(50, 50, 27, FACE),
    line("M50 50V28M50 50L69 61M50 50L31 61", ANCHOVY[0], 8),
    line("M77 50A27 27 0 1 0 23 50A27 27 0 1 0 77 50Z", ANCHOVY[1], 4),
    circle(50, 50, 8, SNOW),
  ],

  // Shop, full size: a red and white striped roof across the top (round scallops), under it a window and a half door that runs off the bottom edge
  shop: [
    rect(0, 36, 100, 70, 0, SNOW),
    rect(0, 36, 100, 14, 0, ANCHOVY[2]),
    ...[0, 1, 2, 3, 4, 5].flatMap((i) => {
      const w = 100 / 6;
      const fill = i % 2 === 0 ? SNOW : RED[1];
      return [
        rect(i * w, 0, w, 36, 0, fill),
        circle(i * w + w / 2, 36, w / 2, fill),
      ];
    }),
    rect(8, 60, 46, 30, 8, FACE),
    pill(5, 88, 52, 7, ANCHOVY[2]),
    pill(15, 66, 6, 14, SNOW, 0.7),
    rect(64, 58, 28, 60, 9, FACE),
    circle(71, 84, 3, SNOW),
  ],

  // Field Notes (white tile): a page with a yellow top that runs to the tile's edge, lines and a pencil
  "field-notes": [
    rect(0, 0, 100, 28, 0, BEE[1]),
    pill(16, 9, 34, 7, BEE[0]),
    circle(86, 14, 4, BEE[2]),
    pill(16, 44, 68, 6, ANCHOVY[2]),
    pill(16, 59, 68, 6, ANCHOVY[2]),
    pill(16, 74, 40, 6, ANCHOVY[2]),
    line("M62 90L84 60", FOX[2], 13),
    line("M62 90L84 60", FOX[1], 11),
    line("M84 60L88 54", CRUMB[1], 11),
    line("M88 54L90 51", COFFEE[1], 8),
  ],

  // Atom Scanner: a radar of see-through rings, a sweep, a dot, and the four corners of a viewfinder
  scanner: [
    circle(50, 50, 36, SNOW, 0.2),
    circle(50, 50, 25, SNOW, 0.28),
    circle(50, 50, 14, SNOW, 0.4),
    path("M50 50L22 20A40 40 0 0 1 78 20Z", SNOW, 0.7),
    circle(50, 50, 6, SNOW),
    circle(66, 62, 3.5, BEE[1]),
    line("M12 34V22Q12 12 22 12H34", SNOW, 8),
    line("M66 12H78Q88 12 88 22V34", SNOW, 8),
    line("M12 66V78Q12 88 22 88H34", SNOW, 8),
    line("M66 88H78Q88 88 88 78V66", SNOW, 8),
  ],

  // Reference Library (white tile): four books side by side, each its own colour, full size and running off the bottom edge
  library: [
    ...[
      [4, 14, RED],
      [27, 4, SEA],
      [50, 20, LEAF],
      [73, 10, PLUM],
    ].flatMap(([x, y, tone]) => {
      const t = tone as readonly string[];
      const X = x as number;
      const Y = y as number;
      return [
        rect(X, Y, 23, 110 - Y, 7, t[2]),
        rect(X, Y, 18, 110 - Y, 7, t[1]),
        pill(X + 3.5, Y + 16, 11, 6, SNOW, 0.85),
        pill(X + 3.5, Y + 30, 11, 6, SNOW, 0.85),
      ];
    }),
  ],

  // Camera: a camera body with a big lens of rings
  camera: [
    rect(32, 14, 36, 20, 8, ANCHOVY[2]),
    rect(14, 32, 80, 58, 17, ANCHOVY[2]),
    rect(10, 28, 80, 58, 17, SNOW),
    circle(50, 58, 24, EEL[1]),
    circle(50, 58, 17, SEA[1]),
    circle(50, 58, 8, SEA[0]),
    pill(38, 46, 5, 11, SNOW, 0.8),
    circle(76, 40, 4.5, FACE),
  ],

  // Safety Guide: a big shield, its far half one step darker, with a tick
  safety: [
    path(SHIELD, SNOW),
    path("M50 8L87 22V50Q87 77 50 94Z", ANCHOVY[0]),
    line("M33 50L46 63L68 36", FACE, 10),
  ],

  // Nuclear Map: a map that runs to the tile's edge, a river, two roads and a pin
  map: [
    rect(0, 0, 100, 100, 0, LEAF[0]),
    path("M-4 66Q26 52 48 70T104 62V104H-4Z", SEA[0]),
    line("M-6 26L106 52", SNOW, 10),
    line("M30 -6L62 106", SNOW, 10),
    path("M50 90Q24 62 24 44A26 26 0 1 1 76 44Q76 62 50 90Z", RED[2]),
    path("M46 90Q20 62 20 44A26 26 0 1 1 72 44Q72 62 46 90Z", RED[1]),
    circle(46, 42, 10, SNOW),
  ],
};

/** The art for an app, or null for an app with none (it falls back to its icon glyph). */
export const appIconArt = (id: string): readonly ArtShape[] | null =>
  APP_ICON_ART[id] ?? null;
