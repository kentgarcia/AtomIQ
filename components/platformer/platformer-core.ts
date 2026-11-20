/**
 * Atom Maze platformer: the world, its physics and its rules (docs/features/PLATFORMER_SPEC.md).
 *
 * Framework-free and unit-tested (`npm run test:platformer`): no React, no Reanimated, no images.
 * Everything is in TILES (one tile = 1 unit, y points down), so the same level plays the same on
 * every screen; the screen only multiplies by its tile size. `stepWorld` moves the hero and the
 * enemies by a fixed step and returns what happened ("events") so the screen can play sounds and
 * open the question battle; `resolveBattle` applies the result of a question.
 *
 * The world is mutated in place (it is stepped 60 times a second from a ref); everything else here
 * is pure. Erasable TypeScript only (no enums, no parameter properties, no path aliases).
 */

import { HURT_TIME, LAND_TIME } from "./hero-anim-core.ts";

/* ------------------------------------------------------------------ */
/* Tuning                                                              */
/* ------------------------------------------------------------------ */

export const STEP = 1 / 60;
export const GRAVITY = 36;
export const MAX_FALL = 18;
export const RUN_SPEED = 6;
export const GROUND_ACCEL = 52;
export const GROUND_FRICTION = 64;
export const AIR_ACCEL = 34;
export const AIR_FRICTION = 14;
/** Takes off at this speed: v² / 2g = 2.9 tiles of height while the button is held. */
export const JUMP_SPEED = 14.5;
/** Letting go while rising caps the climb speed here, so a tap is a hop of about 0.7 tiles. */
export const JUMP_CUT_SPEED = 7;
/** Coins a gem is worth, and how fast a conveyor belt carries the hero (tiles a second). */
export const GEM_VALUE = 5;
export const CONVEYOR_SPEED = 2.6;
export const COYOTE_TIME = 0.1;
export const JUMP_BUFFER = 0.12;
export const INVULNERABLE_TIME = 1.6;
export const MAX_HEARTS = 3;
const EPS = 1e-6;

export const PLAYER_SIZE = { w: 0.7, h: 1 } as const;

/* ------------------------------------------------------------------ */
/* Level format                                                        */
/* ------------------------------------------------------------------ */

/**
 * A level is rows of text, one character per tile:
 *   #  solid ground (grass on top, dirt below, drawn by neighbours)
 *   ~  water (a pit: drawn, not solid, costs a heart when the hero falls past the world)
 *   %  lava (a pit like water, drawn in orange)
 *   $  gem (worth five coins)                  Z  saw (spins where it is; touching it costs a heart)
 *   >  conveyor belt, solid, pushes the hero standing on it to the right        <  the same to the left
 *   _  bridge: a one-way plank drawn as logs   G  gem block (bump it from below: a gem)
 *   o  coin             ^  spikes             *  bush (decoration)
 *   P  hero start       F  goal door          C  checkpoint flag
 *   s  slime  l  ladybug  n  snail  m  mouse  (walk along their ground and turn at an edge or wall)
 *   b  bee (flies side to side)               B  boss (a big slime that guards the flag)
 *   -  one-way plank: stand on it from above, jump up through it from below
 *   ?  coin block (bump it from below: a coin)   !  heart block (bump it: a heart, or coins when full)
 *   =  brick (bump it from below: it breaks)     L  lock (opens with a key; solid until then)
 *   k  key                                       u  spring (bounces the hero about six tiles up)
 *   M  moving platform, three tiles wide, slides sideways (its left end is the letter)
 *   W  moving platform, three tiles wide, slides up and down
 *   1 to 9  a readable sign: its words are `signs[n - 1]`, shown while the hero stands near it. A sign is a picture of what it
 *           is about (`SignIcon`: the arrow buttons, a spring, a gem...), so an entry of `signs` is a string (the plain
 *           sign) or `{ text, icon }`
 *   .  empty
 * A walker, the hero start, a checkpoint or the flag is placed ON the ground: write it in the row above.
 * `scenery` is a second set of rows, the same size, of things that are only looked at (never solid):
 *   b bush   r rock   f fence   x broken fence   t torch   c cactus   m red mushroom   n brown mushroom
 *   g grass tuft   p purple tuft   < sign pointing left   > sign pointing right   e exit sign
 */
export interface LevelDef {
  id: string;
  title: string;
  rows: readonly string[];
  scenery?: readonly string[];
  signs?: readonly (string | SignDef)[];
}

/** What a readable sign shows in place of the signpost: a picture of the thing it talks about. */
export type SignIcon =
  | "sign" | "move" | "jump" | "coin" | "gem" | "enemy" | "boss" | "checkpoint" | "door" | "spring" | "plank" | "bridge"
  | "belt" | "saw" | "lava" | "water" | "key" | "lock" | "block" | "heart" | "brick" | "spikes" | "platform" | "lift"
  | "lesson" | "tip";
export interface SignDef {
  text: string;
  icon: SignIcon;
}

export type EnemyKind = "slime" | "ladybug" | "snail" | "mouse" | "bee" | "boss";

export interface EnemyKindDef {
  /** Hit box in tiles. The picture is drawn around it (see `sprites.ts`). */
  w: number;
  h: number;
  /** Tiles per second. */
  speed: number;
  /** Correct answers needed to beat it. */
  hp: number;
  /** 0 easy, 1 medium, 2 hard: which questions it asks. */
  tier: 0 | 1 | 2;
  flying: boolean;
  /** A boss stays within this many tiles of where it stands (0: walks its whole stretch of ground). */
  range: number;
  /** Drawn this many times its normal size. */
  scale: number;
  name: string;
}

