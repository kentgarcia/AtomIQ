/**
 * Content database read layer (Part 1 of the "Two-Format" strategy).
 *
 * On first launch the pre-populated, read-only `content.db` that ships inside
 * the app bundle (assets/database/content.db) is copied into the device's
 * writable local storage, into the exact directory that expo-sqlite uses.
 * All subsequent sessions open that local copy.
 *
 * `ContentRepository` then provides typed, high-level queries over the curriculum
 * (units, path nodes, lessons made of cards, the shared item bank, references)
 * and the other content (myths, encyclopedia). JSON
 * columns are hydrated into plain objects by content/curriculum/hydrate.ts.
 *
 * USAGE (in a screen / hook):
 *   import { ensureContentDatabase, contentRepository } from "@/services/content-db";
 *
 *   await ensureContentDatabase();          // call once, near app startup
 *   const lesson = await contentRepository.getLessonContent("isotopes");
 */

import * as FileSystem from "expo-file-system/legacy";
import * as SQLite from "expo-sqlite";
import { importDatabaseFromAssetAsync } from "expo-sqlite";
import { Platform } from "react-native";

import type {
  BlogBlock,
  BlogComment,
  BlogPost,
  BlogUnlock,
  FeedChipKind,
  FeedKind,
  FeedTemplate,
  Myth,
  QuizQuestion,
  QuizType,
  UnitStatement,
} from "@/content/types";

import {
  buildLessonContent,
  mapItem,
  mapLesson,
  mapObjective,
  mapPathNode,
  mapReference,
  mapUnit,
  type ItemRow,
  type LessonCardRow,
  type LessonReferenceRow,
  type LessonRow,
  type ObjectiveRow,
  type PathNodeRow,
  type ReferenceRow,
  type UnitRow,
} from "@/content/curriculum/hydrate";

import type { Npc, NpcLine } from "@/content/npcs/types";
import type {
  Item,
  ItemSurface,
  Lesson,
  LessonContent,
  Objective,
  PathNode,
  Reference,
  Unit,
} from "@/content/curriculum/types";

import type { EncyclopediaEntry } from "@/content/explorer/types";
import { kindOf, type MapSite } from "@/components/map/map-core";
import {
  SAFETY_SECTIONS,
  type SafetyCard,
  type SafetySection,
} from "@/components/safety/safety-core";
import type { ScanTarget } from "@/components/scanner/scanner-core";
import type { ChatNode } from "@/services/chat-core";
import type {
  EntrySourceRow,
  LibraryLink,
  LibraryReferenceRow,
  LibraryUnit,
} from "@/services/library-core";

import {
  REQUIRED_CONTENT_TABLES,
  schemaMismatch,
  decideSeedAction,
  verifyCandidate,
  type CandidateReport,
  type ContentMeta,
} from "@/services/content-db-core";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Name of the bundled + on-device database file. Must match the asset name. */
export const CONTENT_DB_NAME = "content.db";

/** Scratch names used while a new database is copied in and verified before the swap. */
const CONTENT_DB_NEXT_NAME = "content.next.db";
const CONTENT_DB_PREV_NAME = "content.prev.db";

/**
 * Content version compiled into this build: "1.4.0" for a published release or
 * "1.4.0+draft.a1b2c3" while there are unpublished edits.
 *
 * Rewritten ONLY by `scripts/sync-content.js` and `npm run release:content`
 * from the release ledger (content/releases.json). Never edit it by hand.
 * The same value is stamped into the bundled database's `content_meta` table,
 * so a device always compares the version of the data it actually holds.
 */
export const CONTENT_DB_VERSION = "0.0.0+draft.449b85";

/**
 * Shape of the content this build's repository reads (columns, step types,
 * tables). Bump BY HAND when that shape changes. A release that changes it is a
 * MAJOR content release. See docs/CONTENT_SQLITE_AND_STUDIO_SPEC.md §3.2.
 */
export const CONTENT_SCHEMA_VERSION = 4;

/** Marker files from older builds / developer preview, stored next to the database. */
const LEGACY_VERSION_MARKER = "content.db.version";
const PREVIEW_MARKER = "content.preview";

/**
 * URI helpers for the SQLite directory.
 *
 * `SQLite.defaultDatabaseDirectory` is a raw filesystem path on Android
 * (e.g. `/data/user/0/<pkg>/files/SQLite` — no `file://` scheme), while the
 * file-system APIs require a `file://` URI. Passing the raw path straight
 * into `File`/`Directory` breaks seeding on Android release builds, so every
 * file operation below goes through these normalized URIs via the
 * battle-tested legacy `expo-file-system` API. The actual database copy uses
 * expo-sqlite's own official primitive (the same one `SQLiteProvider`
 * uses for asset databases), which handles native paths internally.
 */
const toFileUri = (path: string): string =>
  path.startsWith("file://") ? path : `file://${path}`;

