/**
 * How the world is shown: which picture each ground tile uses, which tiles are on screen, and the
 * numbers the renderer reads every frame. Framework-free and unit-tested (`npm run test:platformer`).
 */

import { NO_FX, type FxPose } from "./battle-fx-core.ts";
import { heroFrameIndex } from "./hero-anim-core.ts";
import { ENEMY_KINDS, isSolid, type Level, type World } from "./platformer-core.ts";

/* ------------------------------------------------------------------ */
/* Ground pictures                                                     */
/* ------------------------------------------------------------------ */

/** The backdrop's biome picture sets (see `BIOMES` in sprites.ts) and the ground sets (`TERRAIN`). */
export type BiomeName = "hills" | "trees" | "desert" | "mushrooms";
export type TerrainTheme = "grass" | "sand" | "stone" | "purple" | "snow";
export type { SceneryKind } from "./platformer-core.ts";

export type TileArt =
  | "block"
  | "top"
  | "top_left"
  | "top_right"
  | "left"
  | "center"
  | "right"
  | "bottom_left"
  | "bottom"
  | "bottom_right"
  | "h_left"
  | "h_middle"
  | "h_right"
  | "water"
  | "water_top";

/**
 * The picture for a solid tile, chosen from its open sides: grass on a top edge, a dark edge on
 * an open side, a thin slab (grass on top, dirt cap below) when it has nothing above or below.
 */
export const groundArt = (level: Level, c: number, r: number): TileArt | null => {
  if (!isSolid(level, c, r) || c < 0 || c >= level.cols) return null;
  // A block (coin, heart, brick, lock), a belt or a lead block has its own picture
  if (r >= 0 && r < level.rows && (level.blockAt[r * level.cols + c] !== 0 || level.conveyor[r * level.cols + c] !== 0 || level.lead[r * level.cols + c] !== 0)) return null;
  // The level's own ends are walls that are not drawn, so a tile at the end is not an open side
  const left = c === 0 || isSolid(level, c - 1, r);
  const right = c === level.cols - 1 || isSolid(level, c + 1, r);
  const up = isSolid(level, c, r - 1);
  const down = isSolid(level, c, r + 1) || r >= level.rows - 1;
  if (!up) {
    if (!down) {
      if (!left && !right) return "block";
      return !left ? "h_left" : !right ? "h_right" : "h_middle";
    }
    if (!left && !right) return "top";
    return !left ? "top_left" : !right ? "top_right" : "top";
  }
  if (!down) return !left ? "bottom_left" : !right ? "bottom_right" : "bottom";
  return !left ? "left" : !right ? "right" : "center";
};

/** Water picture for a pit tile: the surface where nothing is above it. */
export const waterArt = (level: Level, c: number, r: number): TileArt | null => {
  const v = level.water[r * level.cols + c];
  if (v !== 1 && v !== 2) return null;
  const above = r > 0 && level.water[(r - 1) * level.cols + c] === v;
  return above ? "water" : "water_top";
};

/**
 * The picture for a tile BELOW the level's last row: the ground goes on as plain dirt to the bottom
 * of the screen (under a pit too, as its floor), keeping the dark edge on an open side.
 */
export const underArt = (level: Level, c: number): TileArt => {
  const r = level.rows - 1;
  if (!isSolid(level, c, r)) return "center";
  const left = c === 0 || isSolid(level, c - 1, r);
  const right = c === level.cols - 1 || isSolid(level, c + 1, r);
  return !left ? "left" : !right ? "right" : "center";
};

/* ------------------------------------------------------------------ */
/* Where the world sits on the screen                                  */
/* ------------------------------------------------------------------ */

export interface PlayLayout {
  tile: number;
  /** Top of the level's first row, in pixels from the top of the screen. */
  worldTop: number;
  /** Rows of dirt drawn under the level so the ground reaches the bottom of the screen. */
  underRows: number;
  viewTiles: number;
}

/**
 * The world fills the whole screen: `colsInView` tiles across, the level's last row `deck` pixels above the
 * bottom (the controls sit on the ground that goes on below it, fading to black), sky above. When the
 * screen is too short for that (landscape) the tiles shrink, to no less than `minTile`, and the level
 * is kept `top` pixels below the top edge for the buttons.
 */
