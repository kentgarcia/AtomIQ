# Content source files, phase 5: lessons, items, cards and the figure library

Status (2026-11-22): all steps are built (spec, figure library, conversion of the 49 figures, the `curriculum` adapter, retirement of the modules and scripts). Two details differ from the sketches below: a lesson's sources are `cite <ref-id>` records (`source <ref-id>` under a unit), and cross-adapter order comes from the foreign-key graph of the database (`tableRanks` in `sync.mjs`), which also resolves the `npcs`/`units` cycle. Specified here before any code, as `CONTENT_SOURCE_SPEC.md` section 14 asks. The main spec's rules still hold (section 10: nothing here changes a file or an adapter of an earlier phase). Where this text and the code differ later, the code and its tests win and this text is fixed.

## 1. What phase 5 moves, and what it retires

Moves into `content/source/units/<unit>/` (layout fixed by main spec 6.3): `units`, `unit_references`, `path_nodes`, `objectives`, `items`, `lessons`, `lesson_references`, `lesson_cards` (2 units, 22 objectives, 14 nodes, 10 lessons, 122 items, 124 cards today).

Retires, with guards in `scripts/content-migration/legacy/`: `curriculum/unit-1.mjs`, `unit-2.mjs`, `curriculum/scenes.mjs`, `sync-unit.mjs`, `curriculum-cutover.mjs`, and the one-off scripts that import them (`add-lesson-art`, `smooth-ramp-and-add-art`, `unit-1-concept-pass`, `rework-lesson-1-opening`, `ease-builders-and-remove-sliders`, `expand-lesson-descriptions`, `add-sort-bucket-icons`, `set-sort-custom-icons`). `scripts/lib/curriculum-load.mjs` stops loading unit modules; the content tests read the files (through the adapter) instead.

The database stays what the app reads. Nothing in `app/`, `components/lesson/` screens or the DB schema changes except the figure resolution in section 2.

## 2. Figures are an id (the library)