const dbDirUri = (): string =>
  toFileUri(SQLite.defaultDatabaseDirectory.replace(/\/*$/, ""));

const dbFileUri = (name: string = CONTENT_DB_NAME): string => `${dbDirUri()}/${name}`;

/** Delete a database file together with its journal sidecars. */
async function deleteDatabaseFiles(name: string): Promise<void> {
  for (const ext of ["", "-wal", "-shm", "-journal"]) {
    await FileSystem.deleteAsync(`${dbFileUri(name)}${ext}`, { idempotent: true });
  }
}

// ---------------------------------------------------------------------------
// Seeding: bundled asset → verified scratch copy → atomic swap
// ---------------------------------------------------------------------------

let seeded = false;
let seedPromise: Promise<void> | null = null;
let lastSeedError: Error | null = null;
/** `content_meta` of the database currently in use (null until known). */
let activeMeta: ContentMeta | null = null;
let previewActive = false;

/**
 * Open a database file in the SQLite directory and report what is in it.
 * The file must exist: opening a missing name would silently create an empty one.
 */
async function readContentReport(name: string): Promise<CandidateReport> {
  const db = await SQLite.openDatabaseAsync(name);
  try {
    let meta: ContentMeta | null = null;
    try {
      const rows = await db.getAllAsync<{ key: string; value: string }>(
        "SELECT key, value FROM content_meta",
      );
      meta = Object.fromEntries(rows.map((r) => [r.key, r.value])) as ContentMeta;
    } catch {
      meta = null; // table missing: database predates content_meta
    }

    let quickCheck: string | null = null;
    try {
      const row = await db.getFirstAsync<Record<string, unknown>>("PRAGMA quick_check");
      quickCheck = row ? String(Object.values(row)[0]) : null;
    } catch {
      quickCheck = null;
    }

    const tableCounts: Record<string, number | undefined> = {};
    for (const table of REQUIRED_CONTENT_TABLES) {
      try {
        const row = await db.getFirstAsync<{ count: number }>(
          `SELECT COUNT(*) AS count FROM ${table}`,
        );
        tableCounts[table] = row?.count ?? 0;
      } catch {
        tableCounts[table] = undefined;
      }
    }
    return { meta, quickCheck, tableCounts };
  } finally {
    await db.closeAsync().catch(() => {});
  }
}

/** Inspect the on-device database, if there is one. */
async function readLocalState(): Promise<{
  exists: boolean;
  meta: ContentMeta | null;
  integrityOk: boolean;
}> {
  const info = await FileSystem.getInfoAsync(dbFileUri());
  if (!info.exists) return { exists: false, meta: null, integrityOk: false };
  try {
    const report = await readContentReport(CONTENT_DB_NAME);
    const version = report.meta?.content_version ?? "";
    return {
      exists: true,
      meta: report.meta,
      integrityOk: verifyCandidate(report, version) === null,
    };
  } catch (e) {
    console.warn("[content-db] Existing copy could not be read", e);
    return { exists: true, meta: null, integrityOk: false };
  }
}

async function readPreviewMarker(): Promise<string | null> {
  const uri = `${dbDirUri()}/${PREVIEW_MARKER}`;
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists) return null;
    return (await FileSystem.readAsStringAsync(uri)).trim() || null;
  } catch {
    return null;
  }
}

/** Close and forget the cached read handle so files can be replaced safely. */
async function releaseContentHandle(): Promise<void> {
  const pending = dbPromise;
  dbPromise = null;
  if (!pending) return;
  try {
    const handle = await pending;
    await handle.closeAsync();
  } catch {
    /* handle never opened, or already closed */
  }
}

/**
 * Replace the live database with the verified scratch copy.
 *
 * The previous file is moved aside first and only deleted once the new one is
 * in place. If the final move fails, the old content is moved back instead of
 * leaving the app with none. (If the process dies in between, the next launch
 * finds no `content.db` and seeds from the bundle again.)
 */
async function swapInCandidate(): Promise<void> {
  await releaseContentHandle();
  await deleteDatabaseFiles(CONTENT_DB_PREV_NAME);

  const hadLive = (await FileSystem.getInfoAsync(dbFileUri())).exists;
  if (hadLive) {
    // Sidecars belong to the old file; drop them before it is renamed.
    for (const ext of ["-wal", "-shm", "-journal"]) {
      await FileSystem.deleteAsync(`${dbFileUri()}${ext}`, { idempotent: true });
    }
    await FileSystem.moveAsync({ from: dbFileUri(), to: dbFileUri(CONTENT_DB_PREV_NAME) });
  }
  try {
    await FileSystem.moveAsync({
      from: dbFileUri(CONTENT_DB_NEXT_NAME),
      to: dbFileUri(),
    });
  } catch (e) {
    if (hadLive) {
      await FileSystem.moveAsync({
        from: dbFileUri(CONTENT_DB_PREV_NAME),
        to: dbFileUri(),
      }).catch(() => {});
    }
    throw e;
  }
  await deleteDatabaseFiles(CONTENT_DB_PREV_NAME);
}

/**
 * Copy the bundled asset into a scratch file with expo-sqlite's official
 * asset-import primitive (the one `SQLiteProvider` uses for `assetSource`),
 * verify it, then swap it in. On any failure the existing `content.db` is untouched.
 */
async function installBundledDatabase(): Promise<void> {
  await deleteDatabaseFiles(CONTENT_DB_NEXT_NAME);
  await importDatabaseFromAssetAsync(CONTENT_DB_NEXT_NAME, {
    assetId: require("@/assets/database/content.db"),
    forceOverwrite: true,
  });

  const report = await readContentReport(CONTENT_DB_NEXT_NAME);
  const problem = verifyCandidate(report, CONTENT_DB_VERSION);
  if (problem) {
    await deleteDatabaseFiles(CONTENT_DB_NEXT_NAME);
    throw new Error(`[content-db] Bundled database failed verification: ${problem}`);
  }
  if (schemaMismatch(report.meta, CONTENT_SCHEMA_VERSION)) {
    const message =
      `[content-db] Bundled schema ${report.meta?.schema_version} does not match ` +
      `this build (${CONTENT_SCHEMA_VERSION}). Re-run npm run sync-content.`;
    if (__DEV__) {
      await deleteDatabaseFiles(CONTENT_DB_NEXT_NAME);
      throw new Error(message);
    }
    console.warn(message); // release builds keep the bundle: it is all we have
  }

  await swapInCandidate();
  activeMeta = report.meta;
}

/**
 * Ensure a verified content.db that matches this build is present in writable storage.
 *
 *   1. Read `content_meta` from the on-device copy. If its version equals
 *      CONTENT_DB_VERSION and it passes the integrity check, it is ready.
 *   2. Otherwise copy the bundle to `content.next.db`, verify it (version,
 *      `PRAGMA quick_check`, every required table non-empty) and swap it in.
 *
 * Idempotent: concurrent callers share one run. Screens normally do not call
 * this: `ContentGate` waits for it at startup. `getReadyContentDb()` keeps
 * calling it as a safety net.
 */
