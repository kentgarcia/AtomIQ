/**
 * Elements 1-20 for the atom builder: names, symbols and which neutron counts give
 * a stable (non-radioactive) nucleus. Framework-free, erasable syntax only.
 *
 * "Stable" here means the combination occurs in nature as a stable isotope.
 * Source to confirm before publish: IUPAC/IAEA nuclide tables (docs/LESSON_RESTRUCTURE_SPEC.md §13).
 */

export interface ElementInfo {
  z: number;
  symbol: string;
  name: string;
  /** Neutron counts of the stable isotopes. */
  stableNeutrons: readonly number[];
  /** The most common stable neutron count (used for "typical atom" starts). */
  common: number;
}

export const ELEMENTS: readonly ElementInfo[] = [
  { z: 1, symbol: "H", name: "Hydrogen", stableNeutrons: [0, 1], common: 0 },
  { z: 2, symbol: "He", name: "Helium", stableNeutrons: [1, 2], common: 2 },
  { z: 3, symbol: "Li", name: "Lithium", stableNeutrons: [3, 4], common: 4 },
  { z: 4, symbol: "Be", name: "Beryllium", stableNeutrons: [5], common: 5 },
  { z: 5, symbol: "B", name: "Boron", stableNeutrons: [5, 6], common: 6 },
  { z: 6, symbol: "C", name: "Carbon", stableNeutrons: [6, 7], common: 6 },
  { z: 7, symbol: "N", name: "Nitrogen", stableNeutrons: [7, 8], common: 7 },
  { z: 8, symbol: "O", name: "Oxygen", stableNeutrons: [8, 9, 10], common: 8 },
  { z: 9, symbol: "F", name: "Fluorine", stableNeutrons: [10], common: 10 },
  { z: 10, symbol: "Ne", name: "Neon", stableNeutrons: [10, 11, 12], common: 10 },
  { z: 11, symbol: "Na", name: "Sodium", stableNeutrons: [12], common: 12 },
  { z: 12, symbol: "Mg", name: "Magnesium", stableNeutrons: [12, 13, 14], common: 12 },
  { z: 13, symbol: "Al", name: "Aluminium", stableNeutrons: [14], common: 14 },
  { z: 14, symbol: "Si", name: "Silicon", stableNeutrons: [14, 15, 16], common: 14 },
  { z: 15, symbol: "P", name: "Phosphorus", stableNeutrons: [16], common: 16 },
  { z: 16, symbol: "S", name: "Sulfur", stableNeutrons: [16, 17, 18, 20], common: 16 },
  { z: 17, symbol: "Cl", name: "Chlorine", stableNeutrons: [18, 20], common: 18 },
  { z: 18, symbol: "Ar", name: "Argon", stableNeutrons: [18, 20, 22], common: 22 },
  { z: 19, symbol: "K", name: "Potassium", stableNeutrons: [20, 22], common: 20 },
  { z: 20, symbol: "Ca", name: "Calcium", stableNeutrons: [20, 22, 23, 24, 26, 28], common: 20 },
];

export function elementByZ(z: number): ElementInfo | undefined {
  return ELEMENTS.find((e) => e.z === z);
}

export function elementBySymbol(symbol: string): ElementInfo | undefined {
  return ELEMENTS.find((e) => e.symbol === symbol);
}

/** True when `protons` and `neutrons` form a stable nucleus (never for zero protons, nor beyond the table). */
export function isStableNucleus(protons: number, neutrons: number): boolean {
  const element = elementByZ(protons);
  return !!element && element.stableNeutrons.includes(neutrons);
}

export interface AtomDescription {
  protons: number;
  neutrons: number;
  electrons: number;
  massNumber: number;
  /** Net charge: protons minus electrons. */
  charge: number;
  element?: ElementInfo;
  /** "Carbon-14", or undefined when there are no protons or the element is outside the table. */
  isotopeName?: string;
  /** Undefined when stability is not known (no protons / outside the table). */
  stable?: boolean;
}

