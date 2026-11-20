/**
 * The phone's small moments as pure timelines (docs/PHONE_SPEC.md §11), no React, tested in
 * `scripts/test-phone-fx.mjs`. One linear clock in ms drives each; `AppIcon.tsx` draws them.
 *
 * Install (an app arriving on the grid), clock 0 to `INSTALL_TOTAL`:
 *
 *     0 .. 150    an outline of the icon appears in its slot
 *   150 .. 750    a ring fills round it (the "installing" beat)
 *   750 .. 1050   the icon pops in: from 60% up past full size and back to 100%, ease-out; the outline and
 *                 ring give way; a burst hangs off 750 (the shared `Burst`)
 *   820 .. 1000   the label comes in
 *   950 .. 1130   the "New" dot pops in
 *
 * The burst hangs off 750 and takes `BURST.total` (900 ms) to leave nothing behind, so the clock that drives the moment runs on to
 * `INSTALL_CLOCK` (1650), well past the icon's own end at 1130: stopped at 1130 the stars froze half way and never went away.
 *
 * Before 0 nothing of it shows, and after the end it is the plain icon. A press sinks the icon to 92%.
 */

import { BURST } from "../motion/burst-core.ts";
import { clamp01, easeOut, lerp } from "../motion/motion-core.ts";

export const INSTALL = {
  outlineEnd: 150,
  ringEnd: 750,
  popAt: 750,
  popEnd: 1050,
  labelAt: 820,
  labelEnd: 1000,
  dotAt: 950,
  dotEnd: 1130,
  total: 1130,
  /** Apps arrive this far apart (ms). */
  stagger: 500,
} as const;

export const INSTALL_TOTAL = INSTALL.total;

/** How long the clock of one install runs: until the burst has finished (it hangs off the pop and takes `BURST.total`). */
export const INSTALL_CLOCK = Math.max(INSTALL.total, INSTALL.popAt + BURST.total);

/** The icon sinks to this when pressed, and comes back in `PRESS.releaseMs`. */
export const PRESS = { scale: 0.92, releaseMs: 120 } as const;

export interface InstallFrame {
  /** The empty slot outline: 0 to 1, gone once the icon has popped in. */
  outline: number;
  /** How full the ring is, 0 to 1 (0 again once the icon pops in). */
  ring: number;
  /** The icon's scale: 0 before it pops in, then 0.6 to a little past 1 and back to 1. */
  icon: number;
  /** The icon's opacity: 0 until it pops in. */
  iconOpacity: number;
  /** The label's opacity, 0 to 1. */
  label: number;
  /** The "New" dot's scale, 0 to 1. */
  dot: number;
}

const REST: InstallFrame = { outline: 0, ring: 0, icon: 1, iconOpacity: 1, label: 1, dot: 1 };
const BEFORE: InstallFrame = { outline: 0, ring: 0, icon: 0, iconOpacity: 0, label: 0, dot: 0 };

/** Every value of the install at clock time `t` (ms). */
export function installFrame(t: number): InstallFrame {
  'worklet';
  if (t >= INSTALL.total) return REST;
  if (t <= 0) return BEFORE;
  const popped = t >= INSTALL.popAt;
  const pop = clamp01((t - INSTALL.popAt) / (INSTALL.popEnd - INSTALL.popAt));
  // 0.6 up to 1.08 in the first 55% of the pop, then back to 1
  const split = 0.55;
  const icon = !popped ? 0 : pop < split ? lerp(0.6, 1.08, easeOut(pop / split)) : lerp(1.08, 1, easeOut((pop - split) / (1 - split)));
  return {
    outline: popped ? 0 : easeOut(clamp01(t / INSTALL.outlineEnd)),
    ring: popped ? 0 : clamp01((t - INSTALL.outlineEnd) / (INSTALL.ringEnd - INSTALL.outlineEnd)),
    icon,
    iconOpacity: popped ? 1 : 0,
    label: easeOut(clamp01((t - INSTALL.labelAt) / (INSTALL.labelEnd - INSTALL.labelAt))),
    dot: easeOut(clamp01((t - INSTALL.dotAt) / (INSTALL.dotEnd - INSTALL.dotAt))),
  };
}

/** When app `i` of a batch starts installing, ms after the batch begins. */
export function installStart(i: number): number {
  return Math.max(0, i) * INSTALL.stagger;
}

/** How long a batch of `count` installs takes from start to the last one's end. */
export function batchTotal(count: number): number {
  return count <= 0 ? 0 : installStart(count - 1) + INSTALL.total;
}

/** The first-open hand-over: its line arrives after the last icon has popped in (ms after the batch begins). */
export function introLineAt(count: number): number {
  return count <= 0 ? 0 : installStart(count - 1) + INSTALL.popEnd;
}
