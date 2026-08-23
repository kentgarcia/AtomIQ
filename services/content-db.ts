/**
 * Content database read layer (Part 1 of the "Two-Format" strategy).
 *
 * On first launch the pre-populated, read-only `content.db` that ships inside
 * the app bundle (assets/database/content.db) is copied into the device's
 * writable local storage, into the exact directory that expo-sqlite uses.
 * All subsequent sessions open that local copy.
 *
 * `ContentRepository` then provides typed, high-level queries — e.g.
 * `getLessonById` — which read a lesson row together with its ordered
 * `lesson_steps` rows and hydrate the flexible JSON string columns
 * (`tags`, `prerequisites`, step `data`) back into plain objects.
 *
 * The hydrated shape intentionally mirrors `Lesson` from `@/content/types`,
 * so screens can swap from the old hardcoded TS registry to this DB-backed
 * repository without changing their rendering code.
 *
 * USAGE (in a screen / hook):
 *   import { ensureContentDatabase, contentRepository } from "@/services/content-db";
 *
 *   await ensureContentDatabase();          // call once, near app startup
 *   const lesson = await contentRepository.getLessonById("background-radiation");
 */

import { Asset } from "expo-asset";
import { Directory, File } from "expo-file-system";
import * as SQLite from "expo-sqlite";
import { Platform } from "react-native";

// expo-sqlite's native module (not part of the public API, but the same
// module expo-sqlite itself uses for `SQLiteProvider` asset databases).
import ExpoSQLiteModule from "expo-sqlite/build/ExpoSQLite";

import type {
  Article,
  Post,
} from "@/content/articles/types";

import type {
  Lesson,
  LessonStep,
  Myth,
  Quiz,
  QuizQuestion,
  QuizType,
} from "@/content/types";

import type {
  AtomMazeChallenge,
  AtomMazeRoom,
  BattleQuestion,
  EncyclopediaEntry,
  Monster,
  MonsterElement,
} from "@/content/explorer/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Name of the bundled + on-device database file. Must match the asset name. */
export const CONTENT_DB_NAME = "content.db";

/**
 * Bump this whenever the bundled content.db schema/data changes. The marker
 * file lets us detect stale copies and re-copy the fresh bundle on the next
 * launch (otherwise the device would silently keep using old content forever).
 */
export const CONTENT_DB_VERSION = 847142882;

/** Marker file stored next to the db, whose content is CONTENT_DB_VERSION. */
const VERSION_MARKER = "content.db.version";

/** The writable directory (files/SQLite on Android, Library/LocalDatabase on iOS). */
const CDB_DIR = (): string => SQLite.defaultDatabaseDirectory;

// ---------------------------------------------------------------------------
// Copy from the read-only bundle into writable local storage (first launch)
// ---------------------------------------------------------------------------

let seeded = false;
let seedPromise: Promise<void> | null = null;
let lastSeedError: Error | null = null;

/**
 * Run a quick sanity query against the on-device content database to confirm
 * it actually contains data (catches "open succeeded but empty/corrupt file"
 * cases that otherwise look like a successful install).
 */
async function verifyContentDb(): Promise<boolean> {
  try {
    const db = await SQLite.openDatabaseAsync(CONTENT_DB_NAME);
    try {
      const row = await db.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) AS count FROM lessons",
      );
      const count = row?.count ?? 0;
      console.log(`[content-db] Integrity check: ${count} lessons seeded`);
      return count > 0;
    } finally {
      await db.closeAsync().catch(() => {});
    }
  } catch (e) {
    console.error("[content-db] Integrity check failed:", e);
    return false;
  }
}

/**
 * Copy the bundled content.db into writable SQLite storage using the native
 * Kotlin copy primitive that expo-sqlite itself uses for asset databases.
 * Falls back to the expo-file-system copy when the module is unavailable.
 */
async function copyBundledDatabase(assetUri: string, destPath: string): Promise<void> {
  const importAssetDatabaseAsync = ExpoSQLiteModule?.importAssetDatabaseAsync;
  if (typeof importAssetDatabaseAsync === "function") {
    await importAssetDatabaseAsync(destPath, assetUri, true);
    return;
  }
  const source = new File(assetUri);
  const dest = new File(destPath);
  if (dest.exists) dest.delete();
  source.copy(dest);
}