export const ENEMY_KINDS: Readonly<Record<EnemyKind, EnemyKindDef>> = {
  slime: { w: 0.7, h: 0.5, speed: 1.1, hp: 1, tier: 0, flying: false, range: 0, scale: 1, name: "Radon Slime" },
  mouse: { w: 0.75, h: 0.45, speed: 1.9, hp: 1, tier: 0, flying: false, range: 0, scale: 1, name: "Neutron Mouse" },
  ladybug: { w: 0.7, h: 0.55, speed: 1.4, hp: 1, tier: 1, flying: false, range: 0, scale: 1, name: "Gamma Bug" },
  snail: { w: 0.75, h: 0.6, speed: 0.7, hp: 2, tier: 1, flying: false, range: 0, scale: 1, name: "Isotope Snail" },
  bee: { w: 0.6, h: 0.5, speed: 1.6, hp: 2, tier: 1, flying: true, range: 2.5, scale: 1, name: "Fission Bee" },
  boss: { w: 1.3, h: 0.95, speed: 1.2, hp: 3, tier: 2, flying: false, range: 2.5, scale: 1.8, name: "Reactor Slime" },
};

const ENEMY_CHARS: Readonly<Record<string, EnemyKind>> = {
  s: "slime",
  l: "ladybug",
  n: "snail",
  m: "mouse",
  b: "bee",
  B: "boss",
};

export interface Point {
  x: number;
  y: number;
}

export interface EnemySpawn {
  kind: EnemyKind;
  /** Left edge and top of the hit box, in tiles. */
  x: number;
  y: number;
}

export interface DecorTile {
  c: number;
  r: number;
  kind: "bush" | "sign" | "flag" | "checkpoint";
}

export type BlockKind = "coin" | "heart" | "brick" | "lock" | "gem";
export interface BlockTile {
  c: number;
  r: number;
  kind: BlockKind;
}
export interface SpringTile {
  c: number;
  r: number;
}
/** A platform that slides: `x` and `y` are its left end and top edge, in tiles; it swings `range` tiles each way along `axis`, at most `speed` tiles a second. */
export interface PlatformDef {
  x: number;
  y: number;
  w: number;
  axis: "x" | "y";
  range: number;
  speed: number;
}
export interface SignTile {
  c: number;
  r: number;
  text: string;
  icon: SignIcon;
}
export type SceneryKind = "bush" | "rock" | "fence" | "fence_broken" | "torch" | "cactus" | "mushroom_red" | "mushroom_brown" | "grass" | "grass_purple" | "sign_left" | "sign_right" | "sign_exit";
export interface SceneryTile {
  c: number;
  r: number;
  kind: SceneryKind;
}

const SCENERY_CHARS: Readonly<Record<string, SceneryKind>> = {
  b: "bush",
  r: "rock",
  f: "fence",
  x: "fence_broken",
  t: "torch",
  c: "cactus",
  m: "mushroom_red",
  n: "mushroom_brown",
  g: "grass",
  p: "grass_purple",
  "<": "sign_left",
  ">": "sign_right",
  e: "sign_exit",
};

/** The platforms are this many tiles wide, swing this far at this speed. */
export const PLATFORM_W = 3;
export const PLATFORM_SWING = { x: { range: 3, speed: 2 }, y: { range: 2.5, speed: 1.6 } } as const;
/** The top of a platform sits this far below the top of its tile. */
const PLATFORM_DROP = 0.3;

export interface Level {
  id: string;
  title: string;
  cols: number;
  rows: number;
  /** Row-major: 1 where the tile is solid. */
  solid: Uint8Array;
  /** Row-major: 1 where a pit holds water, 2 where it holds lava. */
  water: Uint8Array;
  start: Point;
  goal: Point;
  /** Where the hero comes back after a fall, in order along the level. */
  checkpoints: Point[];
  coins: Point[];
  /** Gems: each is worth `GEM_VALUE` coins. */
  gems: Point[];
  spikes: Point[];
  /** Saws, by the tile they spin in. */
  saws: SpringTile[];
  enemies: EnemySpawn[];
  decor: DecorTile[];
  /** 1 where a one-way plank is (a bridge too). */
  oneway: Uint8Array;
  /** 1 where the one-way plank is drawn as a bridge of logs. */
  bridge: Uint8Array;
  /** Row-major: 1 where a conveyor belt pushes right, -1 where it pushes left (the tile is solid). */
  conveyor: Int8Array;
  blocks: BlockTile[];
  /** Row-major: the index into `blocks` plus one, or 0. */
  blockAt: Int16Array;
  keys: Point[];
  springs: SpringTile[];
  platforms: PlatformDef[];
  signs: SignTile[];
  scenery: SceneryTile[];
}

