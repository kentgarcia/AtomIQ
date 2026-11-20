/**
 * The SFX cue catalog and its scheduling rules (docs/features/SFX_SPEC.md §5 and §7).
 *
 * Framework-free and unit-tested (`npm run test:sfx`): no expo-audio, no React. A cue is a
 * meaning ("lesson.answer-correct"); a file is a detail. Screens call `playSfx(cue)` in
 * `services/sfx.ts`, which asks this module whether the cue may play and how.
 */
import type { SfxCategory } from "./media-core.ts";

export type { SfxCategory } from "./media-core.ts";

export type SfxGroup = "ui" | "lesson" | "reward" | "social" | "game" | "phone";

/** Every bundled file: its length in ms (checked against the WAV header by `check:sfx`). */
export const SFX_FILES = {
  "ui/press": 53,
  "ui/release": 64,
  "ui/tab": 142,
  "ui/select": 144,
  "ui/cancel": 312,
  "ui/modal-open": 222,
  "ui/modal-close": 205,
  "ui/lock": 263,
  "ui/disable": 391,
  "ui/warning": 776,
  "ui/equip": 533,
  "ui/unequip": 15,
  "ui/tick": 46,
  "ui/shop-open": 3864,
  "lesson/answer-correct": 791,
  "lesson/answer-wrong": 353,
  "lesson/blip": 77,
  "lesson/zoom-in": 520,
  "lesson/zoom-out": 526,
  "lesson/node-zoom": 1075,
  "lesson/start": 956,
  "lesson/complete": 2381,
  "lesson/finish": 885,
  "lesson/unlock": 635,
  "lesson/whoosh": 144,
  "reward/pop": 382,
  "reward/coin": 712,
  "reward/fill": 485,
  "reward/level-up": 1374,
  "reward/finish-jingle": 3605,
  "reward/rank-up": 2500,
  "reward/achievement": 2115,
  "reward/requirements-met": 1764,
  "reward/chest-open": 2000,
  "reward/purchase": 932,
  "reward/sparkle": 761,
  "social/message-send": 338,
  "social/message-receive": 1051,
  "social/notification": 504,
  "social/new-friend": 750,
  "social/achievement-scroll": 648,
  "game/over": 2282,
  "game/count-1": 1799,
  "game/count-2": 1999,
  "game/count-3": 2003,
  "game/count-finish": 2501,
  "game/time-up": 1063,
  "game/explosion": 2411,
  "game/platformer-jump": 157,
  "game/platformer-coin": 188,
  "game/platformer-hurt": 180,
  "game/platformer-defeat": 582,
  "game/platformer-battle": 278,
  // Platformer: footsteps, jumps and landings by ground (docs/features/PLATFORMER_SPEC.md, "Sounds"), a lie-down thud, the checkpoint and fireworks
  "game/step-grass-left": 365,
  "game/step-grass-right": 346,
  "game/land-grass": 224,
  "game/step-snow-left": 483,
  "game/step-snow-right": 450,
  "game/land-snow": 222,
  "game/step-sand-left": 181,
  "game/step-sand-right": 185,
  "game/land-sand": 282,
  "game/step-stone-left": 66,
  "game/step-stone-right": 55,
  "game/land-stone": 125,
  "game/step-soil-left": 164,
  "game/step-soil-right": 147,
  "game/land-soil": 200,
  "game/fall-grass": 500,
  "game/fall-sand": 500,
  "game/fall-stone": 349,
  "game/fall-soil": 375,
  "game/jump": 406,
  "game/checkpoint": 2000,
  "game/fireworks-launch": 2200,
  "game/fireworks-burst": 2600,
  // docs/features/SFX_EXPANSION_SPEC.md: the second upload, chosen in the SFX lab
  "ui/page-next": 72,
  "ui/page-back": 69,
  "ui/panel-open": 219,
  "ui/panel-close": 73,
  "ui/invalid": 46,
  "ui/announce": 662,
  "ui/delete": 586,
  "ui/tab-right": 25,
  "ui/equip-confirm": 651,
  "ui/try-on": 24,
  "ui/tab-left": 34,
  "ui/swatch": 40,
  "ui/geiger": 38,
  "ui/go": 2003,
  "ui/wipe": 2557,
  "phone/start-1": 185,
  "phone/start-2": 180,
  "phone/start-3": 210,
  "phone/app-open": 98,
  "phone/app-close": 102,
  "phone/wallpaper": 946,
  "phone/typing": 20,
  "phone/send": 70,
  "phone/sticker": 533,
  "phone/end": 1500,
  "phone/archive": 321,
  "phone/note-new": 82,
  "phone/note-clip": 594,
  "phone/shutter": 204,
  "phone/photo-saved": 150,
  "phone/camera-option": 26,
  "phone/scan-lock": 67,
  "phone/scan-miss": 24,
  "phone/map-open": 365,
  "phone/map-close": 262,
  "phone/map-pin": 160,
  "phone/map-limit": 11,
  "phone/book": 121,
  "reward/coin-tick": 28,
  "reward/coin-land": 711,
  "reward/count-up": 471,
  "reward/stat-up": 770,
  "reward/stat-down": 332,
  "reward/podium": 533,
  "reward/item-tick": 26,
  "lesson/pick": 173,
  "lesson/drop": 209,
  "lesson/pair-ok": 185,
  "lesson/lock-in": 72,
  "game/get-ready": 624,
  "game/timer-tick": 226,
} as const;

