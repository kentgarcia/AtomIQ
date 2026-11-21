# AtomIQ — Curriculum and Lesson Restructure Specification

**Status:** Draft for review
**Date:** 2026-11-16
**Owner:** AtomIQ product and engineering
**Applies to:** `content/database/content.db`, `scripts/content-migration/schema.sql`, `content/types.ts`, `content/units.ts`, `content/lessons/`, `content/quizzes/`, `app/lesson/`, `app/quiz/`, `app/(tabs)/index.tsx`, `components/lesson/`, `services/content-db.ts`, `services/database.ts`, `services/guide/`, `tools/studio/`, `scripts/validate-content.mjs`
**Supersedes:** the "replacing the core lesson architecture" non-goal in `docs/qa/ATOMIQ_FEEDBACK_SUMMARY_SPEC.md` §8

## 1. Goal

Lessons today are mostly text and are hard to learn from, both for people new to science and for people who already love it. This spec replaces the curriculum and the lesson format with a Duolingo-inspired structure:

1. **Learn by doing.** Short lessons, one idea per screen, a visual on every teaching screen and something to do on nearly every screen.
2. **One layered path.** Everyone follows the same path. Beginners get in-place support; enthusiasts get optional depth and can test out of what they know.
3. **A planned curriculum.** Seven units with fixed scopes, so later lessons can rely on earlier ones and future units have a place to go.
4. **Connected practice.** Lessons, checkpoints, review and games all draw on the same learning objectives, so the app knows what a learner has and has not mastered.
5. **Referenced content.** Every unit and every lesson cites its sources, and content without references cannot be published.
6. **Data, not hardcoded content.** Interactions are code; everything they show is stored in SQLite, with text kept separable for later localization.

### Non-goals

- Reusing or migrating the current lessons, lesson steps and quizzes. They are retired (§10.4).
- Localized content in this release. The data model is made ready for it (§9.4); translation is a later phase.
- Lives, hearts or any mechanic that blocks learning after mistakes.
- Server-side content, accounts or cloud sync of mastery.
- Changing the article, encyclopedia, periodic-table or Guide features, beyond re-pointing their lesson links.
- Copying another app's visual identity. The mechanics are borrowed; the look stays AtomIQ's.

## 2. Current baseline

| # | Problem | Where |
|---|---|---|
| B1 | Every lesson is the same template: briefing → myth → one `micro_learn` → lab → one or two questions → debrief. | `lesson_steps`, `app/lesson/[id].tsx` |
| B2 | One `micro_learn` step carries the whole lesson as a paragraph plus a bullet list on one slide (20 bullets in `environmental-protection`). The summary slide repeats the paragraph. | `components/lesson/MicroLearnView.tsx` |
| B3 | Every interaction is multiple choice. The "lab" is a four-option question with icons. | `components/lesson/LabView.tsx` |
| B4 | The myth card data only holds a myth, so the answer is always "myth". | `lesson_steps.data` for `myth_buster` |
| B5 | Questions test recall of text read seconds earlier. A wrong answer is "try again" until right and is not recorded. | `components/lesson/AssessmentView.tsx` |
| B6 | Lesson questions, unit quizzes, MythBuster pools and Atom Maze questions are separate. Nothing says which idea a question tests, so review, mastery and placement are impossible. | `quiz_questions`, `mythbuster_questions`, `maze_rooms.questions` |
| B7 | Units overlap: units 6–7 re-teach radiation types, shielding and dose from unit 3. | `content/units.ts` |
| B8 | Units are a TypeScript file, not content. They unlock by XP, not by what was learned. | `content/units.ts`, `isUnitUnlocked()` |
| B9 | Lessons and units carry no references. Only myths, encyclopedia entries, articles and some visual blocks do. | `schema.sql` |

## 3. Design principles

Each principle states its evidence status. "Checked" means a source summary was read during the research for this spec (§16). "To verify" means it comes from general knowledge of the literature and must be confirmed against the primary source before it is quoted in learner-facing or marketing text.

| # | Principle | What it means in the app | Evidence |
|---|---|---|---|
| P1 | Retrieval beats rereading | Learners answer from memory often; recap is a question, not a summary slide. | Checked: Dunlosky et al. 2013 rate practice testing high utility; rereading and summarizing low. |
| P2 | Spread practice over time | Review of earlier objectives is built into the path and a daily review. | Checked: Dunlosky et al. 2013 (distributed practice, high utility); Duolingo's 2022 path interleaves old skills. |
| P3 | Track mastery per idea, not per lesson | Objectives have mastery levels that move up and down with evidence. | Checked: Khan Academy mastery levels. |
| P4 | Teach against known misconceptions | Each lesson names the misconception it targets and confronts it directly. | Checked: physics-education studies on radioactivity misconceptions. To verify: refutation-text effect sizes. |
| P5 | Small segments, one idea each | Hard limits on words per card and on consecutive reading cards. | To verify: Mayer's segmenting and coherence principles. |
| P6 | Support novices without slowing experts | Help is optional and in place; depth is optional; testing out is always offered. | To verify: expertise-reversal effect (Kalyuga). |
| P7 | The game mechanic should be the concept | Bespoke simulations model the idea itself; quiz-wrapped games are practice, not teaching. | Checked with caveat: Habgood & Ainsworth 2011 supports it; the sample was small and a later replication was weaker. Treat as a design preference. |
| P8 | Predict before being told | Lessons open with a prediction the learner commits to, then show the answer. | To verify: productive-failure and predict-observe-explain literature. |

