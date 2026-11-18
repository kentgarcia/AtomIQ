/**
 * Radiation id: three nuclear changes, one at a time. The learner names what leaves the
 * nucleus (alpha, beta or gamma) and only then does the animation play and confirm
 * (docs/UNIT_2_RADIOACTIVITY_SPEC.md §8). A wrong guess is allowed and re-tried.
 */

import type { RadiationIdCase, RadiationIdData, RadiationKind } from "./types.ts";

export const RADIATION_KINDS: readonly RadiationKind[] = ["alpha", "beta", "gamma"];

export interface RadiationIdState {
  /** Index of the case being shown. */
  index: number;
  /** Case ids identified correctly. */
  solved: string[];
  /** Wrong guesses so far, per case id. */
  misses: Record<string, number>;
  /** The latest guess, until the learner moves on. */
  last: { caseId: string; guess: RadiationKind; correct: boolean } | null;
}

export const createRadiationId = (): RadiationIdState => ({ index: 0, solved: [], misses: {}, last: null });

export const caseAt = (cases: RadiationIdCase[], s: RadiationIdState): RadiationIdCase => cases[Math.min(cases.length - 1, s.index)];

/** Pick a radiation type for the current case. Guessing an already solved case changes nothing. */
export function guess(cases: RadiationIdCase[], s: RadiationIdState, choice: RadiationKind): RadiationIdState {
  const c = caseAt(cases, s);
  if (s.solved.includes(c.id)) return s;
  const correct = c.answer === choice;
  return {
    ...s,
    solved: correct ? [...s.solved, c.id] : s.solved,
    misses: correct ? s.misses : { ...s.misses, [c.id]: (s.misses[c.id] ?? 0) + 1 },
    last: { caseId: c.id, guess: choice, correct },
  };
}

/** Move to the next case that is not solved yet (or stay on the last one). */
export function next(cases: RadiationIdCase[], s: RadiationIdState): RadiationIdState {
  const from = s.index + 1;
  const found = cases.findIndex((c, i) => i >= from && !s.solved.includes(c.id));
  return { ...s, index: found >= 0 ? found : Math.min(cases.length - 1, from), last: null };
}

export const goalMet = (cases: RadiationIdCase[], s: RadiationIdState): boolean => cases.length > 0 && cases.every((c) => s.solved.includes(c.id));

/** Problems with a card's data, as plain messages (used by the curriculum rules). */
export function checkRadiationIdData(d: Partial<RadiationIdData> | null | undefined): string[] {
  const errors: string[] = [];
  if (!d || typeof d !== "object") return ["data must be an object"];
  if (typeof d.task !== "string" || !d.task.trim()) errors.push("task is required");
  const cases = d.cases;
  if (!Array.isArray(cases) || cases.length < 2 || cases.length > 6) {
    errors.push("cases must be a list of 2 to 6 changes");
    return errors;
  }
  if (cases.some((c) => typeof c?.id !== "string" || !c.id || typeof c?.clue !== "string" || !c.clue.trim())) errors.push("every case needs an id and a clue");
  if (new Set(cases.map((c) => c?.id)).size !== cases.length) errors.push("case ids must be unique");
  if (cases.some((c) => !RADIATION_KINDS.includes(c?.answer))) errors.push("a case's answer must be alpha, beta or gamma");
  if (d.goal?.all !== true) errors.push("goal must be { all: true }");
  return errors;
}