export function describeAtom(protons: number, neutrons: number, electrons: number): AtomDescription {
  const element = elementByZ(protons);
  const massNumber = protons + neutrons;
  return {
    protons,
    neutrons,
    electrons,
    massNumber,
    charge: protons - electrons,
    ...(element ? { element, isotopeName: `${element.name}-${massNumber}`, stable: element.stableNeutrons.includes(neutrons) } : {}),
  };
}

export interface AtomGoal {
  protons?: number;
  neutrons?: number;
  electrons?: number;
  stable?: boolean;
  elementSymbol?: string;
}

/** Every key present in `goal` must match the current atom. An empty goal is never met. */
export function atomGoalMet(
  goal: AtomGoal,
  atom: { protons: number; neutrons: number; electrons: number },
): boolean {
  const keys = Object.keys(goal) as (keyof AtomGoal)[];
  if (keys.length === 0) return false;
  const d = describeAtom(atom.protons, atom.neutrons, atom.electrons);
  return keys.every((k) => {
    switch (k) {
      case "protons":
        return d.protons === goal.protons;
      case "neutrons":
        return d.neutrons === goal.neutrons;
      case "electrons":
        return d.electrons === goal.electrons;
      case "stable":
        return d.stable === goal.stable;
      case "elementSymbol":
        return d.element?.symbol === goal.elementSymbol;
      default:
        return false;
    }
  });
}

export type ParticleKind = "protons" | "neutrons" | "electrons";
const KINDS: readonly ParticleKind[] = ["protons", "neutrons", "electrons"];

/**
 * The counters worth showing for a goal. A counter appears when the goal names it; a goal that is only
 * about the element or stability shows the protons and neutrons that can change. Everything else stays
 * out of the way, so a card that asks for neutrons shows one counter, not three.
 */
export function builderRows(goal: AtomGoal, lock: Partial<Record<ParticleKind, boolean>> = {}): ParticleKind[] {
  const named = KINDS.filter((k) => goal[k] !== undefined);
  if (named.length) return named;
  const free = (["protons", "neutrons"] as const).filter((k) => !lock[k]);
  return free.length ? [...free] : ["protons", "neutrons"];
}

export interface GoalPart {
  key: keyof AtomGoal;
  label: string;
  met: boolean;
  /** The particle a count goal is about. */
  kind?: ParticleKind;
  /** The number a count goal asks for. */
  target?: number;
}

/** The goal as a checklist, one line per thing asked for, each with whether it is true right now. */
export function goalChecklist(goal: AtomGoal, atom: { protons: number; neutrons: number; electrons: number }): GoalPart[] {
  const d = describeAtom(atom.protons, atom.neutrons, atom.electrons);
  const parts: GoalPart[] = [];
  const count = (kind: ParticleKind, singular: string) => {
    const target = goal[kind];
    if (target === undefined) return;
    parts.push({ key: kind, label: `${target} ${target === 1 ? singular : `${singular}s`}`, met: atom[kind] === target, kind, target });
  };
  count("protons", "proton");
  count("neutrons", "neutron");
  count("electrons", "electron");
  if (goal.elementSymbol !== undefined) {
    const el = elementBySymbol(goal.elementSymbol);
    parts.push({ key: "elementSymbol", label: `Make ${el ? el.name.toLowerCase() : goal.elementSymbol}`, met: d.element?.symbol === goal.elementSymbol });
  }
  if (goal.stable !== undefined) parts.push({ key: "stable", label: goal.stable ? "A stable nucleus" : "An unstable nucleus", met: d.stable === goal.stable });
  return parts;
}

/** Electrons per shell for the first four shells (2, 8, 8, 18 fill order used in drawings up to Z = 20). */
export function shellFilling(electrons: number): number[] {
  const capacity = [2, 8, 8, 2];
  const shells: number[] = [];
  let left = electrons;
  for (const cap of capacity) {
    if (left <= 0) break;
    const n = Math.min(cap, left);
    shells.push(n);
    left -= n;
  }
  if (left > 0) shells.push(left);
  return shells;
}