## 4. Curriculum

### 4.1 Unit map

Seven units, 35 lessons. Each unit ends in a checkpoint that also samples earlier units.

| # | Unit id | Unit | Lessons | Misconceptions targeted | Builds on |
|---|---|---|---|---|---|
| 1 | `inside-the-atom` | Inside the Atom | Atoms are everywhere · Protons, neutrons, electrons · Elements and the periodic table · Isotopes · Stable and unstable nuclei | "Atoms are tiny solid balls"; "isotope means radioactive"; "nuclear always means dangerous" | — |
| 2 | `radioactivity` | Radioactivity | Why nuclei decay · Alpha, beta and gamma · Half-life · Decay chains · Radioactivity is natural | "A nucleus is half gone after one half-life"; "radioactive forever"; "radioactivity is only man-made" | 1 |
| 3 | `radiation-meets-matter` | Radiation Meets Matter | Ionizing vs non-ionizing · Penetration and shielding · Irradiated vs contaminated · Detecting radiation · Becquerel, gray, sievert | "Irradiated things become radioactive"; "all radiation is the same" | 1, 2 |
| 4 | `radiation-and-the-body` | Radiation and the Body | The dose scale · What radiation does to cells · Short vs long exposure · Time, distance, shielding · Risk in perspective | "Any dose is deadly"; "radiation glows green" | 2, 3 |
| 5 | `energy-from-the-nucleus` | Energy from the Nucleus | Where the energy comes from · Fission and chain reactions · Fusion and the stars · How a reactor works · Reactor vs bomb | "Reactors can explode like bombs"; fission and fusion confused | 1, 2 |
| 6 | `nuclear-technology-at-work` | Nuclear Technology at Work | Seeing inside the body · Treating cancer · Food and farming · Industry and dating · Tracing the environment | "Irradiated food is radioactive"; "nuclear medicine makes you dangerous" | 2, 3, 4 |
| 7 | `safety-waste-society` | Safety, Waste and Society | Layers of safety · What happened in the big accidents · Nuclear waste · Nuclear and the climate · Security and global rules | "Waste is unmanageable forever"; "nuclear is not clean" | 2–6 |

### 4.2 Curriculum rules

- **One home per idea.** An objective is taught in exactly one lesson. Later lessons may use it and practise it but never re-teach it.
- **Declared dependencies.** A lesson lists the objectives it relies on. Validation fails if any of them is taught later in the path.
- **History is woven in.** There is no history lesson. Short story cards appear where the discovery matters (Rutherford in Unit 1, Becquerel and the Curies in Unit 2, Meitner in Unit 5).
- **Future units append.** Candidates after Unit 7: the fusion frontier and small reactors, nuclear in space, particle physics. New units go at the end or as optional side branches; they never renumber existing units.
- **Scope per unit is fixed here.** Changing which unit owns a topic requires updating this table first.

Detailed objectives are written per unit when that unit is authored. Unit 1 is specified in §12.

## 5. Structure

### 5.1 Hierarchy

```
Course
└─ Unit                     7 today; has references, a guidebook summary, a test-out
   └─ Path node             ordered; one of:
      ├─ lesson             teaches 2–4 objectives
      ├─ practice           mixed questions from the unit so far plus earlier units
      └─ checkpoint         unit test; gates the next unit
         Lesson
         └─ Card            one screen: a teaching card, an interaction or a simulation
```

Separately, an **objective** is one thing the learner should be able to do ("Given protons and neutrons, name the isotope"). Objectives belong to units, are taught by one lesson, and every question in the app is tagged with one.

### 5.2 The path

- The Home tab shows a vertical path of nodes per unit, with the unit header carrying its title, progress and a **Guidebook** button (unit summary, key terms, references).
- Nodes unlock in order within a unit. Completed nodes can be replayed.
- A unit unlocks when the previous unit's checkpoint is passed, or when the learner passes its **test-out**. The test-out is offered on locked units; passing it opens that unit without completing the units before it, so the current node stays at the earliest unfinished node.
- XP thresholds for unlocking are removed.
- A typical unit of five lessons is laid out as: lesson, lesson, lesson, practice, lesson, lesson, checkpoint.