export type SfxFile = keyof typeof SFX_FILES;

export interface CueDef {
  file: SfxFile;
  category: SfxCategory;
  /** Runtime volume, 0 to 1, on top of the baked file level (§7.4). */
  volume: number;
  /** Minimum ms between two plays of the same cue. */
  gap: number;
  /** How many overlapping copies of the file may play. */
  pool: number;
  /** Playback rate (pitch) when the caller gives none; 1 if left out. Lets one file serve two cues. */
  rate?: number;
}

const cue = (file: SfxFile, category: SfxCategory, volume: number, gap: number, pool = 1, rate?: number): CueDef => ({
  file,
  category,
  volume,
  gap,
  pool,
  ...(rate === undefined ? {} : { rate }),
});

/** The catalog (§5). Aliases (one file, two meanings) are ordinary rows with their own volume. */
export const CUES = {
  // UI
  "ui.press": cue("ui/press", "tap", 0.65, 60, 2),
  "ui.release": cue("ui/release", "tap", 0.5, 60),
  "ui.tab": cue("ui/tab", "tap", 0.7, 80),
  "ui.select": cue("ui/select", "feedback", 0.7, 50, 2),
  "ui.toggle-on": cue("ui/select", "feedback", 0.7, 80, 2),
  "ui.toggle-off": cue("ui/disable", "feedback", 0.6, 80),
  "ui.cancel": cue("ui/cancel", "panel", 0.7, 120),
  "ui.modal-open": cue("ui/modal-open", "panel", 0.6, 120),
  "ui.modal-close": cue("ui/modal-close", "panel", 0.5, 120),
  "ui.lock": cue("ui/lock", "feedback", 0.8, 100),
  "ui.disable": cue("ui/disable", "feedback", 0.6, 120),
  "ui.warning": cue("ui/warning", "panel", 0.7, 200),
  "ui.equip": cue("ui/equip", "feedback", 0.7, 80),
  "ui.unequip": cue("ui/unequip", "feedback", 0.5, 80),
  // The shop opens: a long, lush jingle (3.9 s, the last 0.7 s silent), so it is stopped when the learner leaves
  "ui.shop-open": cue("ui/shop-open", "panel", 0.8, 500),
  "ui.tick": cue("ui/tick", "reward", 0.4, 45, 3),
  // Lesson
  "lesson.answer-correct": cue("lesson/answer-correct", "feedback", 0.9, 150),
  "lesson.answer-wrong": cue("lesson/answer-wrong", "feedback", 0.8, 150),
  "lesson.blip": cue("lesson/blip", "voice", 0.35, 70, 3),
  // A speech bubble pops in: the same soft pop as the map's node bubble, a little lower so it is not the star's
  "lesson.bubble": cue("reward/pop", "voice", 0.5, 120, 1, 0.85),
  "lesson.zoom-in": cue("lesson/zoom-in", "feedback", 0.7, 150),
  "lesson.zoom-out": cue("lesson/zoom-out", "feedback", 0.6, 150),
  // A node's bubble zooms into its preview (the Home map and the Atom Maze level map): a swoosh that lasts as long as the zoom
  "lesson.node-zoom": cue("lesson/node-zoom", "feedback", 0.75, 300),
  "lesson.start": cue("lesson/start", "feedback", 0.8, 300),
  "lesson.complete": cue("lesson/complete", "stinger", 0.9, 500),
  "lesson.finish": cue("lesson/finish", "stinger", 0.85, 500),
  "lesson.unlock": cue("lesson/unlock", "feedback", 0.8, 300),
  "lesson.whoosh": cue("lesson/whoosh", "feedback", 0.6, 80, 2),
  "lesson.stamp": cue("ui/lock", "feedback", 0.6, 100),
  "lesson.star": cue("reward/pop", "feedback", 0.7, 80, 3),
  // Reward
  "reward.pop": cue("reward/pop", "feedback", 0.7, 80, 3),
  "reward.appear": cue("reward/pop", "reward", 0.7, 200, 1, 1.15),
  "reward.coin": cue("reward/coin", "reward", 0.8, 200),
  "reward.fill": cue("reward/fill", "reward", 0.6, 200),
  // A short jingle for a finished round: the lesson finish screen and the Myth Buster results
  "reward.finish-jingle": cue("reward/finish-jingle", "stinger", 0.85, 800),
  "reward.level-up": cue("reward/level-up", "stinger", 0.9, 800),
  "reward.rank-up": cue("reward/rank-up", "stinger", 0.9, 800),
  "reward.achievement": cue("reward/achievement", "stinger", 0.9, 800),
  "reward.requirements-met": cue("reward/requirements-met", "stinger", 0.85, 800),
  "reward.chest-ready": cue("reward/requirements-met", "stinger", 0.85, 800),
  "reward.chest-open": cue("reward/chest-open", "stinger", 0.8, 800),
  "reward.purchase": cue("reward/purchase", "reward", 0.85, 300),
  "reward.sparkle": cue("reward/sparkle", "voice", 0.5, 300),
  // Social
  "social.message-send": cue("social/message-send", "feedback", 0.6, 150),
  "social.message-receive": cue("social/message-receive", "feedback", 0.7, 300),
  "social.notification": cue("social/notification", "feedback", 0.6, 1000),
  "social.new-friend": cue("social/new-friend", "feedback", 0.8, 500),
  "social.achievement-scroll": cue("social/achievement-scroll", "feedback", 0.6, 300),
  // Game
  "game.over": cue("game/over", "stinger", 0.8, 800),
  "game.hit": cue("ui/lock", "feedback", 0.8, 100),
  // The countdown before an Endless round: 1, 2, 3 one second apart, then the finish. Each has a long ring-out that
  // runs into the next beat, so they are separate files and the gaps only stop a double fire
  "game.count-one": cue("game/count-1", "feedback", 0.8, 400),
  "game.count-two": cue("game/count-2", "feedback", 0.8, 400),
  "game.count-three": cue("game/count-3", "feedback", 0.85, 400),
  "game.count-finish": cue("game/count-finish", "stinger", 0.85, 400),
  // Endless: the clock reached 0
  "game.time-up": cue("game/time-up", "feedback", 0.8, 400),
  // The BOOM that ends a Myth Buster round (out of lives, or out of time after the time-up beat)
  "game.explosion": cue("game/explosion", "stinger", 0.85, 800),
  // Atom Maze platformer: hop, pick up a coin, get hurt, an enemy goes poof, and a battle starts (docs/features/SFX_SPEC.md)
  "game.platformer-jump": cue("game/platformer-jump", "feedback", 0.6, 90, 2),
  "game.platformer-coin": cue("game/platformer-coin", "reward", 0.7, 60, 3),
  "game.platformer-hurt": cue("game/platformer-hurt", "feedback", 0.8, 300),
  "game.platformer-defeat": cue("game/platformer-defeat", "feedback", 0.8, 300),
  "game.platformer-battle": cue("game/platformer-battle", "feedback", 0.8, 400),
  // Platformer feet and ground: a step is quiet and decorative ("voice"), left and right are two cues so they never cut each other off
  "game.step-grass-left": cue("game/step-grass-left", "voice", 0.3, 60),
  "game.step-grass-right": cue("game/step-grass-right", "voice", 0.3, 60),
  "game.step-snow-left": cue("game/step-snow-left", "voice", 0.3, 60),
  "game.step-snow-right": cue("game/step-snow-right", "voice", 0.3, 60),
  "game.step-sand-left": cue("game/step-sand-left", "voice", 0.3, 60),
  "game.step-sand-right": cue("game/step-sand-right", "voice", 0.3, 60),
  "game.step-stone-left": cue("game/step-stone-left", "voice", 0.3, 60),
  "game.step-stone-right": cue("game/step-stone-right", "voice", 0.3, 60),
  "game.step-soil-left": cue("game/step-soil-left", "voice", 0.3, 60),
  "game.step-soil-right": cue("game/step-soil-right", "voice", 0.3, 60),
  "game.land-grass": cue("game/land-grass", "feedback", 0.7, 90, 2),
  "game.land-snow": cue("game/land-snow", "feedback", 0.7, 90, 2),
  "game.land-sand": cue("game/land-sand", "feedback", 0.7, 90, 2),
  "game.land-stone": cue("game/land-stone", "feedback", 0.7, 90, 2),
  "game.land-soil": cue("game/land-soil", "feedback", 0.7, 90, 2),
  "game.fall-grass": cue("game/fall-grass", "feedback", 0.8, 300),
  "game.fall-sand": cue("game/fall-sand", "feedback", 0.8, 300),
  "game.fall-stone": cue("game/fall-stone", "feedback", 0.8, 300),
  "game.fall-soil": cue("game/fall-soil", "feedback", 0.8, 300),
  // The hero jumps: one Mario-style hop on every ground
  "game.jump": cue("game/jump", "feedback", 0.7, 90, 2),
  "game.checkpoint": cue("game/checkpoint", "reward", 0.8, 500),
  // Fireworks over the finished level: the launch whistle, then the burst
  "game.fireworks-launch": cue("game/fireworks-launch", "reward", 0.7, 500),
  "game.fireworks-burst": cue("game/fireworks-burst", "reward", 0.8, 500),
  // The second upload (docs/features/SFX_EXPANSION_SPEC.md §5): the Phone and its apps, the shop, counts and ranks, lesson pieces, small games moments
  "nav.page-next": cue("ui/page-next", "feedback", 0.6, 150, 1),
  "nav.page-back": cue("ui/page-back", "feedback", 0.55, 150, 1),
  "ui.panel-open": cue("ui/panel-open", "panel", 0.55, 120, 1),
  "ui.panel-close": cue("ui/panel-close", "panel", 0.55, 120, 1),
  "ui.invalid": cue("ui/invalid", "feedback", 0.6, 120, 1),
  "ui.announce": cue("ui/announce", "feedback", 0.7, 300, 1),
  "ui.delete": cue("ui/delete", "feedback", 0.7, 200, 1),
  "ui.tab-right": cue("ui/tab-right", "feedback", 0.6, 60, 2),
  "ui.tab-left": cue("ui/tab-left", "feedback", 0.6, 60, 2),
  // Equip is pressed on something already owned (Closet_In); trying it on keeps ui.equip
  "shop.equip-confirm": cue("ui/equip-confirm", "feedback", 0.7, 80, 1),
  // An item is tried on in the shop (taking it off again keeps ui.unequip)
  "shop.try": cue("ui/try-on", "feedback", 0.7, 80, 2),
  "shop.swatch": cue("ui/swatch", "feedback", 0.6, 60, 2),
  "lab.geiger": cue("ui/geiger", "feedback", 0.5, 30, 3),
  "onboard.go": cue("ui/go", "feedback", 0.75, 500, 1),
  "transition.wipe": cue("ui/wipe", "stinger", 0.6, 1000, 1),
  "phone.start-1": cue("phone/start-1", "reward", 0.7, 800, 1),
  "phone.start-2": cue("phone/start-2", "reward", 0.7, 100, 1),
  "phone.start-3": cue("phone/start-3", "reward", 0.7, 100, 1),
  "phone.app-open": cue("phone/app-open", "feedback", 0.6, 150, 1),
  "phone.app-close": cue("phone/app-close", "feedback", 0.55, 150, 1),
  "phone.wallpaper": cue("phone/wallpaper", "feedback", 0.6, 300, 1),
  "chat.typing": cue("phone/typing", "voice", 0.4, 120, 1),
  "chat.send": cue("phone/send", "feedback", 0.6, 150, 1),
  "chat.sticker": cue("phone/sticker", "feedback", 0.65, 150, 1),
  "chat.end": cue("phone/end", "feedback", 0.55, 500, 1),
  "chat.archive": cue("phone/archive", "feedback", 0.6, 300, 1),
  "notes.new": cue("phone/note-new", "feedback", 0.55, 200, 1),
  "notes.clip": cue("phone/note-clip", "feedback", 0.7, 200, 1),
  "camera.shutter": cue("phone/shutter", "feedback", 0.8, 400, 1),
  "camera.saved": cue("phone/photo-saved", "feedback", 0.6, 400, 1),
  "camera.option": cue("phone/camera-option", "feedback", 0.6, 80, 2),
  // One rising sweep (the count-up file) as the scanner ring starts to fill
  "scanner.scan": cue("reward/count-up", "feedback", 0.6, 500, 1),
  "scanner.lock": cue("phone/scan-lock", "feedback", 0.65, 300, 1),
  "scanner.miss": cue("phone/scan-miss", "feedback", 0.6, 300, 1),
  "map.open": cue("phone/map-open", "feedback", 0.6, 500, 1),
  "map.close": cue("phone/map-close", "feedback", 0.5, 500, 1),
  "map.pin": cue("phone/map-pin", "feedback", 0.65, 100, 1),
  "map.limit": cue("phone/map-limit", "feedback", 0.5, 200, 1),
  "library.book": cue("phone/book", "feedback", 0.55, 200, 1),
  "shop.coin-tick": cue("reward/coin-tick", "reward", 0.7, 45, 3),
  "shop.coin-land": cue("reward/coin-land", "reward", 0.7, 300, 1),
  "count.run": cue("reward/count-up", "reward", 0.55, 150, 1),
  "rank.up": cue("reward/stat-up", "reward", 0.7, 500, 1),
  "game.heart": cue("reward/stat-up", "reward", 0.7, 300, 1),
  "rank.down": cue("reward/stat-down", "feedback", 0.55, 500, 1),
  "rank.podium": cue("reward/podium", "reward", 0.65, 300, 2),
  "levelup.item": cue("reward/item-tick", "reward", 0.55, 40, 3),
  "lesson.pick": cue("lesson/pick", "feedback", 0.6, 60, 2),
  "lesson.drop": cue("lesson/drop", "feedback", 0.6, 60, 2),
  "lesson.pair-ok": cue("lesson/pair-ok", "feedback", 0.65, 100, 1),
  "lesson.lock-in": cue("lesson/lock-in", "feedback", 0.7, 200, 1),
  "game.get-ready": cue("game/get-ready", "feedback", 0.7, 500, 1),
  "game.timer-tick": cue("game/timer-tick", "feedback", 0.6, 500, 1),
  // Teachers' chat bubbles reuse the message-receive file, a third higher and shorter, so a letter of six bubbles is not long
  "chat.incoming": cue("social/message-receive", "feedback", 0.6, 200, 1, 1.5),
} as const satisfies Record<string, CueDef>;

