/**
 * Content database seeding rules (framework-free, unit-tested).
 *
 * `services/content-db.ts` does the I/O (copy, open, swap). The decisions about
 * *whether* to seed and *whether a freshly copied database is usable* live here
 * so they can run under `node --test` (see scripts/test-content-db-core.mjs).
 */

/** Tables that must exist and hold at least one row for the app to be usable. */
export const REQUIRED_CONTENT_TABLES = [
  "units",
  "objectives",
  "lessons",
  "lesson_cards",
  "path_nodes",
  "items",
  "content_references",
  "mythbuster_questions",
  "myths",
  "mazes",
  "maze_rooms",
  "encyclopedia_entries",
] as const;

/** Key/value rows of the `content_meta` table stamped into every bundled database. */
export interface ContentMeta {
  content_version?: string;
  content_hash?: string;
  schema_version?: string;
  built_at?: string;
}

export type SeedDecision =
  | { action: "ready" }
  | { action: "seed"; reason: "missing" | "version-changed" | "integrity" };

export interface SeedInput {
  /** The on-device content.db exists. */
  localExists: boolean;
  /** `content_meta.content_version` of the on-device DB (null when unreadable or absent). */
  localVersion: string | null;
  /** The on-device DB passed the integrity check. Only consulted when versions match. */
  integrityOk: boolean;
  /** Version compiled into this build (CONTENT_DB_VERSION). */
  bundledVersion: string;
  /**
   * Developer preview (Content Studio): when the on-device DB carries exactly this
   * version it is kept instead of being replaced by the bundle.
   */
  previewVersion?: string | null;
}

/**
 * Decide whether the on-device database is ready or must be replaced by the bundle.
 *
 * The comparison is `!==`, not `<`: restoring or republishing an older content
 * release must also re-seed devices that already have a newer one.
 */
export function decideSeedAction(input: SeedInput): SeedDecision {
  if (!input.localExists) return { action: "seed", reason: "missing" };
  const keepsPreview =
    !!input.previewVersion && input.localVersion === input.previewVersion;
  if (!keepsPreview && input.localVersion !== input.bundledVersion) {
    return { action: "seed", reason: "version-changed" };
  }
  if (!input.integrityOk) return { action: "seed", reason: "integrity" };
  return { action: "ready" };
}

export interface CandidateReport {
  meta: ContentMeta | null;
  /** First column of `PRAGMA quick_check` ("ok" when healthy). */
  quickCheck: string | null;
  /** Row counts of the required tables; a missing table is `undefined`. */
  tableCounts: Record<string, number | undefined>;
}

/**
 * Verify a freshly copied database before it replaces the live one.
 * @returns an error message, or null when the candidate is usable
 */
export function verifyCandidate(
  report: CandidateReport,
  expectedVersion: string,
): string | null {
  if (!report.meta?.content_version) return "content_meta is missing";
  if (report.meta.content_version !== expectedVersion) {
    return `content version ${report.meta.content_version} does not match ${expectedVersion}`;
  }
  if (report.quickCheck !== "ok") {
    return `integrity check failed (${report.quickCheck ?? "no result"})`;
  }
  const empty = REQUIRED_CONTENT_TABLES.filter(
    (t) => !report.tableCounts[t] || report.tableCounts[t]! <= 0,
  );
  if (empty.length) return `empty or missing tables: ${empty.join(", ")}`;
  return null;
}

/** True when a schema mismatch exists between the app build and a content DB. */
export function schemaMismatch(
  meta: ContentMeta | null,
  expectedSchemaVersion: number,
): boolean {
  return meta?.schema_version !== String(expectedSchemaVersion);
}

/** `1.4.0+draft.a1b2c3` → true. Release builds must never ship one. */
export const isDraftVersion = (version: string): boolean => version.includes("+draft");