export const playLayout = (width: number, height: number, rows: number, opts: { colsInView: number; deck: number; top: number; minTile: number }): PlayLayout => {
  const byWidth = Math.floor(width / opts.colsInView);
  const byHeight = Math.floor((height - opts.deck - opts.top) / rows);
  const tile = Math.max(opts.minTile, Math.min(byWidth, byHeight));
  const worldTop = Math.max(opts.top, Math.round(height - opts.deck - rows * tile));
  const underRows = Math.max(0, Math.ceil((height - (worldTop + rows * tile)) / tile) + 1);
  return { tile, worldTop, underRows, viewTiles: width / tile };
};

/* ------------------------------------------------------------------ */
/* What is on screen                                                   */
/* ------------------------------------------------------------------ */

/**
 * Where the backdrop's layers go, from the top: solid sky (the view's own colour), then `clouds`, then
 * the `biome` picture whose bottom edge sits on the ground line (so the hills show above the ground
 * tiles instead of being buried by them). The cloud picture ends in solid white and the biome picture
 * starts with it, so the biome is drawn over the clouds' last `CLOUD_OVERLAP` to keep the white band
 * between them short without covering a bump or a tall tree, then a solid `fill` from the ground line to the bottom of
 * the view. `size` is the side of the square pictures. `groundY` is the top of the level's ground.
 */
/** How much of the cloud picture's solid white bottom the biome covers (the bumps end about 86% down it). */
export const CLOUD_OVERLAP = 0.12;
export interface BackdropStack {
  size: number;
  cloudsTop: number;
  biomeTop: number;
  fillTop: number;
  /** Height of the solid fill, 0 when the ground line is at or below the view. */
  fillHeight: number;
}
export const backdropStack = (viewH: number, groundY: number, tile: number): BackdropStack => {
  const size = Math.round(Math.max(tile * 5.5, 200));
  const biomeTop = Math.round(groundY - size);
  return { size, cloudsTop: biomeTop - size + Math.round(size * CLOUD_OVERLAP), biomeTop, fillTop: Math.round(groundY), fillHeight: Math.max(0, Math.ceil(viewH - groundY)) };
};

export const CHUNK_COLS = 8;

/** Chunk numbers (of CHUNK_COLS columns) that touch the view, with one spare on each side so scrolling never shows a gap. */
export const visibleChunks = (camTiles: number, viewTiles: number, levelCols: number): { from: number; to: number } => {
  const last = Math.max(0, Math.ceil(levelCols / CHUNK_COLS) - 1);
  const from = Math.max(0, Math.floor(camTiles / CHUNK_COLS) - 1);
  const to = Math.min(last, Math.floor((camTiles + viewTiles) / CHUNK_COLS) + 1);
  return { from, to };
};

/* ------------------------------------------------------------------ */
/* Per-frame numbers                                                   */
/* ------------------------------------------------------------------ */

export const FRAME_HEAD = 10;
export const FRAME_PER_ENEMY = 7;
/** The hero is drawn this many tiles wide and tall (128 px of picture against 64 px tiles, scaled down to fit). */
export const HERO_DRAW = 1.5;

/** After the enemies: each moving platform writes its left and top (px), then each spring 1 when its extended pose shows. */
export const FRAME_PER_PLATFORM = 2;
export const platformSlot = (enemies: number, i: number): number => FRAME_HEAD + enemies * FRAME_PER_ENEMY + i * FRAME_PER_PLATFORM;
export const springSlot = (enemies: number, platforms: number, i: number): number => FRAME_HEAD + enemies * FRAME_PER_ENEMY + platforms * FRAME_PER_PLATFORM + i;
/** The last slot: the dose meter, 0 to 1 (a level with dose sources shows it over the hero). */
export const doseSlot = (enemies: number, platforms: number = 0, springs: number = 0): number => FRAME_HEAD + enemies * FRAME_PER_ENEMY + platforms * FRAME_PER_PLATFORM + springs;
export const frameLength = (enemies: number, platforms: number = 0, springs: number = 0): number => doseSlot(enemies, platforms, springs) + 1;