/**
 * Ensure the bundled content.db is present in writable storage.
 *
 * Strategy:
 *   1. If a local copy already exists AND its version marker matches the
 *      bundled version, do nothing (fast path on every launch).
 *   2. Otherwise delete any stale copy, copy the freshly bundled asset into
 *      `SQLite.defaultDatabaseDirectory`, and write the version marker.
 *
 * This method is idempotent and safe to call multiple times (concurrent
 * callers share a single seeding run).
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
      const dbDir = new Directory(CDB_DIR());
      if (!dbDir.exists) {
        dbDir.create({ intermediates: true, idempotent: true });
      }

      const dest = new File(CDB_DIR(), CONTENT_DB_NAME);
      const destMarker = new File(CDB_DIR(), VERSION_MARKER);

      const isFresh =
        dest.exists &&
        destMarker.exists &&
        destMarker.textSync().trim() === String(CONTENT_DB_VERSION);

      if (isFresh) {
        // Fast path: fresh copy present — but confirm it is not an empty shell.
        if (await verifyContentDb()) {
          seeded = true;
          return;
        }
        console.warn("[content-db] Existing copy failed integrity check; re-seeding");
      }

      console.log("[content-db] Seeding bundled content database...");

      // Resolve the bundled asset to a real file (downloadAsync copies it out of
      // the read-only package into the cache so we can copy from it).
      const asset = Asset.fromModule(require("@/assets/database/content.db"));
      await asset.downloadAsync();
      if (!asset.localUri) {
        throw new Error("[content-db] Bundled asset could not be resolved to a local file.");
      }

      // Same destination expo-sqlite uses when opening `content.db`.
      const dbDirPath = SQLite.defaultDatabaseDirectory;
      const destPath = `${dbDirPath.replace(/\/*$/, "")}/${CONTENT_DB_NAME}`;

      await copyBundledDatabase(asset.localUri, destPath);
      destMarker.write(String(CONTENT_DB_VERSION));

      if (!(await verifyContentDb())) {
        throw new Error("[content-db] Seeded copy failed integrity check (no lessons found).");
      }

      console.log(`[content-db] Seeded ${CONTENT_DB_NAME} (v${CONTENT_DB_VERSION}) to ${dest.uri}`);
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

/** Status of the content database seeding — surfaced in the Settings screen. */
export function getContentDbStatus(): {
  seeded: boolean;
  version: number;
  lastError: string | null;
} {
  return {
    seeded,
    version: CONTENT_DB_VERSION,
    lastError: lastSeedError ? lastSeedError.message : null,
  };
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
    dbPromise = SQLite.openDatabaseAsync(CONTENT_DB_NAME);
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

/** Raw shape of a `lessons` row as returned by expo-sqlite. */
interface LessonRow {
  id: string;
  title: string;
  description: string;
  unit_id: string;
  difficulty: Lesson["difficulty"];
  estimated_minutes: number;
  xp_reward: number;
  prerequisites: string; // JSON array of lesson ids
  tags: string; // JSON array of strings
}

/** Raw shape of a `lesson_steps` row as returned by expo-sqlite. */
interface LessonStepRow {
  lesson_id: string;
  id: string;
  step_type: LessonStep["type"];
  data: string; // JSON document, shape depends on step_type
}

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

/** Safely JSON.parse a column that holds a single JSON object (e.g. a maze `boss`). */
function parseJsonObject<T>(raw: string | null | undefined): T | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? (parsed as T) : null;
  } catch {
    return null;
  }
}

