/**
 * The Build an Atom lab's rules and its drawing maths, as pure maths (no React), so they are
 * unit-tested (`scripts/test-atom.mjs`) and `BuildAnAtomLab.tsx` only draws them.
 *
 * The nucleus is a list of slots on a golden spiral. A slot keeps its place for good: adding a
 * particle fills the lowest free slot, removing one empties the most recently filled slot of that
 * kind, so nothing already on screen moves or changes colour while the learner builds. Electrons
 * sit on shells (`shellFilling`) and the shells turn slowly.
 */

import { describeAtom, shellFilling } from "../../content/curriculum/elements.ts";
import { track } from "../motion/motion-core.ts";

export type Kind = "protons" | "neutrons" | "electrons";
export type NuclearKind = "protons" | "neutrons";
export type Slots = (NuclearKind | null)[];

export interface AtomTarget {
  level: 1 | 2 | 3;
  label: string;
  protons: number;
  neutrons: number;
  electrons: number;
}

export const LEVEL_NAME: Record<AtomTarget["level"], string> = { 1: "Elements", 2: "Isotopes", 3: "Ions" };

export const ATOM_CHALLENGES: readonly AtomTarget[] = [
  { level: 1, label: "Hydrogen", protons: 1, neutrons: 0, electrons: 1 },
  { level: 1, label: "Carbon", protons: 6, neutrons: 6, electrons: 6 },
  { level: 1, label: "Nitrogen", protons: 7, neutrons: 7, electrons: 7 },
  { level: 1, label: "Oxygen", protons: 8, neutrons: 8, electrons: 8 },
  { level: 2, label: "Carbon-12", protons: 6, neutrons: 6, electrons: 6 },
  { level: 2, label: "Carbon-14", protons: 6, neutrons: 8, electrons: 6 },
  { level: 2, label: "Hydrogen-2", protons: 1, neutrons: 1, electrons: 1 },
  { level: 3, label: "Na⁺", protons: 11, neutrons: 12, electrons: 10 },
  { level: 3, label: "Cl⁻", protons: 17, neutrons: 18, electrons: 18 },
  { level: 3, label: "Mg²⁺", protons: 12, neutrons: 12, electrons: 10 },
];

export const LIMITS: Record<Kind, number> = { protons: 20, neutrons: 30, electrons: 20 };

export interface Counts {
  protons: number;
  neutrons: number;
  electrons: number;
}

export function chargeText(protons: number, electrons: number): string {
  const c = protons - electrons;
  if (c === 0) return "0";
  return c > 0 ? `+${c}` : `−${Math.abs(c)}`;
}

/** The verdict on a build: right, or which part is off and a nudge that does not give the number away. */
export function checkAtom(target: Counts, got: Counts): { ok: boolean; hint?: string } {
  if (got.protons === target.protons && got.neutrons === target.neutrons && got.electrons === target.electrons) return { ok: true };
  if (got.protons !== target.protons) return { ok: false, hint: "The number of protons decides which element you are building." };
  if (got.neutrons !== target.neutrons) return { ok: false, hint: "Same element, different mass: that is an isotope. Check the neutron count." };
  return { ok: false, hint: "Electrons set the charge. A neutral atom has as many electrons as protons." };
}

/** Add one particle: it takes the lowest free slot (or a new one on the end). */
export function addParticle(slots: Slots, kind: NuclearKind): Slots {
  const next = slots.slice();
  const free = next.indexOf(null);
  if (free >= 0) next[free] = kind;
  else next.push(kind);
  return next;
}

/** Remove one particle of `kind`: the highest slot of that kind empties, so the older ones stay put. Trailing empty slots are dropped. */
export function removeParticle(slots: Slots, kind: NuclearKind): Slots {
  const next = slots.slice();
  const at = next.lastIndexOf(kind);
  if (at < 0) return slots;
  next[at] = null;
  while (next.length > 0 && next[next.length - 1] === null) next.pop();
  return next;
}

export function countSlots(slots: Slots, kind: NuclearKind): number {
  return slots.filter((s) => s === kind).length;
}

const GOLDEN = 2.39996;

/** Where slot `i` sits in a 100-unit square, the nucleus's middle at (50, 50). */
export function slotPosition(i: number): { x: number; y: number } {
  const r = 5.4 * Math.sqrt(i);
  return { x: 50 + r * Math.cos(i * GOLDEN), y: 50 + r * Math.sin(i * GOLDEN) };
}

/** The radius of one nucleus token in the 100-unit square, before the nucleus is scaled to fit. */
export const TOKEN_R = 4.4;