export function ensureContentDatabase(): Promise<void> {
  // Bundled-asset copying only applies to native platforms.
  if (Platform.OS === "web") {
    console.warn("[content-db] Bundled asset seeding is native-only; open the DB directly instead.");
    return Promise.resolve();
  }
  if (seeded) return Promise.resolve();
  if (seedPromise) return seedPromise;

  seedPromise = (async () => {
    try {
      // The SQLite directory is created lazily by expo-sqlite; make sure it exists.
      const dirInfo = await FileSystem.getInfoAsync(dbDirUri());
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(dbDirUri(), { intermediates: true });
      }

      const previewVersion = __DEV__ ? await readPreviewMarker() : null;
      const local = await readLocalState();
      const decision = decideSeedAction({
        localExists: local.exists,
        localVersion: local.meta?.content_version ?? null,
        integrityOk: local.integrityOk,
        bundledVersion: CONTENT_DB_VERSION,
        previewVersion,
      });

      if (decision.action === "ready") {
        activeMeta = local.meta;
        previewActive = !!previewVersion && local.meta?.content_version === previewVersion;
        seeded = true;
        return;
      }

      console.log(`[content-db] Seeding bundled content ${CONTENT_DB_VERSION} (${decision.reason})…`);
      await installBundledDatabase();

      // Clean up what older builds and developer preview left behind.
      await FileSystem.deleteAsync(`${dbDirUri()}/${LEGACY_VERSION_MARKER}`, { idempotent: true });
      await FileSystem.deleteAsync(`${dbDirUri()}/${PREVIEW_MARKER}`, { idempotent: true });
      previewActive = false;

      console.log(`[content-db] Ready: ${CONTENT_DB_NAME} v${CONTENT_DB_VERSION}`);
      seeded = true;
    } catch (e) {
      lastSeedError = e instanceof Error ? e : new Error(String(e));
      console.error("[content-db] Seeding content database FAILED:", lastSeedError);
      throw lastSeedError;
    } finally {
      seedPromise = null;
    }
  })();

  return seedPromise;
}

/** Forget a failed run and try again (used by the Try again button). */
export function retryContentDatabase(): Promise<void> {
  lastSeedError = null;
  seeded = false;
  return ensureContentDatabase();
}

/** Status of the content database — surfaced in the Settings screen. */
export function getContentDbStatus(): {
  seeded: boolean;
  /** Version of the data actually in use (falls back to the build's version until known). */
  version: string;
  /** Version compiled into this build. */
  bundledVersion: string;
  schemaVersion: string | null;
  builtAt: string | null;
  /** True while a Content Studio preview replaces the bundled content (dev builds only). */
  preview: boolean;
  lastError: string | null;
} {
  return {
    seeded,
    version: activeMeta?.content_version ?? CONTENT_DB_VERSION,
    bundledVersion: CONTENT_DB_VERSION,
    schemaVersion: activeMeta?.schema_version ?? null,
    builtAt: activeMeta?.built_at ?? null,
    preview: previewActive,
    lastError: lastSeedError ? lastSeedError.message : null,
  };
}

// ---------------------------------------------------------------------------
// Developer preview: load the in-progress database from Content Studio
// ---------------------------------------------------------------------------

/**
 * Download the working database from Content Studio (`STUDIO_PREVIEW=1`) and use
 * it instead of the bundle, until `resetToBundledContent()` or a reinstall.
 * Dev builds only. The download is verified exactly like the bundled copy.
 *
 * @param baseUrl e.g. `http://192.168.1.20:8787`
 * @param code the short pairing code shown in Studio
 */
export async function loadPreviewContent(baseUrl: string, code: string): Promise<ContentMeta> {
  if (!__DEV__) throw new Error("Content preview is only available in development builds.");
  const root = baseUrl.replace(/\/+$/, "");
  const url = `${root}/api/preview.db?code=${encodeURIComponent(code.trim())}`;

  await ensureContentDatabase();
  await deleteDatabaseFiles(CONTENT_DB_NEXT_NAME);
  const result = await FileSystem.downloadAsync(url, dbFileUri(CONTENT_DB_NEXT_NAME));
  if (result.status !== 200) {
    await deleteDatabaseFiles(CONTENT_DB_NEXT_NAME);
    throw new Error(
      result.status === 403
        ? "Studio refused the pairing code."
        : `Studio answered HTTP ${result.status}.`,
    );
  }

  const report = await readContentReport(CONTENT_DB_NEXT_NAME);
  const version = report.meta?.content_version ?? "";
  const problem = verifyCandidate(report, version);
  if (problem || schemaMismatch(report.meta, CONTENT_SCHEMA_VERSION)) {
    await deleteDatabaseFiles(CONTENT_DB_NEXT_NAME);
    throw new Error(
      problem ??
        `Studio's schema (${report.meta?.schema_version}) does not match this build (${CONTENT_SCHEMA_VERSION}).`,
    );
  }

  await swapInCandidate();
  await FileSystem.writeAsStringAsync(`${dbDirUri()}/${PREVIEW_MARKER}`, version);
  activeMeta = report.meta;
  previewActive = true;
  seeded = true;
  return report.meta as ContentMeta;
}

/** Drop a developer preview and restore the content bundled with this build. */
export async function resetToBundledContent(): Promise<void> {
  await FileSystem.deleteAsync(`${dbDirUri()}/${PREVIEW_MARKER}`, { idempotent: true });
  seeded = false;
  previewActive = false;
  await ensureContentDatabase();
}

// ---------------------------------------------------------------------------
// Database handle
// ---------------------------------------------------------------------------

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Open (and cache) the writable content database. Assumes
 * `ensureContentDatabase()` has been called first.
 */
export function getContentDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(CONTENT_DB_NAME).catch((error) => {
      // Never cache a rejected handle — a transient open failure must not
      // poison every later query for the rest of the app session.
      dbPromise = null;
      throw error;
    });
  }
  return dbPromise;
}

/**
 * Safe entry point used by the repository: guarantees the bundled database
 * has been copied into writable storage before opening it. Idempotent and
 * cheap after the first call, so it is safe to call on every query.
 */
export async function getReadyContentDb(): Promise<SQLite.SQLiteDatabase> {
  await ensureContentDatabase();
  return getContentDb();
}

// ---------------------------------------------------------------------------
// Row → domain object mapping
// ---------------------------------------------------------------------------

/** Safely JSON.parse a column that may be null/empty. */
function parseJsonArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Safely JSON.parse a column that holds an array of objects (e.g. `sources`). */
function parseJsonRecords<T>(raw: string | null | undefined): T[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

/** Safely JSON.parse a column that holds a single JSON object. */
function parseJsonObject<T>(raw: string | null | undefined): T | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? (parsed as T) : null;
  } catch {
    return null;
  }
}

/** Parse a JSON-encoded string/number/boolean back to its runtime value. */
function parseScalarJson(raw: string | null | undefined): string | number | boolean {
  if (raw === null || raw === undefined || raw === "") return 0;
  try {
    return JSON.parse(raw) as string | number | boolean;
  } catch {
    return Number(raw) || 0;
  }
}

// ---------------------------------------------------------------------------
// Quiz row mapping
// ---------------------------------------------------------------------------

/** Raw shape of a `mythbuster_questions` row as returned by expo-sqlite. */
interface MythBusterQuestionRow {
  id: string;
  difficulty: string;
  type: QuizType;
  question: string;
  options: string; // JSON array of strings
  correct_answer: string; // JSON-encoded number
  explanation: string;
  points: number;
}

