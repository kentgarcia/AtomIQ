/**
 * Myth Buster rules, framework-free (`node --test`: scripts/test-mythbuster-core.mjs).
 *
 * Statements come from two decks: the ORIGINAL one (every myth gives a false statement, its reality a true one) and the
 * UNIT decks (10 myth-or-fact statements per unit). The modes:
 *
 *   Quick Play  one unit's deck, 10 statements, no timer, no lives.
 *   Challenge   a mix of both decks, limited lives, no timer; ends when the lives or the statements run out.
 *   Endless     both decks without repeats until all were seen, one clock for the whole round: a right answer adds time,
 *               a wrong one takes time away (see `EndlessClock`); ends when the clock reaches 0.
 */

import type { EndlessClock } from "../constants/mythbuster-modes.ts";

export interface GameStatement {
  id: string;
  statement: string;
  isTrue: boolean;
  category: string;
  difficulty: string;
  /** Shown after the answer. */
  explanation: string;
  deck: "original" | "unit";
}

/** What the original deck reads from a myth. */
export interface MythLike {
  id: string;
  mythStatement: string;
  reality: string;
  explanation: string;
  category: string;
  difficulty: string;
}

/** What a unit's deck reads from `unit_statements`. */
export interface UnitStatementLike {
  id: string;
  unitId: string;
  statement: string;
  verdict: "myth" | "fact";
  explanation: string;
}

/** A random number in [0, 1); a test passes its own. */
export type Rng = () => number;

/** The original deck: a false statement and a true one for every myth. */
export function originalDeck(myths: readonly MythLike[]): GameStatement[] {
  return myths.flatMap((m): GameStatement[] => [
    { id: `${m.id}-myth`, statement: m.mythStatement, isTrue: false, category: m.category, difficulty: m.difficulty, explanation: m.reality, deck: "original" },
    { id: `${m.id}-truth`, statement: m.reality, isTrue: true, category: m.category, difficulty: m.difficulty, explanation: m.explanation, deck: "original" },
  ]);
}

/** A unit's deck (the unit's title is its category). */
export function unitDeck(rows: readonly UnitStatementLike[], category = ""): GameStatement[] {
  return rows.map((r) => ({
    id: r.id,
    statement: r.statement,
    isTrue: r.verdict === "fact",
    category: category || r.unitId,
    difficulty: "easy",
    explanation: r.explanation,
    deck: "unit",
  }));
}

/** A fresh shuffled copy (Fisher-Yates). */
export function shuffle<T>(items: readonly T[], rng: Rng = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/** Quick Play: the unit's deck in a new order, at most `rounds` statements. */
export function quickRound(unit: readonly GameStatement[], rounds: number, rng: Rng = Math.random): GameStatement[] {
  return shuffle(unit, rng).slice(0, rounds);
}

/**
 * Challenge: `rounds` statements drawn evenly from the two decks (the unit deck gives the extra one when `rounds` is odd,
 * and a short deck is topped up from the other), then mixed.
 */
export function challengeRound(original: readonly GameStatement[], unit: readonly GameStatement[], rounds: number, rng: Rng = Math.random): GameStatement[] {
  const a = shuffle(original, rng);
  const b = shuffle(unit, rng);
  const fromUnit = Math.min(b.length, Math.ceil(rounds / 2));
  const fromOriginal = Math.min(a.length, rounds - fromUnit);
  const picked = [...b.slice(0, fromUnit), ...a.slice(0, fromOriginal)];
  // One deck was short: fill the rest from what is left of the other
  const rest = [...b.slice(fromUnit), ...a.slice(fromOriginal)];
  while (picked.length < rounds && rest.length > 0) picked.push(rest.shift()!);
  return shuffle(picked, rng);
}

/** Endless: the next statement. Unseen ones first; once all were seen, any of them again. */
export function nextEndless(pool: readonly GameStatement[], seen: ReadonlySet<string>, rng: Rng = Math.random): GameStatement | null {
  if (pool.length === 0) return null;
  const unseen = pool.filter((s) => !seen.has(s.id));
  const from = unseen.length > 0 ? unseen : pool;
  return from[Math.floor(rng() * from.length)]!;
}

/** Endless: the clock after an answer, kept between 0 and `max`. */
export function clockAfterAnswer(clock: EndlessClock, seconds: number, correct: boolean): number {
  return Math.min(clock.max, Math.max(0, seconds + (correct ? clock.gain : -clock.loss)));
}

/** Endless: one second passes. */
export const clockTick = (seconds: number): number => Math.max(0, seconds - 1);

/** Challenge: lives left after an answer. */
export const livesAfterAnswer = (lives: number, correct: boolean): number => (correct ? lives : Math.max(0, lives - 1));
