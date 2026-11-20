/**
 * Activity log — on-device, offline learning-activity history.
 *
 * Persistence: the SQLite progress database (`atomiq.db`, the app's source of
 * truth for user progress), table `activity_days`. The bundled content DB is
 * never touched, so content reseeds/updates cannot affect this data. Nothing
 * here uses the network and nothing is exported or shared.
 *
 * All logic lives in `activity-core.ts` (framework-free, unit-tested). This
 * file only wires the SQLite store, the device clock, AppState flushing and
 * the one-time import of real historical completion timestamps.
 *
 * See docs/features/ACTIVITY_TRACKER.md.
 */

import { AppState } from "react-native";

import {
  clockNow,
  createActivityEngine,
  dayKeyFromInstant,
  type ActivityEngine,
  type ActivityKind,
  type ActivityStore,
  type DayRecord,
  type HistoricalEvent,
} from "./activity-core";
import { getDatabase } from "./database";

export {
  ACTIVITY_KINDS,
  KIND_POLICY,
  type ActivityKind,
  type DayRecord,
} from "./activity-core";

const CREATE_SQL = `
  CREATE TABLE IF NOT EXISTS activity_days (
    date TEXT PRIMARY KEY,
    payload TEXT NOT NULL,
    total INTEGER NOT NULL DEFAULT 0,
    level INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT
  );
  CREATE TABLE IF NOT EXISTS activity_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`;

let tableReady = false;

const db = async () => {
  const database = getDatabase();
  if (!tableReady) {
    await database.execAsync(CREATE_SQL);
    tableReady = true;
  }
  return database;
};

const sqliteStore: ActivityStore = {
  async loadAll() {
    const database = await db();
    const rows = await database.getAllAsync<{ payload: string }>(
      "SELECT payload FROM activity_days",
    );
    const out: unknown[] = [];
    for (const row of rows) {
      try {
        out.push(JSON.parse(row.payload));
      } catch {
        // A corrupt row is skipped, never deleted.
      }
    }
    return out;
  },
  async saveDays(days: DayRecord[]) {
    if (days.length === 0) return;
    const database = await db();
    await database.withTransactionAsync(async () => {
      for (const day of days) {
        await database.runAsync(
          `INSERT INTO activity_days (date, payload, total, level, updated_at)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(date) DO UPDATE SET
             payload = excluded.payload,
             total = excluded.total,
             level = excluded.level,
             updated_at = excluded.updated_at`,
          [day.date, JSON.stringify(day), day.total, day.level, day.lastEventAt || null],
        );
      }
    });
  },
  async getMeta(key: string) {
    const database = await db();
    const row = await database.getFirstAsync<{ value: string }>(
      "SELECT value FROM activity_meta WHERE key = ?",
      [key],
    );
    return row ? row.value : null;
  },
  async setMeta(key: string, value: string) {
    const database = await db();
    await database.runAsync(
      `INSERT INTO activity_meta (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [key, value],
    );
  },
};

let engine: ActivityEngine | null = null;
let appStateWired = false;

const getEngine = (): ActivityEngine => {
  if (!engine) {
    engine = createActivityEngine({
      store: sqliteStore,
      clock: clockNow,
      debounceMs: 1500,
      onError: (error) => {
        if (__DEV__) console.warn("[activity-log]", error);
      },
    });
    if (!appStateWired) {
      appStateWired = true;
      // Persist pending events before the OS may kill the app.
      AppState.addEventListener("change", (state) => {
        if (state !== "active") void engine?.flush();
      });
    }
  }
  return engine;
};

/**
 * Record one learning event. Fire-and-forget: never throws, never blocks UI,
 * writes are debounced. The event lands on the LOCAL calendar day at the time
 * it happened; deduped/capped by the rules in `activity-core.ts`.
 */
export function recordActivity(kind: ActivityKind, meta?: { id?: string | number }): void {
  try {
    getEngine().record(kind, meta);
  } catch {
    // Activity tracking must never affect learning flows.
  }
}

export const flushActivity = async (): Promise<void> => {
  try {
    await getEngine().flush();
  } catch {
    /* ignore */
  }
};

export const subscribeActivity = (listener: () => void): (() => void) => {
  try {
    return getEngine().subscribe(listener);
  } catch {
    return () => {};
  }
};

/** Run the one-time import of real historical timestamps, then read all days. */
let importStarted = false;
const importHistoryOnce = async () => {
  if (importStarted) return;
  importStarted = true;
  try {
    const database = await db();
    const events: HistoricalEvent[] = [];
    const levels = await database.getAllAsync<{
      id: string;
      type: string | null;
      completed_at: string | null;
    }>("SELECT id, type, completed_at FROM levels WHERE status = 'completed' AND completed_at IS NOT NULL");
    for (const row of levels) {
      events.push({
        kind: row.type === "quiz" ? "quiz_complete" : "lesson_complete",
        id: String(row.id),
        timestamp: String(row.completed_at),
      });
    }
    const scores = await database.getAllAsync<{ game_id: string; created_at: string | null }>(
      "SELECT game_id, created_at FROM game_scores WHERE created_at IS NOT NULL",
    );
    for (const row of scores) {
      events.push({
        kind: "game_session",
        id: String(row.game_id),
        timestamp: String(row.created_at),
      });
    }
    await getEngine().importHistory(events, (ms) => new Date(ms).getTimezoneOffset());
  } catch {
    importStarted = false; // retry next time (e.g. DB not ready yet)
  }
};

export const loadActivityDays = async (): Promise<Record<string, DayRecord>> => {
  await importHistoryOnce();
  return getEngine().getDays();
};

export const currentDayKey = (): string => {
  const c = clockNow();
  return dayKeyFromInstant(c.ms, c.offsetMin);
};
