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

import type { Lesson, LessonStep, Quiz, QuizQuestion, QuizType } from "@/content/types";

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
export const CONTENT_DB_VERSION = 2;

/** Marker file stored next to the db, whose content is CONTENT_DB_VERSION. */
const VERSION_MARKER = "content.db.version";

/** The writable directory (files/SQLite on Android, Library/LocalDatabase on iOS). */
const CDB_DIR = (): string => SQLite.defaultDatabaseDirectory;

// ---------------------------------------------------------------------------
// Copy from the read-only bundle into writable local storage (first launch)
// ---------------------------------------------------------------------------

let seeded = false;

/**
 * Ensure the bundled content.db is present in writable storage.
 *
 * Strategy:
 *   1. If a local copy already exists AND its version marker matches the
 *      bundled version, do nothing (fast path on every launch).
 *   2. Otherwise delete any stale copy, copy the freshly bundled asset into
 *      `SQLite.defaultDatabaseDirectory`, and write the version marker.
 *
 * This method is idempotent and safe to call multiple times.
 */
export async function ensureContentDatabase(): Promise<void> {
  // Bundled-asset copying only applies to native platforms.
  if (Platform.OS === "web") {
    console.warn("[content-db] Bundled asset seeding is native-only; open the DB directly instead.");
    return;
  }
  if (seeded) return; // already ran this session

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
    seeded = true;
    return;
  }

  // Resolve the bundled asset to a real file (downloadAsync copies it out of
  // the read-only package into the cache so we can `File.copy` from it).
  const asset = Asset.fromModule(require("@/assets/database/content.db"));
  await asset.downloadAsync();
  if (!asset.localUri) {
    throw new Error("[content-db] Bundled asset could not be resolved to a local file.");
  }
  const source = new File(asset.localUri);

  // Remove any stale local copy before replacing it.
  if (dest.exists) dest.delete();

  source.copy(dest); // synchronous copy via the modern expo-file-system API
  destMarker.write(String(CONTENT_DB_VERSION));

  console.log(`[content-db] Seeded ${CONTENT_DB_NAME} (v${CONTENT_DB_VERSION}) to ${dest.uri}`);
  seeded = true;
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
