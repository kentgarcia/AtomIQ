-- ============================================================================
-- AtomIQ content database schema
--
-- Stores Lesson content (with nested Steps), Quizzes (with nested Questions),
-- the standalone Mythbuster question banks used by the atom-maze boss
-- battles, the Myths and Facts reference resources, the Atom Maze challenges
-- (with nested Rooms and JSON-encoded Monsters + BattleQuestions), the
-- Encyclopedia entries (with JSON-encoded flexible fields), and the Articles
-- + Posts powering the Learn & Explore feed (JSON-encoded author objects). The flexible `data` payload on
-- each lesson step is stored as a JSON document whose shape is dictated by
-- the step's `step_type`:
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
-- Myths (myth-busting resource articles)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS myths (
  id             TEXT PRIMARY KEY,                -- myth.id
  title          TEXT NOT NULL,
  myth_statement TEXT NOT NULL,                   -- the (false) claim being debunked
  reality        TEXT NOT NULL,                   -- the true reality
  explanation    TEXT NOT NULL DEFAULT '',        -- long-form debunk
  category       TEXT NOT NULL DEFAULT '',        -- myth.category
  difficulty     TEXT NOT NULL DEFAULT 'easy'
                 CHECK (difficulty IN ('easy', 'medium', 'hard')),
  sources        TEXT NOT NULL DEFAULT '[]'       -- JSON array of Source objects
                 CONSTRAINT myths_sources_json CHECK (json_valid(sources)),
  related_facts  TEXT NOT NULL DEFAULT '[]'       -- JSON array of fact ids
                 CONSTRAINT myths_related_facts_json CHECK (json_valid(related_facts)),
  related_lessons TEXT NOT NULL DEFAULT '[]'      -- JSON array of lesson ids
                 CONSTRAINT myths_related_lessons_json CHECK (json_valid(related_lessons)),
  image          TEXT,                             -- nullable
  tags           TEXT NOT NULL DEFAULT '[]'       -- JSON array of strings
                 CONSTRAINT myths_tags_json CHECK (json_valid(tags)),
  popularity     INTEGER NOT NULL DEFAULT 0,       -- how common this myth is (1-10)
  created_at     INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at     INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- NOTE: the standalone `facts` table was retired — verified truths live in
-- each myth's `reality` field. The `related_facts` columns on myths/articles
-- remain as legacy (empty) JSON arrays.

-- ----------------------------------------------------------------------------
-- Atom Mazes (Pokemon-style challenge levels)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mazes (
  id              TEXT PRIMARY KEY,                -- maze.id (e.g. 'safety-maze')
  title           TEXT NOT NULL,
  description     TEXT NOT NULL,
  theme           TEXT NOT NULL DEFAULT '',        -- maze.theme
  xp_reward       INTEGER NOT NULL DEFAULT 0,
  time_limit      INTEGER,                         -- seconds; nullable
  player_max_hp   INTEGER NOT NULL DEFAULT 100,    -- player HP for this maze
  boss            TEXT NOT NULL DEFAULT '{}'       -- JSON Monster object (final boss)
                  CONSTRAINT mazes_boss_json CHECK (json_valid(boss)),
  created_at      INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at      INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- ----------------------------------------------------------------------------
-- Maze rooms (nested children of mazes)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS maze_rooms (
  maze_id           TEXT NOT NULL REFERENCES mazes(id) ON DELETE CASCADE,
  id                TEXT NOT NULL,                 -- room.id (unique within its maze)
  position          INTEGER NOT NULL CHECK (position >= 0),   -- 0-based order within the maze
  title             TEXT NOT NULL,
  description       TEXT NOT NULL,
  monster           TEXT NOT NULL DEFAULT '{}'     -- JSON Monster object to fight
                    CONSTRAINT maze_rooms_monster_json CHECK (json_valid(monster)),
  questions         TEXT NOT NULL DEFAULT '[]'     -- JSON array of BattleQuestions
                    CONSTRAINT maze_rooms_questions_json CHECK (json_valid(questions)),
  damage_per_correct INTEGER NOT NULL DEFAULT 0,   -- damage dealt per correct answer
  explanation       TEXT NOT NULL DEFAULT '',      -- shown after defeating the monster
  next_room_id      TEXT,                           -- path through the maze; nullable
  alternative_path_id TEXT,                          -- branching path; nullable
  unlock_condition  TEXT                            -- JSON { type, value }; nullable
                    CHECK (unlock_condition IS NULL OR json_valid(unlock_condition)),
  created_at        INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at        INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  PRIMARY KEY (maze_id, id),
  UNIQUE (maze_id, position)
);

-- ----------------------------------------------------------------------------
-- Encyclopedia entries (A-Z terms and notable people)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS encyclopedia_entries (
  id             TEXT PRIMARY KEY,                -- entry.id
  term           TEXT NOT NULL,                   -- entry.term (display name)
  definition     TEXT NOT NULL,                   -- entry.definition
  category       TEXT NOT NULL DEFAULT '',        -- entry.category
  related_terms  TEXT NOT NULL DEFAULT '[]'       -- JSON array of term ids
                 CONSTRAINT encyclopedia_related_terms_json CHECK (json_valid(related_terms)),
  quick_facts    TEXT NOT NULL DEFAULT '[]'       -- JSON array of strings
                 CONSTRAINT encyclopedia_quick_facts_json CHECK (json_valid(quick_facts)),
  sources        TEXT NOT NULL DEFAULT '[]'       -- JSON array of Source objects
                 CONSTRAINT encyclopedia_sources_json CHECK (json_valid(sources)),
  image          TEXT,                             -- nullable
  debunking_snippet TEXT,                          -- nullable; short myth debunk
  related_myths  TEXT NOT NULL DEFAULT '[]'       -- JSON array of myth ids
                 CONSTRAINT encyclopedia_related_myths_json CHECK (json_valid(related_myths)),
  related_articles TEXT NOT NULL DEFAULT '[]'     -- JSON array of article ids
                 CONSTRAINT encyclopedia_related_articles_json CHECK (json_valid(related_articles)),
  difficulty     TEXT NOT NULL DEFAULT 'beginner'
                 CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  created_at     INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at     INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- ----------------------------------------------------------------------------
-- Articles (long-form Learn & Explore reading content)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS articles (
  id             TEXT PRIMARY KEY,                -- article.id
  type           TEXT NOT NULL DEFAULT 'article'
                 CHECK (type IN ('article', 'news', 'research', 'opinion', 'guide')),
  category       TEXT NOT NULL DEFAULT '',
  title          TEXT NOT NULL,
  subtitle       TEXT,                            -- nullable
  content        TEXT NOT NULL DEFAULT '',        -- markdown body
  excerpt        TEXT NOT NULL DEFAULT '',        -- short summary for lists/feed
  author         TEXT NOT NULL DEFAULT '{}'       -- JSON { name, avatar, title }
                 CONSTRAINT articles_author_json CHECK (json_valid(author)),
  published_date TEXT NOT NULL DEFAULT '',        -- ISO date string
  read_time      INTEGER NOT NULL DEFAULT 0,      -- minutes
  image          TEXT,                            -- nullable; asset path or URL
  tags           TEXT NOT NULL DEFAULT '[]'       -- JSON array of strings
                 CONSTRAINT articles_tags_json CHECK (json_valid(tags)),
  source         TEXT,
  source_url     TEXT,
  related_myths  TEXT NOT NULL DEFAULT '[]'       -- JSON array of myth ids
                 CONSTRAINT articles_related_myths_json CHECK (json_valid(related_myths)),
  related_facts  TEXT NOT NULL DEFAULT '[]'       -- JSON array of fact ids
                 CONSTRAINT articles_related_facts_json CHECK (json_valid(related_facts)),
  featured       INTEGER NOT NULL DEFAULT 0,      -- 1 = featured in the feed
  difficulty     TEXT
                 CHECK (difficulty IS NULL OR difficulty IN ('beginner', 'intermediate', 'advanced')),
  created_at     INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at     INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- ----------------------------------------------------------------------------
-- Posts (short community-feed items)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS posts (
  id              TEXT PRIMARY KEY,               -- post.id
  type            TEXT NOT NULL DEFAULT 'news',   -- article types + feed-only types
  category        TEXT NOT NULL DEFAULT '',
  title           TEXT NOT NULL,
  content         TEXT NOT NULL DEFAULT '',
  author          TEXT NOT NULL DEFAULT '{}'      -- JSON { name, avatar, title }
                  CONSTRAINT posts_author_json CHECK (json_valid(author)),
  published_date  TEXT NOT NULL DEFAULT '',       -- ISO date string
  image           TEXT,                           -- nullable; asset path or URL
  tags            TEXT NOT NULL DEFAULT '[]'      -- JSON array of strings
                  CONSTRAINT posts_tags_json CHECK (json_valid(tags)),
  source          TEXT,
  source_url      TEXT,
  video_url       TEXT,
  related_content TEXT NOT NULL DEFAULT '[]'      -- JSON array of content ids
                  CONSTRAINT posts_related_content_json CHECK (json_valid(related_content)),
  created_at      INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at      INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
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
CREATE INDEX IF NOT EXISTS idx_myths_category      ON myths(category);
CREATE INDEX IF NOT EXISTS idx_myths_difficulty    ON myths(difficulty);
CREATE INDEX IF NOT EXISTS idx_facts_category      ON facts(category);
CREATE INDEX IF NOT EXISTS idx_facts_importance    ON facts(importance);
CREATE INDEX IF NOT EXISTS idx_maze_rooms_maze     ON maze_rooms(maze_id);
CREATE INDEX IF NOT EXISTS idx_encyclopedia_category ON encyclopedia_entries(category);
CREATE INDEX IF NOT EXISTS idx_encyclopedia_difficulty ON encyclopedia_entries(difficulty);
CREATE INDEX IF NOT EXISTS idx_articles_category    ON articles(category);
CREATE INDEX IF NOT EXISTS idx_articles_featured    ON articles(featured);
CREATE INDEX IF NOT EXISTS idx_articles_published   ON articles(published_date);
CREATE INDEX IF NOT EXISTS idx_posts_category       ON posts(category);
CREATE INDEX IF NOT EXISTS idx_posts_published      ON posts(published_date);

-- Optional JSON1 expression index example — makes `WHERE json_extract(tags,'$[0]') = 'basics'` fast
-- CREATE INDEX IF NOT EXISTS idx_lessons_tags_json ON lessons(json_extract(tags, '$'));