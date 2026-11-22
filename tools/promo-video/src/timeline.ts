/**
 * Single source of truth for AtomIQ's 30-second 16:9 Duolingo-style launch promo.
 * Node-safe: zero React, Remotion, or CSS imports so audio/copy/QA scripts read it directly.
 */

export const FPS = 60;
export const WIDTH = 1920;
export const HEIGHT = 1080;
export const DURATION_FRAMES = 1800; // 30.0s @ 60fps
export const BPM = 124;

export const SAFE = {
  x: 96,
  y: 72,
} as const;

export const SCENES = {
  hook: { id: 'hook', label: 'Hook', from: 0, to: 210, theme: 'gold' },
  lessons: { id: 'lessons', label: 'Visual Lessons', from: 210, to: 510, theme: 'blue' },
  maze: { id: 'maze', label: 'Atom Maze', from: 510, to: 810, theme: 'green' },
  myth: { id: 'myth', label: 'MythBuster', from: 810, to: 1050, theme: 'coral' },
  phone: { id: 'phone', label: 'Science Phone', from: 1050, to: 1290, theme: 'purple' },
  shop: { id: 'shop', label: 'Quests & Shop', from: 1290, to: 1530, theme: 'teal' },
  endcard: { id: 'endcard', label: 'End Card', from: 1530, to: 1800, theme: 'gold' },
} as const;

export type SceneKey = keyof typeof SCENES;

export const CUES = {
  // Beat 1 — Hook (0–210)
  hookIconLand: 6,
  hookLine2: 72,
  hookSparkle: 75,

  // Beat 2 — Visual Lessons (210–510)
  lessonsIn: 210,
  lessonsTapStart: 276,
  lessonsCutToHal: 288,
  lessonsTapWater: 390,
  lessonsCorrect: 393,

  // Beat 3 — Atom Maze (510–810)
  mazeIn: 510,
  mazeJump: 546,
  mazeBattleStart: 582,
  mazeTapAnswer: 660,
  mazeCoins: 684,

  // Beat 4 — MythBuster (810–1050)
  mythIn: 810,
  mythTapMyth: 912,
  mythCorrect: 915,

  // Beat 5 — Science Phone (1050–1290)
  phoneIn: 1050,
  phoneNotif: 1152,
  phoneGeiger: 1188,

  // Beat 6 — Quests & Avatar Shop (1290–1530)
  shopIn: 1290,
  shopChestOpen: 1308,
  shopRise: 1344,
  shopSwapGlasses: 1404,
  shopCoinLand: 1446,

  // Beat 7 — Offline Payoff & End Card (1530–1800)
  stamp1: 1530,
  stamp2: 1563,
  stamp3: 1596,
  endHeroIn: 1638,
  endSparkle: 1668,
} as const;

export interface CopyEntry {
  id: string;
  scene: SceneKey;
  from: number;
  to: number;
  text: string;
  role: 'headline' | 'subline' | 'stamp' | 'cta';
}

export const COPY: readonly CopyEntry[] = [
  { id: 'hook-1', scene: 'hook', from: 0, to: 210, text: 'Nuclear science', role: 'headline' },
  { id: 'hook-2', scene: 'hook', from: 72, to: 210, text: 'that actually makes sense.', role: 'headline' },

  { id: 'lessons-h', scene: 'lessons', from: 214, to: 510, text: '5-minute visual lessons.', role: 'headline' },
  { id: 'lessons-s', scene: 'lessons', from: 228, to: 510, text: 'Guided by your teachers.', role: 'subline' },

  { id: 'maze-h', scene: 'maze', from: 514, to: 810, text: 'Play between questions.', role: 'headline' },
  { id: 'maze-s', scene: 'maze', from: 528, to: 810, text: 'Run, jump & battle in Atom Maze.', role: 'subline' },

  { id: 'myth-h', scene: 'myth', from: 814, to: 1050, text: 'Bust nuclear myths.', role: 'headline' },
  { id: 'myth-s', scene: 'myth', from: 828, to: 1050, text: 'Calm, sourced facts.', role: 'subline' },

  { id: 'phone-h', scene: 'phone', from: 1054, to: 1290, text: 'Your own science phone.', role: 'headline' },
  { id: 'phone-s', scene: 'phone', from: 1068, to: 1290, text: 'Chat, scan & explore.', role: 'subline' },

  { id: 'shop-h1', scene: 'shop', from: 1294, to: 1530, text: 'Earn diamonds.', role: 'headline' },
  { id: 'shop-h2', scene: 'shop', from: 1308, to: 1530, text: 'Style your look.', role: 'headline' },
  { id: 'shop-s', scene: 'shop', from: 1322, to: 1530, text: 'Daily quests & avatar shop.', role: 'subline' },

  { id: 'stamp-1', scene: 'endcard', from: 1530, to: 1563, text: 'No account.', role: 'stamp' },
  { id: 'stamp-2', scene: 'endcard', from: 1563, to: 1596, text: 'No ads.', role: 'stamp' },
  { id: 'stamp-3', scene: 'endcard', from: 1596, to: 1638, text: '100% offline.', role: 'stamp' },
  { id: 'end-tag', scene: 'endcard', from: 1646, to: 1800, text: 'Make the atom make sense.', role: 'subline' },
  { id: 'end-cta', scene: 'endcard', from: 1656, to: 1800, text: 'Available on Google Play', role: 'cta' },
];

