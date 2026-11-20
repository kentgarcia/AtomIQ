/**
 * The pictures a learner can send in a chat (docs/PHONE_SPEC.md §5.2): six reactions (put on a teacher's letter) and eight
 * stickers (sent as a big picture). They are AtomIQ's own, drawn in the lesson object style (project skill
 * `duolingo-object-style`, with the faces after `duolingo-character-style`): flat colour, no outlines or gradients, rounded
 * shapes, light from the upper left and the side facing away one step darker, pill eyes. Pure data with no framework imports, so
 * Node tests can check it and `scripts/render-chat-art.mjs` can draw a contact sheet. Each is one 100 x 100 frame. Colours are
 * fixed hues from the object art's families (theme exception EX-13). The ids are the ones `scripts/lib/chat-vocab.mjs` allows as
 * a reply's label (a test keeps the two lists equal), so a chat message that is a reaction or a sticker stores just the id.
 */

import { ANCHOVY, BEE, COFFEE, EEL, FOX, LEAF, OBJECT_ART, PLUM, RED, SEA, SKIN, SNOW, circle, line, on, path, pill, poly, rect, ring, type ArtShape } from "../lesson/visual/object-art.ts";

export const CHAT_REACTION_IDS = ["like", "love", "haha", "wow", "think", "clap"] as const;
export const CHAT_STICKER_IDS = ["mind-blown", "party", "atom", "banana", "radiation", "sleepy", "nerd", "star"] as const;

const INK = COFFEE[2];

/** A round yellow head: the darker copy behind on the right, then the face. */
const head = (cx: number, cy: number, r: number): ArtShape[] => [circle(cx + 3, cy + 3, r, BEE[2]), circle(cx, cy, r, BEE[1])];

/** A rounded rectangle turned by `deg` about its middle. */
function turned(cx: number, cy: number, w: number, h: number, deg: number, r: number, fill: string): ArtShape {
  const a = (deg * Math.PI) / 180;
  const pts = ([[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]] as [number, number][]).map(([x, y]): [number, number] => [Math.round((cx + x * Math.cos(a) - y * Math.sin(a)) * 100) / 100, Math.round((cy + x * Math.sin(a) + y * Math.cos(a)) * 100) / 100]);
  return poly(pts, r, fill);
}

const starPoints = (cx: number, cy: number, outer: number, inner: number, n: number): [number, number][] => {
  const pts: [number, number][] = [];
  for (let i = 0; i < n * 2; i++) pts.push(on(cx, cy, i % 2 === 0 ? outer : inner, (360 / (n * 2)) * i));
  return pts;
};

const heart = (dx: number, dy: number, fill: string): ArtShape => path(`M${50 + dx} ${86 + dy}C${14 + dx} ${62 + dy} ${12 + dx} ${30 + dy} ${32 + dx} ${24 + dy}C${42 + dx} ${21 + dy} ${49 + dx} ${27 + dy} ${50 + dx} ${34 + dy}C${51 + dx} ${27 + dy} ${58 + dx} ${21 + dy} ${68 + dx} ${24 + dy}C${88 + dx} ${30 + dy} ${86 + dx} ${62 + dy} ${50 + dx} ${86 + dy}Z`, fill);

