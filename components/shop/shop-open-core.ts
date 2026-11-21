/**
 * The shop opening, as a pure timeline (no React, tested in `scripts/test-shop-open.mjs`). `ShopOpening.tsx` draws it.
 * It is the Shop's loading: the screen is a closed shop (a roller shutter under the awning with a CLOSED sign hung on it), the shelves and
 * the avatar are mounted behind it while nothing moves, then the sign flips to OPEN and the shutter rolls up.
 *
 * One linear clock in ms, in two runs with a stall between them:
 *
 *      0 ..  300   the sign drops in from above on its hook and swings to rest (the awning and shutter are already there)
 *                  ........ the clock STOPS at `holdAt` (300): the screen mounts the shelves; the clock runs on once they are laid out
 *    300 ..  440   the sign flips (it turns edge-on, the word changes to OPEN, it turns back)
 *    440 ..  540   a beat
 *    540 ..  940   the shutter rolls up under the awning, taking the sign with it
 *
 * Opacity and transforms only. Before 0 only the shutter shows; after `total` nothing does.
 */

import { clamp01, easeIn, easeInOut, easeOut, lerp, seg } from "../motion/motion-core.ts";

export const SHOP_OPEN = {
  dropEnd: 220,
  holdAt: 300,
  flipAt: 300,
  flipMid: 370,
  flipEnd: 440,
  riseAt: 540,
  total: 940,
} as const;

/** How far above its place the sign starts, dp, and how far (degrees) it first swings. */
export const SIGN_DROP = 70;
export const SIGN_SWING = 12;

export interface ShopOpenFrame {
  /** How far the shutter has rolled up, 0 (closed) to 1 (gone above the screen). It moves `rise` times its own height up. */
  rise: number;
  /** The sign: opacity, its offset below its place (dp, negative while it drops in), its swing (degrees, about its hook) and its width scale (the flip). */
  signOpacity: number;
  signY: number;
  signRotate: number;
  signScaleX: number;
  /** Opacity of the word CLOSED and of the word OPEN: one at a time, switched when the sign is edge-on. */
  closed: number;
  open: number;
}

const BEFORE: ShopOpenFrame = { rise: 0, signOpacity: 0, signY: -SIGN_DROP, signRotate: 0, signScaleX: 1, closed: 1, open: 0 };
const AFTER: ShopOpenFrame = { rise: 1, signOpacity: 1, signY: 0, signRotate: 0, signScaleX: 1, closed: 0, open: 1 };

/** Every value of the opening at clock time `t` (ms). */
export function shopOpenFrame(t: number): ShopOpenFrame {
  'worklet';
  if (t <= 0) return BEFORE;
  if (t >= SHOP_OPEN.total) return AFTER;

  const drop = seg(t, 0, SHOP_OPEN.dropEnd);
  // the swing decays to nothing exactly at the hold, so the stall is still
  const p = clamp01(t / SHOP_OPEN.holdAt);
  const swing = SIGN_SWING * (1 - p) * (1 - p) * Math.cos(p * Math.PI * 3);

  let scaleX = 1;
  if (t > SHOP_OPEN.flipAt && t < SHOP_OPEN.flipEnd) {
    scaleX =
      t < SHOP_OPEN.flipMid
        ? 1 - easeIn((t - SHOP_OPEN.flipAt) / (SHOP_OPEN.flipMid - SHOP_OPEN.flipAt))
        : easeOut((t - SHOP_OPEN.flipMid) / (SHOP_OPEN.flipEnd - SHOP_OPEN.flipMid));
  }
  const flipped = t >= SHOP_OPEN.flipMid;

  return {
    rise: easeInOut(clamp01((t - SHOP_OPEN.riseAt) / (SHOP_OPEN.total - SHOP_OPEN.riseAt))),
    signOpacity: seg(t, 0, 80),
    signY: lerp(-SIGN_DROP, 0, drop),
    signRotate: swing,
    signScaleX: scaleX,
    closed: flipped ? 0 : 1,
    open: flipped ? 1 : 0,
  };
}
