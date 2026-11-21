# Content source files: text is the master, the database is built from it

**Status (2026-11-22):** phases 1 to 4 are built (core, default adapter, export, sync, format, migrate; chat, characters, feed, blog, references, the AtomDex, myths, Myth Buster, unit statements and the phone's scanner, safety and map data owned by files, their seeds retired; `test:source-adapters`; a sync orders operations across adapters, `orderOps`); later phases are marked in section 14. Where this text and the code differ, the code and its tests win and this text is fixed.
**Decided by the owner:** files are the source of truth for authored prose; the SQLite content DB stays what the app ships and reads; Content Studio is only a viewer (the owner does not use it to edit); the `verified` flag is not something the owner will maintain; **lessons, items and cards will be migrated too, in a later phase** (they began as TypeScript files, which were easy to handle, only with very long lines because they describe pages, not plain data); **translations will be one file per language that maps the id of a text to its translation** (section 11); the file extension is **`.atomiq`**.
**Reads with:** `docs/critical/CONTENT_SQLITE_AND_STUDIO_SPEC.md` (the DB, releases, shipped ids), `docs/features/NPC_VOICE_SPEC.md` (the chat words), `scripts/lib/content-store.mjs` (`applyBatch`, the write path this spec reuses).

## 1. Why, and what does not change

Authored content is mostly prose, it is written by an AI and reviewed by a person, and it grows with every unit and teacher. A database row is a poor place to write and review a conversation; a text file in git is a good one. Today the content is half and half: the DB is the master, but chats, feed posts, bios and voices are *seeded* from `.mjs` files that overwrite it, so an edit in either place can be lost (`apply-npc-voices.mjs` deletes Hal's and Ada's chats and re-seeds them). This spec makes the rule single:

> **Anything a person writes lives as text in git (`content/source/`). `content:sync` turns it into rows. The DB is a build artifact the app reads.**

**Not changed:** the app and its runtime reads (`services/content-db.ts`, `contentRepository`); the release flow, the shipped-id ledger and retire reasons; the validators (`content-rules.mjs`, `chat-rules.mjs` ...); the user-state DB; the speed of loading (still SQLite). Text files are never read by the app.

## 2. The one hard requirement

**Migrating a later table must never force a change to a table that is already migrated.** Everything else in this spec follows from that. Five design rules make it true:

| # | Rule | What it protects against |
|---|---|---|
| R1 | **One generic core, many adapters.** The syntax, parser, canonical writer and sync are generic. A table is described by an *adapter* (data: columns, how each is written, children, layout). | A later table needing a new syntax. |
| R2 | **A lossless default adapter exists for every table from day one**, derived from the schema. A friendly adapter is a *refinement* of how one table is laid out; the default is the proof the core can carry any table. | Discovering late that table N cannot be represented. |
| R3 | **Value types come from the adapter, never from the shape of a value.** No YAML-style guessing (`~`, `no`, `1e3`). | Silent corruption, and Ada's `~`. |
| R4 | **Canonical form is pinned by golden files** and changes only through a versioned migration that rewrites files by machine (section 10). | Churn across every file, or a hand-migration. |
| R5 | **Additive evolution:** a new optional attribute, child kind or column never invalidates an existing file. | The same. |

Because rows (DB) and the parsed form (section 4.7) are both lossless, any format change is "parse with the old reader, write with the new writer", checked by a test that the rows did not change. No one edits already-migrated files by hand to follow a format change. If a proposed change would need that, the change is rejected at design time.

## 3. Scope: which tables, in which order

The survey is of the real master DB (131 chat nodes, 92 feed templates, 115 encyclopedia entries ...).

| Phase | Tables (rows) | Fit | Notes |
|---|---|---|---|
| 1 | *none owned yet*: core + default adapter, round trip proven on **all 27 content tables** (`content_meta` is a build artifact and never owned) | n/a | no behaviour change; the gate for everything after |
| 2 | `chat_nodes` (131) | ideal: prose + a reply graph | the first friendly adapter; Hal, Ada, Shrodi |
| 3 | `npcs` (7), `npc_lines` (16), `feed_templates` (92), `blog_posts` (4) + `blog_comments` (4) + `blog_references` (9) | prose + attributes; blog has typed blocks | bios currently also live in `components/npc/npc-roster.ts` (seed and fallback), see section 13 |
| 4 | `unit_statements` (20), `scan_targets` (12), `safety_cards` (14), `map_sites` (18) and their `*_references`, `myths` (37), `mythbuster_questions` (150), `encyclopedia_entries` (115), `content_references` (58) | prose plus arrays and small objects | |
| 5 (committed) | `units`, `objectives`, `lessons`, `path_nodes`, `items`, `lesson_cards`, `unit_references`, `lesson_references` | prose, interaction data and **figures by id**; see 3.1 | today's master is `scripts/content-migration/curriculum/unit-N.mjs` + `scenes.mjs`, synced by `sync-unit.mjs`; those are retired when this phase lands. Needs its own spec first |
| 6 | translations (section 11) | a flat id -> text file per language | its own small spec; changes nothing before it |
| never | `content_meta`, the user-state DB | runtime or build facts | |

### 3.1 What lessons need that the earlier phases do not (known now, designed in phase 5)

Lessons began as TypeScript files and are long because each card describes a *page* (text, a figure, an interaction), not a flat record. Two things make them different from chat, and the core must not block either:

1. **Figures are stored expanded; they should be an id.** `scenes.mjs` holds about 70 named figure functions (`halfLifeBars()`, `decayCurve()`, `radonHouse()`, `isotopePair({ same })`) over a few generators (`nucleus`, `cluster`, `atomModel`, `electronRings`). Almost every card's figure is one such call, and the DB stores only its **output**: 46 of 124 cards carry a `data.figure.scene.shapes` list, 128,599 of the table's 143,819 bytes (89%), mostly `{"t":"circle","x":21.46,...}`. That is unreadable as text, cannot be edited ("change the proton count"), and repeats the same drawing in every card that uses it. The app already does it the other way everywhere else: blog covers, chat stickers, tour pictures and scanner scenes are an id in the DB and the drawing is code (`blog-art.ts`, `chat-art.ts`, `tour-art.ts`, `scan-scenes.ts`). Lessons are the odd one out only because they began as TS files and the call's output was stored.

   **Decision (phase 5): a card's figure is `{ ref, args?, altText, caption? }` and the app draws it from a figure library, like the other art.** A file reads `figure: half-life-bars` or `figure: atom-model 6 6 6`. The library is TypeScript in the app (`components/lesson/visual/figures/`, pure functions, no React, so `node --test` and the toolchain import the same code). Hand-built one-off figures stay possible: `figure.scene` (inline shapes) is still a valid form, and `ref` and `scene` are mutually exclusive (a rule in `curriculum-rules.mjs`). Rules:
   - **Ids are shipped keys.** A figure id never changes meaning. A visual fix to a drawing keeps its id (every card using it improves); a change that would alter what a card says goes in under a new id (`half-life-bars-2`), the old one stays. Same discipline as `CONTENT_SCHEMA_VERSION`.
   - **Unknown ref never crashes or blanks a lesson.** The renderer shows the card without the figure and logs it; `validate:content` and `test:curriculum-content` fail on any `ref` the library lacks or any args it rejects, so it cannot ship.
   - **Proved before converted.** A test resolves every `ref` and compares it with the shapes in the master today; the conversion of a card is allowed only when they are equal. No figure changes appearance by being converted.
   - **Content and code now ship together.** A new figure is a code change and an app build, where an inline scene was a content change. That is the price; the content DB is bundled with the app and swapped at start, so a DB can only reference figures that the same build has, and the unknown-ref guard covers the rest.
   - **The DB gets small.** About 128 KB of coordinates becomes a few hundred bytes of refs. The `checkScene` validator keeps checking inline scenes and also checks the resolved scene of a `ref`.
   - **`scenes.mjs` is retired** with `unit-N.mjs` and `sync-unit.mjs` (its generators move into the library, tests move with them). Until phase 5 it stays the authoring source, and a figure is edited there and synced, never with `content:edit`.

2. **Many interaction shapes in `data` JSON** (choice, order, match, sort, hotspot, builders, decay chain ...): typed per card or item `type`, with the existing `curriculum-rules.mjs` validators. A per-type layout is a refinement of the default adapter (a `json` block is always the lossless fallback).

A figure `ref` is an ordinary value in a card's `data` (a `json` block or a `ref` field), so the core needs nothing new for it and phases 1 to 4 are unaffected. The default adapter already carries all eight lesson tables losslessly today (that is what phase 1 proves), so the lessons can be moved at any time without waiting for the friendly adapter. The figure library can be built and the cards converted on their own, before the lesson adapter exists, because it changes the content and the app, not the file format.

A table is *owned* from the phase that migrates it, not before. Owned tables are listed in one registry (`SOURCE_OWNED_TABLES`, section 9). A table that is not owned keeps working exactly as today.

## 4. The format (core, version 1)

Files are UTF-8, LF, no BOM, no tabs, no trailing spaces, ending in a newline. The extension is `.atomiq`. Files are data, never code: nothing is evaluated.

### 4.1 Lines

Every line is one of:

| Form | Meaning |
|---|---|
| `# text` at column 0 | a comment (kept by the parser and the formatter, never written to the DB) |
| a blank line | a separator, or a blank line inside a prose block |
| `key: value` at column 0 | an attribute (a scalar, or inline JSON for a `json` column) |
| `key:` at column 0, followed by lines indented 4 spaces | a **block** attribute (prose, or multi-line JSON) |
| `keyword: rest` at column 0, where `keyword` is a child kind of the adapter | a child line (a chat reply, a blog block, a list item) |
| `<record-keyword> <id>` at column 0 | the start of a record |
| lines indented 4 spaces | the body of the block above them (verbatim after removing the 4 spaces) |

**Prose is always indented, structure is never.** That is the whole escaping story: a prose line can contain anything, including `[[pic:x]]`, `(`, `-`, `#`, `reply:` or `node`, because it starts with four spaces and structure starts at column 0. A prose block ends at the first non-blank column-0 line. Blank lines inside prose are kept exactly (`a\n\nb` is `a`, a blank line, `b`). A prose value cannot start or end with a newline or have trailing spaces on a line; the writer refuses to write one (the data has none today).

### 4.2 File layout

```
format 1                       # core version (required, first non-comment line)
adapter chat 1                 # adapter name and its version (required)
npc: npc-ada                   # file-scope attributes the adapter declares (shared by every record here)

<record>
<record>
```

Records are separated by one blank line. Order of records in a file, and of files in a directory, is meaningful (section 4.5).

### 4.3 Value types (declared by the adapter, per column)

| Type | Written | Parsed as |
|---|---|---|
| `text` | `key: value` (the rest of the line, trimmed; must not be empty unless the column allows `''`) | string |
| `prose` | `key:` + indented block | string (lines joined with `\n`) |
| `int`, `num` | `key: 48.84` | number |
| `id` | `key: some-id` | string; `[A-Za-z0-9][A-Za-z0-9._/-]*` (no `:` and no `#`, so ids can sit inside a translation key, section 11.1) |
| `json` | `key: {"a":1}` on one line when it is 100 characters or fewer, otherwise `key:` + a block of pretty JSON (2-space indent, 4-space base) | any JSON value; compared **structurally**, never as text |
| `list` | one `key: item` line per string, in order (a list is never null: no lines means `[]`) | array of strings |
| `jsonl` | `key:` + one JSON value per indented line | array of values |

A **null** column is written by leaving the attribute out. An **empty string** is written as `key:` with nothing after it. A NOT NULL column that is absent takes its schema default or is an error. Link tables (`blog_references`, `scan_target_references`, ...) are not records: they are written as a `list` attribute on their parent (`references: ref-a, ref-b`, or one `ref:` child per link when the link has data such as `supports`), and are rebuilt on sync.

### 4.4 Canonical form

There is exactly one canonical text for a given set of rows, and `content:format` writes it:

- attributes in the adapter's declared order, then the body, then children in order;
- one blank line between records, one blank line between the attributes and a prose block, a final newline;
- `json` as in 4.3 with object keys in stored order; numbers as JavaScript prints them;
- no trailing spaces, LF only.

The parser is lenient about whitespace between sections and about the order of attributes. The writer is not. A file that parses but is not canonical gets a *warning* from `content:sync --check`, never an error, so a hand edit is never blocked by formatting.

### 4.5 Order and identity

- **Ids are explicit on every record and are the join key** with the DB. They are never derived from position or file name. A record id is unique across the whole adapter (all its files).
- **`position` columns are not authored.** The adapter marks them `derived: order`; sync computes them from file order (files sorted by name, then record order in the file, within the adapter's owner scope; 6.4). Reordering stories in the Chats list is renaming a file prefix, or moving a record.
- A record lives in exactly one file. A node reachable from several chat stories lives in the file of the first root that reaches it (the free chat counts first).

### 4.6 Errors

Parse errors are reported as `file:line: message` and abort the whole sync before anything is read from or written to the DB. Strict by design: an unknown key, an attribute in the wrong place, an indented line with no block above it, a duplicate id, a tab, a trailing space, a missing required column, a value that does not parse for its declared type, an unknown `format` or `adapter` version. **Nothing unrecognised is ever ignored**; silently dropping text is the failure mode of hand-written formats.

### 4.7 The parsed form

The parser returns an **AST**: file header, then records (keyword, id, attributes, body, children, plus the comments that precede each). Rows are derived from the AST; comments never reach the DB. The formatter, the migrations and the golden tests all work on the AST, so a rewrite never loses a comment. (Rows alone cannot be the canonical model for files because they cannot hold comments.)

## 5. Adapters

An adapter is data plus one small layout function:

```
adapter {
  name: "chat", version: 1, table: "chat_nodes", extension: ".atomiq"
  recordKeyword: "node"
  fileScope: ["npc_id"]                     // one value for the whole file
  columns: [ {name, type, required, derived?} ... ]   // declared order = canonical order
  body: "text"                              // which prose column is the indented body, if any
  children: [ {keyword, column/shape ...} ] // typed child lines
  layout(rows) -> files                     // which record goes in which file, in what order
  translatable: ["text", "title", "replies[].label"]    // section 11
  tests: which npm test scripts read these tables     // section 9
}
```

A test requires that every adapter **covers every column of its table** (a schema change fails the test until the adapter is updated) and that the **default adapter exists for every table**.

### 5.1 The default adapter

For any table: record keyword = the table name, record header = its primary-key parts separated by spaces, one attribute per column in schema order, types from the schema (`TEXT` -> `text`, or `prose` when the value has a newline or is longer than 120 characters; `INTEGER` -> `int`; `REAL` -> `num`; `json_valid` columns -> `json`), `created_at`/`updated_at` omitted (database-owned), `position` derived. It is deliberately plain; it is what makes any table migratable losslessly the day it is needed, and what the phase 1 gate tests on all 28 tables.

### 5.2 Chat adapter (phase 2, the model for the rest)

Layout (section 6): `content/source/chat/<npc-id>/<NNN>-<root-id>.atomiq`, one file per story, the free chat first (`010-`), `NNN` = the story's order in the Chats list. The file's `npc: npc-ada` scope replaces `npc_id`.

```
format 1
adapter chat 1
npc: npc-ada

node chat-ada-up-hello
kind: unprompted
pose: cheer
trigger: lessons_completed:6
title: hi hi hi. it's ada

    HELLO

    (sorry. i've been waiting to say that forever. i saw you finished a lesson in my unit and i dropped a flask)

    i'm ada. i teach the atoms that change. hehe. you'll see~

reply: hi ada -> chat-ada-hello-q
reply: you dropped a flask? -> chat-ada-hello-flask
reply: Hal told me about you -> chat-ada-hello-hal

node chat-ada-hello-flask
kind: reply
pose: sorry

    ok so. it was sparkle. my flask. she slipped. she's fine. she's glass but she's brave

    anyway. hi

reply: aww poor sparkle -> chat-ada-hello-q
reply: ok hi ada -> chat-ada-hello-q
```

| Source | Row |
|---|---|
| `node <id>` | `chat_nodes.id`; `npc_id` from the file scope |
| `kind:`, `pose:`, `trigger:`, `title:` | the columns of that name (`trigger`, `title` absent = NULL) |
| the 4-space block | `text`; a blank line is the `\n\n` that starts a new bubble |
| `reply: label -> next` | `{label, next}` (a text chip) |
| `react: love -> next`, `sticker: nerd -> next` | `{label, type: "react"/"emoji", next}`; with no `->` the story ends there |
| `reply: label => screen [id]` | `{label, action: {screen, id?}}`; `-> next` may be added before `=>` |
| `link: label => screen [id]` | the same, written when a reply only opens a page |
| position | derived (4.5) |

Rules: labels may not contain ` -> ` or ` => ` (none do today; the writer refuses). A node needs `kind`, `pose` and a body, and replies must all be of one type, which `chat-rules.mjs` already enforces on the rows. The validators run on the **desired rows before anything is written**, and errors are mapped back to `file:line`.

### 5.3 Provisional sketches (must stay consistent with the core, finalised in their phase)

| Adapter | Layout | Mapping |
|---|---|---|
| `npc` (`npcs` + `npc_lines`) | `characters/<NNN>-<npc-id>.atomiq` | attributes for name/title/field; `bio:` prose; `spec:` json block; each line a `line` child record (`kind`, `lesson`, `pose`, prose text) |
| `feed` (`feed_templates`) | `feed/<npc-id>.atomiq` (and `feed/shared.atomiq` for posts with no teacher), grouped by kind | `condition:` and `poster_pool:` json; `text:` prose; `weight:` int; `chip:` text |
| `blog` | `blog/<unit-id>/<NNN>-<blog-id>.atomiq` | post attributes; `blocks` as child lines `p:`, `h:`, `quote:`, `list:`, `fact:`, `figure:`, `next:` (the 7 kinds in use), prose bodies; `comment` child records; `references:` list |
| `statement`, `scan`, `safety`, `map` | the paths in 6.3 | arrays as `list`/`jsonl`; `*_references` as a `references:` list |
| `myth`, `mythbuster`, `encyclopedia`, `reference` | the paths in 6.3 | `quick_facts:` as `list`; `sources:` as `jsonl`; `options:` as `list`; `correct_answer:` json |

None of these may need a core change; if one does, that is a sign the core is wrong and the fix is a core version bump with a migration (section 10), found and made in phase 1 by the default-adapter round trip, not in phase 4.

## 6. Files, folders and names

**The whole tree is fixed now, for every phase.** A later phase adds files; it never moves one that an earlier phase wrote. Layout is part of an adapter's version (section 10): changing it is a `content:migrate` that renames files by machine, never a hand reorganisation.

### 6.1 Principles

1. **Domain first, then owner.** The first folder says what the content is (`chat`, `feed`, `blog`, `units`...), the second says whose it is (a teacher or a unit). You find a thing by asking "what is it" then "whose is it".
2. **One file is the natural unit a person edits.** A chat story, a blog post, a lesson with its cards, an objective with its items, one AtomDex entry. Tables of many tiny records (feed posts, sources, quiz questions) are grouped by a stable key instead (the teacher, the category, the difficulty).
3. **Names are the ids.** A folder or file is named after the id it holds, so the name tells you the id and the other way round. Names carry no information that is not also in the file, except order (6.4).
4. **Order lives in a numeric prefix, only where order matters.** Nowhere else do names carry numbers.
5. **Group by an owner or a fixed category, never by free text or a number.** Owners (`npc_id`, `unit_id`) and fixed vocabularies (a category, a scene, a section, a kind) qualify; a score, a title or a date does not. Ids are unique across the whole tree, so changing a record's category just moves it to the other file in the same edit, and sync sees the same id. Myth Buster is filed by difficulty because that is the game's three fixed decks and the id already says it (`mb-easy-q1`).

### 6.2 The tree

```
content/source/
├─ README.md                          one screen: what this is, the commands, a link to this spec
├─ .state.json                        sync state (section 8.1, committed)
├─ characters/                        phase 3
│  ├─ 010-npc-hal.atomiq              the teacher and their lines (npcs + npc_lines)
│  └─ 020-npc-ada.atomiq ...
├─ chat/                              phase 2
│  ├─ npc-hal/
│  │  ├─ 010-chat-hal-greeting.atomiq        the free chat, always first
│  │  └─ 020-chat-hal-up-hello.atomiq ...    one file per story
│  ├─ npc-ada/ ...
│  └─ shrodi/ ...
├─ feed/                              phase 3
│  ├─ npc-hal.atomiq ...              one file per teacher
│  └─ shared.atomiq                   posts with no teacher (the learner's streaks)
├─ blog/                              phase 3
│  └─ inside-the-atom/
│     └─ 010-blog-the-smallest-thing.atomiq   the post, its comments, its sources
├─ units/                             phase 4 (statements), phase 5 (the rest)
│  └─ inside-the-atom/
│     ├─ unit.atomiq                  the unit and its sources
│     ├─ statements.atomiq            the true-or-false statements
│     ├─ path.atomiq                  the map nodes
│     ├─ objectives/
│     │  └─ 010-u1-matter-is-atoms.atomiq   the objective and its items
│     └─ lessons/
│        └─ 010-atoms-are-everywhere.atomiq the lesson, its cards, its sources
├─ reference/                         phase 4
│  ├─ encyclopedia/<category>/<entry-id>.atomiq   one AtomDex entry per file
│  ├─ myths/<category>.atomiq
│  └─ sources/<kind>.atomiq           the references (official, research, textbook)
├─ games/
│  └─ mythbuster/010-easy.atomiq, 020-medium.atomiq, 030-hard.atomiq
├─ phone/
│  ├─ scanner/010-kitchen.atomiq ...  scan targets, one file per scene
│  ├─ safety/010-basics.atomiq ...    safety cards, one file per section
│  └─ map/sites.atomiq                the map sites
└─ i18n/                              phase 6
   └─ es.atomiq                       one file per language (section 11)
```

`content/` already holds TypeScript facades (`curriculum/`, `npcs/`, `myths/`, `explorer/` ...). They are code, untouched, and the new tree uses different names on purpose (`units/` not `curriculum/`, `characters/` not `npcs/`) so a path never means two things. Text lives only under `content/source/`.

### 6.3 Table to path

| Table(s) | Path | Grouped by | Phase |
|---|---|---|---|
| `chat_nodes` | `chat/<npc-id>/<NNN>-<root-id>.atomiq` | story (free chat first) | 2 |
| `npcs`, `npc_lines` | `characters/<NNN>-<npc-id>.atomiq` | teacher | 3 |
| `feed_templates` | `feed/<npc-id>.atomiq`, `feed/shared.atomiq` | poster | 3 |
| `blog_posts`, `blog_comments`, `blog_references` | `blog/<unit-id>/<NNN>-<blog-id>.atomiq` | post | 3 |
| `unit_statements` | `units/<unit-id>/statements.atomiq` | unit | 4 |
| `content_references` | `reference/sources/<kind>.atomiq` | kind | 4 |
| `encyclopedia_entries` | `reference/encyclopedia/<category>/<entry-id>.atomiq` | entry | 4 |
| `myths` | `reference/myths/<category>.atomiq` | category | 4 |
| `mythbuster_questions` | `games/mythbuster/<NNN>-<difficulty>.atomiq` | difficulty | 4 |
| `scan_targets`, `scan_target_references` | `phone/scanner/<NNN>-<scene>.atomiq` | scene | 4 |
| `safety_cards`, `safety_card_references` | `phone/safety/<NNN>-<section>.atomiq` | section | 4 |
| `map_sites`, `map_site_references` | `phone/map/sites.atomiq` | (single file) | 4 |
| `units`, `unit_references` | `units/<unit-id>/unit.atomiq` | unit | 5 |
| `path_nodes` | `units/<unit-id>/path.atomiq` | unit | 5 |
| `objectives`, `items` | `units/<unit-id>/objectives/<NNN>-<objective-id>.atomiq` | objective | 5 |
| `lessons`, `lesson_cards`, `lesson_references` | `units/<unit-id>/lessons/<NNN>-<lesson-id>.atomiq` | lesson | 5 |
| `content_translations` | `i18n/<locale>.atomiq` | language | 6 |

Link tables (`*_references`) never get files of their own: they are lists in the parent's file (4.3). A record belongs to exactly one file. Records may point across files by id (a lesson card's `item_id` names an item that lives in an objective's file; ids are unique across the whole tree), and `content:sync --check` reports a pointer to nothing.

### 6.4 Naming rules

- **Paths are lowercase ASCII kebab-case**: `[a-z0-9]+(-[a-z0-9]+)*`, no spaces, no uppercase, no accents. Exceptions: language files use the BCP 47 form (`es`, `pt-BR`), and the fixed names `README.md` and `.state.json`.
- **Folder = owner id, file = record id** (`npc-ada/`, `inside-the-atom/`, `chat-ada-up-hello`). Ids are already kebab-case. A file whose slug differs from the id it holds gets a *warning* from `content:sync --check`, never an error (the id inside the file is what counts).
- **Fixed singleton names**: `unit.atomiq`, `path.atomiq`, `statements.atomiq`, `shared.atomiq`, `sites.atomiq`. A singleton holds one owner's records of one kind, so it carries no prefix.
- **The `NNN-` prefix** is three digits in steps of ten (`010`, `020`...), so a new file slots in (`015`) without renaming others. It is used **only** where file order feeds a derived `position` or the reading order matters: chat stories, characters, blog posts, objectives, lessons, the Myth Buster difficulties, scanner scenes and safety sections. `content:format --paths` renumbers a folder back to tens, in the same order. A reorder is a rename; git records it as one.
- **`position` is counted within the adapter's owner scope** (chat within a teacher, objectives within a unit), over the files of that scope in name order and the records in file order.
- **Depth** is at most four levels under `content/source/` (`units/<unit>/lessons/<file>`).
- **Size**: a file over about 600 lines or 60 records gets a warning. It is split by the next *stable* grouping key (6.1 rule 5), never by arbitrary ranges. The tree above already keeps today's biggest group (60 AtomDex entries in `science`) at one record per file.

### 6.5 Id conventions for new records

Existing ids are shipped keys and never change. New ones continue the patterns already in the data: a table prefix, then the owner, then a short slug, lowercase kebab-case, at most 60 characters (the longest today is 47).

| Table | Pattern | Example |
|---|---|---|
| `npcs` | `npc-<name>` | `npc-ada` |
| `npc_lines` | `line-<name>-<kind>[-<lesson>]` | `line-ada-intro-half-life` |
| `chat_nodes` | `chat-<name>-<story>[-<beat>]` | `chat-ada-hello-flask` |
| `feed_templates` | `ft-<name>-<trigger>[-<slug>][-<n>]` | `ft-hal-lesson-atoms-are-everywhere-1` |
| `blog_posts` / `blog_comments` | `blog-<slug>` / `bc-<blog-slug>-<name>` | `blog-the-smallest-thing` |
| `objectives` / `items` | `u<N>-<slug>` / `u<N>-l<M>-<slug>` | `u1-atom-scale`, `u1-l1-fill-air` |
| `unit_statements` | `<unit-id>-s<NN>` | `inside-the-atom-s01` |
| `path_nodes` / `lesson_cards` | `u<N>-n<M>` / `c<NN>` (unique within the lesson) | `u1-n1`, `c04` |
| `mythbuster_questions` | `mb-<difficulty>-q<N>` | `mb-easy-q1` |
| `scan_targets`, `safety_cards`, `map_sites`, `content_references` | `scan-`, `safety-`, `site-`, `ref-` + slug | `scan-water`, `ref-openstax-chem-ch2` |
| `units`, `lessons`, `myths`, `encyclopedia_entries` | a plain slug | `radioactivity`, `half-life` |

### 6.6 Where the tooling lives

```
scripts/lib/content-source/
├─ core/        ast.mjs  parse.mjs  write.mjs  values.mjs  errors.mjs     the format (section 4)
├─ adapters/    default.mjs  registry.mjs  chat.mjs  characters.mjs ...   one file per adapter (section 5)
├─ readers/     v1.mjs ...                                                 old format versions, kept for `content:migrate`
├─ layout.mjs   owned.mjs  state.mjs  sync.mjs  export.mjs               paths (6.3), ownership, drift, sync, export
scripts/
├─ content-sync.mjs  content-export.mjs  content-format.mjs  content-migrate.mjs    thin CLIs, like content-edit.mjs
├─ test-content-source-core.mjs  test-content-source-<adapter>.mjs
└─ golden/content-source/v1/    pinned canonical files and their expected rows (section 12, T2 and T8)
```

Figure drawings (phase 5) are **code, not content**: `components/lesson/visual/figures/<group>.ts` in the app, one pure function per figure id, imported by the renderer, the validators and the tests alike. They are never under `content/source/`; a card refers to one by `ref` (3.1).

npm scripts follow the existing `content:*`, `check:*` and `test:*` names: `content:sync`, `content:export`, `content:format`, `content:migrate`, `check:source`, `test:source` (core and the default adapter) and `test:source-<adapter>`.

### 6.7 Repository hygiene

- `.gitattributes`: `*.atomiq text eol=lf`, so a Windows checkout cannot introduce CRLF.
- `.editorconfig` with a `[*.atomiq]` section: UTF-8, LF, final newline, trim trailing whitespace, spaces. (The repo has none today; this adds only that section.)
- `content/source/README.md` is a short static pointer (what this folder is, the four commands, the spec). It is not generated, so it cannot drift.
- Only `.atomiq` files, `README.md` and `.state.json` may live under `content/source/`; `content:sync --check` warns about anything else.

## 7. Export (bootstrap and recovery)

`content:export <adapter> [--force] [--to <dir>]` writes the files from the DB in canonical form. It refuses to overwrite existing source files without `--force` (the files are the master). `--to` writes elsewhere, to compare. A new table is migrated by running export once, committing the files, and adding it to `SOURCE_OWNED_TABLES`. Export is also the recovery path if the files are ever lost.

## 8. Sync

`content:sync [<adapter>…] [--apply] [--retire "<reason>"] [--no-verify] [--force]`

1. Parse every file of the owned adapters. Any error aborts, with `file:line`.
2. Derive the desired rows (positions from order, scope and defaults applied).
3. Read the DB rows of the owned tables and diff by primary key: **insert**, **update** (structural compare; JSON whitespace and timestamps are ignored, as the project already does for content hashes), **delete**, and **moved** (only `position` differs).
4. **Drift check** against `content/source/.state.json` (committed, section 8.1). If the DB rows changed since the last sync or export, stop and say how many rows differ; `--force` overwrites the DB from the files after the dry run has listed everything that would change.
5. Turn the diff into one `applyBatch` call across all owned tables (one transaction, one validation pass, the "no new error anywhere in the database" check, history source `sync`). Order inside the batch: positions that are about to change are first parked at temporary negative values (only for tables with a UNIQUE position), then deletes (children before parents), inserts (parents before children), updates. Nothing is written if anything fails.
6. After commit: refresh `.state.json`, then run, in parallel, the test scripts that read the touched tables (the `checksFor` map).

It is a **dry run by default**: it prints every insert/update/delete with before and after, the moved count, warnings and the validation result. Deleting a **shipped id** needs `--retire "<reason>"`, exactly like `content:edit` and Studio today (the ledger is unchanged). Deletes are listed first and prominently; git is the undo.

**`content:sync --check`** (also `npm run check:source`): changes nothing, exits 1 if files and DB differ or if a file is not parseable. It is what makes a forgotten sync impossible to miss.

### 8.1 State file

`content/source/.state.json` holds, per owned table, a hash of the DB rows as the last sync or export left them (the content hash the project already computes, ignoring timestamps and JSON formatting). It is committed. If it is missing, there is no drift check for that table (the first sync after an export always has one). A merge conflict in it, or a `content.db` regenerated from a merge, is resolved by `content:sync --force` after reading its dry run.

## 9. Ownership and guardrails

`SOURCE_OWNED_TABLES` (one registry in `scripts/lib/`) maps each owned table to its adapter and directory. It is the single place that says "this table is file-owned", and three things read it:

- `content:edit` **refuses** writes (and patches) to an owned table with the path to edit and the sync command, so a direct write cannot drift the DB. (`--force` is not offered.)
- `content:sync --check` runs in the publish gate (`release:content --publish` stops while files and DB differ), in `npm run sync-content`'s start-up path as a *warning*, and as a standalone `check:source`.
- The tests: each adapter lists the `test:*` scripts that read its tables.

Content Studio is **not changed**: it remains a viewer. If it writes to an owned table, the drift check catches it on the next sync. (Making it read-only for those tables is optional and listed under open items.)

### 9.1 Retiring the old seeds

When a table becomes owned, the scripts that seed or rewrite it are retired **in the same change**: moved to `scripts/content-migration/legacy/` with a header that says they must not be run, or the step is removed. For chat: `add-chat-nodes.mjs`, `update-shrodi-tour-chat.mjs`, the chat step of `apply-npc-voices.mjs` (it deletes and re-seeds Hal's and Ada's chats), and the chat parts of `swap-unit-teachers.mjs` (already applied; marked as one-off). CLAUDE.md and `NPC_VOICE_SPEC.md` ("Where the words live") are updated to point at the source files.

## 10. Evolving the format

| Change | What it needs | Touches existing files? |
|---|---|---|
| A new optional attribute, child kind or column | adapter updated; old files stay valid (R5) | no |
| A new table | its adapter (default first); export once | only its own new files |
| Replace a table's default adapter with a friendly one | `content:migrate <adapter>` reads old, writes new, verifies rows unchanged | only that table's files |
| A change to the canonical form, or a removed feature | core or adapter **version bump**; the old reader stays in `scripts/lib/content-source/readers/`; `content:migrate` rewrites all files; the migration commit changes no row | yes, by machine, in one commit |
| A DB schema change | the "adapter covers every column" test fails until the adapter handles it; a new NOT NULL column needs a default | by machine |

`content:migrate` is: read each file with the reader its header names, write with the current writer, parse again, **assert the rows and comments are identical**, then commit the result. If the assertion fails the migration is wrong, not the files. Old golden files stay in the repo so every released version of the format is still readable and tested.

## 11. Localization

The owner's model: **a translation is just a file for one language that maps the id of a text to its translation.** Spanish has one file; `hello` is in the base language and the Spanish file says what it is in Spanish. The app asks for a text by id in the learner's language and **falls back to the base text** when that language has no entry. No translation file is needed for the base language.

The DB already has the table that the sync will fill: `content_translations(locale, entity, entity_id, fields JSON)`, empty, read by nothing yet.

### 11.1 The id of a text

A text is addressed by **`<entity>/<record id>#<field path>`**:

```
chat_nodes/chat-ada-hello-q#text
chat_nodes/chat-ada-hello-q#replies[0].label
lesson_cards/protons-neutrons-electrons/c04#data.title
encyclopedia_entries/half-life#definition
```

- `entity` is the table name. It is required because ids repeat across tables (`half-life` is both a lesson and an AtomDex entry).
- the record id is the same id the source files already carry (4.5); a composite id such as a lesson card's `lesson/card` keeps its `/`.
- `#` separates the field path. No id in any of the 28 tables contains `#` or any character outside `A-Za-z0-9._/-` (surveyed), so the key splits unambiguously at the first `#`; the id grammar (4.3) is fixed to exactly that set.
- the field path is a path into the row: a column name, then `.name` and `[index]` for JSON columns. It maps one to one onto `content_translations.fields`.

### 11.2 The file

One file per language, `content/source/i18n/<locale>.atomiq`, written in the same core format as everything else (an adapter `i18n`, scope `locale: es`, then one entry per text; a multi-line text is an indented prose block, exactly like the base files):

```
format 1
adapter i18n 1
locale: es

chat_nodes/chat-hal-greeting#title: Charla
chat_nodes/chat-ada-hello-q#replies[0].label: hola ada
chat_nodes/chat-ada-hello-q#text:
    ok, pregunta. tengo UN núcleo inestable. solo uno. ahí sentado

    ¿puedes decirme el segundo exacto en que cambiará?
```

Unlike the other adapters, `i18n` has an **open** attribute key set: any `<entity>/<id>#<path>` whose entity has an adapter and whose path is declared `translatable`; an entry for a record or field that does not exist is a parse error (never silently kept). Sync turns it into `content_translations` rows (one per locale, entity and record, with the fields that exist). A missing entry means "use the base text". Only fields an adapter declares `translatable` (5) may appear in a translation file, and **structure is never translatable**: `->` targets, actions, kinds, poses, triggers and every non-text attribute come from the base record. This is the line the `i18n` adapter must keep: a translation changes words and nothing else.

### 11.3 What stays open until it is built

- **Array children** (reply labels, list items) are addressed by index (`replies[0]`), which moves if the base inserts or reorders one. If that proves painful, the fix is additive: give those children optional stable ids, added to the sources and to the translation keys by one `content:migrate` run (section 10).
- **Staleness**: noticing that a base text changed after it was translated (a short hash of the base text next to the entry) is optional and additive; not designed here.
- **Per-language voice rules** (`test:voice` is English: Ada's lowercase and `~`, Hal's capitals and no `!`), per-language length limits, and placeholder checks (`{name}` and `[[pic:id]]` must survive in a translation) belong to the translation spec.
- **Splitting a language file by area** if it grows large (`es/chat.atomiq`) is a layout choice that changes no key.
- The app's own interface strings (in code, not in the DB) are a separate piece of work.

What this spec commits to now is only: ids are explicit and stable on every record, adapters declare `translatable` paths, and the id grammar above. Nothing else is built for localization before its phase.

## 12. Testing

| # | Test | Why it exists |
|---|---|---|
| T1 | **Default-adapter round trip over every table** of the real master: rows -> files -> rows identical, and files -> rows -> files byte-identical | the proof of R2; runs in phase 1 before any table is owned |
| T2 | **Golden files**: a fixed sample that uses every construct is pinned byte for byte, per core and adapter version | R4: a change to the canonical form fails loudly |
| T3 | **Hostile text**: lines that start with `[`, `(`, `-`, `#`, `reply:`, `node`; a label with `:`; curly quotes; empty string versus null; very long lines; CRLF; tabs; trailing spaces; a blank line at the edges | the escaping rule |
| T4 | **Parse errors**: one test per error kind in 4.6, each checking `file:line` and that nothing was written | strictness |
| T5 | **Sync scenarios** on a fixture repo: edit, insert, delete, move, shipped delete without `--retire`, drift stop, `--force`, validation failure leaves the DB untouched, history source, `--check` exit codes, second sync is a no-op | the sync contract |
| T6 | **Determinism**: export twice is identical; two syncs in a row change nothing | |
| T7 | **Ownership guard**: `content:edit` refuses an owned table | |
| T8 | **Old versions still parse**: every golden file ever committed is read by the current code | R4 and section 10 |
| T9 | **Adapter coverage**: every column of every adapter's table is handled; a default adapter exists for every table | R2, schema changes |

## 13. Open items (each has a recommended default; none blocks phase 1)

| # | Question | Recommended |
|---|---|---|
| 1 | The first sync after export changes `position` of many chat rows (the new free-chat nodes sit in the free file now, so the stories' indexes shift). It is invisible to learners and nothing has shipped. | accept it as one "moved" line in the first dry run |
| 2 | `components/npc/npc-roster.ts` also holds bios and lines (seed and runtime fallback). Two sources again after phase 3. | make the sync write the roster's bios from the file, or a test that fails when they differ; decide in phase 3 |
| 3 | `content/snapshot/*.json` (written at publish) becomes a third copy of owned tables. | leave it for now; drop it for owned tables later if it only adds noise |
| 4 | Make Studio read-only for owned tables | not needed while you do not use it for editing |
| 5 | The `verified` flag on sources | an ordinary field in phase 4; first publish uses `--allow-unreviewed` |
| 6 | Reply and list children are addressed by index in translation keys | acceptable until it hurts; then optional child ids by migration (11.3) |
| 7 | Lesson figures are stored as expanded shapes (46 of 124 cards, 89% of the table) | decided: a figure is an id plus args drawn by a library in the app, inline shapes kept for one-offs (3.1); built and converted in phase 5, proved equal to today's shapes first. Until then edit figures in `curriculum/unit-N.mjs` and sync, never with `content:edit` |

Decided: the extension is `.atomiq`; lessons are migrated later (phase 5), with figures as ids; translations are one file per language mapping text id to text (section 11).

## 14. Phases and exit criteria

| Phase | Deliverable | Done when |
|---|---|---|
| 0 | this spec accepted | the owner agrees, or changes it |
| 1 | core parser and writer, default adapter, `content:export`, T1 to T4, T6, T8, T9 | **all 27 content tables round-trip**; no table is owned; no existing behaviour changed |
| 2 | chat adapter, `SOURCE_OWNED_TABLES`, `content:sync` (+ `--check`), drift state, ownership guard, `content:edit` guard, legacy chat scripts retired, publish gate, docs | a Hal story edited as a file reaches the DB through one sync with its tests; T5, T7 pass; the old seeds cannot run |
| 3 | npc, feed, blog adapters, retire their seeds (**built**) | same, per adapter, with no change to chat; a test fails when `npc-roster.ts` and the characters' files differ |
| 4 | the remaining prose tables (**built**: eight adapters, 169 files in all; `unit_references` and `lesson_references` wait for phase 5 with the lesson tables) | same |
| 5 | its own spec first (the figure library and `ref` conversion from 3.1, interaction types, retiring `unit-N.mjs`, `scenes.mjs` and `sync-unit.mjs`), then the lesson adapters | a unit written as `.atomiq` files syncs to the same rows the `unit-N.mjs` sync produced (row-for-row), tests included |
| 6 | the `i18n` adapter and the runtime lookup with base-text fallback (own spec) | one language file reaches `content_translations` and a screen shows it, with fallback |

A phase is not started until the previous one is done, and **no phase may change a file or an adapter of an earlier phase except through section 10.**

## 15. Alternatives considered

| Option | Why not |
|---|---|
| Keep the DB as the only master | what we have: edits through scripts, no review as text, seeds that overwrite |
| JSON files | lossless but unreadable for prose (`\n\n` escapes), no comments, a stray comma breaks a file |
| YAML | implicit typing (`~` is null, `no` is false), `: ` in text, a new dependency, fragile indentation edits |
| TOML | poor for lists of records that contain prose |
| Markdown with front matter | good for blog posts, awkward for a reply graph |
| `.mjs` data modules (today's seeds) | executable, cannot be regenerated from the DB, no strict line-numbered errors |
| Ink or Twine | real tools, but shipped ids, chip/sticker/reaction replies, poses and triggers do not map; extra compiler |
| A chat-only format | breaks R1: the next table would need a second format and a migration of the first |
