/**
 * The pictures Shrodi shows in his tour chat (`chat-shrodi-tour-*`): one small flat scene per stop (the map, the quests, the games,
 * the profile, the phone), so each message says what the screen LOOKS like, not only what it is called. A node's text part that is
 * only `[[pic:<id>]]` is drawn as one of these instead of a bubble (`pictureOf` in `services/chat-core.ts`). Drawn in the lesson
 * object style (project skill `duolingo-object-style`): flat colour, no outlines or gradients, rounded shapes, a darker lip under
 * a card, pill eyes. Pure data with no framework imports, so Node tests can check it and `scripts/render-tour-art.mjs` can draw a
 * contact sheet. Each is one 200 x 120 frame; the colours are the object art's own fixed hues (theme exception EX-13). The ids are
 * the ones `scripts/lib/chat-vocab.mjs` allows in a marker (a test keeps the two lists equal).
 */

import { ANCHOVY, BEE, COFFEE, EEL, FOX, GLASS, LEAF, PLUM, RED, SEA, SKIN, SNOW, circle, line, on, path, pill, poly, rect, type ArtShape } from "../lesson/visual/object-art.ts";

export const TOUR_ART_WIDTH = 200;
export const TOUR_ART_HEIGHT = 120;

export const TOUR_PICTURE_IDS = ["tour-map", "tour-quests", "tour-games", "tour-profile", "tour-phone"] as const;
export type TourPictureId = (typeof TOUR_PICTURE_IDS)[number];

const INK = EEL[1];

/** The scene's backdrop: a white card tinted with one hue. */
const backdrop = (tint: string): ArtShape[] => [rect(0, 0, 200, 120, 16, SNOW), rect(0, 0, 200, 120, 16, tint, 0.35)];

/** A white card with a darker lip under it. */
const card = (x: number, y: number, w: number, h: number, r: number, fill: string = SNOW, lip: string = ANCHOVY[2]): ArtShape[] => [rect(x, y + 3, w, h, r, lip), rect(x, y, w, h, r, fill)];

/** A round button face with its lip. */
const puck = (cx: number, cy: number, r: number, face: string, lip: string): ArtShape[] => [circle(cx, cy + 3, r, lip), circle(cx, cy, r, face)];

const starPoints = (cx: number, cy: number, outer: number, inner: number): [number, number][] => {
  const pts: [number, number][] = [];
  for (let i = 0; i < 10; i++) pts.push(on(cx, cy, i % 2 === 0 ? outer : inner, 36 * i));
  return pts;
};

const diamond = (cx: number, cy: number, s: number): ArtShape[] => [
  poly([[cx, cy - s], [cx + s * 0.8, cy], [cx, cy + s * 1.1], [cx - s * 0.8, cy]], 2, SEA[2]),
  poly([[cx - 1, cy - s + 3], [cx + s * 0.5, cy - 1], [cx - 1, cy + s * 0.5], [cx - s * 0.6, cy - 1]], 2, SEA[1]),
  poly([[cx - s * 0.4, cy - s * 0.2], [cx - 1, cy - s + 5], [cx + 1, cy - s * 0.2]], 1.5, SEA[0]),
];

/** A little fox hero standing on `groundY`, facing right. */
const hero = (cx: number, groundY: number): ArtShape[] => [
  rect(cx - 8, groundY - 18, 16, 18, 7, SNOW),
  poly([[cx - 10, groundY - 26], [cx - 5, groundY - 38], [cx, groundY - 28]], 2, FOX[2]),
  poly([[cx + 10, groundY - 26], [cx + 5, groundY - 38], [cx, groundY - 28]], 2, FOX[2]),
  circle(cx, groundY - 24, 11, FOX[1]),
  pill(cx + 1, groundY - 28, 4, 8, INK),
  pill(cx + 7, groundY - 28, 4, 8, INK),
];

