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
 *     node scripts/content-migration/seed-sqlite.js content/json my-content.db
 *     node scripts/content-migration/seed-sqlite.js content/quizzes/json content/database/content.db
 *
 *   The script applies schema.sql (in this same folder), then ingests every
 *   `.json` file produced by ts-to-json.js. File shape drives which table it
 *   lands in:
 *     - array with `mythStatement`/`reality` entries -> myths
 *     - object with `steps[]`     -> lessons + lesson_steps
 *     - object with `questions[]` -> quizzes + quiz_questions
 *     - object with `rooms[]`     -> mazes + maze_rooms (Atom Maze levels)
 *     - object with `mythStatement` -> a single myth
 *     - object with `statement`   -> a single fact
 *     - plain array              -> mythbuster_questions (atom-maze boss bank)
 *   It is idempotent: re-running replaces existing rows (INSERT OR REPLACE)
 *   inside a single transaction, so you can safely re-seed after regenerating
 *   JSON. Run it once per content directory against the same dbPath; both
 *   content/json and content/quizzes/json feed the same content.db.
 *
 *   NOTE: the one-time TS -> JSON migration is COMPLETE and the intermediate
 *   json/ folders were removed. The content database (content/lessons/
 *   content.db, edited via `npm run content-editor`) is now the source of
 *   truth — this script + ts-to-json.js remain for future bulk migrations.
 *
 * DEFAULTS
 *   jsonDir = content/json     (output of ts-to-json.js)
 *   dbPath  = content/database/content.db
 */

const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");

// ---------------------------------------------------------------------------
// Configuration / CLI
// ---------------------------------------------------------------------------

const SCHEMA_PATH = path.join(__dirname, "schema.sql");
const DEFAULT_JSON_DIR = path.join(__dirname, "..", "..", "content", "lessons", "json");
const DEFAULT_DB_PATH = path.join(__dirname, "..", "..", "content", "database", "content.db");

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

const insertArticle = db.prepare(`
  INSERT OR REPLACE INTO articles
    (id, type, category, title, subtitle, content, excerpt, author,
     published_date, read_time, image, tags, source, source_url,
     related_myths, related_facts, featured, difficulty)
  VALUES
    (@id, @type, @category, @title, @subtitle, @content, @excerpt, @author,
     @publishedDate, @readTime, @image, @tags, @source, @sourceUrl,
     @relatedMyths, @relatedFacts, @featured, @difficulty)
`);

const insertPost = db.prepare(`
  INSERT OR REPLACE INTO posts
    (id, type, category, title, content, author, published_date, image, tags,
     source, source_url, video_url, related_content)
  VALUES
    (@id, @type, @category, @title, @content, @author, @publishedDate, @image, @tags,
     @source, @sourceUrl, @videoUrl, @relatedContent)
`);

const insertMyth = db.prepare(`
  INSERT OR REPLACE INTO myths
    (id, title, myth_statement, reality, explanation, category, difficulty, sources,
     related_facts, related_lessons, image, tags, popularity)
  VALUES
    (@id, @title, @mythStatement, @reality, @explanation, @category, @difficulty, @sources,
     @relatedFacts, @relatedLessons, @image, @tags, @popularity)
`);

const insertFact = db.prepare(`
  INSERT OR REPLACE INTO facts
    (id, title, statement, explanation, category, importance, sources,
     related_myths, related_lessons, image, tags, date_added, last_updated)
  VALUES
    (@id, @title, @statement, @explanation, @category, @importance, @sources,
     @relatedMyths, @relatedLessons, @image, @tags, @dateAdded, @lastUpdated)
`);

const insertMaze = db.prepare(`
  INSERT OR REPLACE INTO mazes
    (id, title, description, theme, xp_reward, time_limit, player_max_hp, boss)
  VALUES
    (@id, @title, @description, @theme, @xpReward, @timeLimit, @playerMaxHp, @boss)
`);