/** Raw shape of a `myths` row as returned by expo-sqlite. */
interface MythRow {
  id: string;
  title: string;
  myth_statement: string;
  reality: string;
  explanation: string;
  category: string;
  difficulty: string;
  sources: string; // JSON array of Source objects
  related_facts: string; // JSON array of fact ids
  related_lessons: string; // JSON array of lesson ids
  image: string | null;
  tags: string; // JSON array of strings
  popularity: number;
}

/** Flatten a mythbuster question row into the domain `QuizQuestion` shape. */
function mapMythBusterQuestionRow(row: MythBusterQuestionRow): QuizQuestion {
  return {
    id: row.id,
    type: row.type,
    question: row.question,
    options: parseJsonArray(row.options),
    correctAnswer: parseScalarJson(row.correct_answer) as QuizQuestion["correctAnswer"],
    explanation: row.explanation,
    difficulty: row.difficulty as QuizQuestion["difficulty"],
    points: row.points,
  };
}

/** Flatten a myth row into the domain `Myth` shape, mirroring content/types.ts. */
function mapMythRow(row: MythRow): Myth {
  const relatedLessons = parseJsonArray(row.related_lessons);
  return {
    id: row.id,
    title: row.title,
    mythStatement: row.myth_statement,
    reality: row.reality,
    explanation: row.explanation,
    category: row.category,
    difficulty: row.difficulty as Myth["difficulty"],
    sources: parseJsonRecords(row.sources),
    ...(relatedLessons.length ? { relatedLessons } : {}),
    ...(row.image ? { image: row.image } : {}),
    tags: parseJsonArray(row.tags),
    popularity: row.popularity,
  };
}

/** Raw shape of an `encyclopedia_entries` row as returned by expo-sqlite. */
interface EncyclopediaEntryRow {
  id: string;
  term: string;
  definition: string;
  category: string;
  related_terms: string; // JSON array of term ids
  quick_facts: string; // JSON array of strings
  sources: string; // JSON array of Source objects
  image: string | null;
  debunking_snippet: string | null;
  related_myths: string; // JSON array of myth ids
  difficulty: string;
}

/** Flatten an encyclopedia entry row into the domain `EncyclopediaEntry` shape. */
function mapEncyclopediaEntryRow(row: EncyclopediaEntryRow): EncyclopediaEntry {
  return {
    id: row.id,
    term: row.term,
    definition: row.definition,
    category: row.category,
    relatedTerms: parseJsonArray(row.related_terms),
    quickFacts: parseJsonArray(row.quick_facts),
    sources: parseJsonRecords(row.sources),
    ...(row.image ? { image: row.image } : {}),
    ...(row.debunking_snippet ? { debunkingSnippet: row.debunking_snippet } : {}),
    ...(row.related_myths ? { relatedMyths: parseJsonArray(row.related_myths) } : {}),
    difficulty: row.difficulty as EncyclopediaEntry["difficulty"],
  };
}

/** Raw shape of a `feed_templates` row. */
interface FeedTemplateRow {
  id: string;
  npc_id: string | null;
  poster_pool: string;
  kind: string;
  trigger: string;
  condition: string;
  text: string;
  chip: string | null;
  reactors: string;
  weight: number;
}

/** Raw shape of a `blog_posts` row. */
interface BlogPostRow {
  id: string;
  npc_id: string;
  unit_id: string | null;
  lesson_id: string | null;
  position: number;
  title: string;
  hook: string;
  cover: string;
  read_min: number;
  unlock: string;
  blocks: string;
  reactors: string;
}

/** Raw shape of a `blog_comments` row. */
interface BlogCommentRow {
  id: string;
  blog_id: string;
  npc_id: string;
  position: number;
  text: string;
  chip: string | null;
}

function mapFeedTemplateRow(row: FeedTemplateRow): FeedTemplate {
  return {
    id: row.id,
    npcId: row.npc_id,
    posterPool: parseJsonArray(row.poster_pool),
    kind: row.kind as FeedKind,
    trigger: row.trigger as FeedTemplate["trigger"],
    condition: parseJsonObject<Record<string, unknown>>(row.condition) ?? {},
    text: row.text,
    chip: (row.chip as FeedChipKind | null) ?? null,
    reactors: parseJsonArray(row.reactors),
    weight: row.weight,
  };
}

function mapBlogPostRow(row: BlogPostRow): BlogPost {
  return {
    id: row.id,
    npcId: row.npc_id,
    unitId: row.unit_id,
    lessonId: row.lesson_id,
    position: row.position,
    title: row.title,
    hook: row.hook,
    cover: row.cover,
    readMin: row.read_min,
    unlock: parseJsonObject<BlogUnlock>(row.unlock) ?? { trigger: "none" },
    blocks: parseJsonRecords<BlogBlock>(row.blocks),
    reactors: parseJsonArray(row.reactors),
  };
}

function mapBlogCommentRow(row: BlogCommentRow): BlogComment {
  return {
    id: row.id,
    blogId: row.blog_id,
    npcId: row.npc_id,
    position: row.position,
    text: row.text,
    chip: parseJsonObject<NonNullable<BlogComment["chip"]>>(row.chip),
  };
}

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

/**
 * Typed read-only repository over the content database.
 * All methods hydrate and cache-free each call, so they always reflect the
 * on-device db. Each method first ensures the bundled db was seeded.
 */
export class ContentRepository {
  // -------------------------------------------------------------------------
  // Curriculum: units, path, lessons made of cards, the item bank, references
  // -------------------------------------------------------------------------

  /** Units in path order. */
  async getUnits(): Promise<Unit[]> {
    const db = await getReadyContentDb();
    const rows = await db.getAllAsync<UnitRow>("SELECT * FROM units ORDER BY position ASC");
    return rows.map(mapUnit);
  }

  /** NPC teachers in cast order. Throws when the bundled database has no `npcs` table (the facade falls back). */
  async getNpcs(): Promise<Npc[]> {
    const db = await getReadyContentDb();
    const rows = await db.getAllAsync<{ id: string; name: string; title: string; field: string; bio: string; spec: string; position: number }>(
      "SELECT id, name, title, field, bio, spec, position FROM npcs ORDER BY position ASC",
    );
    return rows.map((r) => ({ id: r.id, name: r.name, title: r.title, field: r.field, bio: r.bio, spec: JSON.parse(r.spec), position: r.position }));
  }

