/**
 * The end of a level, played on the map instead of a card (pure maths, no React, unit-tested with
 * `npm run test:platformer`). One clock in ms from the moment the hero touches the open door:
 *
 *   0..500      the camera scrolls to the door; 150..650 the view zooms in on it
 *   200         the door swings open
 *   0..600      the hero walks to the door's middle
 *   600..1150   the hero steps in and shrinks away through the doorway
 *   1200        the door shuts behind them (a burst of stars, a kick of the zoom)
 *   1450        the title is stamped at the top ("Level complete!") with a jingle
 *   1800 + 360i the stars pop out over the door one by one (an earned one gold with a burst, the
 *               others a pale outline)
 *   after the last star the result panel rises from the bottom (`exitTotal`)
 *
 * Out of hearts (`lostPose`) is shorter: the hero lies down where they stand (one still frame), the view zooms in on them,
 * the title is stamped and the panel rises. Offsets are in tiles, scales are 1 at rest.
 */

import { CLIPS } from "./hero-anim-core.ts";
import { bell, flow, lerp, seg } from "../motion/motion-core.ts";

export const EXIT = {
  panEnd: 500,
  zoomStart: 150,
  zoomEnd: 650,
  openAt: 200,
  walkEnd: 600,
  enterEnd: 1150,
  closeAt: 1200,
  titleAt: 1450,
  starsAt: 1800,
  starGap: 360,
  panelGap: 500,
} as const;

/** When the result panel rises, ms: after the last star (at least one star's time, so a level without one still waits). */
export const exitTotal = (stars: number): number => EXIT.starsAt + Math.max(1, stars) * EXIT.starGap + EXIT.panelGap;

/** When star `i` (0..2) pops, ms. */
export const starAt = (i: number): number => {
  'worklet'; // read on the UI thread by each star's animated style
  return EXIT.starsAt + i * EXIT.starGap;
};

export interface ExitPose {
  /** The hero's centre x, tiles. */
  x: number;
  walking: boolean;
  /** 0 outside the door, 1 inside it: the hero shrinks as they go. */
  enter: number;
  /** The hero is through the door: draw them no more. */
  gone: boolean;
  /** 0 at the camera the hero was seen from, 1 at the door's. */
  pan: number;
  zoom: number;
  doorOpen: boolean;
  /** A kick added to the zoom's scale when the door shuts. */
  punch: number;
}

export function exitPose(t: number, heroX: number, doorX: number): ExitPose {
  const walk = seg(t, 0, EXIT.walkEnd, 'inOut');
  const moving = Math.abs(doorX - heroX) > 0.03;
  const shut = t - EXIT.closeAt;
  return {
    x: lerp(heroX, doorX, walk),
    walking: moving && t < EXIT.walkEnd,
    enter: seg(t, EXIT.walkEnd, EXIT.enterEnd, 'inOut'),
    gone: t >= EXIT.enterEnd,
    pan: seg(t, 0, EXIT.panEnd, 'inOut'),
    zoom: seg(t, EXIT.zoomStart, EXIT.zoomEnd, 'inOut'),
    doorOpen: t >= EXIT.openAt && t < EXIT.closeAt,
    punch: shut > 0 && shut < 240 ? 0.06 * bell(shut / 240) : 0,
  };
}

/** Out of hearts: the title's time and the panel's, and what the hero and the view do before. */
export const LOST = { zoomStart: 250, zoomEnd: 700, titleAt: 500, panelAt: 1150 } as const;

export interface LostPose {
  zoom: number;
  /** The hero's sprite frame: lying down with crossed-out eyes, one still frame (never a loop, never a flash). */
  heroFrame: number;
}

export function lostPose(t: number): LostPose {
  return { zoom: seg(t, LOST.zoomStart, LOST.zoomEnd, 'inOut'), heroFrame: CLIPS.down.start };
}

export interface StarPose {
  scale: number;
  rotate: number;
  opacity: number;
  /** Lift in tiles (negative is up): a slow float once it has landed. */
  dy: number;
}

/** A star `t` ms after its own pop: it swells out of nothing, squashes back and rocks, then floats if earned. */
export function starPop(t: number, earned: boolean): StarPose {
  'worklet';
  if (t <= 0) return { scale: 0, rotate: 0, opacity: 0, dy: 0 };
  return {
    scale: flow(t, [[0, 0], [130, 1.45], [250, 0.92], [360, 1]]),
    rotate: 20 * Math.sin(t / 60) * (1 - seg(t, 0, 420)),
    opacity: seg(t, 0, 70) * (earned ? 1 : 0.55),
    dy: earned ? -0.06 * Math.sin(Math.max(0, t - 360) / 380) : 0,
  };
}