### 5.3 Checkpoint and test-out

- **Checkpoint:** 12–15 questions; about 70% from the current unit covering every objective at least once, about 30% from earlier units. Pass mark 80%. Missed objectives are listed afterwards with a "practise these" action. No time limit.
- **Test-out:** offered on a locked unit's header. Same generator, current unit only, harder items preferred, pass mark 85%. Passing marks the unit's lessons as skipped (not completed) and its objectives as "familiar" (§7), so review still samples them.

## 6. Lesson anatomy

### 6.1 Shape

A lesson takes 3–5 minutes and has 10–15 cards. The default arc:

1. **Hook and predict.** A question the learner cannot yet answer for sure. They commit to a guess. It is not scored.
2. **Teach–do loops.** A teaching card (visual plus at most 60 words) followed by one or two interactions on that idea. Two to four loops.
3. **Confront the misconception.** A true-or-myth statement or prediction that most people get wrong, followed by a short explanation of why the wrong idea is tempting and what is actually true.
4. **Recap by recall.** Two or three questions answered from memory, including the opening prediction asked again.
5. **Mistakes replay.** Any scored item answered wrongly comes back at the end until answered correctly.
6. **Finish.** XP, objectives touched, and a **Sources** link.

Lessons differ from each other in which cards and simulations they use; the arc is a default, not a template the renderer enforces.

### 6.2 Authoring limits (enforced by validation)

| Rule | Limit |
|---|---|
| Cards per lesson | 8–16 |
| Words on a teaching card | 60 target, 80 hard limit |
| Consecutive non-interactive cards | at most 2 |
| Share of interactive cards | at least 50% |
| Non-choice interactions (order, match, slider, hotspot, sort, simulation) | at least 2 per lesson |
| Teaching cards with a visual | all of them |
| Objectives taught | 2–4 |
| Scored items per taught objective | at least 2 |
| Predict card | at least 1 |
| Lesson references | at least 1 |

### 6.3 Layers

- **Core.** The required path. Written for a learner with no science background.
- **Help in place.** Key terms are tappable and open a short definition from the encyclopedia in a bottom sheet. A "Why?" link on feedback shows a longer explanation. Read Aloud is available on every card through the media policy.
- **Go deeper.** Optional cards marked `tier: deeper`, shown as a chip after the loop they extend. They are never required, never block progress and are excluded from mastery, but give a small XP bonus.
- **Skip ahead.** Unit test-out (§5.3).

### 6.4 Feedback

- Feedback is immediate and specific to the chosen answer where possible (each wrong option may carry its own note naming the misconception).
- No lives. A wrong answer costs nothing except that the item returns in the mistakes replay.
- Correct-on-first-try and corrected-on-replay are recorded separately and both feed mastery (§7).

## 7. Mastery and review

### 7.1 Model

Each objective has a level per learner, stored locally:

| Level | Name | Reached by |
|---|---|---|
| 0 | New | default |
| 1 | Familiar | its lesson completed, or its unit tested out |
| 2 | Practised | answered correctly in two separate sessions after the lesson |
| 3 | Mastered | answered correctly in a checkpoint or review at least 7 days after reaching Practised |

A wrong answer in a checkpoint or review moves the objective down one level, never below Familiar.

### 7.2 Review scheduling

A simple box schedule, fully offline: after a correct review the next one is due in 1, 3, 7, 16, then 35 days; a wrong answer returns the objective to the 1-day box. The scheduling decisions live in a framework-free module (`services/mastery-core.ts`) tested with `node --test`, following the `media-core.ts` pattern.

### 7.3 Where review appears

- **Practice nodes** on the path.
- **Daily review** on Home: up to 10 due items, weakest objectives first. It counts for the streak. It is offered, never required.
- **Checkpoints** (the 30% drawn from earlier units).
- **Games** (§8).

## 8. Games

- **Practice surfaces.** MythBuster and Atom Maze draw their questions from the item bank (§9.2), limited to objectives the learner has reached Familiar on, and prefer due and weak objectives. Their results feed mastery.
- **Simulations.** Bespoke interactive components (§9.3) whose mechanic is the concept. They are built for a lesson first and can be offered afterwards as standalone activities in the Games and Lab tabs.
- **Myth cards mix true and false statements**, in lessons and in MythBuster, so the answer cannot be guessed from the format.
- Until the games are moved to the item bank (Phase 4), they keep their existing tables and behaviour.

## 9. Data model

### 9.1 Code and data split

