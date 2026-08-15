/**
 * Seed a SQLite database from the JSON files produced by ts-to-json.js.
 *
 * RECOMMENDED DRIVER
 *   better-sqlite3 — synchronous, compiled, and the fastest option for this
 *   one-shot content ingestion job. Compare:
 *     - better-sqlite3  : sync API, ~4-6x faster than node-sqlite3, no callback soup
 *                        (best for build/seed tooling)
 *     - expo-sqlite     : already in this repo, but designed for the RN runtime,
 *                         not for Node build scripts
 *     - node-sqlite3    : async callbacks, slower; no advantage here
 *   Install it as a devDependency (build tooling only, never ships to the app):
 *     npm install --save-dev better-sqlite3
 *
 * HOW TO RUN
 *   node scripts/content-migration/seed-sqlite.js [jsonDir] [dbPath]
 *
 *   Examples:
 *     node scripts/content-migration/seed-sqlite.js
 *         # uses defaults below
 *     node scripts/content-migration/seed-sqlite.js content/lessons/json my-content.db
 *     node scripts/content-migration/seed-sqlite.js content/quizzes/json content/lessons/content.db
 *
 *   The script applies schema.sql (in this same folder), then ingests every
 *   `.json` file produced by ts-to-json.js. File shape drives which table it
 *   lands in:
 *     - object with `steps[]`    -> lessons + lesson_steps
 *     - object with `questions[]`-> quizzes + quiz_questions
 *     - plain array             -> mythbuster_questions (atom-maze boss bank)
 *   It is idempotent: re-running replaces existing rows (INSERT OR REPLACE)
 *   inside a single transaction, so you can safely re-seed after regenerating
 *   JSON. Run it once per content directory against the same dbPath; both
 *   content/lessons/json and content/quizzes/json feed the same content.db.
 *
 * DEFAULTS
 *   jsonDir = content/lessons/json     (output of ts-to-json.js)
 *   dbPath  = content/lessons/content.db
 */

const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");

// ---------------------------------------------------------------------------
// Configuration / CLI
// ---------------------------------------------------------------------------

const SCHEMA_PATH = path.join(__dirname, "schema.sql");
const DEFAULT_JSON_DIR = path.join(__dirname, "..", "..", "content", "lessons", "json");
const DEFAULT_DB_PATH = path.join(__dirname, "..", "..", "content", "lessons", "content.db");

const [jsonDirArg = DEFAULT_JSON_DIR, dbPathArg = DEFAULT_DB_PATH] = process.argv.slice(2);

if (process.argv.includes("--help")) {
  console.log(`Usage: node seed-sqlite.js [jsonDir] [dbPath]`);
  process.exit(0);
}

const jsonDir = path.resolve(jsonDirArg);
const dbPath = path.resolve(dbPathArg);

