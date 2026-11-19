/**
 * The boss introduction, as pure maths (no React), unit-tested (`npm run test:platformer`). When the
 * hero comes near the boss the world freezes and a short cinematic plays, like a video game's boss
 * reveal, then the view returns to the hero and play goes on. One clock, in ms, from the moment it
 * starts:
 *
 *   0..350      the letterbox bars slide in (the HUD and the controls leave)
 *   300..1200   the camera scrolls from the hero to the boss (ease in-out)
 *   950..1450   it zooms in on the boss
 *   1600..2360  the boss ROARS: crouches, leaps stretched, slams down squashed (the picture shakes and
 *               a burst of stars rings it), settles; its name is stamped on the bottom bar from 1700
 *   3300..4200  the zoom lets go and the camera scrolls back to the hero (zoom out by 3900)
 *   3900..4300  the bars leave; control returns at 4300
 *
 * It always plays through (no skip). `pan` is 0 at the hero's camera and 1 at the boss's. Offsets
 * are in tiles (`dy` up is negative), scales are 1 at rest, `flash` is 0..1.
 */

import { bell, clamp01, seg, track } from "../motion/motion-core.ts";

export const INTRO = {
  barsIn: 350,
  panStart: 300,
  panEnd: 1200,
  zoomStart: 950,
  zoomEnd: 1450,
  roarAt: 1600,
  titleAt: 1700,
  subtitleAt: 1950,
  returnAt: 3300,
  zoomOutEnd: 3900,
  panBackEnd: 4200,
  barsOutStart: 3900,
  total: 4300,
  /** The camera's zoom on the boss. */
  scale: 1.45,
} as const;

/** How many tiles ahead of the boss the hero is when the cinematic starts (the boss is just off screen). */
export const BOSS_INTRO_DISTANCE = 7;

/** The hero is on the ground, the boss stands ahead of them and within range: time to introduce it. */
export const shouldIntroduceBoss = (hero: { x: number; w: number; onGround: boolean }, boss: { x: number; w: number; alive: boolean } | undefined): boolean => {
  if (!boss || !boss.alive || !hero.onGround) return false;
  const ahead = boss.x + boss.w / 2 - (hero.x + hero.w / 2);
  return ahead > 0 && ahead <= BOSS_INTRO_DISTANCE;
};

/** Left edge of the camera, in tiles, with the boss a little right of centre and the view inside the level. */
export const bossCamera = (bossCenterX: number, viewTiles: number, levelCols: number): number =>
  Math.max(0, Math.min(bossCenterX - viewTiles * 0.6, Math.max(0, levelCols - viewTiles)));

export interface IntroPose {
  /** Letterbox bars, 0 (gone) to 1 (in). */
  bars: number;
  /** 0 at the hero's camera, 1 at the boss's. */
  pan: number;
  /** 0 to 1 along the zoom plan. */
  zoom: number;
  boss: { dy: number; sx: number; sy: number; flash: number };
  /** Picture shake in px along x. */
  shake: number;
  /** The slam's burst plays at this clock (ms) - see `SLAM_AT`. */
}

/** The moment the boss lands. */
export const SLAM_AT = INTRO.roarAt + 420;

const REST = { dy: 0, sx: 1, sy: 1, flash: 0 };

export function introPose(t: number): IntroPose {
  'worklet';
  const bars = seg(t, 0, INTRO.barsIn) * (1 - seg(t, INTRO.barsOutStart, INTRO.total, 'inOut'));
  const pan = seg(t, INTRO.panStart, INTRO.panEnd, 'inOut') * (1 - seg(t, INTRO.returnAt, INTRO.panBackEnd, 'inOut'));
  const zoom = seg(t, INTRO.zoomStart, INTRO.zoomEnd) * (1 - seg(t, INTRO.returnAt, INTRO.zoomOutEnd, 'inOut'));
  const r = t - INTRO.roarAt;
  let boss = REST;
  let shake = 0;
  if (r > 0 && r < 760) {
    boss = {
      dy: track(r, [[0, 0], [170, 0], [320, -0.6, 'out'], [420, 0], [760, 0]]),
      sy: track(r, [[0, 1], [170, 0.8], [320, 1.32, 'out'], [420, 0.72], [520, 1.12], [640, 0.97], [760, 1]]),
      sx: track(r, [[0, 1], [170, 1.14], [320, 0.86, 'out'], [420, 1.22], [520, 0.93], [640, 1.02], [760, 1]]),
      flash: 0.55 * bell(clamp01((r - 350) / 160)),
    };
    const p = (r - 420) / 480;
    if (p > 0 && p < 1) shake = 9 * Math.sin(p * 5 * Math.PI * 2) * (1 - p);
  }
  return { bars, pan, zoom, boss, shake };
}