- **Code** owns behaviour: one React component per card type and per simulation, registered by name.
- **SQLite** owns everything shown: structure, parameters, text, references.
- A card row names its type; the renderer looks the type up in the registry. An unknown type renders a safe fallback and fails validation at publish time.
- Text never carries logic. Correct answers refer to option ids, never to option text or position, so translated or shuffled text cannot break scoring.

### 9.2 Content tables

New tables (`CONTENT_SCHEMA_VERSION` 1 → 2). Columns shown are the meaningful ones; every table also has `created_at` and `updated_at`.

```sql
CREATE TABLE units (
  id TEXT PRIMARY KEY,                 -- 'inside-the-atom'
  position INTEGER NOT NULL UNIQUE,
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  goal TEXT NOT NULL DEFAULT '',
  guidebook TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(guidebook)),  -- summary, key term ids
  icon TEXT NOT NULL DEFAULT '',
  tone TEXT NOT NULL DEFAULT 'primary' -- semantic theme role, not a hex colour
);

CREATE TABLE objectives (
  id TEXT PRIMARY KEY,                 -- 'u1-isotope-definition'
  unit_id TEXT NOT NULL REFERENCES units(id),
  position INTEGER NOT NULL,
  statement TEXT NOT NULL,             -- "Explain what makes two atoms isotopes of one element"
  misconception TEXT                   -- the wrong idea this objective confronts, if any
);

CREATE TABLE lessons (
  id TEXT PRIMARY KEY,
  unit_id TEXT NOT NULL REFERENCES units(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  estimated_minutes INTEGER NOT NULL CHECK (estimated_minutes > 0),
  xp_reward INTEGER NOT NULL DEFAULT 0,
  teaches TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(teaches)),      -- objective ids
  relies_on TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(relies_on))   -- objective ids from earlier lessons
);

CREATE TABLE path_nodes (
  id TEXT PRIMARY KEY,
  unit_id TEXT NOT NULL REFERENCES units(id),
  position INTEGER NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('lesson', 'practice', 'checkpoint')),
  lesson_id TEXT REFERENCES lessons(id),          -- when kind = 'lesson'
  config TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(config)),  -- question counts, pass mark
  UNIQUE (unit_id, position)
);

CREATE TABLE items (                   -- the single question bank
  id TEXT PRIMARY KEY,
  objective_id TEXT NOT NULL REFERENCES objectives(id),
  type TEXT NOT NULL,                  -- interaction card type, §9.3
  data TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(data)),
  difficulty INTEGER NOT NULL DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 3),
  surfaces TEXT NOT NULL DEFAULT '["lesson","practice","checkpoint"]' CHECK (json_valid(surfaces)),
  reference_ids TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(reference_ids))
);

CREATE TABLE lesson_cards (
  lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  position INTEGER NOT NULL CHECK (position >= 0),
  kind TEXT NOT NULL CHECK (kind IN ('teach', 'item', 'sim')),
  type TEXT NOT NULL,                  -- registry name, §9.3
  tier TEXT NOT NULL DEFAULT 'core' CHECK (tier IN ('core', 'deeper')),
  item_id TEXT REFERENCES items(id),   -- when kind = 'item'
  scored INTEGER NOT NULL DEFAULT 1,   -- 0 for predictions
  data TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(data)),  -- teach and sim content
  PRIMARY KEY (lesson_id, id),
  UNIQUE (lesson_id, position)
);

CREATE TABLE content_references (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('official', 'textbook', 'research', 'article', 'video', 'book')),
  publisher TEXT NOT NULL,
  title TEXT NOT NULL,
  authors TEXT NOT NULL DEFAULT '',
  year TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL DEFAULT '',
  accessed TEXT NOT NULL DEFAULT '',   -- ISO date the source was last checked
  verified INTEGER NOT NULL DEFAULT 0, -- 1 once a person has opened the source and confirmed it
  note TEXT NOT NULL DEFAULT ''
);

CREATE TABLE unit_references (
  unit_id TEXT NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  reference_id TEXT NOT NULL REFERENCES content_references(id),
  position INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (unit_id, reference_id)
);

CREATE TABLE lesson_references (
  lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  reference_id TEXT NOT NULL REFERENCES content_references(id),
  supports TEXT NOT NULL DEFAULT '',   -- which claim or number this source backs
  position INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (lesson_id, reference_id)
);

CREATE TABLE content_translations (   -- empty until localization (§9.4)
  locale TEXT NOT NULL,
  entity TEXT NOT NULL,                -- table name
  entity_id TEXT NOT NULL,             -- primary key ('lesson_id/id' for lesson_cards)
  fields TEXT NOT NULL CHECK (json_valid(fields)),  -- translated text fields only
  PRIMARY KEY (locale, entity, entity_id)
);
```

Notes:

