# AtomIQ Content

Source-of-truth content shipped inside the app.

```
content/
├── database/
│   └── content.db      ← master SQLite database (edit via `npm run content-studio`)
├── articles/           # facade + types for articles/posts
├── explorer/           # journeys, encyclopedia images, maze helpers
├── curriculum/         # units, path nodes, lessons, cards, item bank: types,
│                       #   hydration, answer evaluation (framework-free, tested)
├── myths/              # facade over the myths table
├── quizzes/            # MythBuster question getters
└── types.ts            # shared content type definitions
```

## Curriculum

Lessons are a layered path (`docs/LESSON_RESTRUCTURE_SPEC.md`): units contain
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
  article/research metadata (see `docs/CONTENT_QUESTION_QUALITY.md` and
  `docs/ARTICLE_PIPELINE.md`). Run it before `sync-content`.
- `npm run test:content` unit-tests the rules; `npm run test:curriculum` and
  `npm run test:curriculum-content` cover the lesson/path/mastery cores and the
  Unit 1 content.
- Repeatable content migrations live in `scripts/content-migration/`
  (`fix-question-context.mjs`, `add-article-pipeline.mjs`,
  `add-beginner-articles.mjs`).
