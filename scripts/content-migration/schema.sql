-- ============================================================================
-- AtomIQ content database schema
--
-- Stores Lesson content (with nested Steps), Quizzes (with nested Questions),
-- and the standalone Mythbuster question banks used by the atom-maze boss
-- battles. The flexible `data` payload on each lesson step is stored as a JSON
-- document whose shape is dictated by the step's `step_type`:
--
--   briefing   -> { topic, mission, icon }
--   myth_buster-> { myth, reality, explanation, image? }
--   micro_learn-> { title, content, keyPoints?, image? }
--   lab        -> { title, description, task, options[{ id, label, icon?, image? }], correctAnswer, explanation }
--   assessment -> { question, options[], correctIndex, explanation, image? }
--   debrief    -> { title, message, rewards{ xp, stars } }
--
-- Quiz question `correct_answer` is stored as JSON so the original runtime
-- type is preserved: numeric option index for multiple choice, or a JSON
-- boolean for true/false questions (matching the app's getCorrectAnswerIndex
-- which handles both).
--
-- JSON1 functions are used for validation (json_valid) and optional
-- querying. better-sqlite3 bundles a JSON1-enabled SQLite build.
--
-- Run either via seed-sqlite.js (recommended) or directly with any SQLite client:
--   sqlite3 content.db < schema.sql
-- ============================================================================

PRAGMA foreign_keys = ON;