export const parseLevel = (def: LevelDef): Level => {
  const rows = def.rows.length;
  const cols = def.rows[0]?.length ?? 0;
  const solid = new Uint8Array(rows * cols);
  const water = new Uint8Array(rows * cols);
  const coins: Point[] = [];
  const gems: Point[] = [];
  const saws: SpringTile[] = [];
  const spikes: Point[] = [];
  const enemies: EnemySpawn[] = [];
  const decor: DecorTile[] = [];
  const checkpoints: Point[] = [];
  const oneway = new Uint8Array(rows * cols);
  const bridge = new Uint8Array(rows * cols);
  const conveyor = new Int8Array(rows * cols);
  const blocks: BlockTile[] = [];
  const blockAt = new Int16Array(rows * cols);
  const keys: Point[] = [];
  const springs: SpringTile[] = [];
  const platforms: PlatformDef[] = [];
  const signs: SignTile[] = [];
  const scenery: SceneryTile[] = [];
  let start: Point | null = null;
  let goal: Point | null = null;

  def.rows.forEach((line, r) => {
    if (line.length !== cols) throw new Error(`${def.id}: row ${r} is ${line.length} wide, expected ${cols}`);
    for (let c = 0; c < cols; c++) {
      const ch = line[c];
      const i = r * cols + c;
      if (ch === "#") solid[i] = 1;
      else if (ch === "~") water[i] = 1;
      else if (ch === "%") water[i] = 2;
      else if (ch === "$") gems.push({ x: c + 0.5, y: r + 0.5 });
      else if (ch === "Z") saws.push({ c, r });
      else if (ch === ">" || ch === "<") {
        solid[i] = 1;
        conveyor[i] = ch === ">" ? 1 : -1;
      } else if (ch === "_") {
        oneway[i] = 1;
        bridge[i] = 1;
      }
      else if (ch === "o") coins.push({ x: c + 0.5, y: r + 0.5 });
      else if (ch === "^") spikes.push({ x: c, y: r });
      else if (ch === "*") decor.push({ c, r, kind: "bush" });
      else if (ch === "-") oneway[i] = 1;
      else if (ch === "?" || ch === "!" || ch === "=" || ch === "L" || ch === "G") {
        const kind: BlockKind = ch === "?" ? "coin" : ch === "!" ? "heart" : ch === "=" ? "brick" : ch === "G" ? "gem" : "lock";
        solid[i] = 1;
        blocks.push({ c, r, kind });
        blockAt[i] = blocks.length;
      } else if (ch === "k") keys.push({ x: c + 0.5, y: r + 0.5 });
      else if (ch === "u") springs.push({ c, r });
      else if (ch === "M" || ch === "W") {
        const axis = ch === "M" ? "x" : "y";
        platforms.push({ x: c, y: r + PLATFORM_DROP, w: PLATFORM_W, axis, range: PLATFORM_SWING[axis].range, speed: PLATFORM_SWING[axis].speed });
      } else if (ch >= "1" && ch <= "9") {
        const entry = def.signs?.[Number(ch) - 1];
        const text = typeof entry === "string" ? entry : entry?.text;
        if (!text) throw new Error(`${def.id}: sign ${ch} at row ${r}, column ${c} has no text in \`signs\``);
        signs.push({ c, r, text, icon: typeof entry === "string" ? "sign" : entry!.icon });
      }
      else if (ch === "P") start = { x: c + 0.5, y: r + 1 };
      else if (ch === "F") {
        goal = { x: c + 0.5, y: r + 1 };
        decor.push({ c, r, kind: "flag" });
      } else if (ch === "C") {
        checkpoints.push({ x: c + 0.5, y: r + 1 });
        decor.push({ c, r, kind: "checkpoint" });
      } else if (ENEMY_CHARS[ch]) {
        const kind = ENEMY_CHARS[ch];
        const k = ENEMY_KINDS[kind];
        // A walker stands on the bottom of its tile; a bee hangs in the middle of it
        const y = k.flying ? r + 0.5 - k.h / 2 : r + 1 - k.h;
        enemies.push({ kind, x: c + 0.5 - k.w / 2, y });
      } else if (ch !== ".") {
        throw new Error(`${def.id}: unknown tile "${ch}" at row ${r}, column ${c}`);
      }
    }
  });

  if (def.scenery) {
    if (def.scenery.length !== rows) throw new Error(`${def.id}: scenery has ${def.scenery.length} rows, expected ${rows}`);
    def.scenery.forEach((line, r) => {
      if (line.length !== cols) throw new Error(`${def.id}: scenery row ${r} is ${line.length} wide, expected ${cols}`);
      for (let c = 0; c < cols; c++) {
        const ch = line[c];
        if (ch === ".") continue;
        const kind = SCENERY_CHARS[ch];
        if (!kind) throw new Error(`${def.id}: unknown scenery "${ch}" at row ${r}, column ${c}`);
        scenery.push({ c, r, kind });
      }
    });
  }

  if (!start) throw new Error(`${def.id}: no start (P)`);
  if (!goal) throw new Error(`${def.id}: no goal (F)`);
  checkpoints.sort((a, b) => a.x - b.x);
  return { id: def.id, title: def.title, cols, rows, solid, water, start, goal, checkpoints: [start, ...checkpoints], coins, gems, spikes, saws, enemies, decor, oneway, bridge, conveyor, blocks, blockAt, keys, springs, platforms, signs, scenery };
};

export const isSolid = (level: Level, c: number, r: number): boolean => {
  if (c < 0 || c >= level.cols) return true; // the level has invisible walls at both ends
  if (r < 0 || r >= level.rows) return false; // open above, and open below (that is the fall)
  return level.solid[r * level.cols + c] === 1;
};

/* ------------------------------------------------------------------ */
/* World                                                               */
/* ------------------------------------------------------------------ */