/** Parse the flexible step `data` JSON back into a plain object. */
function parseStepData(raw: string): Record<string, unknown> {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
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

/** Raw shape of a `quizzes` row as returned by expo-sqlite. */
interface QuizRow {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  passing_score: number;
  xp_reward: number;
  time_limit: number | null;
  unit_id: string | null;
  estimated_minutes: number | null;
  metadata: string; // JSON object
  tags: string; // JSON array of strings
}

/** Raw shape of a `quiz_questions` row as returned by expo-sqlite. */
interface QuizQuestionRow {
  quiz_id: string;
  id: string;
  type: QuizType;
  question: string;
  options: string; // JSON array of strings
  correct_answer: string; // JSON-encoded number|boolean|string
  explanation: string;
  difficulty: string;
  points: number;
  image: string | null;
  time_limit: number | null;
}

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


/** Raw shape of a `mazes` row as returned by expo-sqlite. */
interface MazeRow {
  id: string;
  title: string;
  description: string;
  theme: string;
  xp_reward: number;
  time_limit: number | null;
  player_max_hp: number;
  boss: string; // JSON Monster object (final boss)
}

/** Raw shape of a `maze_rooms` row as returned by expo-sqlite. */
interface MazeRoomRow {
  maze_id: string;
  id: string;
  title: string;
  description: string;
  monster: string; // JSON Monster object
  questions: string; // JSON array of BattleQuestions
  damage_per_correct: number;
  explanation: string;
  next_room_id: string | null;
  alternative_path_id: string | null;
  unlock_condition: string | null; // JSON { type, value } when set
}

/** Parse the quizzes.metadata JSON back into a plain object. */
function parseMetadata(raw: string | null | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

/** Flatten a quiz row + its questions into the domain `Quiz` shape. */
function mapQuizRow(
  row: QuizRow,
  questions: QuizQuestionRow[],
): Quiz {
  const metadata = parseMetadata(row.metadata);
  const hasMetadata = Object.keys(metadata).length > 0;
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    difficulty: row.difficulty as Quiz["difficulty"],
    passingScore: row.passing_score,
    xpReward: row.xp_reward,
    ...(row.time_limit != null ? { timeLimit: row.time_limit } : {}),
    ...(row.unit_id ? { unitId: row.unit_id } : {}),
    ...(row.estimated_minutes != null ? { estimatedMinutes: row.estimated_minutes } : {}),
    ...(hasMetadata ? { metadata } : {}),
    tags: parseJsonArray(row.tags),
    questions: questions.map((q) => ({
      id: q.id,
      type: q.type,
      question: q.question,
      options: parseJsonArray(q.options),
      correctAnswer: parseScalarJson(q.correct_answer) as QuizQuestion["correctAnswer"],
      explanation: q.explanation,
      difficulty: q.difficulty as QuizQuestion["difficulty"],
      points: q.points,
      ...(q.image ? { image: q.image } : {}),
      ...(q.time_limit != null ? { timeLimit: q.time_limit } : {}),
    })),
  };
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

/** Flatten a lesson row into the domain `Lesson` shape, without steps yet. */
function mapLessonRow(row: LessonRow) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    unitId: row.unit_id,
    difficulty: row.difficulty,
    estimatedMinutes: row.estimated_minutes,
    xpReward: row.xp_reward,
    prerequisites: parseJsonArray(row.prerequisites),
    tags: parseJsonArray(row.tags),
    steps: [] as LessonStep[],
  };
}

/** Parse an embedded monster object, falling back to an empty monster. */
function parseMonster(raw: string | null | undefined): Monster {
  return (
    parseJsonObject<Monster>(raw) ?? {
      id: "",
      name: "",
      element: "nuclear" as MonsterElement,
      maxHp: 0,
      attackPower: 0,
      sprite: "",
      color: "",
      defeatMessage: "",
    }
  );
}

/** Flatten a maze room row into the domain `AtomMazeRoom` shape. */
function mapMazeRoomRow(row: MazeRoomRow): AtomMazeRoom {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    monster: parseMonster(row.monster),
    questions: parseJsonRecords<BattleQuestion>(row.questions),
    damagePerCorrect: row.damage_per_correct,
    explanation: row.explanation,
    ...(row.next_room_id ? { nextRoomId: row.next_room_id } : {}),
    ...(row.alternative_path_id ? { alternativePathId: row.alternative_path_id } : {}),
    ...(row.unlock_condition
      ? {
          unlockCondition: parseJsonObject<NonNullable<AtomMazeRoom["unlockCondition"]>>(
            row.unlock_condition,
          ) ?? undefined,
        }
      : {}),
  };
}

/** Flatten a maze row + its (already ordered) room rows into `AtomMazeChallenge`. */
function mapMazeRow(row: MazeRow, rooms: MazeRoomRow[]): AtomMazeChallenge {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    theme: row.theme,
    rooms: rooms.map(mapMazeRoomRow),
    xpReward: row.xp_reward,
    ...(row.time_limit != null ? { timeLimit: row.time_limit } : {}),
    playerMaxHp: row.player_max_hp,
    boss: parseMonster(row.boss),
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
  related_articles: string; // JSON array of article ids
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
    ...(row.related_articles ? { relatedArticles: parseJsonArray(row.related_articles) } : {}),
    difficulty: row.difficulty as EncyclopediaEntry["difficulty"],
  };
}