  /** NPC voice lines. Throws when the bundled database has no `npc_lines` table. */
  async getNpcLines(): Promise<NpcLine[]> {
    const db = await getReadyContentDb();
    const rows = await db.getAllAsync<{ id: string; npc_id: string; kind: string; lesson_id: string | null; journey_id: string | null; text: string; pose: string }>(
      "SELECT id, npc_id, kind, lesson_id, journey_id, text, pose FROM npc_lines ORDER BY id ASC",
    );
    return rows.map((r) => ({ id: r.id, npcId: r.npc_id, kind: r.kind as NpcLine["kind"], lessonId: r.lesson_id, journeyId: r.journey_id, text: r.text, pose: r.pose as NpcLine["pose"] }));
  }

  /** The teachers' chat nodes (docs/PHONE_SPEC.md §7.1). Throws when the bundled database predates the `chat_nodes` table. */
  async getChatNodes(): Promise<ChatNode[]> {
    const db = await getReadyContentDb();
    const rows = await db.getAllAsync<{
      id: string;
      npc_id: string;
      kind: string;
      trigger: string | null;
      title: string | null;
      text: string;
      pose: string;
      replies: string;
      position: number;
    }>(
      'SELECT id, npc_id, kind, "trigger" AS "trigger", title, text, pose, replies, position FROM chat_nodes ORDER BY npc_id ASC, position ASC, id ASC',
    );
    return rows.map((r) => {
      let replies: ChatNode["replies"] = [];
      try {
        const parsed: unknown = JSON.parse(r.replies);
        if (Array.isArray(parsed)) replies = parsed as ChatNode["replies"];
      } catch {
        // A row with unreadable replies has no pills rather than breaking the thread.
      }
      return {
        id: r.id,
        npcId: r.npc_id,
        kind: r.kind as ChatNode["kind"],
        trigger: r.trigger,
        title: r.title,
        text: r.text,
        pose: r.pose,
        replies,
        position: r.position,
      };
    });
  }

  /** The Atom Scanner's targets, by scene then position (docs/PHONE_SPEC.md §8). Throws when the bundled database predates `scan_targets`. */
  async getScanTargets(): Promise<ScanTarget[]> {
    const db = await getReadyContentDb();
    const rows = await db.getAllAsync<{
      id: string;
      name: string;
      scene: string;
      object: string;
      blurb: string;
      composition: string;
      fun_fact: string;
      atomdex_entry_id: string | null;
      position: number;
    }>(
      "SELECT id, name, scene, object, blurb, composition, fun_fact, atomdex_entry_id, position FROM scan_targets ORDER BY scene ASC, position ASC, id ASC",
    );
    const sourceRows = await db.getAllAsync<{
      target_id: string;
      publisher: string;
      title: string;
    }>(
      "SELECT l.target_id, r.publisher, r.title FROM scan_target_references l JOIN content_references r ON r.id = l.reference_id ORDER BY l.target_id, r.id",
    );
    const sources = new Map<string, string[]>();
    for (const s of sourceRows)
      sources.set(s.target_id, [
        ...(sources.get(s.target_id) ?? []),
        `${s.publisher}, ${s.title}`,
      ]);
    return rows.map((r) => {
      let composition: ScanTarget["composition"] = [];
      try {
        const parsed: unknown = JSON.parse(r.composition);
        if (Array.isArray(parsed))
          composition = parsed as ScanTarget["composition"];
      } catch {
        // A row with unreadable elements shows no chips rather than breaking the scanner.
      }
      return {
        id: r.id,
        name: r.name,
        scene: r.scene,
        object: r.object,
        blurb: r.blurb,
        composition,
        funFact: r.fun_fact,
        atomdexEntryId: r.atomdex_entry_id,
        position: r.position,
        sources: sources.get(r.id) ?? [],
      };
    });
  }

  /** The Safety Guide's cards, by section then position (docs/PHONE_SPEC.md §5.9). Throws when the bundled database predates `safety_cards`. */
  async getSafetyCards(): Promise<SafetyCard[]> {
    const db = await getReadyContentDb();
    const rows = await db.getAllAsync<{
      id: string;
      section: string;
      title: string;
      summary: string;
      steps: string;
      icon: string;
      entry_id: string | null;
      position: number;
    }>(
      "SELECT id, section, title, summary, steps, icon, entry_id, position FROM safety_cards ORDER BY section ASC, position ASC, id ASC",
    );
    const sourceRows = await db.getAllAsync<{
      card_id: string;
      publisher: string;
      title: string;
    }>(
      "SELECT l.card_id, r.publisher, r.title FROM safety_card_references l JOIN content_references r ON r.id = l.reference_id ORDER BY l.card_id, r.id",
    );
    const sources = new Map<string, string[]>();
    for (const s of sourceRows)
      sources.set(s.card_id, [
        ...(sources.get(s.card_id) ?? []),
        `${s.publisher}, ${s.title}`,
      ]);
    const cards: SafetyCard[] = [];
    for (const r of rows) {
      if (!(SAFETY_SECTIONS as readonly string[]).includes(r.section)) continue;
      let steps: string[] = [];
      try {
        const parsed: unknown = JSON.parse(r.steps);
        if (Array.isArray(parsed))
          steps = parsed.filter((s): s is string => typeof s === "string");
      } catch {
        // A card whose lines cannot be read is left out below rather than shown empty.
      }
      cards.push({
        id: r.id,
        section: r.section as SafetySection,
        title: r.title,
        summary: r.summary,
        steps,
        icon: r.icon,
        entryId: r.entry_id,
        position: r.position,
        sources: sources.get(r.id) ?? [],
      });
    }
    return cards;
  }