export type WorldStatus = "playing" | "battle" | "won" | "lost";

export interface Input {
  left: boolean;
  right: boolean;
  jump: boolean;
}

export interface Hero {
  /** Left edge and top of the hit box. */
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  onGround: boolean;
  /** 1 faces right, -1 faces left. */
  facing: 1 | -1;
  coyote: number;
  buffer: number;
  jumpHeld: boolean;
  /** A spring threw the hero up: letting go of jump must not cut the climb. */
  noCut: boolean;
  /** The moving platform the hero stands on, or null. */
  platform: number | null;
  /** Seconds of not being touched left. */
  invulnerable: number;
  /** The grace is after a hurt (a hit, a fall): the hero blinks while it runs. After a won fight the same grace runs without the blink, which would look like a hurt. */
  blink: boolean;
  /** For the pictures (hero-anim-core): tiles walked on the ground, seconds standing still, and the short flinch and landing timers. */
  distance: number;
  idleT: number;
  landT: number;
  hurtT: number;
}

export interface Enemy {
  id: number;
  kind: EnemyKind;
  x: number;
  y: number;
  w: number;
  h: number;
  dir: 1 | -1;
  hp: number;
  maxHp: number;
  alive: boolean;
  homeX: number;
  homeY: number;
  phase: number;
}

export interface Stats {
  coins: number;
  defeated: number;
  correct: number;
  wrong: number;
  falls: number;
  /** Seconds played while not in a battle. */
  time: number;
}

export interface World {
  level: Level;
  t: number;
  hero: Hero;
  enemies: Enemy[];
  /** One flag per coin of the level, true once picked up. */
  coinTaken: boolean[];
  /** The same for the gems. */
  gemTaken: boolean[];
  /** One flag per block of the level: a coin or heart block that has given, a brick that is broken, a lock that is open. */
  blockUsed: boolean[];
  keyTaken: boolean[];
  /** Keys held. */
  keys: number;
  /** Seconds left of each spring's extended pose. */
  springT: number[];
  /** Where each moving platform is now (left end, top) and how far it moved in the last step. */
  platforms: { x: number; y: number; dx: number; dy: number }[];
  /** The sign the hero stands near, or null. */
  activeSign: number | null;
  /** Seconds before the lock may tell the hero it needs a key again. */
  lockedT: number;
  hearts: number;
  checkpoint: number;
  status: WorldStatus;
  battleEnemy: number | null;
  /** The flag was touched while a boss still stood, and the learner has been told. */
  flagLockedTold: boolean;
  stats: Stats;
}

export type WorldEvent =
  | { type: "jump" }
  | { type: "land" }
  | { type: "coin"; index: number }
  | { type: "gem"; index: number }
  | { type: "block"; index: number; reward: "coin" | "heart" | "coins" | "break" | "gem" }
  | { type: "key"; index: number }
  | { type: "unlock"; index: number }
  | { type: "locked" }
  | { type: "spring"; index: number }
  | { type: "sign"; index: number | null }
  | { type: "hurt"; reason: "spikes" | "fall" | "battle" }
  | { type: "battle"; enemy: number }
  | { type: "defeat"; enemy: number }
  | { type: "checkpoint"; index: number }
  | { type: "goal" }
  | { type: "flag-locked" }
  | { type: "lost" };

const makeHero = (at: Point): Hero => ({
  x: at.x - PLAYER_SIZE.w / 2,
  y: at.y - PLAYER_SIZE.h,
  vx: 0,
  vy: 0,
  w: PLAYER_SIZE.w,
  h: PLAYER_SIZE.h,
  onGround: false,
  facing: 1,
  coyote: 0,
  buffer: 0,
  jumpHeld: false,
  noCut: false,
  platform: null,
  invulnerable: 0,
  blink: false,
  distance: 0,
  idleT: 0,
  landT: 0,
  hurtT: 0,
});

export const createWorld = (source: Level): World => {
  // The world gets its own copy of the solid tiles: a broken brick or an opened lock is cleared in it
  const level: Level = { ...source, solid: source.solid.slice() };
  return {
  level,
  t: 0,
  hero: makeHero(level.start),
  enemies: level.enemies.map((spawn, id) => {
    const k = ENEMY_KINDS[spawn.kind];
    return {
      id,
      kind: spawn.kind,
      x: spawn.x,
      y: spawn.y,
      w: k.w,
      h: k.h,
      dir: -1,
      hp: k.hp,
      maxHp: k.hp,
      alive: true,
      homeX: spawn.x,
      homeY: spawn.y,
      phase: id * 1.7,
    };
  }),
  coinTaken: level.coins.map(() => false),
  gemTaken: level.gems.map(() => false),
  blockUsed: level.blocks.map(() => false),
  keyTaken: level.keys.map(() => false),
  keys: 0,
  springT: level.springs.map(() => 0),
  platforms: level.platforms.map((p) => ({ x: p.x, y: p.y, dx: 0, dy: 0 })),
  activeSign: null,
  lockedT: 0,
  hearts: MAX_HEARTS,
  checkpoint: 0,
  status: "playing",
  battleEnemy: null,
  flagLockedTold: false,
  stats: { coins: 0, defeated: 0, correct: 0, wrong: 0, falls: 0, time: 0 },
  };
};

const overlaps = (ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number): boolean =>
  ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;