export interface SfxCue {
  frame: number;
  file: string; // relative to public/sfx/
  gainDb?: number;
  rate?: number; // pitch multiplier
}

export const SFX_CUES: readonly SfxCue[] = [
  // Beat 1 — Hook
  { frame: CUES.hookIconLand, file: 'reward/pop.wav', gainDb: 0 },
  { frame: CUES.hookSparkle, file: 'reward/sparkle.wav', gainDb: -1 },

  // Beat 2 — Visual Lessons
  { frame: CUES.lessonsIn, file: 'lesson/whoosh.wav', gainDb: -2 },
  { frame: CUES.lessonsTapStart, file: 'lesson/node-zoom.wav', gainDb: 0 },
  { frame: CUES.lessonsTapWater, file: 'lesson/pick.wav', gainDb: 0 },
  { frame: CUES.lessonsCorrect, file: 'lesson/answer-correct.wav', gainDb: 1 },

  // Beat 3 — Atom Maze
  { frame: CUES.mazeIn, file: 'lesson/whoosh.wav', gainDb: -2 },
  { frame: CUES.mazeJump, file: 'game/platformer-jump.wav', gainDb: 0 },
  { frame: CUES.mazeBattleStart, file: 'game/platformer-battle.wav', gainDb: 0 },
  { frame: CUES.mazeTapAnswer, file: 'lesson/answer-correct.wav', gainDb: 1 },
  { frame: CUES.mazeCoins, file: 'game/platformer-coin.wav', gainDb: 0 },

  // Beat 4 — MythBuster
  { frame: CUES.mythIn, file: 'ui/page-next.wav', gainDb: -1 },
  { frame: CUES.mythTapMyth, file: 'ui/select.wav', gainDb: 0 },
  { frame: CUES.mythCorrect, file: 'lesson/answer-correct.wav', gainDb: 1 },

  // Beat 5 — Science Phone
  { frame: CUES.phoneIn, file: 'phone/app-open.wav', gainDb: 0 },
  { frame: CUES.phoneNotif, file: 'social/notification.wav', gainDb: 1 },
  { frame: CUES.phoneGeiger, file: 'ui/geiger.wav', gainDb: -1 },

  // Beat 6 — Quests & Shop
  { frame: CUES.shopChestOpen, file: 'reward/chest-open.wav', gainDb: 1 },
  { frame: CUES.shopRise, file: 'ui/shop-open.wav', gainDb: -1 },
  { frame: CUES.shopSwapGlasses, file: 'ui/try-on.wav', gainDb: 1 },
  { frame: CUES.shopCoinLand, file: 'reward/coin-land.wav', gainDb: 0 },

  // Beat 7 — Offline Payoff & End Card
  { frame: CUES.stamp1, file: 'ui/tick.wav', gainDb: 1, rate: 1.0 },
  { frame: CUES.stamp2, file: 'ui/tick.wav', gainDb: 1.5, rate: 1.12 },
  { frame: CUES.stamp3, file: 'ui/tick.wav', gainDb: 2, rate: 1.26 },
  { frame: CUES.endHeroIn, file: 'reward/finish-jingle.wav', gainDb: 1 },
  { frame: CUES.endSparkle, file: 'reward/sparkle.wav', gainDb: -1 },
];

/** 14 keyframe review samples (2 per beat) for contact-sheet QA. */
export const REVIEW_FRAMES: readonly { frame: number; label: string }[] = [
  { frame: 48, label: '01a Hook Icon' },
  { frame: 135, label: '01b Hook Shrodi' },
  { frame: 255, label: '02a Lesson Map' },
  { frame: 445, label: '02b Hal Excellent' },
  { frame: 560, label: '03a Maze Hop' },
  { frame: 720, label: '03b Direct Hit' },
  { frame: 865, label: '04a Myth Card' },
  { frame: 980, label: '04b Myth Busted' },
  { frame: 1110, label: '05a Phone Apps' },
  { frame: 1235, label: '05b Ada + Geiger' },
  { frame: 1370, label: '06a Chest + Shop' },
  { frame: 1475, label: '06b Star Glasses' },
  { frame: 1612, label: '07a 100% Offline' },
  { frame: 1740, label: '07b End Card' },
];