export type SfxCue = keyof typeof CUES;

export const CUE_IDS = Object.keys(CUES) as SfxCue[];

export const fileGroup = (file: SfxFile): SfxGroup => file.split("/")[0] as SfxGroup;

/** Files of one group, for warming the players a route is about to need (§7.6). */
export const filesOfGroup = (group: SfxGroup): SfxFile[] =>
  (Object.keys(SFX_FILES) as SfxFile[]).filter((file) => fileGroup(file) === group);

/** Biggest pool any cue asks for on a file. */
export const poolSizeOf = (file: SfxFile): number =>
  Math.max(1, ...CUE_IDS.filter((id) => CUES[id].file === file).map((id) => CUES[id].pool));

/** What `pickSlot` needs to know of a player. */
export interface SlotState {
  fresh: boolean;
  rewound: boolean;
  /** Reserved by a play until this time (ms). */
  busyUntil: number;
}

/**
 * Which player of a file's pool the next play takes: a free one that is already at the start, any free one,
 * a new one while the pool may still grow, else the one that has been reserved the longest (that play is cut off).
 * A player reserved by a play that has not started yet is never given to a second play.
 */
export const pickSlot = (slots: readonly SlotState[], poolSize: number, now: number): number | "new" => {
  let free = -1;
  for (let i = 0; i < slots.length; i += 1) {
    if (now < slots[i].busyUntil) continue;
    if (slots[i].fresh || slots[i].rewound) return i;
    if (free < 0) free = i;
  }
  if (free >= 0) return free;
  if (slots.length < poolSize) return "new";
  let oldest = 0;
  for (let i = 1; i < slots.length; i += 1) if (slots[i].busyUntil < slots[oldest].busyUntil) oldest = i;
  return oldest;
};

