/**
 * The weekly ranking, the framework-free part (docs/NPC_FEED_SPEC.md §4.4): the learner against
 * the NPC cast as rivals. Rivals' XP is simulated deterministically from the NPC id, the week and
 * the learner's own pace, so the table is the same on every open, rivals are beatable and the
 * table moves a little each week.
 */

import { addDays, dayKeyFromLocalDate, weekdayOf } from "./activity-core.ts";
import { rngFromSeed } from "./rng-core.ts";
import type { RankDirection } from "./feed-core.ts";

/** The learner's id in a ranking. No NPC has it. */
export const LEARNER_ID = "me";

/** Rivals scale from the learner's weekly pace, but never below this (a new learner still has rivals to race). */
export const MIN_RIVAL_PACE = 120;

/* ------------------------------------------------------------------ */
/* Week keys: the Monday of the week, local, like `missions-core`      */
/* ------------------------------------------------------------------ */

/** The week key (the Monday's `YYYY-MM-DD`) that a local day key falls in. */
export function weekKeyOfDay(dayKey: string): string {
  return addDays(dayKey, -((weekdayOf(dayKey) + 6) % 7));
}

/** The week key of a `Date`, using its local parts. */
export const weekKeyOfDate = (date: Date = new Date()): string => weekKeyOfDay(dayKeyFromLocalDate(date));

/** The seven day keys of a week, Monday first. */
export const weekDayKeys = (weekKey: string): string[] => Array.from({ length: 7 }, (_, i) => addDays(weekKey, i));

/** 1 (Monday) to 7 (Sunday). */
export const dayOfWeek = (dayKey: string): number => ((weekdayOf(dayKey) + 6) % 7) + 1;

/** The `n` week keys before `weekKey`, most recent first. */
export const previousWeekKeys = (weekKey: string, n: number): string[] => Array.from({ length: n }, (_, i) => addDays(weekKey, -7 * (i + 1)));

/* ------------------------------------------------------------------ */
/* Simulated rivals                                                    */
/* ------------------------------------------------------------------ */

/** A rival's weekly total, before the week unfolds: base pace scaled by a per-week luck and a per-NPC habit. */
function weeklyTotal(npcId: string, weekKey: string, learnerPace: number): number {
  const base = Math.max(MIN_RIVAL_PACE, Number.isFinite(learnerPace) ? learnerPace : 0);
  const habit = 0.85 + 0.3 * rngFromSeed(`habit|${npcId}`)(); // 0.85 to 1.15, the same every week
  const luck = 0.45 + 0.9 * rngFromSeed(`week|${npcId}|${weekKey}`)(); // 0.45 to 1.35
  return Math.round((base * habit * luck) / 5) * 5;
}

/** How a week's total is spread over its seven days (shares add up to 1). */
function dailyShares(npcId: string, weekKey: string): number[] {
  const rng = rngFromSeed(`days|${npcId}|${weekKey}`);
  const raw = Array.from({ length: 7 }, () => 0.4 + 1.2 * rng());
  const sum = raw.reduce((a, b) => a + b, 0);
  return raw.map((r) => r / sum);
}

/**
 * A rival's XP for a week. Deterministic: the same NPC, week and pace always give the same number.
 * `learnerPace` is the learner's usual weekly XP (the average of recent weeks), not this week's, so
 * the rivals do not run away from a learner who works hard today.
 * `daysElapsed` (1 to 7, default 7, the whole week) says how far into the week it is: the rival earns
 * their total spread over the days, so the table changes through the week.
 */
export function simulateRivalXp(npcId: string, weekKey: string, learnerPace: number, daysElapsed = 7): number {
  const days = Math.max(0, Math.min(7, Math.floor(daysElapsed)));
  if (days === 0) return 0;
  const total = weeklyTotal(npcId, weekKey, learnerPace);
  if (days === 7) return total;
  const shares = dailyShares(npcId, weekKey);
  let part = 0;
  for (let i = 0; i < days; i += 1) part += shares[i];
  return Math.round(total * part);
}

/* ------------------------------------------------------------------ */
/* Ranking                                                             */
/* ------------------------------------------------------------------ */

export interface RivalXp {
  id: string;
  xp: number;
}

export interface RankRow {
  /** `LEARNER_ID` or an NPC id. */
  id: string;
  isLearner: boolean;
  xp: number;
  /** 1 is first. Ties are broken by id, so ranks are always distinct. */
  rank: number;
}

/** Order the learner and the rivals by XP, highest first; equal XP is ordered by id (A to Z). */
export function buildRanking(learnerXp: number, rivals: readonly RivalXp[]): RankRow[] {
  const all = [{ id: LEARNER_ID, xp: Math.max(0, Math.round(learnerXp || 0)) }, ...rivals.filter((r) => r.id !== LEARNER_ID)];
  all.sort((a, b) => b.xp - a.xp || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return all.map((r, i) => ({ id: r.id, isLearner: r.id === LEARNER_ID, xp: r.xp, rank: i + 1 }));
}

/** The whole table for a week: simulated rivals plus the learner's real XP. */
export function weeklyRanking(
  learnerXp: number,
  npcIds: readonly string[],
  weekKey: string,
  learnerPace: number,
  daysElapsed = 7,
): RankRow[] {
  return buildRanking(
    learnerXp,
    npcIds.map((id) => ({ id, xp: simulateRivalXp(id, weekKey, learnerPace, daysElapsed) })),
  );
}

export type RankChange =
  | { type: "none" }
  | { type: "pass"; direction: RankDirection; npcId: string; rankBefore: number; rankAfter: number };

/**
 * Compare two rankings (or just their order, best first) of the same week. Returns who passed whom
 * only when the order of the learner and a rival actually swapped:
 * - `passed`: the learner is now ahead of a rival who was ahead before (the rival nearest below).
 * - `passed_by`: a rival is now ahead of the learner who was behind before (the rival nearest above).
 * When the learner moved both ways at once (not possible with one XP step) a pass by the learner wins.
 */
export function rankChange(before: readonly Pick<RankRow, "id">[], after: readonly Pick<RankRow, "id">[]): RankChange {
  const posBefore = new Map(before.map((r, i) => [r.id, i] as const));
  const posAfter = new Map(after.map((r, i) => [r.id, i] as const));
  const meBefore = posBefore.get(LEARNER_ID);
  const meAfter = posAfter.get(LEARNER_ID);
  if (meBefore === undefined || meAfter === undefined) return { type: "none" };

  const passed: string[] = [];
  const passedBy: string[] = [];
  for (const row of after) {
    if (row.id === LEARNER_ID) continue;
    const rivalBefore = posBefore.get(row.id);
    const rivalAfter = posAfter.get(row.id);
    if (rivalBefore === undefined || rivalAfter === undefined) continue;
    if (rivalBefore < meBefore && rivalAfter > meAfter) passed.push(row.id);
    else if (rivalBefore > meBefore && rivalAfter < meAfter) passedBy.push(row.id);
  }
  const nearest = (ids: string[]): string => ids.slice().sort((a, b) => Math.abs((posAfter.get(a) as number) - meAfter) - Math.abs((posAfter.get(b) as number) - meAfter))[0];
  if (passed.length > 0) return { type: "pass", direction: "passed", npcId: nearest(passed), rankBefore: meBefore + 1, rankAfter: meAfter + 1 };
  if (passedBy.length > 0) return { type: "pass", direction: "passed_by", npcId: nearest(passedBy), rankBefore: meBefore + 1, rankAfter: meAfter + 1 };
  return { type: "none" };
}