/**
 * How much the whole nucleus is shrunk so that `slots` of them stay clear of the first shell: 1
 * while it is small, less as it grows. The picture scales the nucleus as one piece, smoothly,
 * so no token has to move.
 */
export function nucleusFit(slots: number): number {
  const reach = 5.4 * Math.sqrt(Math.max(0, slots - 1)) + TOKEN_R;
  return Math.min(1, (SHELL_RADII[0] - 5) / reach);
}

/** The radii of the electron shells in the same 100-unit square. */
export const SHELL_RADII = [27, 35, 42, 48] as const;

/** How long one turn of shell `s` takes, ms: the inner ones are quicker. */
export function shellPeriod(shell: number): number {
  return 7000 + shell * 3500;
}

/** Electron `k` of `count` on shell `shell`, as a position in the 100-unit square (before the shell turns). */
export function electronPosition(shell: number, k: number, count: number): { x: number; y: number } {
  const a = (k / Math.max(1, count)) * Math.PI * 2 + shell * 0.7;
  const r = SHELL_RADII[Math.min(shell, SHELL_RADII.length - 1)]!;
  return { x: 50 + r * Math.cos(a), y: 50 + r * Math.sin(a) };
}

export function electronShells(electrons: number): number[] {
  return shellFilling(electrons);
}

/** A new particle pops in: from nothing, past its size, settling on it. `t` is ms since it appeared. */
export function popScale(t: number): number {
  'worklet';
  return track(t, [
    [0, 0],
    [130, 1.28, 'out'],
    [260, 1, 'out'],
  ]);
}

export const POP_MS = 260;

/** The turn of a shell (degrees) at time `t`. */
export function shellAngle(shell: number, t: number): number {
  'worklet';
  const period = 7000 + shell * 3500;
  return ((t % period) / period) * 360 * (shell % 2 === 0 ? 1 : -1);
}

/** What the readout says about the atom being built. */
export function readout(c: Counts) {
  const d = describeAtom(c.protons, c.neutrons, c.electrons);
  return {
    symbol: d.element?.symbol ?? "?",
    name: d.element?.name ?? "No element yet",
    atomicNumber: c.protons,
    massNumber: d.massNumber,
    charge: chargeText(c.protons, c.electrons),
    isotope: d.isotopeName,
    stable: d.stable,
  };
}


export interface DemoStep {
  /** ms from the start of the demo. */
  at: number;
  kind: Kind;
}

export interface DemoPlan {
  steps: DemoStep[];
  /** When each part is first said (a caption goes up), ms. */
  captions: { at: number; kind: Kind | "end"; text: string }[];
  /** The atom is complete at `built`, held until `end`, then the demo clears. */
  built: number;
  end: number;
}

export const DEMO = {
  /** After a caption goes up, the particles wait this long so it can be read first. */
  lead: 500,
  /** Every part stays up at least this long (a caption takes about this long to read), however few particles it has. */
  dwell: 2400,
  /** The finished atom is held this long before the demo clears. */
  hold: 2000,
} as const;

/** The time between particles: slow for a few (so each one is seen), quicker for many (so it does not drag). */
export function demoStep(count: number): number {
  return count <= 3 ? 700 : count <= 8 ? 450 : 280;
}

/**
 * The coached build of an element challenge: the protons arrive one by one (they decide the
 * element), then the neutrons (they add mass), then the electrons (they match the protons, so the
 * atom is neutral). A caption goes up as each kind starts and the particles follow after `lead`;
 * a part lasts as long as its particles take or `dwell`, whichever is longer, so even one proton
 * is on screen long enough to read about. The finished atom is held before the demo clears.
 */
export function demoPlan(target: Counts): DemoPlan {
  const steps: DemoStep[] = [];
  const captions: DemoPlan["captions"] = [];
  let t = 400;
  const phases: { kind: Kind; n: number; text: string }[] = [
    { kind: "protons", n: target.protons, text: "Protons decide which element it is." },
    { kind: "neutrons", n: target.neutrons, text: "Neutrons add mass to the nucleus." },
    { kind: "electrons", n: target.electrons, text: target.electrons === target.protons ? "Electrons match the protons, so the atom is neutral." : "Electrons set the charge." },
  ];
  for (const phase of phases) {
    if (phase.n <= 0) continue;
    captions.push({ at: t, kind: phase.kind, text: phase.text });
    const step = demoStep(phase.n);
    for (let i = 0; i < phase.n; i++) steps.push({ at: t + DEMO.lead + i * step, kind: phase.kind });
    t += Math.max(DEMO.lead + phase.n * step, DEMO.dwell);
  }
  captions.push({ at: t, kind: "end", text: "Now you try!" });
  return { steps, captions, built: t, end: t + DEMO.hold };
}