Today 46 of 124 cards store `data.figure.scene.shapes` expanded (89% of the cards' bytes). After this phase a figure is written as an id, and the app draws it from code, like blog art, chat stickers and scanner scenes.

### 2.1 The form

```
figure: half-life-bars                 the id of a function in the library
figure_args: [6, 8, 6, {"label":false}]   optional: the function's arguments, a JSON array (left out when none)
alt: Five bars that shrink ...         optional: overrides the library's alt text (left out normally)
caption: Half the nuclei, each time.   optional, as today
```

In the DB a card's `data.figure` is `{ "ref": "half-life-bars", "args": [...], "altText": "...", "caption": "..." }` where only `ref` is required. An inline `{ "scene": {...}, "altText": ... }` is still valid (one-off drawings, and hotspot items whose scene carries tap targets); `ref` and `scene` exclude each other.

### 2.2 The library

`components/lesson/visual/figures/` (TypeScript, pure functions, no React, erasable syntax, so the app, `node --test` and the content tooling import the same file).

- `shapes.ts`: the generators that `scenes.mjs` has today (`circle`, `rect`, `line`, `art`, `text`, `cluster`, `nucleus`, `atom`, `electronRings`, `wave`, `arrow` ...), unchanged in behaviour.
- `figures.ts`: one exported function per figure, returning `{ scene, altText }`, and `FIGURES: Record<string, (...args) => {scene, altText}>` keyed by a kebab-case id (`halfLifeBars` is `half-life-bars`).
- `index.ts`: `resolveFigure(ref, args) -> {scene, altText} | null` (null for an unknown id or arguments that throw; it never throws) and `figureIds()`.

Rules (these are the main spec's 3.1, restated as checks):

1. **Ids are shipped keys.** An id never changes meaning. A visual fix keeps the id; a change to what a card says is a new id (`half-life-bars-2`). `test:figures` pins every id that has shipped in `figure-ids.json` (only grows, like `shipped-ids.json`).
2. **An unknown ref never crashes or blanks a lesson.** `hydrate` resolves the figure when it maps a card or an item: an unknown ref gives the card no figure (and a console warning once), so the lecture and the question still play. `validate:content` and the curriculum rules make an unknown ref, or arguments that throw, an error, so it cannot be published.
3. **Proved before converted.** A one-off script evaluates the authoring modules with every library function tagged with its name and arguments; for each card whose stored figure equals (deep, key order ignored) a tagged result, it is rewritten to `ref` + `args`. A card whose figure differs from every tagged result, or was never produced by a function, stays inline and is reported. No figure changes appearance by being converted: after the conversion `resolveFigure` of every card equals what was stored (`test:figures` repeats this on the master).
4. **`altText` lives with the figure.** The library returns it; a card stores its own only to override. The accessibility rule (alt text of at least 20 characters) is checked on the resolved figure.
5. Content and code ship together: a DB can only name figures the same app build has, and rule 2 covers the rest.

### 2.3 Where it is read

- `content/curriculum/hydrate.ts`: `mapCard` and `mapItem` replace `figure.ref` by the resolved `{ scene, altText, caption, source }`. Every screen keeps reading `CardFigure` as before.
- `scripts/lib/curriculum-rules.mjs`: resolve before the existing figure rules; new rules `card-figure-ref` (unknown id or throwing args), `card-figure-both` (`ref` with `scene`).
- `components/lesson/visual/object-art` ids inside figures are still checked by the existing art rule on the resolved scene.

## 3. The file forms

One adapter, `curriculum`, whose `owns` covers `units/<unit>/unit.atomiq`, `path.atomiq`, `objectives/*.atomiq`, `lessons/*.atomiq` (the already owned `statements.atomiq` stays with `statements`). The header names the unit (`unit: inside-the-atom`) in every file except `unit.atomiq`, whose record is the unit. Ids and order follow main spec 6.4 and 6.5.

```
# units/inside-the-atom/unit.atomiq
unit inside-the-atom
position: 1                      explicit: units are ordered by a number, not by folder name
title: Inside the Atom
subtitle: What everything is made of
icon: Atom
tone: accent
teacher: npc-hal
goal: Describe what an atom ...
summary:                          guidebook.summary
    Everything you can touch ...
terms: atom                       guidebook.termIds, one a line
terms: matter
guidebook_extra: {}               anything else in guidebook (left out when empty)
description: ...

source ref-openstax-chem-ch2      unit_references, in order (position is the order)
source ref-iaea-isotopes
```

```
# units/inside-the-atom/path.atomiq
unit: inside-the-atom

node u1-n1                        position = the order in the file
kind: lesson
lesson: atoms-are-everywhere
node u1-n4
kind: practice
config: {"questionCount":8,"earlierShare":0}
```

```
# units/inside-the-atom/objectives/010-u1-matter-is-atoms.atomiq
unit: inside-the-atom

objective u1-matter-is-atoms      position = file order (NNN), within the unit
statement: Know that ordinary matter ...
misconception: Air is nothing, ...

item u1-l1-choice-made-of
type: choice
difficulty: 2                     left out when 1
surfaces: lesson                  left out when lesson, practice, checkpoint; one a line
references: ref-openstax-chem-ch1
prompt:
    Which of these is made of atoms?
answer: air
options:                          a block, one JSON object a line
    {"id":"light","label":"The light from a lamp","note":"Light is energy, not matter.","art":"lamp"}
explanation:
    ...
```

```
# units/inside-the-atom/lessons/010-atoms-are-everywhere.atomiq
unit: inside-the-atom

lesson atoms-are-everywhere
title: Atoms are everywhere
minutes: 4
xp: 40
teaches: u1-matter-is-atoms        one a line
relies_on: u1-matter-is-atoms
description:
    Everything you can touch ...

source ref-openstax-chem-ch1       lesson_references: the order is position
supports: Matter has mass and takes up space; air is matter.

card c02                           position = file order within the lesson
kind: teach
type: explain
title: What is everything made of?
figure: matter-examples
figure_args: [...]                 left out when none
figure_at: 1
body:
    Your hand, your phone ...

card c13
kind: item
type: item
item: u1-l1-tom-air-empty
connected: true

card c20
kind: sim
type: atom-builder
task: Build a helium atom ...
hint: Add particles with the plus buttons.
config:                            the rest of `data` as pretty JSON
    {
      "mode": "build", ...
    }
```

Per type, the item and card `data` keys are an allowed list (in the adapter, in canonical order, with a type each: text, prose, id, int, json, jsonl). Anything outside the list is a write error naming the table, id and key, never a silent loss; a new key is a backward-compatible change to the adapter's list.

Item types and their keys today: `choice` (prompt, answer, options, explanation, figure), `true_or_myth` (statement, answer, explanation), `predict` (input, prompt, options, answer, explanation), `sort` (prompt, buckets, items, explanation, figure), `match` (prompt, pairs, explanation), `fill` (mode, prompt, bank, answer, explanation), `order` (prompt, items, explanation), `hotspot` (prompt, scene as a JSON block, targets, answer, explanation, animate_on_correct). Card types: teach (`explain`, `story`, `reveal`: title, speaker, tag, body, figure..., figure_at, predict), `item` (connected), sims (task, hint, config).

### 3.1 What the engine needs (core is untouched)

1. **A duplicate id is per parent.** Card ids repeat across lessons (`c01`), and the table's primary key is `(lesson_id, id)`. The engine's "defined twice" key becomes the record's id columns plus the columns it takes from its parent. Records whose ids were already unique are unaffected.
2. **`lesson_references` and `unit_references` are child records, not links.** They carry `supports` and `position`, which `links` (a bare id list) cannot. A `source <ref-id>` record under its lesson or unit, with `position` derived from file order within the parent and `supports` an attribute.
3. **Derived `position` scoped by columns that the file supplies** already works (objectives per unit, nodes per unit, cards per lesson, references per parent).
4. **Cross-adapter order.** The adapter is listed after `references`, `encyclopedia`, `characters`; `orderOps` already inserts parents first and deletes in reverse.

## 4. Order of work, and the proof at each step

| Step | Work | Proof |
|---|---|---|
| A | this spec | the owner's earlier approval of figures-by-id, and the main spec |
| B | the library: `scenes.mjs` becomes `shapes.ts` and `figures.ts`; `index.ts`; hydrate and rules know `ref`; the authoring modules import the library | `test:figures`: every figure in `FIGURES` runs with no argument (or its documented ones), returns a valid scene (`checkScene`) and alt text; ids pinned; the existing `test:curriculum-content` still passes on the unit modules, whose output has not changed byte for byte |
| C | provenance conversion of the 46 cards (a one-off script, one `applyBatch`, backed up) | `test:figures` on the master: every converted card resolves to exactly the shapes it stored before (the pre-conversion snapshot is kept in the test's fixture list as a hash per card) |
| D | the `curriculum` adapter, its goldens, negative tests, round trip of the real master, `content:export curriculum`, ownership | round trip with no differences and no moved positions on the real master; `content:sync` is a no-op; golden and T8 tests |
| E | retire the modules and scripts of section 1, rewire the content tests and `curriculum-load.mjs`, docs, `content-checks.mjs` | `test:curriculum`, `test:curriculum-content`, `test:content`, `test:lecture`, `validate:content` all pass; every retired script refuses to run |

Each step is committed and pushed on its own, with the gates green, so the work can stop after any step with the app and the content consistent.

## 5. Risks and how they are held

- **A figure that looks the same but differs in a rounded digit.** The proof compares the stored JSON, not a picture. A mismatch stays inline, and is listed, never forced.
- **Editing a library function after conversion changes every card using it.** That is the point of rule 1: a visual fix improves all of them, and a meaning change needs a new id. `test:figures` pins the pre-conversion hash of each converted card's scene as a regression guard on the first release only; later visual fixes update the pinned hash in the same change (a visible, reviewed line).
- **A file that is too long to read.** Lessons stay one file each (about 150 lines with figures as ids); the 600-line warning of the main spec applies.
- **`hotspot` scenes and one-off scenes** stay inline JSON blocks until a figure id is wanted for them: a normal edit (add the function, then the line).
