/**
 * Versioned migrations of the on-device user-state database (`atomiq.db`), the framework-free part.
 *
 * Why this exists: the content database is replaced wholesale on every content release, but the learner's own
 * database lives on the phone for years and can only be changed in place. Until the first public release the
 * changes were ad hoc (`ensureTableColumns`, `repairChatMessages`, `dropLevelsUnitForeignKey` in
 * `services/database.ts`); from the first release on, every change to a table that already shipped is a numbered
 * migration here, so what a phone has done is recorded (`PRAGMA user_version`) and nothing is guessed from the
 * shape of the tables.
 *
 * The rules:
 *  - Version 1 is the BASELINE: everything `initDatabase` did before the first release (the ad hoc repairs stay in
 *    `database.ts`, they are idempotent and cheap). A database with `user_version` 0 is stamped 1 once the baseline
 *    ran. Numbered migrations start at 2.
 *  - `services/local-first/schema.ts` and the `CREATE TABLE`s in `database.ts` always describe the NEWEST shape. A
 *    brand new install is created from them and stamped with the newest version, so no migration runs on it. So a
 *    migration and the matching change to the schema go in the same commit, and a migration only has to know how to
 *    get an OLD shape to the new one.
 *  - A migration is `up` only (no down). It runs inside one transaction together with the version bump: it either
 *    all happens or none of it does, and a failed one is tried again on the next start. Do not toggle
 *    `PRAGMA foreign_keys` inside one (SQLite ignores it inside a transaction); the user database has almost no
 *    foreign keys, so a table rebuild (create new, copy, drop old, rename) is fine.
 *  - A migration never loses a learner's progress: copy, never drop, what it cannot translate.
 *  - Never edit or renumber a migration that has shipped; add a new one. `checkMigrations` (run by the tests)
 *    keeps the list ordered and gap free.
 *  - A database NEWER than the app (the learner installed an older build) is left alone and reported, not
 *    "downgraded".
 *  - The app does not stop on a failed migration (`failed` in the report; `initDatabase` logs it and carries on,
 *    since a learner who cannot open the app cannot be helped), so write a migration so that the app still reads
 *    the old shape without crashing until the retry succeeds.
 */

/** The `PRAGMA user_version` of a database as the app made it before the first release's migrations existed. */
export const BASELINE_USER_DB_VERSION = 1;

/** The slice of `expo-sqlite`'s database the runner needs (and that `node:sqlite` is adapted to in the tests). */
export interface MigrationDb {
  execAsync(sql: string): Promise<void>;
  getFirstAsync<T>(sql: string): Promise<T | null>;
  getAllAsync<T>(sql: string): Promise<T[]>;
}

export interface Migration {
  /** The `user_version` the database has once this migration ran. Strictly 2, 3, 4... in order, never reused. */
  version: number;
  /** A short phrase for the log ("add chat_threads.archived"). */
  name: string;
  /** Change the tables. Runs in a transaction that also sets the version. */
  up(db: MigrationDb): Promise<void>;
}

/** Every migration after the baseline, oldest first. Add new ones at the END. */
export const MIGRATIONS: readonly Migration[] = [
  {
    version: 2,
    name: "add chat_threads.reward_claimed",
    async up(db) {
      // A story pays its diamonds once, the first time it is opened; a thread that already exists has not paid yet
      const columns = await db.getAllAsync<{ name: string }>("PRAGMA table_info(chat_threads)");
      if (!columns.some((c) => c.name === "reward_claimed")) await db.execAsync("ALTER TABLE chat_threads ADD COLUMN reward_claimed INTEGER NOT NULL DEFAULT 0;");
    },
  },
];

/** The version a database made by this build has. */
export const latestUserDbVersion = (migrations: readonly Migration[] = MIGRATIONS): number =>
  migrations.length > 0 ? migrations[migrations.length - 1].version : BASELINE_USER_DB_VERSION;

