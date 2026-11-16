/**
 * Persistence for curriculum progress: objective mastery and item attempts.
 *
 * The rules live in services/mastery-core.ts; this file only loads and saves.
 * Node completion (lesson / practice / checkpoint) is kept in the `levels` table,
 * keyed by path node id.
 */

import {
  applyAnswer,
  initialMastery,
  markFamiliar,
  selectDue,
  type MasterySurface,
  type MasteryState,
} from "@/services/mastery-core";
import { getDatabase } from "@/services/database";

interface MasteryRow {
  objective_id: string;
  level: number;
  box: number;
  due_at: number | null;
  correct: number;
  wrong: number;
  last_seen: number | null;
  practised_at: number | null;
  correct_sessions: string;
}

function parseSessions(raw: string): string[] {
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function fromRow(row: MasteryRow): MasteryState {
  return {
    level: Math.min(3, Math.max(0, row.level)) as MasteryState["level"],
    box: row.box,
    dueAt: row.due_at,
    correct: row.correct,
    wrong: row.wrong,
    lastSeen: row.last_seen,
    practisedAt: row.practised_at,
    correctSessions: parseSessions(row.correct_sessions),
  };
}

async function save(objectiveId: string, state: MasteryState, now: number): Promise<void> {
  await getDatabase().runAsync(
    `INSERT INTO objective_mastery
       (objective_id, level, box, due_at, correct, wrong, last_seen, practised_at, correct_sessions, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?)
     ON CONFLICT(objective_id) DO UPDATE SET
       level = excluded.level, box = excluded.box, due_at = excluded.due_at,
       correct = excluded.correct, wrong = excluded.wrong, last_seen = excluded.last_seen,
       practised_at = excluded.practised_at, correct_sessions = excluded.correct_sessions,
       updated_at = excluded.updated_at`,
    [
      objectiveId,
      state.level,
      state.box,
      state.dueAt,
      state.correct,
      state.wrong,
      state.lastSeen,
      state.practisedAt,
      JSON.stringify(state.correctSessions),
      now,
    ],
  );
}

/** Mastery for every objective that has any history. Missing objectives are New. */
export async function loadMastery(): Promise<Map<string, MasteryState>> {
  const rows = await getDatabase().getAllAsync<MasteryRow>("SELECT * FROM objective_mastery");
  return new Map(rows.map((r) => [r.objective_id, fromRow(r)]));
}

export interface RecordedAnswer {
  itemId: string;
  objectiveId: string;
  surface: MasterySurface;
  correct: boolean;
}

/**
 * Record scored answers from one sitting. Each objective's state is updated once per
 * answer in order, and every answer is logged.
 */
export async function recordAnswers(
  sessionId: string,
  answers: RecordedAnswer[],
  now: number = Date.now(),
): Promise<void> {
  if (answers.length === 0) return;
  const db = getDatabase();
  const states = await loadMastery();
  for (const a of answers) {
    await db.runAsync(
      "INSERT INTO item_attempts (item_id, objective_id, surface, session_id, correct, answered_at) VALUES (?,?,?,?,?,?)",
      [a.itemId, a.objectiveId, a.surface, sessionId, a.correct ? 1 : 0, now],
    );
    const next = applyAnswer(states.get(a.objectiveId) ?? initialMastery(), {
      correct: a.correct,
      surface: a.surface,
      sessionId,
      now,
    });
    states.set(a.objectiveId, next);
  }
  for (const id of new Set(answers.map((a) => a.objectiveId))) {
    const state = states.get(id);
    if (state) await save(id, state, now);
  }
}

/** A lesson was completed (or a unit tested out): these objectives are at least Familiar. */
export async function markObjectivesFamiliar(objectiveIds: string[], now: number = Date.now()): Promise<void> {
  if (objectiveIds.length === 0) return;
  const states = await loadMastery();
  for (const id of objectiveIds) {
    const current = states.get(id) ?? initialMastery();
    const next = markFamiliar(current, now);
    if (next !== current) await save(id, next, now);
  }
}

/** Objective ids due for review now, most overdue first. */
export async function loadDueObjectives(limit: number, now: number = Date.now()): Promise<string[]> {
  const states = await loadMastery();
  return selectDue(Object.fromEntries(states), now, limit);
}