/** Raw shape of an `articles` row as returned by expo-sqlite. */
interface ArticleRow {
  id: string;
  type: string;
  category: string;
  title: string;
  subtitle: string | null;
  content: string;
  excerpt: string;
  author: string; // JSON { name, avatar, title }
  published_date: string;
  read_time: number;
  image: string | null;
  tags: string; // JSON array of strings
  source: string | null;
  source_url: string | null;
  related_myths: string; // JSON array of myth ids
  related_facts: string; // JSON array of fact ids
  featured: number; // 0 / 1
  difficulty: string | null;
}

/** Flatten an article row into the domain `Article` shape. */
function mapArticleRow(row: ArticleRow): Article {
  return {
    id: row.id,
    type: row.type as Article["type"],
    category: row.category as Article["category"],
    title: row.title,
    ...(row.subtitle ? { subtitle: row.subtitle } : {}),
    content: row.content,
    excerpt: row.excerpt,
    author:
      parseJsonObject<Article["author"]>(row.author) ?? { name: "", avatar: "", title: "" },
    publishedDate: row.published_date,
    readTime: row.read_time,
    ...(row.image ? { image: row.image } : {}),
    tags: parseJsonArray(row.tags),
    ...(row.source ? { source: row.source } : {}),
    ...(row.source_url ? { sourceUrl: row.source_url } : {}),
    ...(row.related_myths ? { relatedMyths: parseJsonArray(row.related_myths) } : {}),
    ...(row.featured ? { featured: true } : {}),
    ...(row.difficulty ? { difficulty: row.difficulty as Article["difficulty"] } : {}),
  };
}

/** Raw shape of a `posts` row as returned by expo-sqlite. */
interface PostRow {
  id: string;
  type: string;
  category: string;
  title: string;
  content: string;
  author: string; // JSON { name, avatar, title }
  published_date: string;
  image: string | null;
  tags: string; // JSON array of strings
  source: string | null;
  source_url: string | null;
  video_url: string | null;
  related_content: string; // JSON array of content ids
}

