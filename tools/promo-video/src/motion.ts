import { Easing, spring } from 'remotion';
import { FPS } from './timeline';

/** Named motion tokens combining Cinetic curve families & Duolingo snap/settle feel. */
export const E = {
  // Arrive family: fast out, smooth settle
  snapOut: Easing.bezier(0.16, 1, 0.3, 1),
  glideOut: Easing.bezier(0.22, 1, 0.36, 1),
  settleOut: Easing.bezier(0.25, 0.95, 0.35, 1),
  jump: (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : (1 - Math.exp(-10 * t)) / (1 - Math.exp(-10))),

  // Reposition family
  stdInOut: Easing.bezier(0.42, 0, 0.2, 1),
  strongInOut: Easing.bezier(0.65, 0, 0.35, 1),

  // Leave family: accelerates into cut
  buildIn: Easing.bezier(0.55, 0, 1, 0.45),
  launchIn: Easing.bezier(0.7, 0, 1, 0.35),

  // Overshoot pop (for icons, stamps, sparkles)
  popOut: Easing.bezier(0.18, 1.35, 0.35, 1),
} as const;

export const SPR = {
  landing: { damping: 14, stiffness: 210, mass: 0.9 },
  snappy: { damping: 17, stiffness: 280, mass: 0.8 },
  critical: { damping: 26, stiffness: 200, mass: 1 },
  bouncy: { damping: 11, stiffness: 230, mass: 0.85 },
} as const;

export const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

export const mix = (a: number, b: number, t: number): number => a + (b - a) * t;

export const prog = (
  frame: number,
  from: number,
  to: number,
  ease: (t: number) => number = E.glideOut,
): number => {
  if (to <= from) return frame >= from ? 1 : 0;
  const raw = clamp((frame - from) / (to - from), 0, 1);
  return ease(raw);
};

export const spr = (
  frame: number,
  start: number,
  config: { damping: number; stiffness: number; mass: number } = SPR.landing,
): number => {
  if (frame < start) return 0;
  return spring({
    frame: frame - start,
    fps: FPS,
    config,
  });
};

/** Quarter-sine attack + exponential decay punch envelope (from Cinetic motion-tokens). */
export const hitPulse = (t: number, attack = 2, tau = 5): number => {
  if (t < 0) return 0;
  if (t <= attack) return Math.sin((t / attack) * (Math.PI / 2));
  return Math.exp(-(t - attack) / tau);
};

/** Contact squash & stretch (widens x, flattens y on impact, rebounds cleanly). */
export const contactSquash = (
  t: number,
  amount = 0.12,
  tau = 4.5,
): { sx: number; sy: number } => {
  if (t < 0) return { sx: 1, sy: 1 };
  const p = hitPulse(t, 2, tau);
  const rebound = t > 4 ? Math.sin(((t - 4) / 6) * Math.PI) * Math.exp(-(t - 4) / 7) * 0.35 : 0;
  const s = p - rebound;
  return {
    sx: 1 + amount * s,
    sy: 1 - amount * 0.9 * s,
  };
};

/** Tactile button press sink (0 -> 1 on contact -> 0 on release) for chunky 3D-lipped buttons. */
export const pressSink = (frame: number, hitFrame: number): number => {
  const dt = frame - hitFrame;
  if (dt < -4 || dt > 12) return 0;
  if (dt < 0) return prog(frame, hitFrame - 4, hitFrame, E.launchIn);
  if (dt <= 4) return 1;
  return 1 - prog(frame, hitFrame + 4, hitFrame + 12, E.snapOut);
};

/** Fast 12-frame punchy scene entrance + exit slide/scale for beat cuts. */
export const sceneWipeIn = (localFrame: number, dur = 14): { x: number; opacity: number } => {
  const p = prog(localFrame, 0, dur, E.snapOut);
  return {
    x: mix(80, 0, p),
    opacity: clamp(prog(localFrame, 0, 6, E.snapOut), 0, 1),
  };
};

/** Deterministic pseudo-random in [0, 1) from integer seed. */
export const rand = (seed: number): number => {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};