const approach = (value: number, target: number, amount: number): number =>
  value < target ? Math.min(value + amount, target) : Math.max(value - amount, target);

/* ------------------------------------------------------------------ */
/* Hurt, respawn                                                       */
/* ------------------------------------------------------------------ */

const loseHeart = (world: World, events: WorldEvent[], reason: "spikes" | "fall" | "battle"): boolean => {
  world.hearts = Math.max(0, world.hearts - 1);
  events.push({ type: "hurt", reason });
  if (world.hearts === 0) {
    world.status = "lost";
    events.push({ type: "lost" });
    return true;
  }
  return false;
};

const respawn = (world: World): void => {
  const at = world.level.checkpoints[world.checkpoint];
  world.hero = { ...makeHero(at), facing: world.hero.facing, invulnerable: INVULNERABLE_TIME, blink: true };
};

/** Push the hero away from a point and up, and give a moment of grace. */
const knockBack = (hero: Hero, fromX: number): void => {
  const away = hero.x + hero.w / 2 < fromX ? -1 : 1;
  hero.vx = away * 5;
  hero.vy = -8;
  hero.onGround = false;
  hero.invulnerable = INVULNERABLE_TIME;
  hero.blink = true;
  hero.hurtT = HURT_TIME;
};

/* ------------------------------------------------------------------ */
/* Hero movement                                                       */
/* ------------------------------------------------------------------ */

const moveHeroX = (level: Level, hero: Hero, dx: number): void => {
  hero.x += dx;
  const top = Math.floor(hero.y + EPS);
  const bottom = Math.floor(hero.y + hero.h - EPS);
  if (dx > 0) {
    const c = Math.floor(hero.x + hero.w - EPS);
    for (let r = top; r <= bottom; r++) {
      if (isSolid(level, c, r)) {
        hero.x = c - hero.w;
        hero.vx = 0;
        break;
      }
    }
  } else if (dx < 0) {
    const c = Math.floor(hero.x);
    for (let r = top; r <= bottom; r++) {
      if (isSolid(level, c, r)) {
        hero.x = c + 1;
        hero.vx = 0;
        break;
      }
    }
  }
};

/** A tile the hero's head hit from below this step (blocks react to it). */
interface Bump {
  c: number;
  r: number;
}

/** How far a spring throws the hero (v² / 2g = 6.1 tiles), and how long its extended pose lasts. */
export const SPRING_SPEED = 21;
const SPRING_POSE = 0.32;

const moveHeroY = (world: World, dy: number, bumps: Bump[]): void => {
  const { level, hero } = world;
  const prevBottom = hero.y + hero.h;
  hero.y += dy;
  hero.onGround = false;
  hero.platform = null;
  const left = Math.floor(hero.x + EPS);
  const right = Math.floor(hero.x + hero.w - EPS);
  if (dy > 0) {
    const r = Math.floor(hero.y + hero.h - EPS);
    for (let c = left; c <= right; c++) {
      // Solid ground, or a plank the hero came down onto from above (never one it is jumping up through)
      const plank = c >= 0 && c < level.cols && r >= 0 && r < level.rows && level.oneway[r * level.cols + c] === 1 && prevBottom <= r + 0.05;
      if (isSolid(level, c, r) || plank) {
        hero.y = r - hero.h;
        hero.vy = 0;
        hero.onGround = true;
        break;
      }
    }
    // A moving platform: landed on from above, with its horizontal reach
    if (!hero.onGround) {
      for (let i = 0; i < world.platforms.length; i++) {
        const p = world.platforms[i];
        const w = level.platforms[i].w;
        if (hero.x + hero.w - 0.1 > p.x && hero.x + 0.1 < p.x + w && prevBottom <= p.y + 0.15 && hero.y + hero.h >= p.y) {
          hero.y = p.y - hero.h;
          hero.vy = 0;
          hero.onGround = true;
          hero.platform = i;
          break;
        }
      }
    }
  } else if (dy < 0) {
    const r = Math.floor(hero.y);
    for (let c = left; c <= right; c++) {
      if (isSolid(level, c, r)) {
        hero.y = r + 1;
        hero.vy = 0;
        // The block the middle of the hero's head is under, if there is one; otherwise the nearest the head touched
        const mid = Math.floor(hero.x + hero.w / 2);
        bumps.push({ c: isSolid(level, mid, r) && mid >= left && mid <= right ? mid : c, r });
        break;
      }
    }
  }
};

/**
 * Where the hero would come to rest if they fell straight down from where they are now (their top, in
 * tiles), or null when there is nothing under them (a pit). Used when the run ends in the air, so the
 * hero can drop to the floor instead of hanging there. Leaves the world untouched.
 */
export const landingY = (world: World): number | null => {
  const ghost: World = { ...world, hero: { ...world.hero, vx: 0, vy: Math.max(0, world.hero.vy), onGround: false } };
  const limit = world.level.rows + 2;
  for (let i = 0; i < 600 && ghost.hero.y < limit; i++) {
    ghost.hero.vy = Math.min(MAX_FALL, ghost.hero.vy + GRAVITY * STEP);
    moveHeroY(ghost, ghost.hero.vy * STEP, []);
    if (ghost.hero.onGround) return ghost.hero.y;
  }
  return null;
};

