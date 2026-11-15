# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

AtomIQ is an offline-first nuclear-science learning app: Expo SDK 58, React Native 0.88, React 19, Expo Router (file-based, typed routes), strict TypeScript. Node `>=22.13` is required (the content tooling uses `node:sqlite`). Path alias: `@/*` → repo root.

## Commands

```bash
npm run start | android | ios | web   # all run sync-content first, then expo start
npm run typecheck                     # tsc --noEmit
npm run lint                          # expo lint (lint:fix = eslint . --fix)
npm run sync-content                  # copy master content.db → assets/, rewrite CONTENT_DB_VERSION
npm run validate:content              # question/article quality gate; run BEFORE sync-content
npm run content-studio                # web content editor on http://localhost:8787 (edits the master DB)
```

There is no umbrella `npm test`. Each gate is its own script, and tests use `node --test` on a single file, so run one with e.g. `node --no-warnings --test scripts/test-media-policy.mjs`. Check scripts: `check:icons`, `check:theme-colors`, `check:tab-bar`. Test scripts: `test:icons`, `test:activity`, `test:theme`, `test:media`, `test:contrast`, `test:visuals`, `test:periodic`, `test:content`, `test:maze`. See `package.json` for the exact file each one runs.

Before handing off: `sync-content`, `typecheck`, `lint`, plus the check/test scripts relevant to what you touched (icons, theme colors, content, media).

Android release builds go through EAS (`eas.json`: `preview` = APK, `production` = AAB) or `./build-apk.sh`. `credentials.json` and `*.jks` are signing secrets and are gitignored.

## Architecture

### Content is a SQLite database, not TypeScript

All learner-facing content (lessons, quizzes, myths, MythBuster questions, mazes, encyclopedia, articles/posts) lives in **`content/database/content.db`**, the master and source of truth. `README.md` and `scripts/content-migration/ts-to-json.js` describe an older `content/*.ts → seed-sqlite` pipeline; the `content/*/index.ts` files are now thin facades over SQLite reads.

Pipeline:

1. Edit the master DB with Content Studio (`tools/studio/server.mjs`) or `npm run content-editor`. Schema: `scripts/content-migration/schema.sql`. One-off, repeatable data fixes live in `scripts/content-migration/*.mjs`.
2. `scripts/sync-content.js` copies it to `assets/database/content.db` when they differ. It also **rewrites the `CONTENT_DB_VERSION` constant in `services/content-db.ts`** from a hash of the bundled bytes. Never bump the version by hand, and expect `services/content-db.ts` to show a diff after content changes. `postinstall` and every `start*` script run it.
3. At runtime `services/content-db.ts` (`ensureContentDatabase()`, called from `app/_layout.tsx`) copies the bundled DB into on-device storage when the version changes. `contentRepository` provides typed queries that hydrate JSON columns into the shapes in `content/types.ts`.

Commit both `content/database/content.db` and `assets/database/content.db`. The `-wal`/`-shm` sidecars are gitignored.

### Two separate databases / stores

- **Content DB** (read-only, re-seeded on version bump): `services/content-db.ts`.
- **User-state DB** (writable, local-first): `services/database.ts` creates tables from `services/local-first/schema.ts`, with sync metadata prepared for a future Supabase sync. It migrates by adding columns in code (`ensureTableColumns`), not by migration files. Profile, XP/streaks, missions, bookmarks and explorer progress live here, accessed through `services/StorageContext.tsx`, `services/storage.ts`, `services/explorer-storage.ts`, `services/missions.ts`, and `services/activity-*.ts`.
- **AsyncStorage** (`STORAGE_KEYS` in `services/storage.ts`, all prefixed `@atomiq:`) holds lightweight preferences only.

### Screens and navigation

`app/` is Expo Router. `(tabs)/` holds Home, Discovery/community, Guide (`chat.tsx`), Games, Profile, awards and leaderboard. Flows live in `lesson/`, `quiz/`, `mythbuster/`, `explorer/` (journeys, encyclopedia, Atom Maze), `lab/` and `periodic-table/`. `app/_layout.tsx` is the root: it wires the theme provider, `StorageProvider`, Android back policy, media lifecycle, UI SFX and content seeding. Lessons render through `components/lesson/LessonRenderer.tsx`, which dispatches on step type (briefing, micro-learn, lab, mythbuster, assessment, debrief). Visual blocks are documented in `docs/VISUAL_LESSON_BLOCKS.md`.

### Guide (Shrodi)

`services/guide/` is a local, rule-based assistant (no network): `engine.ts` answers, `topics.ts` holds the knowledge, `navigate.ts` maps answers to routes (pills that deep-link to lessons, articles, journeys and games), `context.ts` supplies app state. UI is in `components/guide/`.

### Theme system (enforced by scripts)

- Styles are theme-dependent: define them with `createStyles((theme) => ({...}))` from `@/theme` and call the result inside the component with the current theme. Do **not** use a static module-level `StyleSheet.create` with colors.
- Use semantic theme color roles from `theme/themes.ts` and tokens from `theme/tokens.ts`. `npm run check:theme-colors` fails on hardcoded neutral surface/text/border colors, duplicated light/dark palettes, and alpha applied to literal colors (use `withAlpha(themeColor, a)`).
- Genuinely invariant colors (e.g. Atom Maze artwork) need either a `FILE_EXCEPTIONS` entry in the check script or an inline `// theme-allow: <reason>` comment. Both must also be registered in `docs/THEME_EXCEPTION_REGISTER.md`.
- Layout primitives (`components/layout/`: `ScreenFrame`, `ResponsiveContainer`, `ResponsiveGrid`, `tab-bar-inset`) handle safe areas, tablets and tab-bar clearance. `check:tab-bar` verifies that scrollable screens clear the tab bar.

### Icons

Use `components/ui/icon.tsx`, never `iconsax-react-native` directly. It resolves names through `components/ui/icon-registry.ts` (reviewed aliases plus a visible fallback). Icon names also appear in DB content, so `npm run check:icons` validates both source and the bundled DB.

### Media policy

All Read Aloud, SFX and music go through one runtime: `services/media-core.ts` (framework-free, unit-tested state machine and gates) and `services/media.ts` (runtime and lifecycle). Screens must use `<ReadAloudButton>` and the `use-read-aloud` hooks, and never call `expo-speech` or `expo-audio` directly. Details are in `docs/MEDIA_POLICY.md`.

## Other notes

- `docs/` holds specs and checklists (Android responsive UX, Play release, dark-mode compliance, content question quality at `CONTENT_QUESTION_QUALITY.md`, article pipeline). Check the relevant one before changing those areas.
- ESLint is `eslint-config-expo` with a few React Compiler hook rules downgraded or disabled for Reanimated shared values; see `eslint.config.js`.
- Expo Go is fine for iteration, but verify safe areas, back handling, keyboard, TTS, fonts and audio on a release-like Android build.
- `.opencode/` and `.openidea/` are tooling state. `.opencode/plugin/atomiq-content.ts` is an OpenCode plugin that talks to the Content Studio HTTP API.
