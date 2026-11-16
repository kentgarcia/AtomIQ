# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

AtomIQ is an offline-first nuclear-science learning app: Expo SDK 58, React Native 0.88, React 19, Expo Router (file-based, typed routes), strict TypeScript. Node `>=22.13` is required (the content tooling uses `node:sqlite`). Path alias: `@/*` → repo root.

## Commands

```bash
npm run start | android | ios | web   # all run sync-content first, then expo start
npm run typecheck                     # tsc --noEmit
npm run lint                          # expo lint (lint:fix = eslint . --fix)
npm run sync-content                  # refresh assets/ bundle + CONTENT_DB_VERSION only if out of date
npm run release:content               # status; --publish, --list, --restore <ver>, --record-update <id>
npm run validate:content              # question/article quality gate; run BEFORE sync-content
npm run content-studio                # web content editor on http://localhost:8787 (edits the master DB as a draft)
```

There is no umbrella `npm test`. Each gate is its own script, and tests use `node --test` on a single file, so run one with e.g. `node --no-warnings --test scripts/test-media-policy.mjs`. Check scripts: `check:icons`, `check:theme-colors`, `check:tab-bar`. Test scripts: `test:icons`, `test:activity`, `test:theme`, `test:media`, `test:contrast`, `test:visuals`, `test:periodic`, `test:content`, `test:maze`, `test:content-db`, `test:releases`, `test:backups`, `test:studio`, `test:curriculum`, `test:curriculum-content`, `test:npc`. See `package.json` for the exact file each one runs.

Before handing off: `sync-content`, `typecheck`, `lint`, plus the check/test scripts relevant to what you touched (icons, theme colors, content, media).

Android release builds go through EAS (`eas.json`: `preview` = APK, `production` = AAB) or `./build-apk.sh`. `credentials.json` and `*.jks` are signing secrets and are gitignored.

## Architecture

### Content is a SQLite database, not TypeScript

All learner-facing content (units, path nodes, lessons and cards, the item bank, myths, MythBuster questions, mazes, encyclopedia, articles/posts) lives in **`content/database/content.db`**, the master and source of truth. `README.md` and `scripts/content-migration/ts-to-json.js` describe an older `content/*.ts → seed-sqlite` pipeline; the `content/*/index.ts` files are now thin facades over SQLite reads.

Pipeline (editing is a draft; a version only exists once you **publish**):

1. Edit the master DB with Content Studio (`npm run content-studio`, `tools/studio/app.mjs`). Saves are validated by the same rules as `validate:content`, recorded in history (`content/database/studio-history.db`, gitignored) and written straight to the master. Schema: `scripts/content-migration/schema.sql`. One-off, repeatable data fixes live in `scripts/content-migration/*.mjs`; they take a backup first (`backupBeforeScript`).
2. Publish from Studio's **Publish** button or `npm run release:content -- --publish --notes "…"`. This validates, takes a `pre-publish` backup, then writes `content/releases.json` (append-only ledger), `content/releases/<ver>.db.gz`, `content/shipped-ids.json` (only grows), `content/snapshot/*.json`, the bundled `assets/database/content.db` (with a `content_meta` table) and the `CONTENT_DB_VERSION` string in `services/content-db.ts`. Versions are semver (`1.4.0`); the working copy is `<last>+draft.<hash>`. The bump suggestion (patch = edits, minor = rows added/removed, major = a shipped id retired or `CONTENT_SCHEMA_VERSION` changed) can be raised but not lowered. Never edit the version constant or the ledger by hand.
3. `npm run sync-content` only rebuilds the bundle/constant when its metadata is out of date (`start*` and `postinstall` run it); it never creates a version. `npm run release:content` with no flags shows the current status; `--list`, `--restore <ver>` (as a draft) and `--record-update <eas-group-id>` manage releases.
4. At runtime `services/content-db.ts` (`ensureContentDatabase()`, awaited by `components/content/ContentGate.tsx` while the splash is up) copies the bundled DB into on-device storage when the version differs, via `content.next.db` → verify → swap with rollback (`services/content-db-core.ts` holds the pure decisions). `contentRepository` provides typed queries that hydrate JSON columns into the shapes in `content/types.ts`.