const stepHero = (world: World, input: Input, dt: number, events: WorldEvent[], bumps: Bump[]): void => {
  const { hero, level } = world;
  const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  if (dir !== 0) hero.facing = dir > 0 ? 1 : -1;

  // Sideways: speed up toward the pressed direction, slow down when nothing is pressed
  const ground = hero.onGround;
  if (dir !== 0) hero.vx = approach(hero.vx, dir * RUN_SPEED, (ground ? GROUND_ACCEL : AIR_ACCEL) * dt);
  else hero.vx = approach(hero.vx, 0, (ground ? GROUND_FRICTION : AIR_FRICTION) * dt);

  // Jump: a press is remembered for a moment, and leaving a ledge still allows a jump for a moment
  if (input.jump && !hero.jumpHeld) hero.buffer = JUMP_BUFFER;
  else hero.buffer = Math.max(0, hero.buffer - dt);
  hero.jumpHeld = input.jump;
  hero.coyote = ground ? COYOTE_TIME : Math.max(0, hero.coyote - dt);
  if (hero.buffer > 0 && hero.coyote > 0) {
    hero.vy = -JUMP_SPEED;
    hero.buffer = 0;
    hero.coyote = 0;
    hero.onGround = false;
    events.push({ type: "jump" });
  }
  if (hero.noCut && (hero.vy >= 0 || hero.onGround)) hero.noCut = false;
  if (!input.jump && !hero.noCut && hero.vy < -JUMP_CUT_SPEED) hero.vy = -JUMP_CUT_SPEED;

  hero.vy = Math.min(MAX_FALL, hero.vy + GRAVITY * dt);
  const wasAir = !hero.onGround;
  const fell = hero.vy;
  moveHeroX(level, hero, hero.vx * dt);
  moveHeroY(world, hero.vy * dt, bumps);
  if (wasAir && hero.onGround && fell > 4) {
    events.push({ type: "land" });
    hero.landT = LAND_TIME;
  }
  hero.invulnerable = Math.max(0, hero.invulnerable - dt);
  if (hero.invulnerable === 0) hero.blink = false;
  hero.hurtT = Math.max(0, hero.hurtT - dt);
  hero.landT = Math.max(0, hero.landT - dt);
  if (hero.onGround) {
    hero.distance += Math.abs(hero.vx) * dt;
    hero.idleT = dir === 0 && Math.abs(hero.vx) < 0.3 ? hero.idleT + dt : 0;
  } else hero.idleT = 0;
};

/* ------------------------------------------------------------------ */
/* Enemies                                                             */
/* ------------------------------------------------------------------ */

const stepEnemy = (world: World, e: Enemy, dt: number): void => {
  const k = ENEMY_KINDS[e.kind];
  const level = world.level;
  if (k.flying) {
    e.x += e.dir * k.speed * dt;
    if (Math.abs(e.x - e.homeX) > k.range) {
      e.dir = e.x > e.homeX ? -1 : 1;
      e.x = e.homeX + Math.sign(e.x - e.homeX) * k.range;
    }
    e.y = e.homeY + Math.sin(world.t * 2.4 + e.phase) * 0.35;
    return;
  }
  e.x += e.dir * k.speed * dt;
  const front = e.dir > 0 ? e.x + e.w + 0.04 : e.x - 0.04;
  const c = Math.floor(front);
  const bodyRow = Math.floor(e.y + e.h / 2);
  const footRow = Math.floor(e.y + e.h + 0.05);
  const wall = isSolid(level, c, bodyRow);
  const edge = !isSolid(level, c, footRow);
  const leash = k.range > 0 && Math.abs(e.x + e.w / 2 - (e.homeX + e.w / 2)) > k.range;
  if (wall || edge || leash) {
    e.dir = e.dir > 0 ? -1 : 1;
    e.x += e.dir * k.speed * dt;
  }
};

/* ------------------------------------------------------------------ */
/* One step                                                            */
/* ------------------------------------------------------------------ */

