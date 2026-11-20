/**
 * The buying moment, as pure maths (no React), unit-tested in `scripts/test-purchase-fx.mjs`; `PurchaseFx.tsx` draws it.
 * One clock in ms, played once when a buy goes through (`useTriggerClock`):
 *
 *   diamonds leave the balance, one after another (`step` apart), each flying `flight` ms along an arc to the avatar
 *   (it grows out of the balance, speeds up, shrinks as it arrives); a "-price" rises from the balance;
 *   when the last one lands (`landMs`) the avatar puts the item on (the screen does that then), a burst goes off
 *   round it (`Burst`, `at = landMs`) and the avatar pops.
 *
 * A free item sends no diamonds: it lands at once. Every value is a function of the clock and the diamond's index, never
 * random per frame. Frame 0 and the last frame show nothing. Points are px in the preview's own space.
 */

import { BURST } from "../motion/burst-core.ts";
import { clamp01, easeIn, easeInOut, easeOut, lerp, seeded } from "../motion/motion-core.ts";

export const PURCHASE = { minCoins: 3, maxCoins: 7, diamondsPerCoin: 12, step: 70, flight: 440, arc: 70, label: 900, size: 22 } as const;

export interface Point {
  x: number;
  y: number;
}

/** How many diamonds fly for a price: none for a free item, otherwise more for a dearer one. */
export function coinCount(price: number): number {
  if (!(price > 0)) return 0;
  return Math.min(PURCHASE.maxCoins, Math.max(PURCHASE.minCoins, Math.round(price / PURCHASE.diamondsPerCoin)));
}

/** When the last diamond lands and the item goes on, ms. */
export function landMs(count: number): number {
  return count <= 0 ? 0 : (count - 1) * PURCHASE.step + PURCHASE.flight;
}

/** When the whole moment is over, for the most diamonds there can be. */
export const PURCHASE_TOTAL = landMs(PURCHASE.maxCoins) + BURST.total;

export interface CoinFrame {
  x: number;
  y: number;
  scale: number;
  opacity: number;
  /** Degrees. */
  rotate: number;
}

const GONE: CoinFrame = { x: 0, y: 0, scale: 0.5, opacity: 0, rotate: 0 };

/** Diamond `i` at time `t`, flying from `from` to `to`: out of the balance, arcing up, in to the avatar. */
export function coinFrame(i: number, t: number, from: Point, to: Point): CoinFrame {
  'worklet';
  const { step, flight, arc } = PURCHASE;
  const local = t - i * step;
  const p = clamp01(local / flight);
  if (local <= 0 || p >= 1) return GONE;
  // Slow out of the balance, fast into the avatar, and a sideways sway of its own
  const e = lerp(easeInOut(p), easeIn(p), 0.4);
  const sway = (seeded(i, 41) - 0.5) * 36;
  return {
    x: lerp(from.x, to.x, e) + sway * Math.sin(Math.PI * p),
    y: lerp(from.y, to.y, e) - arc * Math.sin(Math.PI * p),
    scale: lerp(0.5, 1, easeOut(clamp01(p / 0.22))) * lerp(1, 0.55, easeIn(clamp01((p - 0.6) / 0.4))),
    opacity: clamp01(local / 50) * (1 - clamp01((p - 0.88) / 0.12)),
    rotate: lerp(-30, 30, seeded(i, 42)) * p,
  };
}

export interface LabelFrame {
  y: number;
  scale: number;
  opacity: number;
}

const NO_LABEL: LabelFrame = { y: 0, scale: 0.8, opacity: 0 };

/** The "-price" under the balance: pops in, rises 26 px and fades. */
export function labelFrame(t: number): LabelFrame {
  'worklet';
  const p = clamp01(t / PURCHASE.label);
  if (t <= 0 || p >= 1) return NO_LABEL;
  return {
    y: 26 * easeOut(p),
    scale: lerp(0.8, 1, easeOut(clamp01(p / 0.2))),
    opacity: clamp01(t / 80) * (1 - clamp01((p - 0.55) / 0.45)),
  };
}