-- ----------------------------------------------------------------------------
-- Lessons
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lessons (
  id                 TEXT PRIMARY KEY,                         -- lesson.id
  title              TEXT NOT NULL,
  description        TEXT NOT NULL,
  unit_id            TEXT NOT NULL,                            -- lesson.unitId (units table is optional)
  difficulty         TEXT NOT NULL
                     CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  estimated_minutes  INTEGER NOT NULL CHECK (estimated_minutes > 0),
  xp_reward          INTEGER NOT NULL DEFAULT 0,
  prerequisites      TEXT NOT NULL DEFAULT '[]'                -- JSON array of lesson ids
                     CONSTRAINT lessons_prerequisites_json CHECK (json_valid(prerequisites)),
  tags               TEXT NOT NULL DEFAULT '[]'                -- JSON array of strings
                     CONSTRAINT lessons_tags_json CHECK (json_valid(tags)),
  created_at         INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at         INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- ----------------------------------------------------------------------------
-- Lesson steps (nested children of lessons)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lesson_steps (
  lesson_id  TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  id         TEXT NOT NULL,          -- step.id (unique within its lesson)
  step_type  TEXT NOT NULL CHECK (
    step_type IN ('briefing', 'myth_buster', 'micro_learn', 'lab', 'assessment', 'debrief')
  ),
  position   INTEGER NOT NULL CHECK (position >= 0),           -- 0-based order within the lesson
  data       TEXT NOT NULL DEFAULT '{}'                        -- JSON; shape varies by step_type
             CONSTRAINT lesson_steps_data_json CHECK (json_valid(data)),
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  PRIMARY KEY (lesson_id, id),
  UNIQUE (lesson_id, position)
);

-- ----------------------------------------------------------------------------
-- Quizzes
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quizzes (
  id                 TEXT PRIMARY KEY,                         -- quiz.id
  title              TEXT NOT NULL,
  description        TEXT NOT NULL DEFAULT '',
  category           TEXT NOT NULL DEFAULT '',                 -- quiz.category
  difficulty         TEXT NOT NULL DEFAULT 'easy'
                     CHECK (difficulty IN ('easy', 'medium', 'hard', 'beginner')),
  passing_score      INTEGER NOT NULL DEFAULT 70,              -- passing percentage
  xp_reward          INTEGER NOT NULL DEFAULT 0,
  time_limit         INTEGER,                                  -- seconds (quiz-level, nullable)
  unit_id            TEXT,                                     -- nullable; legacy field (atomic-basics only)
  estimated_minutes  INTEGER,                                  -- nullable; legacy field (atomic-basics only)
  metadata           TEXT NOT NULL DEFAULT '{}'                -- JSON; legacy metadata blob (atomic-basics only)
                     CONSTRAINT quizzes_metadata_json CHECK (json_valid(metadata)),
  tags               TEXT NOT NULL DEFAULT '[]'                -- JSON array of strings
                     CONSTRAINT quizzes_tags_json CHECK (json_valid(tags)),
  created_at         INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at         INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- ----------------------------------------------------------------------------
-- Quiz questions (nested children of quizzes)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quiz_questions (
  quiz_id       TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  id            TEXT NOT NULL,              -- question.id (unique within its quiz)
  position      INTEGER NOT NULL CHECK (position >= 0),           -- 0-based order within the quiz
  type          TEXT NOT NULL CHECK (
    type IN ('multiple_choice', 'true_false', 'matching', 'fill_blank')
  ),
  question      TEXT NOT NULL DEFAULT '',
  options       TEXT NOT NULL DEFAULT '[]'   -- JSON array of strings ([] when absent)
                CONSTRAINT quiz_questions_options_json CHECK (json_valid(options)),
  correct_answer TEXT NOT NULL DEFAULT '0'  -- JSON: numeric index OR boolean (preserves runtime type)
                CONSTRAINT quiz_questions_answer_json CHECK (json_valid(correct_answer)),
  explanation   TEXT NOT NULL DEFAULT '',
  difficulty    TEXT NOT NULL DEFAULT 'easy'
                CHECK (difficulty IN ('easy', 'medium', 'hard')),
  points        INTEGER NOT NULL DEFAULT 10,
  image         TEXT,                        -- nullable
  time_limit    INTEGER,                     -- per-question seconds; nullable (atomic-basics only)
  created_at    INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at    INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  PRIMARY KEY (quiz_id, id),
  UNIQUE (quiz_id, position)
);

-- ----------------------------------------------------------------------------
-- Mythbuster question banks (standalone pools used by the atom-maze boss)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mythbuster_questions (
  id            TEXT PRIMARY KEY,            -- e.g. 'mb-easy-q1'
  difficulty    TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  type          TEXT NOT NULL DEFAULT 'multiple_choice'
                CHECK (type IN ('multiple_choice', 'true_false', 'matching', 'fill_blank')),
  question      TEXT NOT NULL DEFAULT '',
  options       TEXT NOT NULL DEFAULT '[]'
                CONSTRAINT mythbuster_options_json CHECK (json_valid(options)),
  correct_answer TEXT NOT NULL DEFAULT '0'   -- JSON: numeric option index
                CONSTRAINT mythbuster_answer_json CHECK (json_valid(correct_answer)),
  explanation   TEXT NOT NULL DEFAULT '',
  points        INTEGER NOT NULL DEFAULT 5,
  position      INTEGER NOT NULL DEFAULT 0,  -- 0-based order within its difficulty pool
  created_at    INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at    INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  UNIQUE (difficulty, position)
);

-- ----------------------------------------------------------------------------
-- Indexes
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_lessons_unit_id     ON lessons(unit_id);
CREATE INDEX IF NOT EXISTS idx_lessons_difficulty  ON lessons(difficulty);
CREATE INDEX IF NOT EXISTS idx_lesson_steps_lesson ON lesson_steps(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_steps_type   ON lesson_steps(step_type);
CREATE INDEX IF NOT EXISTS idx_quizzes_category    ON quizzes(category);
CREATE INDEX IF NOT EXISTS idx_quizzes_difficulty  ON quizzes(difficulty);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz ON quiz_questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_mythbuster_difficulty ON mythbuster_questions(difficulty);

-- Optional JSON1 expression index example — makes `WHERE json_extract(tags,'$[0]') = 'basics'` fast
-- CREATE INDEX IF NOT EXISTS idx_lessons_tags_json ON lessons(json_extract(tags, '$'));