export const TOUR_ART: Readonly<Record<TourPictureId, readonly ArtShape[]>> = {
  /** Home: a winding path of lesson circles: two done, the one you are on (with a halo), and one still locked. */
  "tour-map": [
    ...backdrop(GLASS[2]),
    pill(14, 14, 74, 10, GLASS[2]),
    pill(14, 29, 46, 7, GLASS[1]),
    line("M36 90L80 72L124 54L168 36", ANCHOVY[2], 9),
    circle(124, 54, 22, BEE[0], 0.7),
    ...puck(36, 90, 13, LEAF[1], LEAF[2]),
    line("M30 90L35 95L43 85", SNOW, 3.5),
    ...puck(80, 72, 13, LEAF[1], LEAF[2]),
    line("M74 72L79 77L87 67", SNOW, 3.5),
    ...puck(124, 54, 14, BEE[1], BEE[2]),
    poly(starPoints(124, 54, 8, 3.4), 1.2, SNOW),
    ...puck(168, 36, 13, ANCHOVY[2], EEL[0]),
    rect(162, 36, 12, 9, 3, SNOW),
    line("M165 36V33Q168 27 171 33V36", SNOW, 2.5),
  ],

  /** Quests: three goal rows with their bars and buttons, and a chest with a diamond rising from it. */
  "tour-quests": [
    ...backdrop(BEE[0]),
    ...card(12, 12, 120, 28, 9),
    pill(20, 18, 52, 6, EEL[0]),
    pill(20, 29, 72, 6, ANCHOVY[1]),
    pill(20, 29, 72, 6, LEAF[1]),
    ...card(98, 19, 26, 14, 7, LEAF[1], LEAF[2]),
    ...card(12, 49, 120, 28, 9),
    pill(20, 55, 64, 6, EEL[0]),
    pill(20, 66, 72, 6, ANCHOVY[1]),
    pill(20, 66, 44, 6, LEAF[1]),
    ...card(98, 56, 26, 14, 7, ANCHOVY[1], ANCHOVY[2]),
    ...card(12, 86, 120, 28, 9),
    pill(20, 92, 44, 6, EEL[0]),
    pill(20, 103, 72, 6, ANCHOVY[1]),
    pill(20, 103, 18, 6, LEAF[1]),
    ...card(98, 93, 26, 14, 7, ANCHOVY[1], ANCHOVY[2]),
    ...diamond(160, 38, 13),
    rect(140, 64, 44, 44, 8, COFFEE[2]),
    rect(138, 60, 44, 44, 8, COFFEE[1]),
    rect(138, 60, 44, 18, 8, COFFEE[0]),
    rect(138, 74, 44, 5, 0, BEE[2]),
    rect(153, 74, 14, 14, 4, BEE[1]),
    circle(160, 80, 2.4, COFFEE[2]),
  ],

  /** Games: a platformer scene (the hero, a coin, an enemy) beside a fact-or-myth card with its two answers. */
  "tour-games": [
    ...backdrop(LEAF[0]),
    rect(10, 12, 86, 96, 12, SEA[0]),
    pill(22, 24, 24, 8, SNOW),
    pill(32, 31, 20, 7, SNOW),
    rect(10, 82, 86, 26, 12, LEAF[1]),
    rect(10, 82, 86, 8, 0, LEAF[0]),
    circle(58, 52, 7, BEE[2]),
    circle(57, 51, 6, BEE[1]),
    ...hero(32, 82),
    circle(74, 72, 11, RED[2]),
    circle(73, 71, 10, RED[1]),
    pill(68, 66, 4, 8, SNOW),
    pill(75, 66, 4, 8, SNOW),
    ...card(104, 12, 86, 96, 12),
    pill(116, 24, 62, 7, EEL[0]),
    pill(116, 36, 46, 6, ANCHOVY[1]),
    ...card(116, 54, 62, 20, 9, LEAF[1], LEAF[2]),
    line("M139 64L145 70L156 58", SNOW, 3.5),
    ...card(116, 82, 62, 20, 9, RED[1], RED[2]),
    line("M141 88L153 98M153 88L141 98", SNOW, 3.5),
  ],

  /** Profile: the explorer passport, with a face, a name, the level medal, badges and the streak flame. */
  "tour-profile": [
    ...backdrop(PLUM[0]),
    rect(14, 17, 172, 92, 14, PLUM[2]),
    rect(14, 14, 172, 92, 14, PLUM[1]),
    circle(52, 52, 25, BEE[1]),
    circle(52, 47, 9, SKIN[0]),
    path("M40 71Q40 59 52 59Q64 59 64 71Z", SEA[1]),
    pill(88, 32, 62, 8, SNOW),
    pill(88, 46, 44, 6, PLUM[0]),
    circle(162, 42, 15, BEE[2]),
    circle(160, 40, 15, BEE[1]),
    poly(starPoints(160, 40, 8.5, 3.6), 1.2, SNOW),
    ...puck(40, 90, 10, SEA[1], SEA[2]),
    ...puck(68, 90, 10, LEAF[1], LEAF[2]),
    ...puck(96, 90, 10, RED[1], RED[2]),
    path("M168 98C158 92 160 82 165 74C166 79 170 80 171 77C177 84 178 93 168 98Z", FOX[1]),
    path("M168 98C163 95 164 90 168 86C171 90 174 93 168 98Z", BEE[1]),
  ],

  /** The phone: a handset with a grid of app icons (one with a new dot) and two chat bubbles beside it. */
  "tour-phone": [
    ...backdrop(SEA[0]),
    rect(60, 9, 80, 108, 16, EEL[2]),
    rect(60, 6, 80, 108, 16, EEL[1]),
    rect(65, 11, 70, 98, 12, ANCHOVY[0]),
    ...[
      [RED[1], 72, 22], [SEA[1], 93, 22], [LEAF[1], 114, 22],
      [BEE[1], 72, 43], [PLUM[1], 93, 43], [FOX[1], 114, 43],
      [SEA[2], 72, 64], [LEAF[2], 93, 64], [RED[2], 114, 64],
    ].flatMap(([fill, x, y]) => [rect(x as number, y as number, 14, 14, 5, fill as string)]),
    rect(76, 27, 6, 5, 2, SNOW),
    circle(87, 22, 3.5, RED[1]),
    pill(86, 98, 28, 4, EEL[0]),
    ...card(10, 36, 42, 24, 11),
    pill(18, 44, 22, 5, EEL[0]),
    pill(18, 52, 14, 4, ANCHOVY[2]),
    ...card(148, 62, 42, 24, 11, SEA[1], SEA[2]),
    pill(156, 70, 24, 5, SNOW),
    pill(156, 78, 16, 4, SEA[0]),
  ],
};

export const TOUR_ART_NAMES: Readonly<Record<TourPictureId, string>> = {
  "tour-map": "The Home map with lesson circles",
  "tour-quests": "The Quests list and a chest",
  "tour-games": "A platformer level and a fact-or-myth card",
  "tour-profile": "The explorer passport",
  "tour-phone": "The phone with its apps",
};

const isTourPicture = (id: string): id is TourPictureId => (TOUR_PICTURE_IDS as readonly string[]).includes(id);
export const tourArt = (id: string): readonly ArtShape[] | null => (isTourPicture(id) ? TOUR_ART[id] : null);
export const tourArtName = (id: string): string => (isTourPicture(id) ? TOUR_ART_NAMES[id] : id);