/* ------------------------------------------------------------------ */
/* Pitch ladders (§7.5)                                                */
/* ------------------------------------------------------------------ */

const LADDER = [1, 1.12, 1.26, 1.4, 1.5] as const;

/** Playback rate for step `index` of a rising run (stars, coins, a decay chain). */
export const ladderRate = (index: number): number => {
  const i = Number.isFinite(index) ? Math.max(0, Math.floor(index)) : 0;
  return LADDER[Math.min(i, LADDER.length - 1)];
};

/** Reaction pitches on the Discover feed (§6.6). */
export const REACTION_RATE: Readonly<Record<string, number>> = { like: 1, love: 1.1, clap: 0.95, wow: 1.2 };

/** A little variety for the typed blips: `unit` is a random number in [0, 1). */
export const blipRate = (unit: number): number => 0.92 + Math.min(Math.max(unit, 0), 0.999) * 0.16;

/* ------------------------------------------------------------------ */
/* Scheduling: gap, burst cap, stingers, ducking (§7.3)                */
/* ------------------------------------------------------------------ */

export const BURST_WINDOW_MS = 100;
export const BURST_MAX = 6;

export interface PlayOptions {
  /** Multiplies the catalog volume. */
  volume?: number;
  /** Absolute playback rate; wins over `index`. */
  rate?: number;
  /** Step of a pitch ladder. */
  index?: number;
}