- Lesson interactions are items. A lesson card of kind `item` points into the bank, so the same question can come back in practice, checkpoints and games.
- Existing visual blocks (`docs/completed/VISUAL_LESSON_BLOCKS.md`) are kept. A teaching card's `data.visual` holds one `VisualBlock`. Its `source` may name a `reference_id`.
- Key terms link to `encyclopedia_entries` by id using inline markers in text (`[[isotope|isotopes]]`).
- `content/units.ts` is deleted; `content/units/index.ts` becomes a facade over the `units` and `path_nodes` tables like the other content facades.

### 9.3 Card types

Each has a TypeScript type in `content/types.ts`, a validator in `scripts/lib/content-rules.mjs`, a renderer in `components/lesson/cards/` and a Studio form. `data: any` is not allowed on the new types.

| Kind | Type | What the learner does | Needed for Unit 1 |
|---|---|---|---|
| teach | `explain` | Reads up to 60 words beside a visual block | Yes |
| teach | `story` | Reads a short history or real-life vignette with an image or scene | Yes |
| teach | `reveal` | Sees the answer to an earlier prediction with the correct visual | Yes |
| item | `choice` | Picks one option; options may be text, icon or image | Yes |
| item | `true_or_myth` | Judges a statement; statements are a mix of true and false | Yes |
| item | `order` | Arranges 3–6 things in sequence | Yes |
| item | `match` | Pairs items from two columns | Yes |
| item | `sort` | Drops items into two or three buckets | Yes |
| item | `fill` | Completes a sentence from a word bank or a number pad | Yes |
| item | `estimate` | Sets a slider or scale; scored within a tolerance | Yes |
| item | `hotspot` | Taps the right part of a scene figure | Yes |
| item | `predict` | Commits to an answer before being taught; unscored | Yes |
| sim | `atom-builder` | Adds protons, neutrons and electrons and sees the element, isotope and stability change | Yes |
| sim | `scale-zoom` | Zooms from a hand down to an atom | Yes |
| sim | later units | For example half-life decay, shielding test, chain-reaction control, dose calculator | No |

Rules for every interactive type:

- A tap-only alternative to any drag gesture.
- Screen-reader labels and a text equivalent for any figure.
- A simulation card has a goal state defined in `data` so completion is checkable, and reports the objective it exercised.
- Styles follow the theme system (`createStyles`, semantic colour roles); icons go through `components/ui/icon.tsx`.

### 9.4 Localization readiness

- English is the base locale and lives in the normal rows, so authoring and validation stay simple.
- A translation is one `content_translations` row per entity holding only its translated text fields, in the same shape as the base (`{ "title": "…", "data": { "options": { "a": { "label": "…" } } } }`). The repository deep-merges it over the base row for the active locale and falls back to English per field.
- To make that merge safe, option lists and similar arrays in `data` are keyed by stable ids, not by array position.
- UI strings in components (button labels, feedback headings) are out of scope here and need a separate app-string solution.

### 9.5 User-state tables

Added to the user-state database (`services/database.ts`), with the columns the future sync layer expects:

| Table | Purpose |
|---|---|
| `objective_mastery` | per objective: level, box, due date, correct and wrong counts, last seen |
| `item_attempts` | append-only log: item id, objective id, surface, correct, first try, timestamp |

**Path node progress reuses the existing `levels` table** instead of a new `node_progress` table (as built). A row is keyed by the path node id, with `type` set to `lesson`, `practice` or `checkpoint`, and `unit_id` set. A passed unit test-out is a row with id `testout:<unitId>` and type `testout`. Only completion, stars and attempts are stored. `locked`, `current` and `available` are derived from the path rules in `services/path-core.ts`, so they can never disagree with the content. Rows keyed by old lesson or quiz ids are never read, which is how old progress is "left in place but ignored". The old `units` and `lesson_steps` progress tables are no longer written. See §10.4.

## 10. App changes

### 10.1 Lesson runner

- `app/lesson/[id].tsx` becomes a thin screen over a framework-free `services/lesson-core.ts` state machine: card order, optional deeper cards, scoring, mistakes replay, completion. Unit-tested with `node --test`.
- `components/lesson/cards/` holds one file per card type plus `registry.ts`. The old `*View.tsx` step components and `LessonRenderer.tsx` are removed once Unit 1 runs on the new runner.
- Progress inside a lesson survives backgrounding. Leaving mid-lesson offers to resume.
- The same runner plays practice nodes, checkpoints, test-outs and the daily review; only the card source differs.

### 10.2 Home path

`app/(tabs)/index.tsx` renders units and path nodes from the content DB joined with `levels` (see §9.5). It must keep passing `check:tab-bar`.

### 10.3 Things that point at lessons

These refer to lesson, unit or quiz ids and must be re-pointed or cleared when the old content is retired. Validation gains a rule that every such link resolves.

