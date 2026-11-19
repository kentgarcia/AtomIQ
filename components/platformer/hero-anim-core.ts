/**
 * Which picture of Shrodi to show (docs/PLATFORMER_SPEC.md §1b). Framework-free and unit-tested
 * (`npm run test:platformer`). The pictures are ONE sprite sheet of 256 px frames baked by
 * `scripts/bake-shrodi-hero.mjs`; this module owns the table of clips (how many frames each has and
 * how fast it plays), and the bake script reads the same table, so the sheet and the game cannot
 * disagree on where a frame is.
 *
 * What plays follows the hero's state, most urgent first: hurt, in the air (rising, the top, falling),
 * just landed, walking (a frame for every part of a stride walked, so the feet match the ground),
 * and otherwise standing, where an idle loop runs, then a longer fidget, then the loop again.
 */

/** Frame size in px: the art is drawn on a 128 canvas and baked at twice that, so it stays sharp on a 3x phone and when a battle zooms in. */
export const SHEET = { frame: 256, cols: 8 } as const;

export type ClipName = "idle" | "fidget" | "walk" | "rise" | "apex" | "fall" | "land" | "hit" | "cheer" | "down";

export interface Clip {
  start: number;
  count: number;
  /** Frames per second when played by time (the walk is played by distance instead). */
  fps: number;
}

/** In sheet order: the bake script draws them in this order. */
const CLIP_TABLE: readonly (readonly [ClipName, number, number])[] = [
  ["idle", 24, 10],
  ["fidget", 20, 10],
  ["walk", 4, 0],
  ["rise", 1, 1],
  ["apex", 1, 1],
  ["fall", 1, 1],
  ["land", 2, 14],
  ["hit", 2, 8],
  ["cheer", 6, 12],
  // Out of hearts: lying on their back with crossed-out eyes, one still frame
  ["down", 1, 1],
];

export const CLIPS: Readonly<Record<ClipName, Clip>> = (() => {
  const out = {} as Record<ClipName, Clip>;
  let start = 0;
  for (const [name, count, fps] of CLIP_TABLE) {
    out[name] = { start, count, fps };
    start += count;
  }
  return out;
})();

export const CLIP_ORDER: readonly ClipName[] = CLIP_TABLE.map(([name]) => name);
export const TOTAL_FRAMES = CLIP_TABLE.reduce((n, [, count]) => n + count, 0);
export const SHEET_ROWS = Math.ceil(TOTAL_FRAMES / SHEET.cols);

/** Column and row of a frame in the sheet. */
export const cellOf = (index: number): { col: number; row: number } => ({ col: index % SHEET.cols, row: Math.floor(index / SHEET.cols) });

/** Tiles walked for one whole walking cycle (4 frames: step, pass, step with the other foot, pass). At 6 tiles a second that is 3.75 cycles a second. */
export const STRIDE = 1.6;
/** Seconds the landing squash lasts. */
export const LAND_TIME = 0.14;
/** Seconds the flinch lasts after a hit. */
export const HURT_TIME = 0.4;
/** Seconds of the idle loop played before the fidget, in loops. */
export const IDLE_LOOPS = 2;

const idleSeconds = CLIPS.idle.count / CLIPS.idle.fps;
const fidgetSeconds = CLIPS.fidget.count / CLIPS.fidget.fps;
export const IDLE_CYCLE = IDLE_LOOPS * idleSeconds + fidgetSeconds;

/** The frame of the standing animation after `seconds` of standing still: idle, idle, fidget, and round again. */
export const idleFrame = (seconds: number): number => {
  const t = ((seconds % IDLE_CYCLE) + IDLE_CYCLE) % IDLE_CYCLE;
  const loops = IDLE_LOOPS * idleSeconds;
  if (t < loops) return CLIPS.idle.start + (Math.floor(t * CLIPS.idle.fps) % CLIPS.idle.count);
  return CLIPS.fidget.start + Math.min(CLIPS.fidget.count - 1, Math.floor((t - loops) * CLIPS.fidget.fps));
};

export interface HeroAnimState {
  onGround: boolean;
  vx: number;
  vy: number;
  /** Tiles walked on the ground in total. */
  distance: number;
  /** Seconds standing still. */
  idleT: number;
  /** Seconds left of the landing squash. */
  landT: number;
  /** Seconds left of the flinch. */
  hurtT: number;
  /** World time, for the hit's flutter. */
  t: number;
}

/** Vertical speed (tiles/s) inside which the hero is "at the top" of a jump. */
export const APEX_SPEED = 2.5;

export const heroFrameIndex = (s: HeroAnimState): number => {
  if (s.hurtT > 0) return CLIPS.hit.start + (Math.floor(s.t * CLIPS.hit.fps) % CLIPS.hit.count);
  if (!s.onGround) {
    if (s.vy < -APEX_SPEED) return CLIPS.rise.start;
    if (s.vy > APEX_SPEED) return CLIPS.fall.start;
    return CLIPS.apex.start;
  }
  if (s.landT > 0 && Math.abs(s.vx) < 3) return CLIPS.land.start + (s.landT > LAND_TIME / 2 ? 0 : 1);
  if (Math.abs(s.vx) > 0.3) {
    const step = Math.floor((s.distance / STRIDE) * CLIPS.walk.count);
    return CLIPS.walk.start + (((step % CLIPS.walk.count) + CLIPS.walk.count) % CLIPS.walk.count);
  }
  return idleFrame(s.idleT);
};

/** For a picture that plays on its own (the battle and the result cards): a mode and the seconds since it began. */
export type ClipMode = "idle" | "cheer" | "hit";

export const modeFrame = (mode: ClipMode, seconds: number): number => {
  if (mode === "idle") return idleFrame(seconds);
  const clip = CLIPS[mode];
  return clip.start + (Math.floor(Math.max(0, seconds) * clip.fps) % clip.count);
};
