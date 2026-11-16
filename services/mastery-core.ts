/**
 * Objective mastery and review scheduling — pure and framework-free.
 *
 * Levels (spec §7.1):
 *   0 New       default
 *   1 Familiar  its lesson was completed, or its unit tested out
 *   2 Practised answered correctly in two separate sessions after the lesson
 *   3 Mastered  answered correctly in a checkpoint or review at least 7 days after Practised
 * A wrong answer in a checkpoint or review drops one level, never below Familiar.
 *
 * Review boxes (spec §7.2): a correct review moves the objective to the next box,
 * due in 1, 3, 7, 16, then 35 days; a wrong answer returns it to the 1-day box.
 *
 * Everything is a function of (state, event, now): no clocks, no storage. The app
 * persists `MasteryState` in the `objective_mastery` table.
 */

export type MasteryLevel = 0 | 1 | 2 | 3;

export const BOX_DAYS = [1, 3, 7, 16, 35] as const;
export const MASTERED_AFTER_DAYS = 7;
export const DAY_MS = 24 * 60 * 60 * 1000;

/** Where an answer was given. `lesson` answers never count toward leveling up. */
export type MasterySurface = "lesson" | "practice" | "checkpoint" | "review" | "game";

export interface MasteryState {
  level: MasteryLevel;
  /** Index into BOX_DAYS. */
  box: number;
  /** Epoch ms when the next review is due; null while New. */
  dueAt: number | null;
  correct: number;
  wrong: number;
  lastSeen: number | null;
  /** Epoch ms when the objective reached Practised. */
  practisedAt: number | null;
  /** Distinct sessions with a correct answer after the lesson (capped). */
  correctSessions: string[];
}

export interface AnswerEvent {
  correct: boolean;
  surface: MasterySurface;
  /** Identifies one sitting (a practice run, a checkpoint attempt, a review). */
  sessionId: string;
  now: number;
}

export function initialMastery(): MasteryState {
  return {
    level: 0,
    box: 0,
    dueAt: null,
    correct: 0,
    wrong: 0,
    lastSeen: null,
    practisedAt: null,
    correctSessions: [],
  };
}

const dueIn = (box: number, now: number) => now + BOX_DAYS[Math.min(box, BOX_DAYS.length - 1)] * DAY_MS;

/** The lesson was completed or the unit tested out: at least Familiar, first review due in a day. */
export function markFamiliar(state: MasteryState, now: number): MasteryState {
  if (state.level >= 1) return state;
  return { ...state, level: 1, box: 0, dueAt: dueIn(0, now), lastSeen: now };
}

/** Apply one answer. Returns a new state; the input is not modified. */
export function applyAnswer(state: MasteryState, event: AnswerEvent): MasteryState {
  const { correct, surface, sessionId, now } = event;
  const next: MasteryState = {
    ...state,
    correctSessions: [...state.correctSessions],
    lastSeen: now,
    correct: state.correct + (correct ? 1 : 0),
    wrong: state.wrong + (correct ? 0 : 1),
  };

  // Answers before the lesson is complete only count as exposure.
  if (state.level === 0) return next;

  const scoring = surface !== "lesson";

  if (correct) {
    if (scoring) {
      if (!next.correctSessions.includes(sessionId)) {
        next.correctSessions = [...next.correctSessions, sessionId].slice(-8);
      }
      next.box = Math.min(state.box + 1, BOX_DAYS.length - 1);
      next.dueAt = dueIn(next.box, now);

      if (next.level === 1 && next.correctSessions.length >= 2) {
        next.level = 2;
        next.practisedAt = now;
      } else if (
        next.level === 2 &&
        (surface === "checkpoint" || surface === "review") &&
        next.practisedAt !== null &&
        now - next.practisedAt >= MASTERED_AFTER_DAYS * DAY_MS
      ) {
        next.level = 3;
      }
    }
    return next;
  }

  // Wrong answer.
  next.box = 0;
  next.dueAt = dueIn(0, now);
  if ((surface === "checkpoint" || surface === "review") && next.level > 1) {
    next.level = (next.level - 1) as MasteryLevel;
    next.correctSessions = [];
    next.practisedAt = next.level >= 2 ? next.practisedAt : null;
  }
  return next;
}

export function isDue(state: MasteryState, now: number): boolean {
  return state.level >= 1 && state.dueAt !== null && state.dueAt <= now;
}

/**
 * Pick the objectives to review: due ones only, weakest first (lowest level, then
 * the most overdue), capped at `limit`.
 */
export function selectDue(
  states: Record<string, MasteryState>,
  now: number,
  limit: number,
): string[] {
  return Object.entries(states)
    .filter(([, s]) => isDue(s, now))
    .sort(([ia, a], [ib, b]) => a.level - b.level || (a.dueAt as number) - (b.dueAt as number) || (ia < ib ? -1 : 1))
    .slice(0, limit)
    .map(([id]) => id);
}

export const MASTERY_LABELS = ["New", "Familiar", "Practised", "Mastered"] as const;