  /** The Nuclear Map's sites in reading order (docs/PHONE_SPEC.md §5.8). Throws when the bundled database predates `map_sites`. */
  async getMapSites(): Promise<MapSite[]> {
    const db = await getReadyContentDb();
    const rows = await db.getAllAsync<{
      id: string;
      name: string;
      place: string;
      kind: string;
      year: string;
      lat: number;
      lon: number;
      blurb: string;
      fact: string;
      entry_id: string | null;
      position: number;
    }>(
      "SELECT id, name, place, kind, year, lat, lon, blurb, fact, entry_id, position FROM map_sites ORDER BY position ASC, id ASC",
    );
    const sourceRows = await db.getAllAsync<{
      site_id: string;
      publisher: string;
      title: string;
    }>(
      "SELECT l.site_id, r.publisher, r.title FROM map_site_references l JOIN content_references r ON r.id = l.reference_id ORDER BY l.site_id, r.id",
    );
    const sources = new Map<string, string[]>();
    for (const s of sourceRows)
      sources.set(s.site_id, [
        ...(sources.get(s.site_id) ?? []),
        `${s.publisher}, ${s.title}`,
      ]);
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      place: r.place,
      kind: kindOf(r.kind),
      year: r.year,
      lat: r.lat,
      lon: r.lon,
      blurb: r.blurb,
      fact: r.fact,
      entryId: r.entry_id,
      position: r.position,
      sources: sources.get(r.id) ?? [],
    }));
  }

  // -------------------------------------------------------------------------
  // NPC feed and mini blog (docs/NPC_FEED_SPEC.md §6). These throw when the bundled
  // database predates the feed tables; `services/feed.ts` treats that as "no content".
  // -------------------------------------------------------------------------

  /** Feed post templates, in id order. */
  async getFeedTemplates(): Promise<FeedTemplate[]> {
    const db = await getReadyContentDb();
    const rows = await db.getAllAsync<FeedTemplateRow>(
      'SELECT id, npc_id, poster_pool, kind, "trigger" AS "trigger", condition, text, chip, reactors, weight FROM feed_templates ORDER BY id ASC',
    );
    return rows.map(mapFeedTemplateRow);
  }

  /** Blog pieces in reading order (unit order, then position within it). */
  async getBlogPosts(): Promise<BlogPost[]> {
    const db = await getReadyContentDb();
    const rows = await db.getAllAsync<BlogPostRow>(
      `SELECT b.* FROM blog_posts b LEFT JOIN units u ON u.id = b.unit_id
        ORDER BY COALESCE(u.position, 0) ASC, b.position ASC, b.id ASC`,
    );
    return rows.map(mapBlogPostRow);
  }

  /** One blog piece, or `null`. */
  async getBlogPost(id: string): Promise<BlogPost | null> {
    const db = await getReadyContentDb();
    const row = await db.getFirstAsync<BlogPostRow>("SELECT * FROM blog_posts WHERE id = ? LIMIT 1", [id]);
    return row ? mapBlogPostRow(row) : null;
  }

  /** The NPC comments authored with a blog piece, in order (possibly none). */
  async getBlogComments(blogId: string): Promise<BlogComment[]> {
    const db = await getReadyContentDb();
    const rows = await db.getAllAsync<BlogCommentRow>(
      "SELECT * FROM blog_comments WHERE blog_id = ? ORDER BY position ASC, id ASC",
      [blogId],
    );
    return rows.map(mapBlogCommentRow);
  }

  /** The sources of a blog piece (same shape and table as lesson references). */
  async getBlogReferences(blogId: string): Promise<Reference[]> {
    const db = await getReadyContentDb();
    const rows = await db.getAllAsync<ReferenceRow>(
      `SELECT r.* FROM blog_references br
         JOIN content_references r ON r.id = br.reference_id
        WHERE br.blog_id = ? ORDER BY r.id ASC`,
      [blogId],
    );
    return rows.map(mapReference);
  }

  /** One unit, or `null`. */
  async getUnitById(id: string): Promise<Unit | null> {
    const db = await getReadyContentDb();
    const row = await db.getFirstAsync<UnitRow>("SELECT * FROM units WHERE id = ? LIMIT 1", [id]);
    return row ? mapUnit(row) : null;
  }

  /** Objectives, optionally for one unit, in path order. */
  async getObjectives(unitId?: string): Promise<Objective[]> {
    const db = await getReadyContentDb();
    const rows = unitId
      ? await db.getAllAsync<ObjectiveRow>("SELECT * FROM objectives WHERE unit_id = ? ORDER BY position ASC", [unitId])
      : await db.getAllAsync<ObjectiveRow>(
          "SELECT o.* FROM objectives o JOIN units u ON u.id = o.unit_id ORDER BY u.position ASC, o.position ASC",
        );
    return rows.map(mapObjective);
  }

  /** Path nodes (lesson, practice, checkpoint), optionally for one unit, in path order. */
  async getPathNodes(unitId?: string): Promise<PathNode[]> {
    const db = await getReadyContentDb();
    const rows = unitId
      ? await db.getAllAsync<PathNodeRow>("SELECT * FROM path_nodes WHERE unit_id = ? ORDER BY position ASC", [unitId])
      : await db.getAllAsync<PathNodeRow>(
          "SELECT n.* FROM path_nodes n JOIN units u ON u.id = n.unit_id ORDER BY u.position ASC, n.position ASC",
        );
    return rows.map(mapPathNode);
  }

  /** Lesson metadata only (no cards), optionally for one unit. */
  async getLessons(unitId?: string): Promise<Lesson[]> {
    const db = await getReadyContentDb();
    const rows = unitId
      ? await db.getAllAsync<LessonRow>("SELECT * FROM lessons WHERE unit_id = ? ORDER BY id ASC", [unitId])
      : await db.getAllAsync<LessonRow>("SELECT * FROM lessons ORDER BY id ASC");
    return rows.map(mapLesson);
  }

  /** Lesson metadata for one id, or `null`. */
  async getLessonById(id: string): Promise<Lesson | null> {
    const db = await getReadyContentDb();
    const row = await db.getFirstAsync<LessonRow>("SELECT * FROM lessons WHERE id = ? LIMIT 1", [id]);
    return row ? mapLesson(row) : null;
  }

  /** A playable lesson: ordered cards with their bank items attached, plus its references. */
  async getLessonContent(id: string): Promise<LessonContent | null> {
    const db = await getReadyContentDb();
    const lessonRow = await db.getFirstAsync<LessonRow>("SELECT * FROM lessons WHERE id = ? LIMIT 1", [id]);
    if (!lessonRow) return null;
    const cardRows = await db.getAllAsync<LessonCardRow>(
      "SELECT * FROM lesson_cards WHERE lesson_id = ? ORDER BY position ASC",
      [id],
    );
    const itemRows = await db.getAllAsync<ItemRow>(
      "SELECT i.* FROM items i JOIN lesson_cards c ON c.item_id = i.id WHERE c.lesson_id = ?",
      [id],
    );
    const referenceRows = await db.getAllAsync<LessonReferenceRow>(
      `SELECT r.*, lr.supports FROM lesson_references lr
         JOIN content_references r ON r.id = lr.reference_id
        WHERE lr.lesson_id = ? ORDER BY lr.position ASC`,
      [id],
    );
    return buildLessonContent(lessonRow, cardRows, itemRows, referenceRows);
  }

  /** References for a unit, in display order. */
  async getUnitReferences(unitId: string): Promise<Reference[]> {
    const db = await getReadyContentDb();
    const rows = await db.getAllAsync<ReferenceRow>(
      `SELECT r.* FROM unit_references ur
         JOIN content_references r ON r.id = ur.reference_id
        WHERE ur.unit_id = ? ORDER BY ur.position ASC`,
      [unitId],
    );
    return rows.map(mapReference);
  }

  /** Items from the bank, filtered by objective and/or surface. Predictions are never returned. */
  async getItems(filter: { objectiveIds?: string[]; surface?: ItemSurface } = {}): Promise<Item[]> {
    const db = await getReadyContentDb();
    const where: string[] = ["type != 'predict'"];
    const params: string[] = [];
    if (filter.objectiveIds) {
      if (filter.objectiveIds.length === 0) return [];
      where.push(`objective_id IN (${filter.objectiveIds.map(() => "?").join(",")})`);
      params.push(...filter.objectiveIds);
    }
    if (filter.surface) {
      where.push("EXISTS (SELECT 1 FROM json_each(items.surfaces) WHERE json_each.value = ?)");
      params.push(filter.surface);
    }
    const rows = await db.getAllAsync<ItemRow>(`SELECT * FROM items WHERE ${where.join(" AND ")} ORDER BY id ASC`, params);
    return rows.map(mapItem);
  }

  /** Bank items by id, in the order asked. Unknown ids are skipped. */
  async getItemsByIds(ids: string[]): Promise<Item[]> {
    if (ids.length === 0) return [];
    const db = await getReadyContentDb();
    const rows = await db.getAllAsync<ItemRow>(`SELECT * FROM items WHERE id IN (${ids.map(() => "?").join(",")})`, ids);
    const byId = new Map(rows.map((r) => [r.id, mapItem(r)]));
    return ids.map((id) => byId.get(id)).filter((i): i is Item => !!i);
  }

  /**
   * Everything the Reference Library needs: every content reference, where each is cited (units, lessons, blog
   * pieces, with the unit they belong to), the sources written on AtomDex entries, and the units in path order.
   */
  async getReferenceLibraryData(): Promise<{
    references: LibraryReferenceRow[];
    links: LibraryLink[];
    entrySources: EntrySourceRow[];
    units: LibraryUnit[];
  }> {
    const db = await getReadyContentDb();
    const refRows = await db.getAllAsync<ReferenceRow>(
      "SELECT * FROM content_references ORDER BY id ASC",
    );
    const unitLinks = await db.getAllAsync<{
      reference_id: string;
      unit_id: string;
      title: string;
    }>(
      "SELECT ur.reference_id, u.id AS unit_id, u.title FROM unit_references ur JOIN units u ON u.id = ur.unit_id",
    );
    const lessonLinks = await db.getAllAsync<{
      reference_id: string;
      unit_id: string;
      title: string;
    }>(
      "SELECT lr.reference_id, l.unit_id, l.title FROM lesson_references lr JOIN lessons l ON l.id = lr.lesson_id",
    );
    const blogLinks = await db.getAllAsync<{
      reference_id: string;
      unit_id: string | null;
      title: string;
    }>(
      "SELECT br.reference_id, b.unit_id, b.title FROM blog_references br JOIN blog_posts b ON b.id = br.blog_id",
    );
    const entryRows = await db.getAllAsync<{
      id: string;
      term: string;
      sources: string;
    }>(
      "SELECT id, term, sources FROM encyclopedia_entries WHERE sources != '[]'",
    );
    const unitRows = await db.getAllAsync<{
      id: string;
      title: string;
      position: number;
    }>("SELECT id, title, position FROM units ORDER BY position ASC");

    const entrySources: EntrySourceRow[] = [];
    for (const e of entryRows) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(e.sources);
      } catch {
        continue;
      }
      if (!Array.isArray(parsed)) continue;
      for (const s of parsed as {
        title?: string;
        url?: string;
        author?: string;
        type?: string;
      }[]) {
        entrySources.push({
          entryId: e.id,
          entryTerm: e.term,
          title: s.title ?? "",
          url: s.url ?? "",
          author: s.author ?? "",
          type: s.type ?? "article",
        });
      }
    }

    return {
      references: refRows.map((row) => {
        const r = mapReference(row);
        return {
          id: r.id,
          kind: r.kind,
          publisher: r.publisher,
          title: r.title,
          year: r.year,
          url: r.url,
          verified: r.verified,
        };
      }),
      links: [
        ...unitLinks.map((l) => ({
          refId: l.reference_id,
          kind: "unit" as const,
          label: l.title,
          unitId: l.unit_id,
        })),
        ...lessonLinks.map((l) => ({
          refId: l.reference_id,
          kind: "lesson" as const,
          label: l.title,
          unitId: l.unit_id,
        })),
        ...blogLinks.map((l) => ({
          refId: l.reference_id,
          kind: "blog" as const,
          label: l.title,
          unitId: l.unit_id,
        })),
      ],
      entrySources,
      units: unitRows,
    };
  }

  /** References by id, in the order asked. Unknown ids are skipped. */
  async getReferencesByIds(ids: string[]): Promise<Reference[]> {
    if (ids.length === 0) return [];
    const db = await getReadyContentDb();
    const rows = await db.getAllAsync<ReferenceRow>(
      `SELECT * FROM content_references WHERE id IN (${ids.map(() => "?").join(",")})`,
      ids,
    );
    const byId = new Map(rows.map((r) => [r.id, mapReference(r)]));
    return ids.map((id) => byId.get(id)).filter((r): r is Reference => !!r);
  }

  /** Number of lessons seeded: handy for integrity checks. */
  async getLessonCount(): Promise<number> {
    const db = await getReadyContentDb();
    const { count } = (await db.getFirstAsync<{ count: number }>("SELECT COUNT(*) AS count FROM lessons")) as { count: number };
    return count;
  }

  /** Number of bank items seeded. */
  async getItemCount(): Promise<number> {
    const db = await getReadyContentDb();
    const { count } = (await db.getFirstAsync<{ count: number }>("SELECT COUNT(*) AS count FROM items")) as { count: number };
    return count;
  }

  /**
   * Mythbuster question banks: every question for the given difficulty pool
   * (easy/medium/hard), ordered by position.
   */
  async getMythBusterQuizQuestionsByDifficulty(
    difficulty: "easy" | "medium" | "hard",
  ): Promise<QuizQuestion[]> {
    const db = await getReadyContentDb();
    const rows = await db.getAllAsync<MythBusterQuestionRow>(
      "SELECT * FROM mythbuster_questions WHERE difficulty = ? ORDER BY position ASC, id ASC",
      [difficulty],
    );
    return rows.map(mapMythBusterQuestionRow);
  }

  /** Every question across all mythbuster difficulty pools. */
  async getAllMythBusterQuizQuestions(): Promise<QuizQuestion[]> {
    const db = await getReadyContentDb();
    const rows = await db.getAllAsync<MythBusterQuestionRow>(
      "SELECT * FROM mythbuster_questions ORDER BY difficulty ASC, position ASC, id ASC",
    );
    return rows.map(mapMythBusterQuestionRow);
  }

  // -------------------------------------------------------------------------
  // Myths & facts
  // -------------------------------------------------------------------------

  /** Fetch a single myth by id, or `null`. */
  async getMythById(id: string): Promise<Myth | null> {
    const db = await getReadyContentDb();
    const row = await db.getFirstAsync<MythRow>(
      "SELECT * FROM myths WHERE id = ? LIMIT 1",
      [id],
    );
    return row ? mapMythRow(row) : null;
  }

  /** Every myth, fully hydrated, ordered by id. */
  async getAllMyths(): Promise<Myth[]> {
    const db = await getReadyContentDb();
    const rows = await db.getAllAsync<MythRow>("SELECT * FROM myths ORDER BY id");
    return rows.map(mapMythRow);
  }

  /**
   * The myth-or-fact decks of the units (Myth Buster, Quick Play), in unit then deck order. Pass a unit id for its deck only.
   * A content database from before the table existed has none: that is an empty list, not an error.
   */
  async getUnitStatements(unitId?: string): Promise<UnitStatement[]> {
    const db = await getReadyContentDb();
    try {
      const rows = await db.getAllAsync<{
        id: string;
        unit_id: string;
        position: number;
        statement: string;
        verdict: string;
        explanation: string;
      }>(
        unitId
          ? "SELECT * FROM unit_statements WHERE unit_id = ? ORDER BY position"
          : "SELECT * FROM unit_statements ORDER BY unit_id, position",
        unitId ? [unitId] : [],
      );
      return rows.map((r) => ({
        id: r.id,
        unitId: r.unit_id,
        position: r.position,
        statement: r.statement,
        verdict: r.verdict === "fact" ? "fact" : "myth",
        explanation: r.explanation,
      }));
    } catch {
      return [];
    }
  }

  /** Number of myths seeded — handy for integrity checks on launch. */
  async getMythCount(): Promise<number> {
    const db = await getReadyContentDb();
    const { count } = (await db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) AS count FROM myths",
    )) as { count: number };
    return count;
  }

  // -------------------------------------------------------------------------
  // Encyclopedia
  // -------------------------------------------------------------------------

  /**
   * Fetch a single encyclopedia entry by id, or `null`.
   */
  async getEncyclopediaEntryById(id: string): Promise<EncyclopediaEntry | null> {
    const db = await getReadyContentDb();
    const row = await db.getFirstAsync<EncyclopediaEntryRow>(
      "SELECT * FROM encyclopedia_entries WHERE id = ? LIMIT 1",
      [id],
    );
    return row ? mapEncyclopediaEntryRow(row) : null;
  }

  /**
   * Every encyclopedia entry, fully hydrated (JSON columns parsed),
   * ordered by term.
   */
  async getAllEncyclopediaEntries(): Promise<EncyclopediaEntry[]> {
    const db = await getReadyContentDb();
    const rows = await db.getAllAsync<EncyclopediaEntryRow>(
      "SELECT * FROM encyclopedia_entries ORDER BY term",
    );
    return rows.map(mapEncyclopediaEntryRow);
  }

  /**
   * Search encyclopedia entries by query string (term, definition, category, quickFacts).
   * Note: This uses SQLite LIKE for simplicity; for large datasets a FTS5 virtual table would be better.
   */
  async searchEncyclopedia(query: string): Promise<EncyclopediaEntry[]> {
    const db = await getReadyContentDb();
    const lowerQuery = query.toLowerCase();
    const rows = await db.getAllAsync<EncyclopediaEntryRow>(
      `SELECT * FROM encyclopedia_entries
       WHERE lower(term) LIKE ?
          OR lower(definition) LIKE ?
          OR lower(category) LIKE ?
          OR EXISTS (
            SELECT 1 FROM json_each(quick_facts)
            WHERE lower(value) LIKE ?
          )
       ORDER BY term`,
      [`%${lowerQuery}%`, `%${lowerQuery}%`, `%${lowerQuery}%`, `%${lowerQuery}%`],
    );
    return rows.map(mapEncyclopediaEntryRow);
  }

  /** Encyclopedia entries filtered by category, ordered by term. */
  async getEncyclopediaByCategory(category: string): Promise<EncyclopediaEntry[]> {
    const db = await getReadyContentDb();
    const rows = await db.getAllAsync<EncyclopediaEntryRow>(
      "SELECT * FROM encyclopedia_entries WHERE category = ? ORDER BY term",
      [category],
    );
    return rows.map(mapEncyclopediaEntryRow);
  }

  /** Encyclopedia entries filtered by difficulty, ordered by term. */
  async getEncyclopediaByDifficulty(
    difficulty: "beginner" | "intermediate" | "advanced",
  ): Promise<EncyclopediaEntry[]> {
    const db = await getReadyContentDb();
    const rows = await db.getAllAsync<EncyclopediaEntryRow>(
      "SELECT * FROM encyclopedia_entries WHERE difficulty = ? ORDER BY term",
      [difficulty],
    );
    return rows.map(mapEncyclopediaEntryRow);
  }

  /** Number of encyclopedia entries seeded — handy for integrity checks on launch. */
  async getEncyclopediaCount(): Promise<number> {
    const db = await getReadyContentDb();
    const { count } = (await db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) AS count FROM encyclopedia_entries",
    )) as { count: number };
    return count;
  }
}

/** Default, app-wide instance. Create more if you need separate handles. */
export const contentRepository = new ContentRepository();
