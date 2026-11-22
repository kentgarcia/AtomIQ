# Content source files

Text that a person writes lives here as `.atomiq` files. `npm run content:sync` turns them into rows of the content database (`content/database/content.db`), which is what the app ships and reads. The files are the master; the database is built from them. Spec: `docs/features/CONTENT_SOURCE_SPEC.md`.

| Command | What it does |
|---|---|
| `npm run content:sync` | dry run: every insert, update, delete and move, and the validation result |
| `npm run content:sync -- --apply` | writes it (backup first, then the tests that read the touched tables) |
| `npm run check:source` | changes nothing; exit 1 if the files cannot be read or differ from the database |
| `npm run content:export -- <adapter> --force` | writes the files from the database (recovery, or taking a database change into the files) |
| `npm run content:format` | puts every file in canonical form (`--paths` renumbers the `NNN-` prefixes) |

Never edit a table that is listed here with `content:edit` or Studio: the sync would report drift. Delete a shipped id only with `--retire "<reason>"`.

## What is here

| Folder | Table(s) | One file is | Order |
|---|---|---|---|
| `chat/<npc>/NNN-<root>.atomiq` | `chat_nodes` | a story (the free chat is `010-`) | file `NNN`, then the nodes in the file |
| `characters/NNN-<npc>.atomiq` | `npcs`, `npc_lines` | a teacher and their voice lines | file `NNN` |
| `feed/<npc>.atomiq`, `feed/shared.atomiq` | `feed_templates` | a poster's posts | by kind, then id |
| `blog/<unit>/NNN-<blog>.atomiq` | `blog_*` | a piece with its comments and sources | file `NNN` |
| `reference/sources/<kind>.atomiq` | `content_references` | the sources of one kind | by id |
| `reference/encyclopedia/<category>/<id>.atomiq` | `encyclopedia_entries` | one AtomDex entry | by id |
| `reference/myths/<category>.atomiq` | `myths` | the myths of one category | by id |
| `games/mythbuster/NNN-<difficulty>.atomiq` | `mythbuster_questions` | one difficulty | the order in the file |
| `units/<unit>/statements.atomiq` | `unit_statements` | a unit's myth-or-fact statements | the order in the file |
| `i18n/<locale>.atomiq` | `content_translations` | one language: the translated fields of records, by entity and id | by entity, then id |
| `units/<unit>/unit.atomiq` | `units`, `unit_references` | the unit and the sources it cites | `position:` |
| `units/<unit>/path.atomiq` | `path_nodes` | the map nodes of a unit | the order in the file |
| `units/<unit>/objectives/NNN-<objective>.atomiq` | `objectives`, `items` | an objective and its question bank | file `NNN`; items by id |
| `units/<unit>/lessons/NNN-<lesson>.atomiq` | `lessons`, `lesson_references`, `lesson_cards` | a lesson, its sources (`cite`) and cards | file `NNN`; cards in file order |
| `phone/scanner/NNN-<scene>.atomiq` | `scan_targets`, `scan_target_references` | one scene | the order in the file |
| `phone/safety/NNN-<section>.atomiq` | `safety_cards`, `safety_card_references` | one section | the order in the file |
| `phone/map/sites.atomiq` | `map_sites`, `map_site_references` | all sites | the order in the file |

A source that other things cite (`reference/sources`) and an AtomDex entry are written once and named by id elsewhere (`references: ref-x`, `entry: marie-curie`). Lists are repeated lines (`tags: radiation`, `steps: ...`), a block of JSON lines is `sources:` or `composition:`, and a long text is an indented block under its key. A figure in a card is an id from the figure library (`figure: half-life-bars`, optional `figure_args:` as JSON); an unknown id is a validation error.

## Chat (`chat/<npc-id>/NNN-<root-id>.atomiq`, one file per story, the free chat is `010-`)

```
node chat-ada-up-hello          a node and its id
kind: unprompted                greeting | reply | unprompted | sign_off
pose: cheer
trigger: lessons_completed:6    only on the node that opens a story
title: hi hi hi. it's ada       the thread's subject line (a story's first node)

    HELLO                       the words, indented 4 spaces: a blank line starts a new bubble

    (sorry. i've been waiting to say that forever)

reply: hi ada -> chat-ada-hello-q                       a text reply and the node it leads to
reply: open it -> chat-x => entry half-life             a reply that also opens a screen (=> screen [id])
link: See the lesson => next-lesson                     a reply that only opens a screen
react: love -> chat-y                                   a reaction (an id of chat-art)
sticker: nerd -> chat-z                                 a sticker (an id of chat-art)
```

A message offers 2 to 6 replies of one type; a reaction or sticker with no `->` ends the story. A node that no reply leads to is an error (the validators run before anything is written). A line that starts with `#` at the left edge is a comment and never reaches the database.
