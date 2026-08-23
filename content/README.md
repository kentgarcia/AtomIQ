# AtomIQ Content

Source-of-truth content shipped inside the app.

```
content/
├── database/
│   └── content.db      ← master SQLite database (edit via `npm run content-studio`)
├── articles/           # facade + types for articles/posts
├── explorer/           # journeys, encyclopedia images, maze helpers
├── lessons/            # facade over the lessons tables
├── myths/              # facade over the myths table
├── quizzes/            # facade over the quizzes tables
├── types.ts            # shared content type definitions
└── units.ts            # unit / learning-path configuration
```

## How content flows

1. **Author** — edit `database/content.db` with the Content Studio
   (`npm run content-studio`, http://localhost:8787) or the legacy editor
   (`npm run content-editor`).
2. **Bundle** — save/export copies the db over `assets/database/content.db`
   and bumps `CONTENT_DB_VERSION` in `services/content-db.ts`.
3. **Ship** — the app copies the bundled db into on-device storage on first
   launch (see `services/content-db.ts`).

The `index.ts` facades keep the app's import surface (`@/content/lessons`,
`@/content/myths`, …) stable while reads are served from SQLite.

Transient `-wal` / `-shm` files next to a `.db` are SQLite sidecars; they are
gitignored and safe to delete when no process has the database open.