const insertMazeRoom = db.prepare(`
  INSERT OR REPLACE INTO maze_rooms
    (maze_id, id, position, title, description, monster, questions,
     damage_per_correct, explanation, next_room_id, alternative_path_id, unlock_condition)
  VALUES
    (@mazeId, @id, @position, @title, @description, @monster, @questions,
     @damagePerCorrect, @explanation, @nextRoomId, @alternativePathId, @unlockCondition)
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

// Insert a single Myth resource. `relatedFacts`/`relatedLessons` are optional
// arrays of ids; `sources` is an array of Source objects. Mirror the domain
// `Myth` shape from content/types.ts exactly.
const insertMythResource = db.transaction((myth) => {
  insertMyth.run({
    id: myth.id,
    title: myth.title,
    mythStatement: myth.mythStatement,
    reality: myth.reality,
    explanation: myth.explanation ?? "",
    category: myth.category ?? "",
    difficulty: myth.difficulty ?? "easy",
    sources: JSON.stringify(myth.sources || []),
    relatedFacts: JSON.stringify(myth.relatedFacts || []),
    relatedLessons: JSON.stringify(myth.relatedLessons || []),
    image: myth.image ?? null,
    tags: JSON.stringify(myth.tags || []),
    popularity: myth.popularity ?? 0,
  });
});

// Insert a single Fact resource, mirroring the domain `Fact` from content/types.ts.
const insertFactResource = db.transaction((fact) => {
  insertFact.run({
    id: fact.id,
    title: fact.title,
    statement: fact.statement,
    explanation: fact.explanation ?? "",
    category: fact.category ?? "",
    importance: fact.importance ?? "medium",
    sources: JSON.stringify(fact.sources || []),
    relatedMyths: JSON.stringify(fact.relatedMyths || []),
    relatedLessons: JSON.stringify(fact.relatedLessons || []),
    image: fact.image ?? null,
    tags: JSON.stringify(fact.tags || []),
    dateAdded: fact.dateAdded ?? "",
    lastUpdated: fact.lastUpdated ?? "",
  });
});

// Insert an Atom Maze challenge + its ordered rooms. Monsters are embedded
// JSON (the boss on the maze, a monster per room) and questions is a JSON
// array of BattleQuestions, mirroring the domain AtomMazeChallenge shape.
const insertMazeWithRooms = db.transaction((maze) => {
  insertMaze.run({
    id: maze.id,
    title: maze.title,
    description: maze.description,
    theme: maze.theme ?? "",
    xpReward: maze.xpReward ?? 0,
    timeLimit: maze.timeLimit ?? null,
    playerMaxHp: maze.playerMaxHp ?? 100,
    boss: JSON.stringify(maze.boss || {}),
  });

  (maze.rooms || []).forEach((room, index) => {
    insertMazeRoom.run({
      mazeId: maze.id,
      id: room.id,
      position: index,
      title: room.title,
      description: room.description,
      monster: JSON.stringify(room.monster || {}),
      questions: JSON.stringify(room.questions || []),
      damagePerCorrect: room.damagePerCorrect ?? 0,
      explanation: room.explanation ?? "",
      nextRoomId: room.nextRoomId ?? null,
      alternativePathId: room.alternativePathId ?? null,
      unlockCondition: room.unlockCondition
        ? JSON.stringify(room.unlockCondition)
        : null,
    });
  });
});

const insertEncyclopediaEntry = db.prepare(`
  INSERT OR REPLACE INTO encyclopedia_entries
    (id, term, definition, category, related_terms, quick_facts, sources,
     image, debunking_snippet, related_myths, related_articles, difficulty)
  VALUES
    (@id, @term, @definition, @category, @relatedTerms, @quickFacts, @sources,
     @image, @debunkingSnippet, @relatedMyths, @relatedArticles, @difficulty)
`);

// Insert a single Article (long-form Learn & Explore content). `author` is a
// JSON object; `relatedMyths`/`relatedFacts` are optional id arrays. Mirrors
// the domain `Article` shape from content/articles/types.ts.
const insertArticleResource = db.transaction((article) => {
  insertArticle.run({
    id: article.id,
    type: article.type ?? "article",
    category: article.category ?? "",
    title: article.title,
    subtitle: article.subtitle ?? null,
    content: article.content ?? "",
    excerpt: article.excerpt ?? "",
    author: JSON.stringify(article.author || {}),
    publishedDate: article.publishedDate ?? "",
    readTime: article.readTime ?? 0,
    image: article.image ?? null,
    tags: JSON.stringify(article.tags || []),
    source: article.source ?? null,
    sourceUrl: article.sourceUrl ?? null,
    relatedMyths: JSON.stringify(article.relatedMyths || []),
    relatedFacts: JSON.stringify(article.relatedFacts || []),
    featured: article.featured ? 1 : 0,
    difficulty: article.difficulty ?? null,
  });
});

// Insert a single Post (community-feed item). `author` is a JSON object and
// `relatedContent` is an optional id array. Mirrors the domain `Post` shape
// from content/articles/types.ts.
const insertPostResource = db.transaction((post) => {
  insertPost.run({
    id: post.id,
    type: post.type ?? "news",
    category: post.category ?? "",
    title: post.title,
    content: post.content ?? "",
    author: JSON.stringify(post.author || {}),
    publishedDate: post.publishedDate ?? "",
    image: post.image ?? null,
    tags: JSON.stringify(post.tags || []),
    source: post.source ?? null,
    sourceUrl: post.sourceUrl ?? null,
    videoUrl: post.videoUrl ?? null,
    relatedContent: JSON.stringify(post.relatedContent || []),
  });
});

// Insert encyclopedia entries from an object of entries (people.json / terms.json).
const insertEncyclopediaEntries = db.transaction((entries) => {
  for (const entry of Object.values(entries)) {
    insertEncyclopediaEntry.run({
      id: entry.id,
      term: entry.term,
      definition: entry.definition,
      category: entry.category ?? "",
      relatedTerms: JSON.stringify(entry.relatedTerms || []),
      quickFacts: JSON.stringify(entry.quickFacts || []),
      sources: JSON.stringify(entry.sources || []),
      image: entry.image ?? null,
      debunkingSnippet: entry.debunkingSnippet ?? null,
      relatedMyths: JSON.stringify(entry.relatedMyths || []),
      relatedArticles: JSON.stringify(entry.relatedArticles || []),
      difficulty: entry.difficulty ?? "beginner",
    });
  }
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
let mythCount = 0;
let factCount = 0;
let mazeCount = 0;
let mazeRoomCount = 0;
let encyclopediaCount = 0;
let articleCount = 0;
let postCount = 0;

for (const file of jsonFiles) {
  const filePath = path.join(jsonDir, file);
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));

  if (Array.isArray(data)) {
    const isMythList = data.some(
      (item) =>
        typeof item?.mythStatement === "string" &&
        typeof item?.reality === "string",
    );
    if (isMythList) {
      data.forEach((myth) => insertMythResource(myth));
      mythCount += data.length;
      console.log(`  + ${data.length} myth(s) (${file})`);
    } else {
      insertMythBusterBank(data);
      mythBusterCount += data.length;
      console.log(`  + ${data.length} mythbuster question(s) (${file})`);
    }
    continue;
  }

  // Atom Maze challenge: an object with a `rooms` array.
  if (Array.isArray(data?.rooms)) {
    if (data.id && data.id !== path.basename(file, ".json")) {
      console.warn(`  ! id "${data.id}" does not match filename "${file}"`);
    }
    insertMazeWithRooms(data);
    mazeCount += 1;
    mazeRoomCount += (data.rooms || []).length;
    console.log(
      `  + ${data.title} maze (${file}) — ${(data.rooms || []).length} room(s)`,
    );
    continue;
  }

  // Encyclopedia entries: object where values have `term`, `definition`, `category`, `quickFacts`.
  // Matches the EncyclopediaEntry shape from content/explorer/types.ts.
  if (
    data &&
    typeof data === "object" &&
    !Array.isArray(data) &&
    Object.values(data).some(
      (v) =>
        typeof v?.term === "string" &&
        typeof v?.definition === "string" &&
        typeof v?.category === "string" &&
        Array.isArray(v?.quickFacts),
    )
  ) {
    insertEncyclopediaEntries(data);
    encyclopediaCount += Object.keys(data).length;
    console.log(`  + ${Object.keys(data).length} encyclopedia entries (${file})`);
    continue;
  }

  // Article: has an `excerpt` + `readTime` (Posts have neither).
  // Matches the Article shape from content/articles/types.ts.
  if (typeof data?.excerpt === "string" && typeof data?.readTime === "number") {
    if (data.id && data.id !== path.basename(file, ".json")) {
      console.warn(`  ! id "${data.id}" does not match filename "${file}"`);
    }
    insertArticleResource(data);
    articleCount += 1;
    console.log(`  + ${data.title} article (${file})`);
    continue;
  }

  // Posts record: an object whose values are post-shaped (title + content +
  // author, no excerpt/readTime) — e.g. scienceDaily2026Posts.json.
  if (
    data &&
    typeof data === "object" &&
    !Array.isArray(data) &&
    Object.values(data).some(
      (v) =>
        typeof v?.title === "string" &&
        typeof v?.content === "string" &&
        v?.author &&
        typeof v?.author === "object",
    )
  ) {
    const posts = Object.values(data);
    posts.forEach((post) => insertPostResource(post));
    postCount += posts.length;
    console.log(`  + ${posts.length} post(s) (${file})`);
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

  if (typeof data?.mythStatement === "string") {
    if (data.id && data.id !== path.basename(file, ".json")) {
      console.warn(`  ! id "${data.id}" does not match filename "${file}"`);
    }
    insertMythResource(data);
    mythCount += 1;
    console.log(`  + ${data.title} myth (${file})`);
    continue;
  }

  if (typeof data?.statement === "string") {
    if (data.id && data.id !== path.basename(file, ".json")) {
      console.warn(`  ! id "${data.id}" does not match filename "${file}"`);
    }
    insertFactResource(data);
    factCount += 1;
    console.log(`  + ${data.title} fact (${file})`);
    continue;
  }

  // Post: a single feed item (title + content + author object).
  if (
    typeof data?.title === "string" &&
    typeof data?.content === "string" &&
    data?.author &&
    typeof data?.author === "object"
  ) {
    if (data.id && data.id !== path.basename(file, ".json")) {
      console.warn(`  ! id "${data.id}" does not match filename "${file}"`);
    }
    insertPostResource(data);
    postCount += 1;
    console.log(`  + ${data.title} post (${file})`);
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
const { count: mythRows } = db
  .prepare(`SELECT COUNT(*) AS count FROM myths`)
  .get();
const { count: factRows } = db
  .prepare(`SELECT COUNT(*) AS count FROM facts`)
  .get();
const { count: mazeRows } = db
  .prepare(`SELECT COUNT(*) AS count FROM mazes`)
  .get();
const { count: mazeRoomRows } = db
  .prepare(`SELECT COUNT(*) AS count FROM maze_rooms`)
  .get();
const { count: encyclopediaRows } = db
  .prepare(`SELECT COUNT(*) AS count FROM encyclopedia_entries`)
  .get();
const { count: articleRows } = db
  .prepare(`SELECT COUNT(*) AS count FROM articles`)
  .get();
const { count: postRows } = db
  .prepare(`SELECT COUNT(*) AS count FROM posts`)
  .get();

console.log(
  `\nDone. ${lessonRows} lessons / ${stepRows} steps · ` +
    `${quizRows} quizzes / ${quizQuestionRows} questions · ` +
    `${mythBusterRows} mythbuster questions · ` +
    `${mythRows} myths · ${factRows} facts · ` +
    `${mazeRows} mazes / ${mazeRoomRows} rooms · ` +
    `${encyclopediaRows} encyclopedia entries · ` +
    `${articleRows} articles · ${postRows} posts in ${dbPath}`,
);
db.close();