export const CHAT_ART: Readonly<Record<string, readonly ArtShape[]>> = {
  // ── reactions ──────────────────────────────────────────────────────────────────────────────────
  /** A thumb up on a fist, with a blue cuff. */
  like: [
    rect(35, 49, 52, 40, 12, SKIN[2]),
    rect(39, 17, 18, 44, 9, SKIN[2]),
    rect(32, 46, 52, 40, 12, SKIN[1]),
    rect(36, 14, 18, 44, 9, SKIN[1]),
    pill(62, 56, 16, 5, SKIN[2]),
    pill(62, 67, 16, 5, SKIN[2]),
    rect(12, 48, 18, 42, 6, SEA[1]),
  ],
  /** A heart. */
  love: [heart(3, 3, RED[2]), heart(0, 0, RED[1]), pill(24, 33, 7, 15, RED[0])],
  /** Laughing: shut eyes, a wide open mouth, tears. */
  haha: [
    ...head(50, 50, 38),
    line("M25 44Q32 34 40 44", INK, 5),
    line("M60 44Q68 34 75 44", INK, 5),
    path("M27 57H73Q71 82 50 82Q29 82 27 57Z", INK),
    path("M37 78Q50 66 63 78Q57 84 50 84Q43 84 37 78Z", RED[1]),
    circle(14, 60, 5, SEA[1]),
    circle(86, 60, 5, SEA[1]),
  ],
  /** Surprised: high brows, tall eyes, a round mouth. */
  wow: [
    ...head(50, 50, 38),
    line("M27 30Q35 23 43 28", INK, 4.5),
    line("M57 28Q65 23 73 30", INK, 4.5),
    pill(30, 37, 9, 18, INK),
    pill(61, 37, 9, 18, INK),
    circle(50, 69, 10, INK),
    circle(50, 73, 5.5, RED[1]),
  ],
  /** Thinking: one brow up, a sideways mouth, a thought rising. */
  think: [
    ...head(44, 58, 34),
    line("M26 42H40", INK, 4.5),
    line("M52 38Q60 33 68 39", INK, 4.5),
    circle(34, 54, 5, INK),
    circle(60, 54, 5, INK),
    line("M33 72Q44 67 58 73", INK, 5),
    circle(84, 22, 6, ANCHOVY[2]),
    circle(91, 9, 4, ANCHOVY[2]),
  ],
  /** Two hands clapping, with three marks over them. */
  clap: [
    turned(63, 62, 28, 50, 20, 11, SKIN[2]),
    turned(37, 62, 28, 50, -20, 11, SKIN[1]),
    turned(29, 44, 3.5, 16, -20, 1.75, SKIN[2]),
    turned(37, 42, 3.5, 18, -20, 1.75, SKIN[2]),
    turned(45, 44, 3.5, 16, -20, 1.75, SKIN[2]),
    line("M50 6V18", BEE[1], 5),
    line("M26 13L33 23", BEE[1], 5),
    line("M74 13L67 23", BEE[1], 5),
  ],

  // ── stickers ───────────────────────────────────────────────────────────────────────────────────
  /** A mind blown: a burst coming out of the top of a wide-eyed head. */
  "mind-blown": [
    poly(starPoints(50, 32, 30, 15, 8), 4, FOX[1]),
    poly(starPoints(50, 32, 17, 9, 8), 3, BEE[0]),
    ...head(50, 64, 30),
    circle(39, 60, 8, SNOW),
    circle(61, 60, 8, SNOW),
    circle(40, 61, 4, EEL[1]),
    circle(60, 61, 4, EEL[1]),
    circle(50, 79, 6, INK),
  ],
  /** A party popper with its cone and confetti. */
  party: [
    poly([[19, 88], [38, 36], [68, 66]], 5, FOX[2]),
    poly([[16, 85], [35, 33], [65, 63]], 5, FOX[1]),
    line("M26 64L47 70", BEE[1], 5),
    line("M31 50L53 57", BEE[1], 5),
    circle(70, 28, 6, RED[1]),
    rect(52, 12, 14, 7, 3.5, SEA[1]),
    circle(86, 50, 5, LEAF[1]),
    line("M70 78Q78 70 86 78", PLUM[1], 5),
    circle(84, 20, 3.5, BEE[1]),
  ],
  atom: OBJECT_ART.atom,
  banana: OBJECT_ART.banana,
  radiation: OBJECT_ART.radiation,
  /** Asleep: shut eyes, a small mouth and two Zs. */
  sleepy: [
    ...head(44, 62, 32),
    line("M27 58Q33 65 40 58", INK, 5),
    line("M50 58Q56 65 63 58", INK, 5),
    circle(45, 77, 4.5, INK),
    line("M66 28H80L66 44H80", SEA[2], 5.5),
    line("M80 8H90L80 19H90", SEA[2], 4.5),
  ],
  /** A bookish face with round glasses and a smile. */
  nerd: [
    ...head(50, 54, 36),
    line(ring(36, 52, 10), EEL[1], 4.5),
    line(ring(64, 52, 10), EEL[1], 4.5),
    line("M46 52H54", EEL[1], 4.5),
    circle(37, 54, 3.2, EEL[1]),
    circle(63, 54, 3.2, EEL[1]),
    line("M38 71Q50 80 62 71", INK, 4.5),
    rect(46, 73, 8, 7, 2, SNOW),
  ],
  /** A cheering star with a happy face. */
  star: [
    poly(starPoints(54, 58, 40, 20, 5), 7, BEE[2]),
    poly(starPoints(50, 54, 40, 20, 5), 7, BEE[1]),
    pill(32, 30, 6, 14, BEE[0]),
    circle(42, 56, 3.6, INK),
    circle(58, 56, 3.6, INK),
    line("M44 66Q50 72 56 66", INK, 4),
  ],
};

export const CHAT_ART_NAMES: Readonly<Record<string, string>> = {
  like: "Like",
  love: "Love",
  haha: "Haha",
  wow: "Wow",
  think: "Hmm",
  clap: "Clap",
  "mind-blown": "Mind blown",
  party: "Party",
  atom: "Atom",
  banana: "Banana",
  radiation: "Radiation",
  sleepy: "Sleepy",
  nerd: "Nerd",
  star: "Star",
};

export const chatArt = (id: string): readonly ArtShape[] | null => CHAT_ART[id] ?? null;
export const chatArtName = (id: string): string => CHAT_ART_NAMES[id] ?? id;
