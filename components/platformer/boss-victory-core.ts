/**
 * The boss's defeat, as pure maths (no React), unit-tested (`npm run test:platformer`). The last right
 * answer has landed and the battle panel has gone, but the picture is still zoomed on the pair. One
 * clock, in ms, from that moment:
 *
 *   0..500      the beaten boss shudders (no flash)
 *   500..1000   it swells and squashes, about to burst
 *   1000        it EXPLODES: gone at once, a big burst of stars and a ring, the picture kicks and shakes,
 *               the hero throws up their arms (the cheer); confetti rains from 1050
 *   350..700    the letterbox bars slide in; the name is stamped on the bottom bar from 1250
 *   2300..2900  the view zooms back out to the level
 *   2600..3600  the camera scrolls to the goal flag; it OPENS at 3600 (pops up, sparkles) and the
 *               bar says so
 *   4500..5400  the camera scrolls back to the hero; the bars leave 5000..5400; control at 5400
 *
 * It always plays through (no skip). `pan` is 0 at the hero's camera and 1 at the flag's.
 */

import { CLIPS } from "./hero-anim-core.ts";
import { bell, clamp01, seeded, seg, track } from "../motion/motion-core.ts";

export const VICTORY = {
  barsIn: 700,
  explodeAt: 1000,
  titleAt: 1250,
  subtitleAt: 3700,
  confettiAt: 1050,
  zoomOutStart: 2300,
  zoomOutEnd: 2900,
  panStart: 2600,
  panEnd: 3600,
  flagAt: 3600,
  returnAt: 4500,
  panBackEnd: 5400,
  barsOutStart: 5000,
  total: 5400,
} as const;

export interface VictoryPose {
  bars: number;
  /** 1 on the battle's zoom, 0 zoomed out. */
  zoom: number;
  pan: number;
  boss: { dx: number; dy: number; sx: number; sy: number; flash: number };
  /** The boss has burst: draw it no more. */
  gone: boolean;
  /** Picture shake in px along x, and a kick added to the zoom's scale. */
  shake: number;
  punch: number;
  /** The hero's sprite frame, or null to leave it. */
  heroFrame: number | null;
}

export function victoryPose(t: number): VictoryPose {
  'worklet';
  const bars = seg(t, 350, VICTORY.barsIn) * (1 - seg(t, VICTORY.barsOutStart, VICTORY.total, 'inOut'));
  const zoom = 1 - seg(t, VICTORY.zoomOutStart, VICTORY.zoomOutEnd, 'inOut');
  const pan = seg(t, VICTORY.panStart, VICTORY.panEnd, 'inOut') * (1 - seg(t, VICTORY.returnAt, VICTORY.panBackEnd, 'inOut'));
  const gone = t >= VICTORY.explodeAt;
  // Shudder, then swell
  const shudder = t < 500 ? Math.sin(t / 28) * 0.07 * (0.4 + t / 500) : 0;
  const swell = track(t, [[0, 1], [500, 1], [980, 1.4, 'out']]);
  const squash = track(t, [[0, 1], [500, 1], [980, 0.82, 'out']]);
  // No white flash on a beaten boss (only the hero flashes, when hurt): it shudders and swells, then bursts
  const flash = 0;
  const blast = t - VICTORY.explodeAt;
  const shake = blast > 0 && blast < 650 ? 11 * Math.sin((blast / 650) * 7 * Math.PI * 2) * (1 - blast / 650) : 0;
  const punch = blast > 0 && blast < 260 ? 0.09 * bell(blast / 260) : 0;
  const cheer = t - VICTORY.explodeAt;
  const heroFrame = cheer < 0 ? null : CLIPS.cheer.start + Math.min(CLIPS.cheer.count - 1, Math.floor((cheer / 1000) * CLIPS.cheer.fps));
  return {
    bars,
    zoom,
    pan,
    boss: { dx: shudder, dy: 0, sx: swell * (1 - shudder * 0.5), sy: squash, flash },
    gone,
    shake,
    punch,
    heroFrame,
  };
}


export const CONFETTI = 34;

export interface ConfettiPiece {
  /** 0..1 across the width. */
  x: number;
  /** 0..1 down the height (above the top at the start, below the bottom at the end). */
  y: number;
  rotate: number;
  opacity: number;
  /** Which colour (0..4) and how wide, px. */
  color: number;
  size: number;
}

/** Piece `i` of the confetti that rains after the burst, `t` ms on the victory clock. */
export function confettiPiece(i: number, t: number): ConfettiPiece {
  'worklet';
  const start = VICTORY.confettiAt + seeded(i, 1) * 700;
  const fall = 1500 + seeded(i, 2) * 1100;
  const p = (t - start) / fall;
  const live = p > 0 && p < 1;
  const x0 = seeded(i, 3);
  return {
    x: x0 + Math.sin(p * 6 + i) * 0.03,
    y: -0.08 + 1.2 * clamp01(p),
    rotate: (seeded(i, 4) - 0.5) * 900 * clamp01(p) + seeded(i, 5) * 360,
    opacity: live ? 1 - seg(t, start + fall * 0.8, start + fall, 'inOut') : 0,
    color: Math.floor(seeded(i, 6) * 5),
    size: 7 + Math.floor(seeded(i, 8) * 7),
  };
}