export interface PlayPlan {
  play: boolean;
  /** Why not, for tests and debugging. */
  reason?: "gap" | "burst" | "duck";
  volume: number;
  rate: number;
  /** A stinger is already playing and must be stopped first. */
  stopStinger: boolean;
}

export interface SfxScheduler {
  /** Decide whether `cueId` may start at `now`, and record it if so. */
  plan: (cueId: SfxCue, now: number, options?: PlayOptions) => PlayPlan;
  /** Forget everything (app backgrounded, tests). */
  reset: () => void;
}

const clamp01 = (n: number): number => Math.min(1, Math.max(0, n));

export const createSfxScheduler = (): SfxScheduler => {
  const lastAt = new Map<SfxCue, number>();
  let recent: number[] = [];
  let stingerUntil = 0;

  const plan = (cueId: SfxCue, now: number, options: PlayOptions = {}): PlayPlan => {
    const def = CUES[cueId];
    const volume = clamp01(def.volume * (options.volume ?? 1));
    const rate = options.rate ?? (options.index === undefined ? (def.rate ?? 1) : ladderRate(options.index));
    const skip = (reason: "gap" | "burst" | "duck"): PlayPlan => ({ play: false, reason, volume, rate, stopStinger: false });

    const last = lastAt.get(cueId);
    if (last !== undefined && now - last < def.gap) return skip("gap");

    // A stinger is the moment: the decorative cues go quiet while it plays.
    if (def.category === "voice" && now < stingerUntil) return skip("duck");

    // Too many starts at once: the quietest categories give way first.
    recent = recent.filter((t) => now - t < BURST_WINDOW_MS);
    if (recent.length >= BURST_MAX && (def.category === "voice" || def.category === "tap")) return skip("burst");

    lastAt.set(cueId, now);
    recent.push(now);

    let stopStinger = false;
    if (def.category === "stinger") {
      stopStinger = now < stingerUntil;
      stingerUntil = now + SFX_FILES[def.file];
    }
    return { play: true, volume, rate, stopStinger };
  };

  const reset = () => {
    lastAt.clear();
    recent = [];
    stingerUntil = 0;
  };

  return { plan, reset };
};

/** Every Nth visible character of a typing bubble blips (§6.3). */
export const BLIP_EVERY = 3;

export const shouldBlip = (visibleChars: number): boolean => visibleChars > 0 && visibleChars % BLIP_EVERY === 0;