/**
 * Write what the renderer needs, in pixels, into `out` (see the indexes below), and return it:
 *   0 camera left   1 time in seconds
 *   2 hero left     3 hero top    4 hero frame in the sprite sheet (hero-anim-core)   5 flip (1 or -1)   6 hero opacity
 *   7 hero scale x   8 hero scale y (about the feet)   9 hero flash (0..1, red)
 *   then per enemy: left, top, step (0 or 1), flip (1 or -1), scale x, scale y, flash (0..1, white)
 *   then per moving platform: left, top (px); then per spring: 1 while its extended pose shows; then the dose meter (0 to 1)
 * In a battle `fx` (the pose to show and which enemy it is) makes the two face each other and moves, squashes and flashes them (battle-fx-core.ts).
 */
/** Enemies and platforms this many tiles beyond the view are not moved: nobody sees them, and every number that changes is a native view update. */
export const CULL_MARGIN_TILES = 4;
/** Where a culled thing waits: far outside the world, and constant, so nothing is sent for it. */
export const PARKED_PX = -100000;

export const fillFrame = (world: World, camPx: number, tile: number, out: number[], fx?: { pose: FxPose; enemy: number }, viewPx?: number): number[] => {
  const margin = CULL_MARGIN_TILES * tile;
  const unseen = (leftPx: number, widthPx: number): boolean => viewPx !== undefined && (leftPx + widthPx < camPx - margin || leftPx > camPx + viewPx + margin);
  const h = world.hero;
  const draw = Math.round(HERO_DRAW * tile);
  out[0] = camPx;
  out[1] = world.t;
  const pose = fx ? fx.pose : NO_FX;
  out[2] = (h.x + h.w / 2 + pose.hero.dx) * tile - draw / 2;
  out[3] = (h.y + h.h + pose.hero.dy) * tile - draw;
  out[4] = pose.heroFrame ?? heroFrameIndex({ onGround: h.onGround, vx: h.vx, vy: h.vy, distance: h.distance, idleT: h.idleT, landT: h.landT, hurtT: h.hurtT, t: world.t });
  // In a battle the hero faces the enemy
  const foe = fx ? world.enemies[fx.enemy] : undefined;
  out[5] = foe ? (foe.x + foe.w / 2 > h.x + h.w / 2 ? 1 : -1) : h.facing;
  out[7] = pose.hero.sx;
  out[8] = pose.hero.sy;
  out[9] = pose.hero.flash;
  // Blink while the moment of grace after a hurt lasts (not after a won fight)
  out[6] = h.invulnerable > 0 && h.blink && Math.floor(world.t * 14) % 2 === 0 ? 0.35 : 1;
  world.enemies.forEach((e, i) => {
    const k = ENEMY_KINDS[e.kind];
    const size = k.scale * tile;
    const at = FRAME_HEAD + i * FRAME_PER_ENEMY;
    const body = fx && fx.enemy === i ? fx.pose.enemy : NO_FX.enemy;
    const left = (e.x + e.w / 2 + body.dx) * tile - size / 2;
    if ((!fx || fx.enemy !== i) && unseen(left, size)) {
      out[at] = PARKED_PX;
      return;
    }
    out[at] = left;
    out[at + 1] = (k.flying ? (e.y + e.h / 2) * tile - size / 2 : (e.y + e.h) * tile - size) + body.dy * tile;
    out[at + 2] = Math.floor(world.t * 6 + i) % 2;
    // The pictures face left, so moving right flips them; in a battle the enemy faces the hero
    out[at + 3] = fx && fx.enemy === i ? (h.x + h.w / 2 > e.x + e.w / 2 ? -1 : 1) : e.dir > 0 ? -1 : 1;
    out[at + 4] = body.sx;
    out[at + 5] = body.sy;
    out[at + 6] = body.flash;
  });
  world.platforms.forEach((p, i) => {
    const at = platformSlot(world.enemies.length, i);
    const width = (world.level.platforms[i]?.w ?? 3) * tile;
    if (unseen(p.x * tile, width)) {
      out[at] = PARKED_PX;
      return;
    }
    out[at] = p.x * tile;
    out[at + 1] = p.y * tile;
  });
  world.springT.forEach((t, i) => {
    out[springSlot(world.enemies.length, world.platforms.length, i)] = t > 0 ? 1 : 0;
  });
  out[doseSlot(world.enemies.length, world.platforms.length, world.springT.length)] = world.dose;
  return out;
};