/** Flatten a post row into the domain `Post` shape. */
function mapPostRow(row: PostRow): Post {
  return {
    id: row.id,
    type: row.type as Post["type"],
    category: row.category as Post["category"],
    title: row.title,
    content: row.content,
    author:
      parseJsonObject<Post["author"]>(row.author) ?? { name: "", avatar: "" },
    publishedDate: row.published_date,
    ...(row.image ? { image: row.image } : {}),
    tags: parseJsonArray(row.tags),
    ...(row.source ? { source: row.source } : {}),
    ...(row.source_url ? { sourceUrl: row.source_url } : {}),
    ...(row.video_url ? { videoUrl: row.video_url } : {}),
    ...(row.related_content ? { relatedContent: parseJsonArray(row.related_content) } : {}),
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
  /**
   * Fetch a full lesson by ID: the `lessons` row plus its `lesson_steps` rows
   * ordered by `position`, with every JSON string column parsed back into
   * usable objects.
   *
   * Returns `null` when no lesson with that ID exists.
   */
  async getLessonById(id: string): Promise<Lesson | null> {
    const db = await getReadyContentDb();

    const row = await db.getFirstAsync<LessonRow>(
      "SELECT * FROM lessons WHERE id = ? LIMIT 1",
      [id],
    );
    if (!row) return null;

    const stepRows = await db.getAllAsync<LessonStepRow>(
      "SELECT id, step_type, data FROM lesson_steps WHERE lesson_id = ? ORDER BY position ASC",
      [id],
    );

    return this.nodeToLesson(row, stepRows);
  }

  /**
   * Every lesson, fully hydrated (steps + parsed JSON), ordered by id.
   * Useful for search, menus, and any place that needs the whole catalog.
   */
  async getAllLessons(): Promise<Lesson[]> {
    const db = await getReadyContentDb();

    const rows = await db.getAllAsync<LessonRow>(
      "SELECT * FROM lessons ORDER BY id",
    );
    const stepRows = await db.getAllAsync<LessonStepRow>(
      "SELECT * FROM lesson_steps ORDER BY lesson_id ASC, position ASC",
    );

    // Group steps by lesson while preserving `position` order.
    const stepsByLessonId = new Map<string, LessonStepRow[]>();
    for (const stepRow of stepRows) {
      const list = stepsByLessonId.get(stepRow.lesson_id);
      if (list) list.push(stepRow);
      else stepsByLessonId.set(stepRow.lesson_id, [stepRow]);
    }

    return rows.map((row) =>
      this.nodeToLesson(row, stepsByLessonId.get(row.id) ?? []),
    );
  }

  /** Lessons belonging to a single unit, in the canonical id/position order. */
  async getLessonsByUnit(unitId: string): Promise<Lesson[]> {
    const db = await getReadyContentDb();

    const rows = await db.getAllAsync<LessonRow>(
      "SELECT * FROM lessons WHERE unit_id = ? ORDER BY id",
      [unitId],
    );
    const stepRows = await db.getAllAsync<LessonStepRow>(
      "SELECT * FROM lesson_steps ORDER BY lesson_id ASC, position ASC",
    );

    const stepsByLessonId = new Map<string, LessonStepRow[]>();
    for (const stepRow of stepRows) {
      const list = stepsByLessonId.get(stepRow.lesson_id);
      if (list) list.push(stepRow);
      else stepsByLessonId.set(stepRow.lesson_id, [stepRow]);
    }

    return rows.map((row) =>
      this.nodeToLesson(row, stepsByLessonId.get(row.id) ?? []),
    );
  }

  /** Number of lessons seeded — handy for integrity checks on launch. */
  async getLessonCount(): Promise<number> {
    const db = await getReadyContentDb();
    const { count } = (await db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) AS count FROM lessons",
    )) as { count: number };
    return count;
  }

  // -------------------------------------------------------------------------
  // Quizzes
  // -------------------------------------------------------------------------

  /**
   * Fetch a full quiz by ID: the `quizzes` row plus its `quiz_questions` rows
   * ordered by `position`, with every JSON string column parsed back into
   * usable objects. Returns `null` when no quiz matches.
   */
  async getQuizById(id: string): Promise<Quiz | null> {
    const db = await getReadyContentDb();

    const row = await db.getFirstAsync<QuizRow>(
      "SELECT * FROM quizzes WHERE id = ? LIMIT 1",
      [id],
    );
    if (!row) return null;

    const questionRows = await db.getAllAsync<QuizQuestionRow>(
      "SELECT * FROM quiz_questions WHERE quiz_id = ? ORDER BY position ASC",
      [id],
    );

    return mapQuizRow(row, questionRows);
  }

  /**
   * Fetch full quizzes (questions + parsed JSON), optionally filtered by
   * criterion. `filter` receives the hydrated quiz and returns true to keep.
   */
  private async getQuizzes(filter?: (quiz: Quiz) => boolean): Promise<Quiz[]> {
    const db = await getReadyContentDb();

    const quizRows = await db.getAllAsync<QuizRow>(
      "SELECT * FROM quizzes ORDER BY id",
    );
    if (quizRows.length === 0) return [];

    const questionRows = await db.getAllAsync<QuizQuestionRow>(
      "SELECT * FROM quiz_questions ORDER BY quiz_id ASC, position ASC",
    );

    const questionsByQuiz = new Map<string, QuizQuestionRow[]>();
    for (const row of questionRows) {
      const list = questionsByQuiz.get(row.quiz_id);
      if (list) list.push(row);
      else questionsByQuiz.set(row.quiz_id, [row]);
    }

    const quizzes = quizRows.map((row) =>
      mapQuizRow(row, questionsByQuiz.get(row.id) ?? []),
    );

    return filter ? quizzes.filter(filter) : quizzes;
  }

  /** Every quiz, fully hydrated, ordered by id. */
  async getAllQuizzes(): Promise<Quiz[]> {
    return this.getQuizzes();
  }

  /** Number of quizzes seeded — handy for integrity checks on launch. */
  async getQuizCount(): Promise<number> {
    const db = await getReadyContentDb();
    const { count } = (await db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) AS count FROM quizzes",
    )) as { count: number };
    return count;
  }

  /**
   * Mythbuster question banks: every question for the given difficulty pool
   * (easy/medium/hard), ordered by position. Used by the atom-maze boss.
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

  /** Number of myths seeded — handy for integrity checks on launch. */
  async getMythCount(): Promise<number> {
    const db = await getReadyContentDb();
    const { count } = (await db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) AS count FROM myths",
    )) as { count: number };
    return count;
  }

  // -------------------------------------------------------------------------
  // Mazes
  // -------------------------------------------------------------------------

  /**
   * Fetch a full maze by ID: the `mazes` row plus its `maze_rooms` rows
   * ordered by `position`, with every embedded JSON column (boss, monsters,
   * questions, unlock conditions) parsed back into usable objects. Returns
   * `null` when no maze with that ID exists.
   */
  async getMazeById(id: string): Promise<AtomMazeChallenge | null> {
    const db = await getReadyContentDb();

    const row = await db.getFirstAsync<MazeRow>(
      "SELECT * FROM mazes WHERE id = ? LIMIT 1",
      [id],
    );
    if (!row) return null;

    const roomRows = await db.getAllAsync<MazeRoomRow>(
      "SELECT * FROM maze_rooms WHERE maze_id = ? ORDER BY position ASC",
      [id],
    );

    return mapMazeRow(row, roomRows);
  }

  /**
   * Every maze, fully hydrated (rooms + parsed monster/question JSON),
   * ordered by id. Used by the game picker / difficulty panel.
   */
  async getAllMazes(): Promise<AtomMazeChallenge[]> {
    const db = await getReadyContentDb();

    const rows = await db.getAllAsync<MazeRow>("SELECT * FROM mazes ORDER BY id");
    if (rows.length === 0) return [];

    const roomRows = await db.getAllAsync<MazeRoomRow>(
      "SELECT * FROM maze_rooms ORDER BY maze_id ASC, position ASC",
    );

    // Group rooms by maze while preserving `position` order.
    const roomsByMazeId = new Map<string, MazeRoomRow[]>();
    for (const roomRow of roomRows) {
      const list = roomsByMazeId.get(roomRow.maze_id);
      if (list) list.push(roomRow);
      else roomsByMazeId.set(roomRow.maze_id, [roomRow]);
    }

    return rows.map((row) => mapMazeRow(row, roomsByMazeId.get(row.id) ?? []));
  }

  /** Number of mazes seeded — handy for integrity checks on launch. */
  async getMazeCount(): Promise<number> {
    const db = await getReadyContentDb();
    const { count } = (await db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) AS count FROM mazes",
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

  // -------------------------------------------------------------------------
  // Articles & Posts
  // -------------------------------------------------------------------------

  /** Fetch a single article by id, or `null`. */
  async getArticleById(id: string): Promise<Article | null> {
    const db = await getReadyContentDb();
    const row = await db.getFirstAsync<ArticleRow>(
      "SELECT * FROM articles WHERE id = ? LIMIT 1",
      [id],
    );
    return row ? mapArticleRow(row) : null;
  }

  /**
   * Every article, fully hydrated (JSON columns parsed), newest first.
   */
  async getAllArticles(): Promise<Article[]> {
    const db = await getReadyContentDb();
    const rows = await db.getAllAsync<ArticleRow>(
      "SELECT * FROM articles ORDER BY published_date DESC, id",
    );
    return rows.map(mapArticleRow);
  }

  /** Fetch a single post by id, or `null`. */
  async getPostById(id: string): Promise<Post | null> {
    const db = await getReadyContentDb();
    const row = await db.getFirstAsync<PostRow>(
      "SELECT * FROM posts WHERE id = ? LIMIT 1",
      [id],
    );
    return row ? mapPostRow(row) : null;
  }

  /**
   * Every post, fully hydrated (JSON columns parsed), newest first.
   */
  async getAllPosts(): Promise<Post[]> {
    const db = await getReadyContentDb();
    const rows = await db.getAllAsync<PostRow>(
      "SELECT * FROM posts ORDER BY published_date DESC, id",
    );
    return rows.map(mapPostRow);
  }

  // -------------------------------------------------------------------------
  // Lessons
  // -------------------------------------------------------------------------

  /** Combine a lesson row + its (already ordered) step rows into a `Lesson`. */
  private nodeToLesson(row: LessonRow, stepRows: LessonStepRow[]): Lesson {
    const lesson = mapLessonRow(row) as Lesson;
    lesson.steps = stepRows.map((step) => ({
      id: step.id,
      type: step.step_type,
      data: parseStepData(step.data),
    }));
    return lesson;
  }
}

/** Default, app-wide instance. Create more if you need separate handles. */
export const contentRepository = new ContentRepository();
