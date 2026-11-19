-- ============================================================================
-- AtomIQ content database schema
--
-- Stores the curriculum (units, objectives, lessons made of cards, the item bank
-- and references; see "Curriculum v2" below), the standalone Mythbuster question banks used by the atom-maze boss
-- battles, the Myths and Facts reference resources, the Atom Maze challenges
-- (with nested Rooms and JSON-encoded Monsters + BattleQuestions) and the
-- Encyclopedia entries (with JSON-encoded flexible fields).
--
-- JSON1 functions are used for validation (json_valid) and optional
-- querying. better-sqlite3 bundles a JSON1-enabled SQLite build.
--
-- Run either via seed-sqlite.js (recommended) or directly with any SQLite client:
--   sqlite3 content.db < schema.sql
-- ============================================================================

PRAGMA foreign_keys = ON;

-- ----------------------------------------------------------------------------
-- Curriculum v2 (docs/LESSON_RESTRUCTURE_SPEC.md §9)
--
-- Units -> path nodes -> lessons -> cards; objectives; one item bank; references.
-- Correct answers refer to option ids (never text or position), and option lists
-- are arrays of { id, ... } objects, so text can be translated or shuffled safely.
-- scripts/content-migration/curriculum-cutover.mjs applies this block to an
-- existing master database; keep the markers.
-- ----------------------------------------------------------------------------
-- BEGIN curriculum-v2
CREATE TABLE IF NOT EXISTS units (
  id          TEXT PRIMARY KEY,                -- 'inside-the-atom'
  position    INTEGER NOT NULL UNIQUE,
  title       TEXT NOT NULL,
  subtitle    TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  goal        TEXT NOT NULL DEFAULT '',
  guidebook   TEXT NOT NULL DEFAULT '{}'       -- JSON { summary, termIds[] }
              CONSTRAINT units_guidebook_json CHECK (json_valid(guidebook)),
  icon        TEXT NOT NULL DEFAULT '',
  tone        TEXT NOT NULL DEFAULT 'primary'
              CHECK (tone IN ('primary', 'accent', 'success', 'warning', 'danger', 'info')),
  teacher_npc_id TEXT,                         -- npcs.id: the unit's teacher (docs/NPC_TEACHERS_SPEC.md)
  created_at  INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at  INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE TABLE IF NOT EXISTS objectives (
  id             TEXT PRIMARY KEY,             -- 'u1-isotope-definition'
  unit_id        TEXT NOT NULL REFERENCES units(id),
  position       INTEGER NOT NULL,
  statement      TEXT NOT NULL,                -- "Explain what makes two atoms isotopes of one element"
  misconception  TEXT,                         -- the wrong idea this objective confronts, if any
  created_at     INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at     INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE TABLE IF NOT EXISTS lessons (
  id                 TEXT PRIMARY KEY,
  unit_id            TEXT NOT NULL REFERENCES units(id),
  title              TEXT NOT NULL,
  description        TEXT NOT NULL DEFAULT '',
  estimated_minutes  INTEGER NOT NULL CHECK (estimated_minutes > 0),
  xp_reward          INTEGER NOT NULL DEFAULT 0,
  teaches            TEXT NOT NULL DEFAULT '[]'  -- JSON array of objective ids
                     CONSTRAINT lessons_teaches_json CHECK (json_valid(teaches)),
  relies_on          TEXT NOT NULL DEFAULT '[]'  -- JSON array of objective ids from earlier lessons
                     CONSTRAINT lessons_relies_on_json CHECK (json_valid(relies_on)),
  created_at         INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at         INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE TABLE IF NOT EXISTS path_nodes (
  id         TEXT PRIMARY KEY,
  unit_id    TEXT NOT NULL REFERENCES units(id),
  position   INTEGER NOT NULL CHECK (position >= 0),
  kind       TEXT NOT NULL CHECK (kind IN ('lesson', 'practice', 'checkpoint')),
  lesson_id  TEXT REFERENCES lessons(id),            -- when kind = 'lesson'
  config     TEXT NOT NULL DEFAULT '{}'              -- JSON { questionCount, earlierShare, passMark }
             CONSTRAINT path_nodes_config_json CHECK (json_valid(config)),
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  UNIQUE (unit_id, position)
);

-- The single question bank. Lessons, practice, checkpoints, review and games all draw from it.
CREATE TABLE IF NOT EXISTS items (
  id            TEXT PRIMARY KEY,
  objective_id  TEXT NOT NULL REFERENCES objectives(id),
  type          TEXT NOT NULL CHECK (
    type IN ('choice', 'true_or_myth', 'order', 'match', 'sort', 'fill', 'estimate', 'hotspot', 'predict')
  ),
  data          TEXT NOT NULL DEFAULT '{}'
                CONSTRAINT items_data_json CHECK (json_valid(data)),
  difficulty    INTEGER NOT NULL DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 3),
  surfaces      TEXT NOT NULL DEFAULT '["lesson","practice","checkpoint"]'
                CONSTRAINT items_surfaces_json CHECK (json_valid(surfaces)),
  reference_ids TEXT NOT NULL DEFAULT '[]'
                CONSTRAINT items_reference_ids_json CHECK (json_valid(reference_ids)),
  created_at    INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at    INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE TABLE IF NOT EXISTS lesson_cards (
  lesson_id  TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  id         TEXT NOT NULL,                          -- unique within its lesson
  position   INTEGER NOT NULL CHECK (position >= 0),
  kind       TEXT NOT NULL CHECK (kind IN ('teach', 'item', 'sim')),
  type       TEXT NOT NULL,                          -- card type registry name
  tier       TEXT NOT NULL DEFAULT 'core' CHECK (tier IN ('core', 'deeper')),
  item_id    TEXT REFERENCES items(id),              -- when kind = 'item'
  scored     INTEGER NOT NULL DEFAULT 1,             -- 0 for predictions
  data       TEXT NOT NULL DEFAULT '{}'              -- teach and sim content
             CONSTRAINT lesson_cards_data_json CHECK (json_valid(data)),
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  PRIMARY KEY (lesson_id, id),
  UNIQUE (lesson_id, position)
);

CREATE TABLE IF NOT EXISTS content_references (
  id         TEXT PRIMARY KEY,
  kind       TEXT NOT NULL CHECK (kind IN ('official', 'textbook', 'research', 'article', 'video', 'book')),
  publisher  TEXT NOT NULL,
  title      TEXT NOT NULL,
  authors    TEXT NOT NULL DEFAULT '',
  year       TEXT NOT NULL DEFAULT '',
  url        TEXT NOT NULL DEFAULT '',
  accessed   TEXT NOT NULL DEFAULT '',               -- ISO date the source was last opened and checked
  verified   INTEGER NOT NULL DEFAULT 0,             -- 1 once a person confirmed what it supports
  note       TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE TABLE IF NOT EXISTS unit_references (
  unit_id      TEXT NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  reference_id TEXT NOT NULL REFERENCES content_references(id),
  position     INTEGER NOT NULL DEFAULT 0,
  created_at   INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at   INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  PRIMARY KEY (unit_id, reference_id)
);

CREATE TABLE IF NOT EXISTS lesson_references (
  lesson_id    TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  reference_id TEXT NOT NULL REFERENCES content_references(id),
  supports     TEXT NOT NULL DEFAULT '',             -- which claim or number this source backs
  position     INTEGER NOT NULL DEFAULT 0,
  created_at   INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at   INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  PRIMARY KEY (lesson_id, reference_id)
);

-- Empty until localization (spec §9.4).
CREATE TABLE IF NOT EXISTS content_translations (
  locale     TEXT NOT NULL,
  entity     TEXT NOT NULL,                          -- table name
  entity_id  TEXT NOT NULL,                          -- primary key ('lesson_id/id' for lesson_cards)
  fields     TEXT NOT NULL CONSTRAINT content_translations_fields_json CHECK (json_valid(fields)),
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  PRIMARY KEY (locale, entity, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_objectives_unit     ON objectives(unit_id);
CREATE INDEX IF NOT EXISTS idx_lessons_unit_id     ON lessons(unit_id);
CREATE INDEX IF NOT EXISTS idx_path_nodes_unit     ON path_nodes(unit_id);
CREATE INDEX IF NOT EXISTS idx_items_objective     ON items(objective_id);
CREATE INDEX IF NOT EXISTS idx_lesson_cards_lesson ON lesson_cards(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_cards_item   ON lesson_cards(item_id);
-- END curriculum-v2

-- BEGIN npcs
-- NPC teachers (docs/NPC_TEACHERS_SPEC.md). The DB holds values only: `spec` is the NpcSpec JSON
-- (colours and style choices); the drawing is code in components/npc/.
CREATE TABLE IF NOT EXISTS npcs (
  id         TEXT PRIMARY KEY,                 -- shipped id, e.g. 'npc-ada'
  name       TEXT NOT NULL,
  title      TEXT NOT NULL,
  field      TEXT NOT NULL,
  bio        TEXT NOT NULL,
  spec       TEXT NOT NULL CONSTRAINT npcs_spec_json CHECK (json_valid(spec)),
  position   INTEGER NOT NULL UNIQUE,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE TABLE IF NOT EXISTS npc_lines (
  id         TEXT PRIMARY KEY,
  npc_id     TEXT NOT NULL REFERENCES npcs(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL CHECK (kind IN ('meet', 'lesson_intro', 'sign_off', 'tease', 'journey_intro')),
  lesson_id  TEXT REFERENCES lessons(id) ON DELETE CASCADE,
  journey_id TEXT,
  text       TEXT NOT NULL,
  pose       TEXT NOT NULL DEFAULT 'explain',
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_npc_lines_npc ON npc_lines(npc_id);
-- END npcs

-- BEGIN feed
-- NPC feed and mini blog (docs/NPC_FEED_SPEC.md §6). Values only; the vocabulary (trigger keys, their
-- condition fields and placeholders, block types) is scripts/lib/feed-vocab.mjs, enforced by
-- scripts/lib/feed-rules.mjs on validate:content and on Studio saves.
CREATE TABLE IF NOT EXISTS feed_templates (
  id          TEXT PRIMARY KEY,              -- 'ft-ada-lesson-1' (shipped id once published)
  npc_id      TEXT REFERENCES npcs(id),      -- poster; NULL = chosen from poster_pool
  poster_pool TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(poster_pool)),
  kind        TEXT NOT NULL CHECK (kind IN ('celebrate','milestone','nudge','tease')),
  trigger     TEXT NOT NULL,                 -- a trigger key from §5.1 (not blog_unlocked: a blog card's text is the piece's hook)
  condition   TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(condition)),
  text        TEXT NOT NULL,                 -- {placeholders}: {lesson} {unit} {days} {rival} {name}
  chip        TEXT CHECK (chip IN ('lesson','unit','quests','ranks') OR chip IS NULL),
  reactors    TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(reactors)),  -- npc ids that always react
  weight      INTEGER NOT NULL DEFAULT 1,
  created_at  INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  updated_at  INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

CREATE TABLE IF NOT EXISTS blog_posts (
  id          TEXT PRIMARY KEY,              -- 'blog-the-smallest-thing' (shipped id)
  npc_id      TEXT NOT NULL REFERENCES npcs(id),   -- author
  unit_id     TEXT REFERENCES units(id),
  lesson_id   TEXT REFERENCES lessons(id),
  position    INTEGER NOT NULL,
  title       TEXT NOT NULL,
  hook        TEXT NOT NULL,                 -- one line, shown on the blog card
  cover       TEXT NOT NULL,                 -- a lesson figure / object id from the existing art
  read_min    INTEGER NOT NULL,
  unlock      TEXT NOT NULL DEFAULT '{"trigger":"none"}' CHECK (json_valid(unlock)),
  blocks      TEXT NOT NULL CHECK (json_valid(blocks)),  -- vocabulary below
  reactors    TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(reactors)),
  created_at  INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  updated_at  INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

CREATE TABLE IF NOT EXISTS blog_comments (   -- authored with the piece; a piece may have none
  id          TEXT PRIMARY KEY,
  blog_id     TEXT NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  npc_id      TEXT NOT NULL REFERENCES npcs(id),   -- commenter, never the author
  position    INTEGER NOT NULL,
  text        TEXT NOT NULL,
  chip        TEXT CHECK (chip IS NULL OR json_valid(chip)),  -- optional {"lessonId":..} / {"entryId":..}
  created_at  INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  updated_at  INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

CREATE TABLE IF NOT EXISTS blog_references (   -- same shape as lesson_references
  blog_id      TEXT NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  reference_id TEXT NOT NULL REFERENCES content_references(id),
  PRIMARY KEY (blog_id, reference_id)
);

CREATE INDEX IF NOT EXISTS idx_blog_comments_blog ON blog_comments(blog_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_unit    ON blog_posts(unit_id);
-- END feed

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
-- Myths (myth-busting reference resources)
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
-- each myth's `reality` field. The `related_facts` column on myths
-- remains as a legacy (empty) JSON array.

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
  difficulty     TEXT NOT NULL DEFAULT 'beginner'
                 CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  created_at     INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at     INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- ----------------------------------------------------------------------------
-- Indexes
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_mythbuster_difficulty ON mythbuster_questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_myths_category      ON myths(category);
CREATE INDEX IF NOT EXISTS idx_myths_difficulty    ON myths(difficulty);
CREATE INDEX IF NOT EXISTS idx_maze_rooms_maze     ON maze_rooms(maze_id);
CREATE INDEX IF NOT EXISTS idx_encyclopedia_category ON encyclopedia_entries(category);
CREATE INDEX IF NOT EXISTS idx_encyclopedia_difficulty ON encyclopedia_entries(difficulty);

-- Optional JSON1 expression index example — makes `WHERE json_extract(tags,'$[0]') = 'basics'` fast
-- CREATE INDEX IF NOT EXISTS idx_lessons_tags_json ON lessons(json_extract(tags, '$'));

-- BEGIN unit-statements
-- Myth Buster, Quick Play: each unit is a theme with a short deck of myth-or-fact statements. `verdict` is
-- 'myth' (the statement is false) or 'fact' (it is true). The DB holds values only; the game is code.
CREATE TABLE IF NOT EXISTS unit_statements (
  id          TEXT PRIMARY KEY,                -- e.g. 'inside-the-atom-s01'
  unit_id     TEXT NOT NULL REFERENCES units(id),
  position    INTEGER NOT NULL DEFAULT 0,      -- 0-based order within its unit
  statement   TEXT NOT NULL,
  verdict     TEXT NOT NULL CHECK (verdict IN ('myth', 'fact')),
  explanation TEXT NOT NULL DEFAULT '',
  created_at  INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at  INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  UNIQUE (unit_id, position)
);
CREATE INDEX IF NOT EXISTS idx_unit_statements_unit ON unit_statements(unit_id);
-- END unit-statements