/** A list problem as a message, or null when the list is fine: versions start right after the baseline and go up by one. */
export function checkMigrations(migrations: readonly Migration[]): string | null {
  let expected = BASELINE_USER_DB_VERSION + 1;
  for (const m of migrations) {
    if (m.version !== expected) return `migration "${m.name}" is version ${m.version}, expected ${expected} (versions go up by one, never reused)`;
    if (!m.name.trim()) return `migration ${m.version} has no name`;
    expected += 1;
  }
  return null;
}

export interface MigrationReport {
  /** `user_version` found before anything ran. */
  from: number;
  /** `user_version` after (the same as `from` when nothing ran or the first one failed). */
  to: number;
  /** Names of the migrations that ran, in order. */
  applied: string[];
  /** The one that failed (everything before it stays applied, it and everything after it did not run). */
  failed: { version: number; name: string; error: string } | null;
  /** The database is newer than this build knows (an older build was installed over a newer one): left untouched. */
  newerThanApp: boolean;
  /** A brand new install: stamped with the newest version without running anything. */
  fresh: boolean;
}

export async function readUserVersion(db: MigrationDb): Promise<number> {
  const row = await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version");
  return Number(row?.user_version ?? 0);
}

const writeUserVersion = (db: MigrationDb, version: number): Promise<void> => {
  // PRAGMA takes no bound parameters; the number is ours and is checked to be an integer
  if (!Number.isInteger(version) || version < 0) throw new Error(`bad user_version ${version}`);
  return db.execAsync(`PRAGMA user_version = ${version};`);
};

/**
 * Bring the user database up to date. Call once, after the baseline tables exist. `fresh` is true when this very
 * start created the database (there was no `user_profile` table before), in which case the schema already is the
 * newest and the database is only stamped. Never throws: a failure is in the report.
 */
export async function migrateUserDb(
  db: MigrationDb,
  { fresh = false, migrations = MIGRATIONS, log = () => {} }: { fresh?: boolean; migrations?: readonly Migration[]; log?: (message: string) => void } = {},
): Promise<MigrationReport> {
  const latest = latestUserDbVersion(migrations);
  const report: MigrationReport = { from: 0, to: 0, applied: [], failed: null, newerThanApp: false, fresh: false };
  try {
    const listProblem = checkMigrations(migrations);
    if (listProblem) throw new Error(listProblem);
    const from = await readUserVersion(db);
    report.from = from;
    report.to = from;
    if (from > latest) {
      report.newerThanApp = true;
      log(`user database is version ${from}, this build knows ${latest}: left as it is`);
      return report;
    }
    if (from === 0 && fresh) {
      await writeUserVersion(db, latest);
      report.to = latest;
      report.fresh = true;
      return report;
    }
    // A database from before versions existed has the baseline (the ad hoc repairs ran just before this call)
    let version = from === 0 ? BASELINE_USER_DB_VERSION : from;
    if (from === 0) {
      await writeUserVersion(db, version);
      report.to = version;
    }
    for (const m of migrations) {
      if (m.version <= version) continue;
      try {
        await db.execAsync("BEGIN IMMEDIATE;");
        await m.up(db);
        await writeUserVersion(db, m.version);
        await db.execAsync("COMMIT;");
      } catch (error) {
        try {
          await db.execAsync("ROLLBACK;");
        } catch {
          /* no transaction open */
        }
        report.failed = { version: m.version, name: m.name, error: error instanceof Error ? error.message : String(error) };
        log(`migration ${m.version} (${m.name}) failed: ${report.failed.error}`);
        return report;
      }
      version = m.version;
      report.to = version;
      report.applied.push(m.name);
      log(`migration ${m.version} done: ${m.name}`);
    }
    return report;
  } catch (error) {
    report.failed = { version: report.to + 1, name: "setup", error: error instanceof Error ? error.message : String(error) };
    log(`migrations could not run: ${report.failed.error}`);
    return report;
  }
}