if (!fs.existsSync(jsonDir)) {
  console.error(`JSON directory does not exist: ${jsonDir}`);
  console.error(`Run ts-to-json.js first, or pass the correct directory.`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Open the database and apply the schema
// ---------------------------------------------------------------------------

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

const schema = fs.readFileSync(SCHEMA_PATH, "utf8");
db.exec(schema);

// ---------------------------------------------------------------------------
// Prepared statements
//   INSERT OR REPLACE keeps the script idempotent across re-runs.
// ---------------------------------------------------------------------------

const insertLesson = db.prepare(`
  INSERT OR REPLACE INTO lessons
    (id, title, description, unit_id, difficulty, estimated_minutes, xp_reward, prerequisites, tags)
  VALUES
    (@id, @title, @description, @unitId, @difficulty, @estimatedMinutes, @xpReward, @prerequisites, @tags)
`);

const insertStep = db.prepare(`
  INSERT OR REPLACE INTO lesson_steps (lesson_id, id, step_type, position, data)
  VALUES (@lessonId, @id, @stepType, @position, @data)
`);

const insertQuiz = db.prepare(`
  INSERT OR REPLACE INTO quizzes
    (id, title, description, category, difficulty, passing_score, xp_reward, time_limit, unit_id, estimated_minutes, metadata, tags)
  VALUES
    (@id, @title, @description, @category, @difficulty, @passingScore, @xpReward, @timeLimit, @unitId, @estimatedMinutes, @metadata, @tags)
`);

const insertQuizQuestion = db.prepare(`
  INSERT OR REPLACE INTO quiz_questions
    (quiz_id, id, position, type, question, options, correct_answer, explanation, difficulty, points, image, time_limit)
  VALUES
    (@quizId, @id, @position, @type, @question, @options, @correctAnswer, @explanation, @difficulty, @points, @image, @timeLimit)
`);

const insertMythBusterQuestion = db.prepare(`
  INSERT OR REPLACE INTO mythbuster_questions
    (id, difficulty, type, question, options, correct_answer, explanation, points, position)
  VALUES
    (@id, @difficulty, @type, @question, @options, @correctAnswer, @explanation, @points, @position)
`);

// Wrapping each lesson (and its steps) in a transaction is what makes the
// bulk insert fast; better-sqlite3 transactions also roll back on error.
const insertLessonWithSteps = db.transaction((lesson) => {
  insertLesson.run({
    id: lesson.id,
    title: lesson.title,
    description: lesson.description,
    unitId: lesson.unitId,
    difficulty: lesson.difficulty,
    estimatedMinutes: lesson.estimatedMinutes,
    xpReward: lesson.xpReward ?? 0,
    prerequisites: JSON.stringify(lesson.prerequisites || []),
    tags: JSON.stringify(lesson.tags || []),
  });

  (lesson.steps || []).forEach((step, index) => {
    insertStep.run({
      lessonId: lesson.id,
      id: step.id,
      stepType: step.type,
      position: index,
      data: JSON.stringify(step.data || {}),
    });
  });
});

// Serialize a question's correctAnswer while preserving its runtime type
// (numeric option index vs boolean for true/false questions).
const serializeAnswer = (answer) => JSON.stringify(answer);

const insertQuizWithQuestions = db.transaction((quiz) => {
  insertQuiz.run({
    id: quiz.id,
    title: quiz.title,
    description: quiz.description ?? "",
    category: quiz.category ?? "",
    difficulty: quiz.difficulty ?? "easy",
    passingScore: quiz.passingScore ?? 70,
    xpReward: quiz.xpReward ?? 0,
    timeLimit: quiz.timeLimit ?? null,
    unitId: quiz.unitId ?? null,
    estimatedMinutes: quiz.estimatedMinutes ?? null,
    metadata: JSON.stringify(quiz.metadata ?? {}),
    tags: JSON.stringify(quiz.tags || []),
  });

  (quiz.questions || []).forEach((question, index) => {
    insertQuizQuestion.run({
      quizId: quiz.id,
      id: question.id,
      position: index,
      type: question.type,
      question: question.question,
      options: JSON.stringify(question.options || []),
      correctAnswer: serializeAnswer(question.correctAnswer),
      explanation: question.explanation ?? "",
      difficulty: question.difficulty ?? "easy",
      points: question.points ?? 10,
      image: question.image ?? null,
      timeLimit: question.timeLimit ?? null,
    });
  });
});

// Mythbuster question banks arrive as plain arrays. Group by each question's
// own `difficulty` so ordering is preserved within every atom-maze pool.
const insertMythBusterBank = db.transaction((questions) => {
  const positionByDifficulty = new Map();
  questions.forEach((question) => {
    const difficulty = question.difficulty ?? "easy";
    const position = positionByDifficulty.get(difficulty) ?? 0;
    positionByDifficulty.set(difficulty, position + 1);
    insertMythBusterQuestion.run({
      id: question.id,
      difficulty,
      type: question.type ?? "multiple_choice",
      question: question.question,
      options: JSON.stringify(question.options || []),
      correctAnswer: serializeAnswer(question.correctAnswer),
      explanation: question.explanation ?? "",
      points: question.points ?? 5,
      position,
    });
  });
});

// ---------------------------------------------------------------------------
// Ingest
// ---------------------------------------------------------------------------

const jsonFiles = fs
  .readdirSync(jsonDir)
  .filter((name) => name.endsWith(".json"))
  .sort();

if (jsonFiles.length === 0) {
  console.warn(`No .json files found in ${jsonDir}`);
}

let lessonCount = 0;
let stepCount = 0;
let quizCount = 0;
let quizQuestionCount = 0;
let mythBusterCount = 0;

for (const file of jsonFiles) {
  const filePath = path.join(jsonDir, file);
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));

  if (Array.isArray(data)) {
    insertMythBusterBank(data);
    mythBusterCount += data.length;
    console.log(`  + ${data.length} mythbuster question(s) (${file})`);
    continue;
  }

  if (Array.isArray(data?.questions)) {
    if (data.id && data.id !== path.basename(file, ".json")) {
      console.warn(`  ! id "${data.id}" does not match filename "${file}"`);
    }
    insertQuizWithQuestions(data);
    quizCount += 1;
    quizQuestionCount += (data.questions || []).length;
    console.log(`  + ${data.title} quiz (${file}) — ${(data.questions || []).length} question(s)`);
    continue;
  }

  if (data.id && data.id !== path.basename(file, ".json")) {
    console.warn(`  ! id "${data.id}" does not match filename "${file}"`);
  }

  insertLessonWithSteps(data);
  lessonCount += 1;
  stepCount += (data.steps || []).length;
  console.log(`  + ${data.title} (${file}) — ${(data.steps || []).length} step(s)`);
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

const { count: lessonRows } = db
  .prepare(`SELECT COUNT(*) AS count FROM lessons`)
  .get();
const { count: stepRows } = db
  .prepare(`SELECT COUNT(*) AS count FROM lesson_steps`)
  .get();
const { count: quizRows } = db
  .prepare(`SELECT COUNT(*) AS count FROM quizzes`)
  .get();
const { count: quizQuestionRows } = db
  .prepare(`SELECT COUNT(*) AS count FROM quiz_questions`)
  .get();
const { count: mythBusterRows } = db
  .prepare(`SELECT COUNT(*) AS count FROM mythbuster_questions`)
  .get();

console.log(
  `\nDone. ${lessonRows} lessons / ${stepRows} steps · ` +
    `${quizRows} quizzes / ${quizQuestionRows} questions · ` +
    `${mythBusterRows} mythbuster questions in ${dbPath}`,
);
db.close();