/**
 * Daily facts the learner has read: the SQL over the `daily_facts_read` table (framework-free, so a
 * test can run it on an in-memory SQLite) and the pure helpers for the list. The app binds it to the
 * user-state database in `services/daily-facts.ts`.
 */

export interface FactsDb {
  runAsync(sql: string, params?: (string | number | null)[]): Promise<{ changes: number }>;
  getAllAsync<T>(sql: string, params?: (string | number | null)[]): Promise<T[]>;
}

export interface ReadFactRow {
  factId: string;
  title: string;
  /** Local day it was first read, `YYYY-MM-DD`. */
  readOn: string;
  readAt: number;
}

export function createDailyFactsStore(getDb: () => Promise<FactsDb> | FactsDb) {
  /** Record a fact as read. `true` the first time, `false` when it was already in the list. */
  async function recordRead(factId: string, title: string, readOn: string, now: number): Promise<boolean> {
    const db = await getDb();
    const result = await db.runAsync(
      "INSERT OR IGNORE INTO daily_facts_read (fact_id, title, read_on, read_at, updated_at) VALUES (?,?,?,?,?)",
      [factId, title, readOn, now, now],
    );
    return result.changes > 0;
  }

  /** Every fact read, newest first. */
  async function listRead(): Promise<ReadFactRow[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<{ fact_id: string; title: string; read_on: string; read_at: number }>(
      "SELECT fact_id, title, read_on, read_at FROM daily_facts_read WHERE deleted_at IS NULL ORDER BY read_at DESC, fact_id",
    );
    return rows.map((r) => ({ factId: r.fact_id, title: r.title, readOn: r.read_on, readAt: r.read_at }));
  }

  return { recordRead, listRead };
}

export type DailyFactsStore = ReturnType<typeof createDailyFactsStore>;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "18 Nov" for a `YYYY-MM-DD` day; the input unchanged when it is not one. */
export function factDayLabel(day: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!m) return day;
  const month = MONTHS[Number(m[2]) - 1];
  return month ? `${Number(m[3])} ${month}` : day;
}

/** "3 facts read" / "1 fact read" / "No facts read yet". */
export function readCountLabel(count: number): string {
  if (!(count > 0)) return "No facts read yet";
  return `${count} ${count === 1 ? "fact" : "facts"} read`;
}