Backups (`content/backups/`, gitignored; optional mirror via `ATOMIQ_BACKUP_DIR`) are taken automatically each day, before publish/restore/scripts, and on demand from Studio → Backups. Shipped ids can't be renamed or deleted without a recorded retire reason. EAS production builds run `check:content-published` and fail on an unpublished draft (`ATOMIQ_ALLOW_DRAFT=1` overrides). Studio tests: `test:studio`, `test:releases`, `test:backups`, `test:content-db`.

Commit the content files together after a publish: both `content.db` files, `content/releases*`, `content/shipped-ids.json`, `content/retired-ids.json`, `content/snapshot/`. The `-wal`/`-shm` sidecars are gitignored.

### Curriculum (units → path nodes → lessons → cards → item bank)

Spec: `docs/LESSON_RESTRUCTURE_SPEC.md`. NPC teachers (a cast of Duolingo-style characters, one per field, using the `duolingo-character-style` skill) are specified in `docs/NPC_TEACHERS_SPEC.md` and built in `components/npc/` (drawing is pure data in `npc-art.ts`, roster in `npc-roster.ts`; tables `npcs`/`npc_lines` and `units.teacher_npc_id` live between the `npcs` markers in `schema.sql`, seeded by `scripts/content-migration/add-npcs.mjs`; `test:npc`). Explorer narrators are still to do. The visual and UX redesign of the lesson screens (brand pass) is specified in `docs/LESSON_VISUAL_SPEC.md`. Content tables (schema v2, between the `curriculum-v2` markers in `schema.sql`): `units`, `objectives`, `lessons`, `path_nodes`, `items`, `lesson_cards`, `content_references` (+ `unit_references`, `lesson_references`), `content_translations` (empty, for localization). The DB holds values only; every interaction is a hardcoded component in `components/lesson/cards/`. Authoring source is `scripts/content-migration/curriculum/unit-N.mjs`, loaded by `curriculum-cutover.mjs`; rules live in `scripts/lib/curriculum-rules.mjs` and run in `validate:content` and on Studio saves. Unverified references are warnings in a draft but errors at the publish gate.

Logic is in framework-free `.ts` cores with `node --test` suites (erasable syntax, `.ts` import extensions): `content/curriculum/*` (types, hydrate, evaluate), `services/lesson-core.ts` (run state machine), `mastery-core.ts`, `path-core.ts`, `session-core.ts`. Screens: `app/lesson/[id].tsx` (preview → run → finish) and `app/practice/[id].tsx` (practice, checkpoint, `testout:<unit>`, `review`). Node completion is stored in the existing `levels` table keyed by path node id; lock/current status is derived by `path-core`, never stored. Mastery and item attempts live in the user-state DB (`services/curriculum-progress.ts`).

### Motion and lesson art

Animation and character work follows the project skills in `.claude/skills/` (`rossark-motion-skill`, `duolingo-character-style`); project rules are in `components/motion/MOTION.md` and override the skills. The engine is `components/motion/motion-core.ts` (pure worklets: curves, `track`/`flow`/`wave`) plus `motion.ts` (Reanimated clocks). Shrodi (the mascot) is data in `components/mascot/shrodi-art.ts`, rendered by `Shrodi.tsx`; `node scripts/render-shrodi.mjs <dir>` makes a contact sheet so art changes can be looked at (`test:mascot` covers the math). Shrodi's head shapes come from `assets/images/mascot/layers/*.svg` via `python3 scripts/bake-shrodi-layers.py`, and he is flat colour (theme exception EX-10; SVG gradients rendered black on device, so don't add any). Scene shapes are flat with a same-hue rim (`toneRim`). Scene figures stay data: an optional `motion` (`orbit` | `pulse` | `float`) on a circle/rect, validated by `checkScene` (periods must divide `SCENE_LOOP_MS`). Everything freezes on frame 0 with reduced motion or when the screen is not focused. Interface moves stay under 300 ms, ease-out.

### Two separate databases / stores