- `services/guide/topics.ts`, `services/guide/context.ts`, `services/guide/navigate.ts`
- `myths.related_lessons` (the `articles` and `posts` tables were removed later, with the Articles feature)
- `hooks/use-completed-lessons.ts`, `services/missions.ts`, achievements that count lessons
- Bookmarks of type `lesson`
- `app/quiz/[id].tsx` and any entry point that opens a unit quiz

### 10.4 Retiring the old content

- All rows in `lessons`, `lesson_steps`, `quizzes` and `quiz_questions` are retired in one recorded action with the reason "curriculum v2 rebuild", through the existing shipped-id retire mechanism. The old tables are dropped from the schema.
- This is a major content version and a schema version change.
- **Learner progress:** total XP, streaks, activity history, achievements already unlocked and game scores are kept. Old lesson and quiz completion rows are left in place but ignored. The new path starts at Unit 1, with every unit's test-out available. A one-time notice explains the change.
- Lesson bookmarks pointing at retired ids are hidden, not deleted.

### 10.5 Content Studio

- A lesson editor that shows the lesson as an ordered list of cards with add, reorder and per-type forms, and a live count against the §6.2 limits.
- Editors for units, path nodes, objectives, the item bank (filter by objective) and references, with a reference picker on units, lessons and items.
- Bespoke simulations are edited as a parameter form generated from the type's schema.
- The OpenCode plugin (`.opencode/plugin/atomiq-content.ts`) is updated to the new entities.

### 10.6 Validation (`validate:content` and Studio save)

New rules, in addition to the existing question-quality rules:

1. Every §6.2 limit.
2. Every item has an objective; every objective is taught by exactly one lesson and has at least 4 items, at least one of them with `checkpoint` in `surfaces`.
3. `relies_on` objectives are taught earlier in the path.
4. Every unit and every lesson has at least one reference; every reference used by published content has a publisher, title and either a URL or full bibliographic detail.
5. Items that state a number, date or named fact carry a `reference_id`.
6. `true_or_myth` items across a lesson and across the MythBuster pool include both true and false statements.
7. Card `type` exists in the registry list and its `data` matches the type's schema.
8. Every link listed in §10.3 resolves.
9. Glossary markers resolve to encyclopedia entries.

Unverified references (`verified = 0`) produce a warning in draft and block **publish**.

## 11. References

- **Unit references** are the core sources the unit rests on. They appear in the unit Guidebook.
- **Lesson references** are the specific sources for that lesson's facts and numbers, each with a `supports` note. They appear under **Sources** on the lesson's finish screen and on its preview.
- **Item references** back individual numeric or factual claims and appear in the "Why?" explanation.
- Source policy follows the visual-block rules: prefer IAEA, UNSCEAR, WHO, national regulators, standard textbooks and primary papers; never cite a source that has not been opened and checked; use "about" and ranges for approximate values.

## 12. Unit 1 pilot: Inside the Atom

Path: L1 → L2 → L3 → practice → L4 → L5 → checkpoint. Two simulations: `atom-builder` (used in L2–L5 in different modes) and `scale-zoom` (L1).

Facts and figures below are the intended content. Each number is confirmed against a reference during authoring before it is entered.

### 12.1 Objectives

Unit 1 is deliberately simple: **one core idea per lesson**, in short plain sentences. Anything harder is an optional "Go deeper" card (tier `deeper`) that is never required and never scored. The authoring source is now `content/source/units/inside-the-atom/` (`.atomiq` files built with `npm run content:sync`); the former `unit-1.mjs` module and the scripts around it are retired in `scripts/content-migration/legacy/`.

| Lesson | The one idea | Goal |
|---|---|---|
| L1 Atoms are everywhere | Ordinary matter is made of atoms. Air is matter too. Atoms are far too small to see. | "I understand what atoms are and how tiny they are." |
| L2 Meet the atom | An atom has a tiny centre, the nucleus, with electrons around it. Proton positive, neutron no charge, electron negative. | "I know the basic parts of an atom." |
| L3 Elements | The number of protons tells you the element. Change it and the element changes. | "I see why the proton count matters." |
| L4 Isotopes | Same protons, same element. Different neutrons, different isotope. Not automatically radioactive. | "Same protons = same element; different neutrons = different isotope." |
| L5 Stable and unstable nuclei | Some nuclei are stable, others are unstable. An unstable nucleus can change and give off radiation. | Ready for Unit 2. |

