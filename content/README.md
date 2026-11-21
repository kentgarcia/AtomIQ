# AtomIQ Content

Source-of-truth content shipped inside the app.

```
content/
├── database/
│   └── content.db      ← master SQLite database (edit via `npm run content-studio`)
├── explorer/           # journeys, encyclopedia images
├── curriculum/         # units, path nodes, lessons, cards, item bank: types,
│                       #   hydration, answer evaluation (framework-free, tested)
├── myths/              # facade over the myths table
├── quizzes/            # MythBuster question getters
└── types.ts            # shared content type definitions
```

## Curriculum

Lessons are a layered path (`docs/features/LESSON_RESTRUCTURE_SPEC.md`): units contain
path nodes (lesson, practice, checkpoint); a lesson is an ordered list of cards;
interactive cards point at items in a shared bank that also feeds practice,
review and games. The database stores values only. Every interaction is a
hardcoded component in `components/lesson/cards/`.

Authoring source for a unit is `scripts/content-migration/curriculum/unit-N.mjs`
(Unit 1 is the pilot). `node scripts/content-migration/curriculum-cutover.mjs
[--dry-run]` loads those files into the master db (backing it up first), and the
rules in `scripts/lib/curriculum-rules.mjs` run inside `validate:content` and on
every Studio save. References must be verified by a person before publish
(unverified ones are warnings in a draft and errors at the publish gate). The
old lessons and quizzes are saved under `scripts/content-migration/legacy/`.

## NPC feed and mini blog

Discover is a feed in which the NPC cast posts about what the learner did
(`docs/features/NPC_FEED_SPEC.md`). Its content tables are `feed_templates` (a post's
text per trigger, with placeholders), `blog_posts` (the short pieces, written in
blocks), `blog_comments` (NPC comments, authored with the piece) and
`blog_references` (a piece's sources). Seed rows live in
`content/source/feed/` and `content/source/blog/` (text files, built into the
database by `npm run content:sync`; the old seed `feed-content.mjs` is retired). The trigger keys, their condition fields and placeholders and the
block types are in `scripts/lib/feed-vocab.mjs`; the rules in
`scripts/lib/feed-rules.mjs` run in `validate:content` and on every Studio
save. A piece needs a verified source before publish, like a lesson.

## How content flows

1. **Author** — edit `database/content.db` with the Content Studio
   (`npm run content-studio`, http://localhost:8787). Edits are drafts.
2. **Publish** — Studio's Publish button (or `npm run release:content --
   --publish`) validates, backs up, creates the next version, copies the db to
   `assets/database/content.db` and sets `CONTENT_DB_VERSION` in
   `services/content-db.ts`. Released copies are kept in `content/releases/`.
3. **Ship** — the app copies the bundled db into on-device storage on first
   launch and whenever the version differs (see `services/content-db.ts`).

Reads are served from SQLite through `contentRepository` in
`services/content-db.ts`; the `index.ts` facades keep the older import surface
(`@/content/myths`, …) stable.

Transient `-wal` / `-shm` files next to a `.db` are SQLite sidecars; they are
gitignored and safe to delete when no process has the database open.

## Quality gates

- `npm run validate:content` checks every learner-facing question and the
  curriculum and reference rules (see `docs/critical/CONTENT_QUESTION_QUALITY.md`). Run
  it before `sync-content`.
- `npm run test:content` unit-tests the rules; `npm run test:curriculum` and
  `npm run test:curriculum-content` cover the lesson/path/mastery cores and the
  Unit 1 content.
- Repeatable content migrations live in `scripts/content-migration/`
  (`fix-question-context.mjs`, `remove-articles.mjs`).