/** Advance the world by `dt` seconds (use STEP). Does nothing unless the status is "playing". */
export const stepWorld = (world: World, input: Input, dt: number = STEP): WorldEvent[] => {
  const events: WorldEvent[] = [];
  if (world.status !== "playing") return events;
  world.t += dt;
  world.stats.time += dt;
  const { hero, level } = world;

  // The moving platforms go first, and carry the hero standing on one
  level.platforms.forEach((d, i) => {
    const p = world.platforms[i];
    const offset = d.range * Math.sin((world.t * d.speed) / d.range + i * 1.3);
    const x = d.axis === "x" ? d.x + offset : d.x;
    const y = d.axis === "y" ? d.y + offset : d.y;
    p.dx = x - p.x;
    p.dy = y - p.y;
    p.x = x;
    p.y = y;
    if (hero.platform === i && hero.onGround) {
      moveHeroX(level, hero, p.dx);
      hero.y += p.dy;
    }
  });

  // A conveyor belt carries the hero standing on it (a moving platform has its own way)
  if (hero.onGround && hero.platform === null) {
    const belt = level.conveyor[Math.floor(hero.y + hero.h + 0.05) * level.cols + Math.floor(hero.x + hero.w / 2)] ?? 0;
    if (belt !== 0) moveHeroX(level, hero, belt * CONVEYOR_SPEED * dt);
  }

  const bumps: Bump[] = [];
  stepHero(world, input, dt, events, bumps);
  for (const e of world.enemies) if (e.alive) stepEnemy(world, e, dt);

  // Blocks: a head bump gives a coin or a heart, or breaks a brick
  for (const b of bumps) {
    const index = level.blockAt[b.r * level.cols + b.c] - 1;
    if (index < 0 || world.blockUsed[index]) continue;
    const kind = level.blocks[index].kind;
    if (kind === "coin") {
      world.blockUsed[index] = true;
      world.stats.coins += 1;
      events.push({ type: "block", index, reward: "coin" });
    } else if (kind === "heart") {
      world.blockUsed[index] = true;
      if (world.hearts < MAX_HEARTS) {
        world.hearts += 1;
        events.push({ type: "block", index, reward: "heart" });
      } else {
        world.stats.coins += 3;
        events.push({ type: "block", index, reward: "coins" });
      }
    } else if (kind === "gem") {
      world.blockUsed[index] = true;
      world.stats.coins += GEM_VALUE;
      events.push({ type: "block", index, reward: "gem" });
    } else if (kind === "brick") {
      world.blockUsed[index] = true;
      level.solid[b.r * level.cols + b.c] = 0;
      events.push({ type: "block", index, reward: "break" });
    }
  }

  // Locks: a key opens the one the hero walks into
  world.lockedT = Math.max(0, world.lockedT - dt);
  level.blocks.forEach((b, index) => {
    if (b.kind !== "lock" || world.blockUsed[index]) return;
    if (!overlaps(hero.x - 0.12, hero.y, hero.w + 0.24, hero.h, b.c, b.r, 1, 1)) return;
    if (world.keys > 0) {
      world.keys -= 1;
      world.blockUsed[index] = true;
      level.solid[b.r * level.cols + b.c] = 0;
      events.push({ type: "unlock", index });
    } else if (world.lockedT === 0) {
      world.lockedT = 3;
      events.push({ type: "locked" });
    }
  });

  // Keys
  level.keys.forEach((key, index) => {
    if (world.keyTaken[index]) return;
    if (overlaps(hero.x, hero.y, hero.w, hero.h, key.x - 0.3, key.y - 0.3, 0.6, 0.6)) {
      world.keyTaken[index] = true;
      world.keys += 1;
      events.push({ type: "key", index });
    }
  });

  // Springs: landing on one (or walking onto it) throws the hero high
  level.springs.forEach((sp, index) => {
    world.springT[index] = Math.max(0, world.springT[index] - dt);
    const bottom = hero.y + hero.h;
    if (hero.vy >= 0 && bottom > sp.r + 0.35 && bottom <= sp.r + 1.05 && hero.x + hero.w - 0.1 > sp.c && hero.x + 0.1 < sp.c + 1) {
      hero.vy = -SPRING_SPEED;
      hero.onGround = false;
      hero.noCut = true;
      hero.coyote = 0;
      hero.buffer = 0;
      world.springT[index] = SPRING_POSE;
      events.push({ type: "spring", index });
    }
  });

  // Signs: the one the hero stands near (or none)
  let near: number | null = null;
  level.signs.forEach((sg, index) => {
    if (Math.abs(hero.x + hero.w / 2 - (sg.c + 0.5)) < 1.15 && hero.y + hero.h > sg.r - 1.5 && hero.y < sg.r + 1) near = index;
  });
  if (near !== world.activeSign) {
    world.activeSign = near;
    events.push({ type: "sign", index: near });
  }

  // Coins
  level.coins.forEach((coin, index) => {
    if (world.coinTaken[index]) return;
    if (overlaps(hero.x, hero.y, hero.w, hero.h, coin.x - 0.3, coin.y - 0.3, 0.6, 0.6)) {
      world.coinTaken[index] = true;
      world.stats.coins += 1;
      events.push({ type: "coin", index });
    }
  });

  // Gems
  level.gems.forEach((gem, index) => {
    if (world.gemTaken[index]) return;
    if (overlaps(hero.x, hero.y, hero.w, hero.h, gem.x - 0.32, gem.y - 0.32, 0.64, 0.64)) {
      world.gemTaken[index] = true;
      world.stats.coins += GEM_VALUE;
      events.push({ type: "gem", index });
    }
  });

  // Checkpoints: passing one makes it the place to come back to
  for (let i = world.checkpoint + 1; i < level.checkpoints.length; i++) {
    if (hero.x + hero.w / 2 >= level.checkpoints[i].x) {
      world.checkpoint = i;
      events.push({ type: "checkpoint", index: i });
    }
  }

  // Spikes and saws
  if (hero.invulnerable === 0) {
    for (const s of level.spikes) {
      if (overlaps(hero.x, hero.y, hero.w, hero.h, s.x + 0.12, s.y + 0.5, 0.76, 0.5)) {
        knockBack(hero, s.x + 0.5);
        loseHeart(world, events, "spikes");
        return events;
      }
    }
    for (const s of level.saws) {
      if (overlaps(hero.x, hero.y, hero.w, hero.h, s.c + 0.14, s.r + 0.14, 0.72, 0.72)) {
        knockBack(hero, s.c + 0.5);
        loseHeart(world, events, "spikes");
        return events;
      }
    }
  }

  // Falling out of the bottom of the world
  if (hero.y > level.rows + 1) {
    world.stats.falls += 1;
    if (!loseHeart(world, events, "fall")) respawn(world);
    return events;
  }

  // Touching an enemy opens a battle
  if (hero.invulnerable === 0) {
    for (const e of world.enemies) {
      if (!e.alive) continue;
      if (overlaps(hero.x + 0.05, hero.y + 0.05, hero.w - 0.1, hero.h - 0.1, e.x, e.y, e.w, e.h)) {
        world.status = "battle";
        world.battleEnemy = e.id;
        hero.vx = 0;
        events.push({ type: "battle", enemy: e.id });
        return events;
      }
    }
  }

  // The flag: a boss still standing keeps it shut
  if (Math.abs(hero.x + hero.w / 2 - level.goal.x) < 0.6 && hero.y + hero.h > level.goal.y - 2 && hero.y < level.goal.y) {
    if (world.enemies.some((e) => e.kind === "boss" && e.alive)) {
      if (!world.flagLockedTold) {
        world.flagLockedTold = true;
        events.push({ type: "flag-locked" });
      }
    } else {
      world.status = "won";
      events.push({ type: "goal" });
    }
  } else if (world.flagLockedTold && Math.abs(hero.x + hero.w / 2 - level.goal.x) > 3) {
    world.flagLockedTold = false;
  }
  return events;
};