| Id | Objective | Lesson |
|---|---|---|
| `u1-matter-is-atoms` | Know that ordinary matter, including air, is made of atoms, and that light and heat are not | L1 |
| `u1-atom-scale` | Know that atoms are far too small to see, even with an ordinary microscope | L1 |
| `u1-particles` | Name the three particles and say whether each is positive, negative or has no charge | L2 |
| `u1-nucleus` | Know that the tiny nucleus holds almost all of the mass and that the rest of the atom is mostly empty space | L2 |
| `u1-atomic-number` | Know that the number of protons tells you the element | L3 |
| `u1-change-protons` | Know that changing the number of protons changes the element | L3 |
| `u1-isotope-definition` | Know that isotopes of an element have the same protons and different neutrons | L4 |
| `u1-isotope-not-radioactive` | Know that an isotope is not automatically radioactive | L4 |
| `u1-stable-unstable` | Know that some nuclei are stable and others unstable | L5 |
| `u1-unstable-changes` | Know that an unstable nucleus can change and give off radiation, and that this happens in nature | L5 |

Not required in Unit 1 (Go deeper only, or left to later units): precise atom sizes, particle masses, electron configurations, quantum ideas, memorising the periodic table or symbols, calculating atomic numbers, mass number (protons plus neutrons), and the competing forces in a nucleus. The strong force is one optional card at the end of L5.

Misconceptions confronted on purpose: air is not "nothing" (L1); atoms are mostly empty space (L2); changing the protons changes the element (L3); isotopes are not automatically radioactive (L4); radioactivity is not something people create (L5).

Language rule for this unit: short, plain sentences. Example: not "Two forces compete: electric repulsion between protons, and the strong force that glues neighbouring particles together at very short range", but "Protons push away from each other. A very strong force inside the nucleus helps hold the nucleus together." Hard terms are linked with `[[id|shown]]` markers to an encyclopedia entry; entries were added for matter, element, periodic table, mass number, ion, strong force, electric force, radioactivity, nuclear stability and electron cloud (`add-unit-1-glossary.mjs`).

### 12.2 Lessons

Each teaching card has a figure. Final questions ask the learner to use the idea (a scenario, a new case) rather than repeat a line. Cards marked (deeper) are optional.

**L1 — Atoms are everywhere** (`atoms-are-everywhere`): matter and energy, a sort, "air is matter too" with a myth question, "far too small to see", the `scale-zoom` sim (hand, skin cell, virus, atom; no exact atom diameter is taught), an order-by-size question, a true-or-myth on microscopes, a "which is made of atoms?" question. Democritus (deeper).

**L2 — Meet the atom** (`protons-neutrons-electrons`): a stadium prediction, "a tiny centre" (nucleus, electrons, almost all the mass in the nucleus), tap the nucleus, the three particles and their charges, match particle to charge, build helium, the stadium answered (a marble), "an atom is a solid ball" myth, where the mass is, sort particles by location. Rutherford's gold foil as a short story (deeper), electron cloud (deeper).

**L3 — Elements** (`elements-and-the-periodic-table`): predict, "protons tell you the element" (6 carbon, 7 nitrogen, 8 oxygen), `atom-builder` carbon to nitrogen, fill "6 protons is always ___", "change the protons, change the element", `atom-builder` nitrogen to oxygen, a "gains one proton" myth, then use-it questions (an oxygen atom loses a proton; gold versus oxygen). The periodic table is a single optional card (deeper); no table is tested.

**Practice node** — 8 items drawn from L1–L3 objectives.

**L4 — Isotopes** (`isotopes`): predict, "same element, different neutrons" (carbon-12 and carbon-14), `atom-builder` isotope (make carbon-14 from carbon-12), sort which atoms are carbon, "isotope does not mean radioactive", two true-or-myth questions, a sort of isotope pairs versus different elements, a use-it choice (17 protons with 18 or 20 neutrons). "Reading the name" and mass number are one optional card (deeper); nothing is calculated.

**L5 — Stable and unstable nuclei** (`stable-and-unstable-nuclei`): predict, "stable and unstable", `atom-builder` stability (make carbon-14 stable), sort stable or unstable, "unstable nuclei can change" (radioactivity), "radioactivity is natural" (rocks, bananas, your body), myth and true-or-myth questions, a "what can happen to an unstable nucleus?" choice, a sort of natural versus man-made. "What holds a nucleus together" (the strong force) and Becquerel's plate are optional (deeper).

**Checkpoint** — 12 items covering all ten objectives. As the first unit, it has no earlier units to sample.

### 12.3 Candidate references for Unit 1

These are candidates. Each must be opened, checked and entered with its exact title, URL and access date before it is marked verified.

| Level | Candidate source | Supports |
|---|---|---|
| Unit | OpenStax, *Chemistry 2e*, chapter 2 "Atoms, Molecules, and Ions" | Atomic structure, atomic number, isotopes, periodic table |
| Unit | OpenStax, *University Physics Volume 3*, chapter 10 "Nuclear Physics" | Nuclear size, stability, radioactivity |
| Unit | IAEA explainers on isotopes | Isotope definition, stable and unstable isotopes |
| L1 | OpenStax *Chemistry 2e* section 1.2 | Matter, air is matter |
| L2 | E. Rutherford (1911), *Philosophical Magazine* | Gold-foil story (optional) |
| L3 | IUPAC Periodic Table of the Elements | Element names and atomic numbers |
| L5 | A source for potassium-40 in food and the body; Becquerel (1896) | Natural radioactivity |