- **Content DB** (read-only, re-seeded on version bump): `services/content-db.ts`.
- **User-state DB** (writable, local-first): `services/database.ts` creates tables from `services/local-first/schema.ts`, with sync metadata prepared for a future Supabase sync. It migrates by adding columns in code (`ensureTableColumns`), not by migration files. Profile, XP/streaks, missions, bookmarks and explorer progress live here, accessed through `services/StorageContext.tsx`, `services/storage.ts`, `services/explorer-storage.ts`, `services/missions.ts`, and `services/activity-*.ts`.
- **AsyncStorage** (`STORAGE_KEYS` in `services/storage.ts`, all prefixed `@atomiq:`) holds lightweight preferences only.

### Screens and navigation

`app/` is Expo Router. `(tabs)/` holds Home, Discovery/community, Guide (`chat.tsx`), Games, Profile, awards and leaderboard. Flows live in `lesson/`, `quiz/`, `mythbuster/`, `explorer/` (journeys, encyclopedia, Atom Maze), `lab/` and `periodic-table/`. `app/_layout.tsx` is the root: it wires the theme provider, `StorageProvider`, Android back policy, media lifecycle, UI SFX and content seeding. Lessons render through `components/lesson/LessonRenderer.tsx`, which dispatches on step type (briefing, micro-learn, lab, mythbuster, assessment, debrief). Visual blocks are documented in `docs/completed/VISUAL_LESSON_BLOCKS.md`.

### Guide (Shrodi)

`services/guide/` is a local, rule-based assistant (no network): `engine.ts` answers, `topics.ts` holds the knowledge, `navigate.ts` maps answers to routes (pills that deep-link to lessons, articles, journeys and games), `context.ts` supplies app state. UI is in `components/guide/`.

### Theme system (enforced by scripts)

- Styles are theme-dependent: define them with `createStyles((theme) => ({...}))` from `@/theme` and call the result inside the component with the current theme. Do **not** use a static module-level `StyleSheet.create` with colors.
- Use semantic theme color roles from `theme/themes.ts` and tokens from `theme/tokens.ts`. `npm run check:theme-colors` fails on hardcoded neutral surface/text/border colors, duplicated light/dark palettes, and alpha applied to literal colors (use `withAlpha(themeColor, a)`).
- Genuinely invariant colors (e.g. Atom Maze artwork) need either a `FILE_EXCEPTIONS` entry in the check script or an inline `// theme-allow: <reason>` comment. Both must also be registered in `docs/THEME_EXCEPTION_REGISTER.md`.
- Cards are `components/ui/card.tsx` (3D: border plus lip) and buttons are `components/ui/button.tsx`; use them rather than hand-rolled borders. Lesson figures use the fixed Duolingo-style palette in `components/lesson/visual/duo-palette.ts` (EX-11).
- Layout primitives (`components/layout/: `ScreenFrame`, `ResponsiveContainer`, `ResponsiveGrid`, `tab-bar-inset`) handle safe areas, tablets and tab-bar clearance. `check:tab-bar` verifies that scrollable screens clear the tab bar.

### Icons

Use `components/ui/icon.tsx`, never `iconsax-react-native` directly. It resolves names through `components/ui/icon-registry.ts` (reviewed aliases plus a visible fallback). Icon names also appear in DB content, so `npm run check:icons` validates both source and the bundled DB.

### Media policy

All Read Aloud, SFX and music go through one runtime: `services/media-core.ts` (framework-free, unit-tested state machine and gates) and `services/media.ts` (runtime and lifecycle). Screens must use `<ReadAloudButton>` and the `use-read-aloud` hooks, and never call `expo-speech` or `expo-audio` directly. Details are in `docs/MEDIA_POLICY.md`.

## Other notes

- `docs/` holds specs and checklists (Android responsive UX, Play release, dark-mode compliance, content question quality at `CONTENT_QUESTION_QUALITY.md`, article pipeline). Check the relevant one before changing those areas.
- ESLint is `eslint-config-expo` with a few React Compiler hook rules downgraded or disabled for Reanimated shared values; see `eslint.config.js`.
- Expo Go is fine for iteration, but verify safe areas, back handling, keyboard, TTS, fonts and audio on a release-like Android build.
- `.opencode/` and `.openidea/` are tooling state. `.opencode/plugin/atomiq-content.ts` is an OpenCode plugin that talks to the Content Studio HTTP API.