/* ------------------------------------------------------------------ */
/* Battle                                                              */
/* ------------------------------------------------------------------ */

export interface BattleResult {
  events: WorldEvent[];
  /** The enemy has more life left: ask another question. */
  continues: boolean;
}

/**
 * Apply the answer to one question of the current battle. A right answer hits the enemy and the
 * battle goes on until it is beaten. A wrong answer costs a heart and ends the battle: the hero is
 * pushed away and the enemy keeps what life it has left, so it can be fought again.
 */
export const resolveBattle = (world: World, correct: boolean): BattleResult => {
  const events: WorldEvent[] = [];
  const enemy = world.battleEnemy === null ? null : world.enemies[world.battleEnemy];
  if (world.status !== "battle" || !enemy) return { events, continues: false };
  const hero = world.hero;

  if (correct) {
    world.stats.correct += 1;
    enemy.hp -= 1;
    if (enemy.hp > 0) return { events, continues: true };
    enemy.alive = false;
    world.stats.defeated += 1;
    events.push({ type: "defeat", enemy: enemy.id });
    hero.vy = -9;
    hero.onGround = false;
    hero.invulnerable = 0.8;
    hero.blink = false;
    world.status = "playing";
    world.battleEnemy = null;
    return { events, continues: false };
  }

  world.stats.wrong += 1;
  world.battleEnemy = null;
  world.status = "playing";
  knockBack(hero, enemy.x + enemy.w / 2);
  loseHeart(world, events, "battle");
  return { events, continues: false };
};

/* ------------------------------------------------------------------ */
/* Camera and score                                                    */
/* ------------------------------------------------------------------ */

/** Left edge of the view, in tiles: the hero sits a little left of centre and the view stays inside the level. */
export const cameraTarget = (heroCenterX: number, viewTiles: number, levelCols: number, facing: 1 | -1 = 1): number => {
  const lead = facing * viewTiles * 0.08;
  const raw = heroCenterX - viewTiles * 0.42 + lead;
  return Math.max(0, Math.min(raw, Math.max(0, levelCols - viewTiles)));
};

export interface Summary {
  score: number;
  /** The most the level can give (every coin, every enemy, all hearts, the flag). */
  maxScore: number;
  stars: number;
  won: boolean;
  /** Seconds played outside battles (the learner's thinking time is not counted). */
  time: number;
}

/** Points: a coin 10, an enemy 100, a heart left 50, and 200 for reaching the flag. */
export const POINTS = { coin: 10, enemy: 100, heart: 50, flag: 200 } as const;
/** Share of the level's best score for the second and third star (the first is for reaching the flag). */
export const STAR_SHARE = { two: 0.6, three: 0.85 } as const;

/** The best score a level can give: all its coins, gems and enemies, all hearts left and the flag. */
export const maxScoreOf = (level: Pick<Level, "coins" | "enemies"> & Partial<Pick<Level, "gems">>): number =>
  (level.coins.length + (level.gems?.length ?? 0) * GEM_VALUE) * POINTS.coin + level.enemies.length * POINTS.enemy + MAX_HEARTS * POINTS.heart + POINTS.flag;

/** 0 until the flag is reached, then 1 to 3 by how much of the best score was collected. */
export const starsFor = (score: number, maxScore: number, won: boolean): number => {
  if (!won) return 0;
  const share = maxScore > 0 ? score / maxScore : 1;
  return share >= STAR_SHARE.three ? 3 : share >= STAR_SHARE.two ? 2 : 1;
};

/** Points still missing for the next star (null at three, or without the flag). */
export const pointsToNextStar = (score: number, maxScore: number, stars: number): number | null => {
  if (stars < 1 || stars >= 3) return null;
  const share = stars === 1 ? STAR_SHARE.two : STAR_SHARE.three;
  return Math.max(1, Math.ceil(share * maxScore) - score);
};

/** Score (coins, enemies beaten and hearts left, plus the flag) and the stars it earns, with the time of the run. */
export const summarize = (world: World): Summary => {
  const won = world.status === "won";
  const score =
    world.stats.coins * POINTS.coin + world.stats.defeated * POINTS.enemy + (won ? POINTS.flag + world.hearts * POINTS.heart : 0);
  const maxScore = maxScoreOf(world.level);
  return { score, maxScore, stars: starsFor(score, maxScore, won), won, time: world.stats.time };
};