## 13. Authoring workflow

1. Write the unit's objectives and misconceptions; check them against §4.
2. Collect and verify references for the unit.
3. For each lesson: write the card outline (as in §12.2), then the items, then the teaching text, then the visuals.
4. Build any new simulation the unit needs, with its data schema and Studio form.
5. Enter content in Content Studio (or through a repeatable script in `scripts/content-migration/` for bulk entry, which takes a backup first).
6. `npm run validate:content`, then play every lesson on a device, light and dark, with Read Aloud.
7. Review by a subject-matter reader for accuracy and by a beginner for clarity.
8. Publish.

Drafting of outlines, items and text is done with AI assistance; a person verifies every fact against its reference and approves every lesson before publish.

## 14. Phases

| Phase | Scope | Exit criteria |
|---|---|---|
| 0 | Sign off this spec; verify Unit 1 references | Open decisions in §15 resolved |
| 1 | Schema v2, types, repository, validation rules, Studio editors, `lesson-core.ts` with tests | `test:content`, `test:studio`, `test:content-db` pass on the new schema |
| 2 | Lesson runner, the twelve generic card types, `atom-builder`, `scale-zoom`, Home path, Unit 1 authored, old content retired, links re-pointed | Unit 1 plays end to end on a release-like Android build; all check and test scripts pass |
| 3 | Mastery, review scheduling, practice nodes, checkpoint, test-out, daily review | `mastery-core` tests pass; Unit 1 checkpoint and test-out work offline |
| 4 | Units 2–7, each with its simulations; games moved to the item bank | Each unit passes validation and review before publish |
| 5 | Localization: translation rows, locale selection, app strings | Separate spec |

## 15. Open decisions

| # | Decision | Default if not decided otherwise |
|---|---|---|
| D1 | When to release to users, given the old units are removed and new ones arrive one at a time | Internal and beta builds from Phase 2; no public release until Units 1–3 are published |
| D2 | Pass marks | Checkpoint 80%, test-out 85% |
| D3 | Whether passing a test-out awards the unit's XP | Half the unit's XP |
| D4 | Whether the daily review counts toward the streak | Yes |
| D5 | Whether old completion data is deleted or left ignored | Left in place, ignored |
| D6 | Whether simulations also appear as standalone games in Phase 2 or wait for Phase 4 | Wait for Phase 4 |
| D7 | Who does the subject-matter accuracy review | To be named before Unit 1 is published |

## 16. Success measures

- Lesson completion rate and median time per lesson (target 3–5 minutes).
- First-try accuracy per item; items below 30% or above 95% are reviewed.
- Share of learners who pass the Unit 1 checkpoint on the first attempt.
- Share of Unit 1 objectives at Practised or Mastered two weeks after completion.
- Test-out attempts and pass rate, as a signal of how well enthusiasts are served.
- Use of "Go deeper" cards and glossary taps.
- Beta ratings for "easy to understand" and "motivating to continue learning", compared with the previous round.
- Zero published lessons or units without a verified reference.

## 17. Research sources

Read as search summaries during the research for this spec, not as full papers:

- Dunlosky, Rawson, Marsh, Nathan and Willingham (2013), "Improving Students' Learning With Effective Learning Techniques", *Psychological Science in the Public Interest* 14(1). Summary: https://www.psychologicalscience.org/news/releases/which-study-strategies-make-the-grade.html
- Duolingo, "New Duolingo home screen design" (2022 path redesign): https://blog.duolingo.com/new-duolingo-home-screen-design
- Khan Academy, "How do Khan Academy's Mastery levels work?": https://support.khanacademy.org/hc/bg/articles/5548760867853
- "Misconceptions, knowledge, and attitudes of secondary school students towards the phenomenon of radioactivity": https://arxiv.org/pdf/2001.07746
- Prather, "Students' beliefs about the role of atoms in radioactive decay and half-life": https://experts.arizona.edu/en/publications/students-beliefs-about-the-role-of-atoms-in-radioactive-decay-and/
- "Student understanding of emergent aspects of radioactivity": https://www.ijpce.org/index.php/IJPCE/article/view/125
- Habgood and Ainsworth (2011), "Motivating children to learn effectively: exploring the value of intrinsic integration in educational games": https://shura.shu.ac.uk/3556

Not yet checked and marked "to verify" in §3: Mayer's multimedia principles, the expertise-reversal effect, refutation-text research, productive failure and predict-observe-explain, and how Brilliant structures its lessons.
