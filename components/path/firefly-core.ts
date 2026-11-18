/**
 * Fireflies on the lesson map: small lights in the progress ring's colour that drift and fade in and out. Pure maths
 * (no React), so the numbers are unit-tested; `Fireflies.tsx` only draws them.
 *
 * Every firefly is a function of one loop clock (`FIREFLY_LOOP_MS`) and its index, so nothing
 * is random per frame: position, size, speed and phase come from `seeded(i)`. Each period
 * divides the loop, so the clock wraps without a jump. A firefly is dark at the ends of its
 * blink (`bell`), which is where it can be anywhere without anyone seeing it move.
 */

import { bell, loop, lerp, seeded, wave } from "../motion/motion-core.ts";

/** The shared loop. Every period below divides it. */
export const FIREFLY_LOOP_MS = 60000;

/** Drift periods (ms): slow, so the lights wander rather than dart. */
export const DRIFT_PERIODS = [12000, 15000, 20000, 30000] as const;
/** Blink periods (ms): how long one fade-in, fade-out takes. */
export const BLINK_PERIODS = [5000, 6000, 7500, 10000] as const;

export interface FireflySpec {
  /** Rest position as a fraction of the area (0 to 1). */
  fx: number;
  fy: number;
  /** Radius of the bright core, in px. */
  radius: number;
  /** Drift, in px each way. */
  driftX: number;
  driftY: number;
  driftPeriodX: number;
  driftPeriodY: number;
  blinkPeriod: number;
  phaseX: number;
  phaseY: number;
  phaseBlink: number;
  /** Brightest the dot gets (0 to 1). */
  peak: number;
  /** Lightness step from the base colour: below 0 darker, above 0 lighter (see `shadeColor`). */
  shade: number;
}

const pick = <T,>(list: readonly T[], r: number): T => list[Math.min(list.length - 1, Math.floor(r * list.length))];

/** The look of firefly `i`: the same every render. */
export function fireflySpec(i: number): FireflySpec {
  return {
    fx: seeded(i, 1),
    fy: seeded(i, 2),
    radius: lerp(2, 3.4, seeded(i, 3)),
    driftX: lerp(8, 22, seeded(i, 4)),
    driftY: lerp(6, 16, seeded(i, 5)),
    driftPeriodX: pick(DRIFT_PERIODS, seeded(i, 6)),
    driftPeriodY: pick(DRIFT_PERIODS, seeded(i, 7)),
    blinkPeriod: pick(BLINK_PERIODS, seeded(i, 8)),
    phaseX: seeded(i, 9),
    phaseY: seeded(i, 10),
    phaseBlink: seeded(i, 11),
    peak: lerp(0.55, 1, seeded(i, 12)),
    shade: lerp(-0.18, 0.5, seeded(i, 13)),
  };
}

/**
 * The base colour made lighter (`amount` above 0, toward white) or darker (below 0, toward black),
 * keeping its hue. Anything that is not #RRGGBB comes back unchanged.
 */
export function shadeColor(hex: string, amount: number): string {
  const m = /^#([0-9A-Fa-f]{6})/.exec(hex);
  if (!m) return hex;
  const k = Math.max(-1, Math.min(1, amount));
  const out = [0, 2, 4].map((i) => {
    const v = parseInt(m[1].slice(i, i + 2), 16);
    const mixed = k >= 0 ? v + (255 - v) * k : v * (1 + k);
    return Math.round(Math.max(0, Math.min(255, mixed))).toString(16).padStart(2, "0");
  });
  return `#${out.join("")}`;
}

/** How many fireflies fill an area: about one for every `PER_PX` of height, never fewer than 4. */
const PER_PX = 46;
export function fireflyCount(height: number): number {
  if (!Number.isFinite(height) || height <= 0) return 0;
  return Math.max(4, Math.round(height / PER_PX));
}

export interface FireflyFrame {
  /** Offset from the rest position, px. */
  dx: number;
  dy: number;
  /** 0 to 1: how bright the core is. */
  opacity: number;
}

/** Where firefly `spec` is, and how bright, at time `t` (ms) of the shared loop. */
export function fireflyFrame(spec: FireflySpec, t: number): FireflyFrame {
  'worklet';
  return {
    dx: spec.driftX * wave(t, spec.driftPeriodX, spec.phaseX),
    dy: spec.driftY * wave(t, spec.driftPeriodY, spec.phaseY),
    // A soft blink: dark at the ends, so a firefly fades in, glows and fades out in its own time
    opacity: spec.peak * Math.pow(bell(loop(t, spec.blinkPeriod, spec.phaseBlink)), 1.5),
  };
}
