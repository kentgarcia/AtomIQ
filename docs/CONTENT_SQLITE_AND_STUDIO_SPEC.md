# AtomIQ — Content Delivery, Versioning, Backups & Content Studio Specification

**Status:** Implemented except Phase 0 / OTA delivery (see §8)
**Date:** 2026-11-16
**Owner:** AtomIQ engineering
**Applies to:** `content/database/content.db`, `assets/database/content.db`, `scripts/sync-content.js`, `services/content-db.ts`, `app/_layout.tsx`, `tools/studio/`, `scripts/validate-content.mjs`, `.opencode/plugin/atomiq-content.ts`

## 1. Goal

Content (lessons, quizzes, myths, MythBuster pools, mazes, encyclopedia, articles, posts) should be:

1. **Simple:** one source of truth (the SQLite master DB), one editor (Content Studio), one release command.
2. **Reliable on device:** the app never shows a half-seeded or empty content database, and a failed seed is visible and recoverable.
3. **Easy to update:** a content fix reaches users without a Play Store release.
4. **Safe to edit:** the editor validates as you type, cannot break ids that shipped to users, and every change is reviewable in git.
5. **Deliberate releases:** editing is a draft. A content version is created only when someone publishes, with a readable version number, a change summary and release notes, and any past release can be restored.
6. **Recoverable:** no edit, delete or script run can destroy content permanently. Whole-DB backups, per-entity history and an archive of every release cover three different failure sizes.

### Non-goals

- Moving content out of SQLite, or to JSON/Markdown source files.
- A server-side content backend, Supabase content sync, or user-generated content.
- Row-level or delta updates. The DB is 720 KB, so a full replacement is fine.
- Web support for the content DB (still native-only).
- Multi-user or hosted Content Studio. It stays a local developer tool.

## 2. Current baseline

### 2.1 Pipeline

1. Content Studio (`tools/studio/server.mjs`) writes rows straight into `content/database/content.db`.
2. `scripts/sync-content.js` copies master to `assets/database/content.db` and rewrites `CONTENT_DB_VERSION` in `services/content-db.ts` with a hash of the **file bytes**.
3. On device, `ensureContentDatabase()` compares a `content.db.version` marker file with the constant. On mismatch it deletes the DB, re-imports the bundled asset, writes the marker, then checks that `lessons` has rows.
4. The only way new content reaches users is a new store build.

Size: 11 tables, ~560 rows, 720 KB.

### 2.2 Problems

| # | Problem | Where |
|---|---|---|
| P1 | Content updates need a full Play Store release. | No `expo-updates`, no download path |
| P2 | The version is a hash of the file bytes, so a `VACUUM`, page reorder or WAL checkpoint counts as a "new version" even when no content changed. | `scripts/sync-content.js` `stableVersion()` |
| P3 | Seeding deletes the live DB first, then copies, then writes a separate marker file. These steps are not atomic. | `services/content-db.ts:196-202` |
| P4 | Seeding is fired and forgotten at startup. Each screen's first query blocks on it, and a failure appears as scattered per-screen errors (only Settings shows status). | `app/_layout.tsx:63`, `getReadyContentDb()` |
| P5 | The integrity check only counts `lessons`. | `verifyContentDb()` |
| P6 | User state (bookmarks, explorer journey/node progress, article `related_*`) refers to content by string id. Nothing stops a shipped id from being renamed or deleted, which silently orphans user progress. | `services/local-first/schema.ts`, `services/explorer-storage.ts` |
| P7 | The DB is binary, so content changes cannot be reviewed in a git diff or PR, and history grows by ~720 KB per content commit (×2 copies). | `content/database/`, `assets/database/` |
| P8 | Versioning is implicit. Every byte-level change produces a new opaque 9-digit number: no release notes, no "what changed since the last release", no way to name or restore a past release, and nothing separates work in progress from something ready to publish. | `scripts/sync-content.js` |
| P9 | The only backup is one button that copies the live DB file next to the master (`content.db.bak-<stamp>`). It does not checkpoint the WAL first, so a copy can miss recent writes. There is no list, restore, retention or per-entity undo, and scripted fixes (`scripts/content-migration/*.mjs`) and the OpenCode plugin write with no safety net. | `server.mjs` `/api/backup` |
| S1 | Studio's **Bump version** increments `CONTENT_DB_VERSION` by 1, but `sync-content` overwrites it with the hash on the next run. The button is misleading, and the OpenCode plugin tells authors to press it. | `server.mjs` `bumpVersion()`, `.opencode/plugin/atomiq-content.ts` |
| S2 | The Studio API is writable, sends `Access-Control-Allow-Origin: *`, and listens on all interfaces (no host passed to `listen`). Any website open in the browser, or any device on the same Wi-Fi, can edit or delete content while Studio runs. | `server.mjs` `json()`, `server.listen(PORT)` |
| S3 | Studio is a generic table editor. A lesson is edited as 1 `lessons` row plus N separate `lesson_steps` rows, with manual `position` numbers. | `public/app.js` |
| S4 | No validation on save beyond SQLite `CHECK`s. `content-rules.mjs` runs only from the CLI. | `server.mjs`, `scripts/validate-content.mjs` |
| S5 | No editor for visual blocks (`visuals`), maze rooms/monsters/boss questions, or icon names. Authors fall back to raw JSON or one-off scripts. | `public/app.js`, `docs/completed/VISUAL_LESSON_BLOCKS.md` |
| S6 | No way to preview an edit in the app without sync + rebuild/reload. | — |
| S7 | Two editors exist: Content Studio and the legacy `npm run content-editor` (`tools/content-sql.html`, 224 KB, sql.js). | `tools/`, `package.json` |

## 3. Target design

```
 Content Studio ──writes──▶ content/database/content.db   (master = working draft)
        │                              │
        │ validate on save             │ npm run sync-content
        ▼                              ▼
 scripts/lib/content-rules.mjs   content/snapshot/*.json    (text dump, committed, diffable)
                                 assets/database/content.db (bundled copy + content_meta row)
                                 CONTENT_DB_VERSION = last release (+draft suffix)
                                               │
                                               │ npm run release:content  →  eas update
                                               ▼
                                  device: ContentGate → seed (tmp → verify → swap) → app
```

### 3.1 Snapshot for review (fixes P2, P7)

`sync-content.js` gains a **snapshot step**:

- Dump every content table to `content/snapshot/<table>.json`: rows sorted by primary key, JSON columns parsed, `created_at`/`updated_at` excluded, 2-space pretty-printed, trailing newline.
- The snapshot is committed. Every content change becomes a readable diff in git and in PRs. Binary DB diffs can be ignored in review.
- `content_hash` = first 12 hex digits of `sha256(concatenated snapshot files)`. It answers "did the content change?" and is used for draft detection (§3.7). It is **not** the version.
- `VACUUM`, checkpoints and timestamp churn no longer change the hash.

Optional (decision D3): with the snapshot committed, `assets/database/content.db` can be gitignored, because `postinstall` and every `start*` script already run `sync-content`, and EAS builds run `postinstall`. This halves the binary churn in git.

### 3.2 Metadata lives inside the DB (fixes P3, P5)

New table, written by `sync-content.js` into the **bundled copy only**, after hashing:

```sql
CREATE TABLE IF NOT EXISTS content_meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
-- rows: content_version (e.g. '1.4.0' or '1.4.0+draft.a1b2c3'),
--       content_hash, schema_version, built_at (ISO)
```

- `schema_version` is an integer kept in `scripts/content-migration/schema.sql` and mirrored as `CONTENT_SCHEMA_VERSION` in `services/content-db.ts`. Bump it by hand only when the shape the repository reads changes (new column, new step type, new table). Mismatch in a dev build throws; in a release build it logs and falls back to the bundle.
- The on-device marker file goes away. The device reads `content_version` from the DB it is about to use. The version travels with the data, so they can never disagree.

### 3.3 Atomic seeding (fixes P3, P5)

Rework `ensureContentDatabase()`:

1. Open `content.db` if it exists and read `content_meta.content_version`. If it equals `CONTENT_DB_VERSION` and the integrity check passes, it is ready.
2. Otherwise import the bundled asset as `content.next.db` (`importDatabaseFromAssetAsync`, `forceOverwrite: true`).
3. Verify `content.next.db`:
   - `content_meta.content_version` equals `CONTENT_DB_VERSION`;
   - `PRAGMA quick_check` returns `ok`;
   - each required table (`lessons`, `lesson_steps`, `quizzes`, `quiz_questions`, `mythbuster_questions`, `myths`, `mazes`, `maze_rooms`, `encyclopedia_entries`) has at least one row.
4. Close and reset the cached handle (`dbPromise = null`), delete `content.db` with its `-wal`/`-shm`, then rename `content.next.db` to `content.db`.
5. If anything fails, leave the existing `content.db` untouched and surface the error.

A crash at any step is recoverable: the bundled asset is always present, so the next launch simply repeats the swap.

Extract the decision logic into a framework-free `services/content-db-core.ts`, following the `media-core.ts` pattern: `decideSeedAction({ localVersion, bundledVersion, integrityOk }) → "ready" | "seed"` plus the list of required tables. Unit-test it with `node --test`.

The content DB is opened read-only from the app's point of view. No code path writes to it.

### 3.4 Content gate at startup (fixes P4)

Add `components/content/ContentGate.tsx` and wrap the router in `app/_layout.tsx`:

- Keep the splash screen up (`SplashScreen.preventAutoHideAsync`) until `ensureContentDatabase()` resolves, alongside fonts.
- On first launch after an update, if seeding takes longer than ~800 ms, show a themed "Preparing lessons…" screen.
- On failure, show a full-screen error with **Try again** (re-runs the seed) and the error text, instead of letting every screen fail separately.
- Settings keeps its status line, now showing `content_version`, `schema_version` and `built_at` read from `content_meta`.

`getReadyContentDb()` stays as a safety net, but in practice screens no longer wait on it.

### 3.5 Content id stability (fixes P6)

- `content/shipped-ids.json`: for each id-bearing table (`lessons`, `quizzes`, `myths`, `mazes`, `encyclopedia_entries`, `articles`, `posts`, journeys/nodes), the ids that have shipped. `npm run release:content` regenerates it (union with the previous file, so ids are never dropped).
- `content/retired-ids.json`: `{ "<table>": { "<id>": "<reason, date>" } }`.
- `validate:content` errors when an id in `shipped-ids.json` is missing from the DB and not listed in `retired-ids.json`.
- Renames are not allowed. Create the new id and retire the old one.
- App rule: every facade lookup can return `null` (most already do), and screens that load content from user state (bookmarks, journey progress, "continue lesson") must skip or hide missing ids rather than crash. Audit those call sites as part of this work.

### 3.6 Delivery with EAS Update (fixes P1)

Content ships as part of an over-the-air JS update. The bundled DB is an asset, and the existing version check re-seeds on the next launch.

- Add `expo-updates`. Set `runtimeVersion: { "policy": "fingerprint" }` in `app.json`, so an OTA update only reaches builds with the same native code, and add `channel` values to the `preview` and `production` profiles in `eas.json`.
- Default update check (`ON_LOAD`). Users get the new content on the next cold start after the download. Nothing extra is needed.
- `npm run release:content` (§3.7) validates, creates the version, archives it, and prints the exact `eas update --channel <channel> --message "<msg>"` command. Running `eas update` stays a deliberate human step.
- Native changes, or a `CONTENT_SCHEMA_VERSION` change that needs new native code, still go through a store build. The fingerprint policy enforces this automatically.

**Phase 0 must confirm** that an OTA update delivers a changed `assets/database/content.db` and that `importDatabaseFromAssetAsync` reads the updated asset (see §6). If it does not, the fallback is a small manifest + download of `content.db` into `content.next.db`, which reuses §3.3 unchanged.

### 3.7 Releases and versioning (fixes P8)

**Principle: editing is a draft. A version exists only because someone published.**

**Version format.** Semantic versioning for content, independent of the app version: `MAJOR.MINOR.PATCH`, starting at `1.0.0` (the first release records the currently bundled content as the baseline). Studio and the script compute a suggested bump from the diff against the last release:

| Bump | When | Examples |
|---|---|---|
| PATCH | Wording changes only. No entity added, removed or retired. | Typo, clearer explanation, fixed distractor, reordered steps |
| MINOR | Entities added, or new optional fields filled. | New lesson, six new quiz questions, a new article |
| MAJOR | An id is retired (§3.5) or `schema_version` changes. | Removed myth, new lesson step type |

The author may raise the bump but not go below the suggestion.

**Draft state.** Any difference between the master DB and the last release (compared by `content_hash`) is "unpublished changes".
- Studio's header shows `v1.4.0 + 7 unpublished changes`.
- Dev builds (`npm run start`, via `sync-content`) bundle the version as `1.4.0+draft.<hash6>`. That string changes with every edit, so a dev device re-seeds on each change, and no release is created.
- Release builds and OTA updates **refuse drafts**. A new `check:content-published` script (also run by `release:content`, and by `eas-build-pre-install` in `package.json`) fails when the bundled version has a `+draft` suffix.

**Type change.** `CONTENT_DB_VERSION` in `services/content-db.ts` becomes a string (still rewritten only by scripts, never by hand). The seed decision uses `!==`, not `<`, so restoring or republishing an older release also re-seeds the device.

**Release ledger.** `content/releases.json` is append-only and committed:

```json
{
  "releases": [
    {
      "version": "1.4.0",
      "date": "2026-11-16",
      "bump": "minor",
      "schemaVersion": 3,
      "contentHash": "a1b2c3d4e5f6",
      "summary": {
        "added":   { "lessons": 1, "quiz_questions": 6 },
        "changed": { "encyclopedia_entries": 4 },
        "retired": {}
      },
      "notes": "Added the Fusion basics lesson; fixed four encyclopedia entries.",
      "update": { "channel": "production", "groupId": null }
    }
  ]
}
```

`update.groupId` is filled in after the author runs `eas update` (Studio form field, or `npm run release:content -- --record-update <groupId>`), so each release can be traced to the OTA update that carried it.

**Archive.** Each release is also stored as `content/releases/<version>.db.gz` (~200 KB, committed) and tagged in git as `content-v<version>`. Releases are rare, so this replaces the per-commit binary churn from P7 with a handful of small files. Together they are the permanent, off-machine backup of everything that ever shipped.

**Publish flow** (`npm run release:content -- [--bump patch|minor|major] [--notes "…"]`, or Studio's Publish button, §4.4):

1. Refuse if nothing changed since the last release.
2. `validate:content --strict-review`, `typecheck`, `check:icons`.
3. Take a `pre-publish` backup (§3.8).
4. Compute the change summary and suggested bump; apply the author's bump.
5. Write the snapshot, the bundled DB with `content_meta`, the new `CONTENT_DB_VERSION`, the `releases.json` entry, the archive file, and the refreshed `shipped-ids.json`.
6. Print the `git commit` / `git tag content-v<version>` and `eas update` commands.

If any step after 3 fails, the files it touched are restored from the `pre-publish` backup, so a failed publish never leaves a half-written release.

**Rollback.** `npm run release:content -- --restore 1.3.2` (or Studio → Releases → Restore) loads that archive into the master DB as a draft. Publishing it creates a new release (e.g. `1.4.1`, with the note "Restores 1.3.2"), so the ledger only ever moves forward. For an emergency, republish the earlier EAS update group; devices re-seed because the version differs.

### 3.8 Backups and history (fixes P9)

Three layers, each for a different size of mistake:

| Layer | Protects against | Where | Kept |
|---|---|---|---|
| **History** (per entity) | "I changed this lesson wrongly", "I deleted that question", an AI edit I want to undo | `content/database/studio-history.db` (gitignored) | 90 days, or the last 50 revisions per entity, whichever keeps more |
| **File backups** (whole DB) | A bad script, a corrupt DB, a bad bulk edit | `content/backups/` (gitignored) | By reason, see below |
| **Release archive** (§3.7) | Everything else, including a lost laptop | `content/releases/` + git tags | Forever |

**History.** Every write to a content row, from Studio, the OpenCode plugin, or a script that uses the shared helper, appends `(table, pk, timestamp, action, before_json, after_json, source)` where `source` is `studio`, `plugin` or `script:<name>`. Child rows are recorded with their parent (a lesson revision includes its steps). This gives:
- a **History** tab on every entity with a field-level diff and **Restore this revision**;
- a **Recently deleted** list that brings back a deleted entity with its children;
- plugin edits that are identifiable and individually revertable.

**File backups.** Created with `VACUUM INTO` (a consistent copy even while the DB is open, fixing the WAL problem in P9), named `content-<ISO time>-<reason>.db`:

| Reason | Created when | Retention |
|---|---|---|
| `auto-daily` | Studio starts, or the first write of the day, if the newest `auto-daily` is over 24 h old | newest 14 |
| `pre-publish` | Step 3 of the publish flow | newest 20 |
| `pre-restore` | Before restoring a backup, history revision or release | newest 20 |
| `pre-script` | Start of any `scripts/content-migration/*.mjs` run (they call the shared `scripts/lib/backup.mjs`) | newest 20 |
| `manual` | The Backup button, with an optional label | never pruned |

If `ATOMIQ_BACKUP_DIR` is set (for example a cloud-synced folder), each new backup is also copied there.

**Restore.** The Backups view lists each file with its date, reason, size, row counts, and a summary of how it differs from the current DB. Restore runs `PRAGMA quick_check` on the file, takes a `pre-restore` backup, then replaces the master and reopens Studio's handle. Restoring a file whose tables or columns differ from the current schema is refused unless the author confirms.

**Housekeeping.** Add `content/backups/`, `content/database/studio-history.db*` and `.opencode/studio-token` to `.gitignore`. Replace the old `content.db.bak-<stamp>` files next to the master with the new directory (the existing ones can be moved into `content/backups/` as `manual`).

## 4. Content Studio

Studio stays a zero-dependency local tool (`node:http` + `node:sqlite`, vanilla ES modules, no build step). Split `public/app.js` (834 lines) into modules: `api.js`, `views/*.js` (one per content type), `widgets/*.js`.

### 4.1 P0 — Safety and correctness

| Item | Requirement |
|---|---|
| Local only (S2) | `server.listen(PORT, "127.0.0.1")`. Remove `Access-Control-Allow-Origin: *`. Reject requests whose `Origin` header is present and is not `http://localhost:<PORT>` / `http://127.0.0.1:<PORT>`. |
| Plugin access (S2) | The server generates a random token at startup and writes it to `.opencode/studio-token` (gitignored). Write endpoints accept either a same-origin browser request or `Authorization: Bearer <token>`. The OpenCode plugin reads the token file. |
| Remove Bump version (S1) | Delete `/api/bump-version` and the button. Replace with **Publish** (§4.4). Update the plugin's tool description to say edits are drafts and are released from Studio's Publish button or `npm run release:content`. |
| Validate on save (S4) | `PUT`/`POST` run the same rules as `validate:content` (`scripts/lib/content-rules.mjs`, plus the id/reference checks in `validate-content.mjs`, moved into the lib) on the affected entity. **Errors** block the save and come back field by field; **warnings** save but show in the UI. |
| Transactions | Saving a whole entity (e.g. a lesson with its steps) runs in one `BEGIN … COMMIT`. A failure leaves the DB unchanged. |
| Delete guard (P6) | Deleting a row whose id is in `shipped-ids.json` is refused unless the request includes a retirement reason, which Studio then appends to `retired-ids.json`. Renaming a primary key on a shipped id is refused. |
| Backups and history | Implement §3.8: automatic and manual backups via `VACUUM INTO`, per-entity history on every write (including plugin writes, tagged by source), and a shared helper so migration scripts back up first. The old `/api/backup` copy is replaced. |
| WAL hygiene | Run `PRAGMA wal_checkpoint(TRUNCATE)` after each save, so `sync-content` and git always see complete data. |

### 4.2 P1 — Entity editors (S3, S5)

Replace the table list with a sidebar of **content types**. Each opens a purpose-built editor; a "Raw tables" section remains as an advanced fallback.

| Content type | Editor |
|---|---|
| Lessons | Lesson fields at the top; steps as an ordered list of cards below. Add step by type, drag to reorder (`position` is computed on save), duplicate, delete. Each step card uses a form for its type (briefing, micro-learn, lab, myth_buster, assessment, debrief). |
| Visual blocks | Inside micro-learn steps: list of blocks with a form per `kind` (diagram, process_flow, model, comparison_cards, annotated_illustration, real_life_example), following `docs/completed/VISUAL_LESSON_BLOCKS.md`. Required fields (objective, alt text, source) are enforced. |
| Quizzes | Quiz fields plus an ordered question list. Questions use a shared question widget (type, options, correct answer, explanation, difficulty). |
| MythBuster pools | Three columns (easy/medium/hard), reorderable, using the same question widget. |
| Myths | Single form. |
| Mazes | Maze fields, an ordered room list, and per room: monsters and battle questions as forms, not JSON. Boss questions use the question widget. |
| Encyclopedia | Single form with reference pickers for related entries/elements. |
| Articles / Posts | Existing source and author widgets, plus the review workflow from `docs/ARTICLE_PIPELINE.md` (status, reviewer, last reviewed). |

Shared widgets:

- **Icon picker:** searchable list built from `components/ui/icon-registry.ts`. Unknown names are an error, which matches `check:icons`.
- **Reference picker:** already exists (`refboxWidget`); extend to every `related_*` and prerequisite field.
- **Used by panel:** for any entity, list where its id is referenced (prerequisites, `related_*`, journeys). It is shown before delete.
- **Raw JSON toggle:** per field, for edge cases. Still validated on save.
- **Global search:** across all content types' text fields, results grouped by type.
- **Problems panel:** live `validate:content` results for the whole DB, each linking to the offending field.

### 4.3 P1 — Change review

- A **Changes** view diffs the live master DB against the **last published release** (`content/releases/<version>.db.gz`) entity by entity: added, changed (field-level), retired. The header counter ("7 unpublished changes") links here.
- This is what the author checks before publishing, and the committed snapshot diff is what a reviewer reads in the PR.

### 4.4 P1 — Publish, releases, backups

Three views in the sidebar, all driving the flows in §3.7 and §3.8:

- **Publish** (button in the header, enabled only when there are unpublished changes). A dialog shows the validation result, the change summary by table, the suggested bump with the next version number (`1.4.0 → 1.5.0`), and a required release-notes box. Confirming runs the publish flow server-side, streams its output, then shows the `git` and `eas update` commands to copy. A **Record update** field takes the EAS update group id afterwards.
- **Releases.** The ledger as a list: version, date, notes, change summary, and EAS group id. Each row has **View changes** (diff against the previous release) and **Restore as draft**.
- **Backups.** The list from §3.8 with a diff summary against the current DB, **Restore**, **Backup now** (with a label), and a **Recently deleted** tab. Every entity editor also has a **History** tab.

Studio never runs `eas update`, pushes to git, or creates tags itself. It prints the commands.

### 4.5 P2 — Preview on device (S6)

- Studio serves `GET /api/preview.db`: a checkpointed copy of the master DB with a `content_meta` row (`content_version = "preview-<hash>"`).
- Dev builds only (`__DEV__`): Settings → **Developer** → "Load content from Studio" takes a host (default: the Metro host IP) and downloads into `content.next.db`, then runs the §3.3 verify-and-swap. Lesson rows get an "Open in app" link (`atomiq://lesson/<id>`).
- Because this endpoint must be reachable from a phone, it is the **one** exception to localhost-only. It is served on the LAN only when Studio is started with `STUDIO_PREVIEW=1`, it is read-only, and it requires the token (shown in the Studio UI as a QR code / short code).
- "Reset to bundled content" in the same Developer section restores the normal seed.

### 4.6 Cleanup (S7)

- Delete `tools/content-sql.html`, `scripts/content-editor.js` and the `content-editor` npm script.
- Update `CLAUDE.md`, `README.md`, `content/README.md` and `docs/ARTICLE_PIPELINE.md` to describe Studio + `release:content` as the only workflow, and drop the stale `content/*.ts → seed-sqlite` description.

## 5. Testing

| Area | Test |
|---|---|
| Seed decision logic | `scripts/test-content-db-core.mjs`: version match/mismatch, integrity failure, missing DB, schema mismatch. |
| Snapshot determinism | Run `sync-content` twice, and once after a `VACUUM` on the master. Version and snapshot must not change. |
| Studio API | `scripts/test-studio.mjs`: start the server on a temp copy (`ATOMIQ_DB`, random `PORT`, `NO_OPEN=1`), then assert that a cross-origin write is rejected, a write without the token from a non-browser client is rejected, an invalid question is rejected with field errors, deleting a shipped id without a reason is refused, a lesson save with steps is atomic. |
| Id stability | `validate:content` fixture: remove a shipped id, expect an error; add it to `retired-ids.json`, expect a pass. |
| Versioning | `scripts/test-releases.mjs`: bump suggestion (typo edit → patch, new row → minor, retired id → major, lowering below the suggestion is refused), draft suffix appears after an edit and disappears after publish, `check:content-published` fails on a draft, publishing with no changes is refused, a failure injected after the backup restores the pre-publish files, `--restore` creates a new forward release. |
| Backups and history | `scripts/test-backups.mjs`: `VACUUM INTO` backup contains rows written moments earlier (WAL case), retention prunes per reason but never `manual`, restore takes a `pre-restore` backup first, a corrupt file is refused, a plugin write appears in history with `source = plugin`, a deleted lesson is restored with its steps. |
| Device | Release-like Android build: fresh install, upgrade from the current Play version (marker-file era), kill the app mid-seed, OTA content update, airplane mode on first launch. |

Add `test:content-db` and `test:studio` scripts to `package.json`.

## 6. Phases

| Phase | Scope | Exit criteria |
|---|---|---|
| **0. EAS Update spike** (~1 day) | Add `expo-updates` on a branch, build a preview APK, publish an update that changes one lesson title. | Title change appears after a cold restart, without reinstalling. If not, pick the manifest-download fallback (§3.6) and note it here. |
| **1. Runtime hardening** | §3.1–3.4: snapshot, `content_meta`, string version with draft suffix, atomic seed, `content-db-core.ts`, `ContentGate`. Also the file-backup layer of §3.8 (`VACUUM INTO`, `scripts/lib/backup.mjs`), because it protects every later step. | Tests in §5 pass. Upgrade from the current build keeps user data and lands on the new content. Migration scripts take a backup before writing. |
| **2. Studio safety + releases + history** | §3.5–3.8, §4.1, §4.4, §4.6. First publish creates `1.0.0` as the baseline. | No writable endpoint reachable cross-origin or off-host. `npm run release:content` and Studio's Publish are the only way to create a version. Bump version is gone. Entity history and restore work. |
| **3. Studio editors** | §4.2, §4.3. | Every content type can be authored without raw JSON. The Problems panel matches `validate:content`. |
| **4. Device preview** | §4.5. | An edit in Studio shows up on a dev build in under 30 s without rebuilding. |

Phases 1 and 2 can ship in the same store release. Phases 3 and 4 are tooling only and need no app release (phase 4 touches dev-only app code).

## 7. Decisions needed

| # | Question | Recommendation |
|---|---|---|
| D1 | EAS Update vs. our own manifest + download for OTA content. | EAS Update, if Phase 0 passes and the free-tier MAU cap fits the expected audience (check current pricing on expo.dev). |
| D2 | `runtimeVersion` policy. | `fingerprint` (automatic). `appVersion` is simpler but requires remembering to bump the version on native changes. |
| D3 | Stop committing `assets/database/content.db`. | Yes, once the snapshot is committed and an EAS build from a clean clone has been checked. |
| D4 | Keep Studio vanilla JS vs. adopt a small UI library (e.g. Preact + htm, vendored). | Stay vanilla through Phase 2. Revisit at Phase 3 if the editors get unwieldy. |
| D5 | Should Studio images stay as remote URLs or support local uploads into `assets/`? | Out of scope here. Bundled images need a store build anyway; track separately. |
| D6 | Version scheme: semver (`1.4.0`, bump suggested from the diff), calendar (`2026.11.16.1`), or a plain counter (`r27`). | Semver. The bump tells you at a glance whether a release was a typo fix or new lessons, and MAJOR flags retired ids. |
| D7 | Commit `content/releases/*.db.gz` to git? | Yes. About 200 KB per release, and releases are rare. It is the permanent off-machine backup and what makes restore possible. |
| D8 | Off-machine location for file backups (`ATOMIQ_BACKUP_DIR`). | Optional. Release archives in git already cover everything that shipped; this only protects unpublished drafts. A cloud-synced folder is enough. |

## 8. Implementation status and deviations

Everything in §3 (except §3.6) and §4 is implemented. Where the code differs from the text above, the code is right:

- **Phase 0 / §3.6 (EAS Update) is not done.** `expo-updates` is not installed and there are no `runtimeVersion` or channels yet, so published versions reach learners through a new store build only. `release:content --record-update <group-id>` and the ledger field exist for when OTA is added. **D3 is not applied.**
- **MINOR also covers removed child rows** (a step, question or room deleted from an existing parent), not only added rows.
- **`built_at`** in `content_meta` is a release date, or the literal `draft` / `preview` for the working copy and developer previews.
- **`shipped-ids.json` covers database tables only.** Journeys are still TypeScript and are not tracked.
- **Device preview** is paired with a 6-digit code typed in Settings → Developer (with attempt lockout), not a QR code.
- **First publish needs `--allow-unreviewed`** (the "Publish anyway" box in Studio) while articles and posts are still `needs-review`; the release records `unreviewedAllowed: true`.
- **Frontend**: plain ES modules under `tools/studio/public/js/` (`form.js` is the spec-driven widget builder, `types.js` the per-type field specs, `entity.js` the editor, `panels.js` the Problems / Changes / Publish / Releases / Backups / Search / SQL views). The visual-block SVG preview is not built; the Problems view enforces the block rules instead.
- **Verification**: `test:content-db`, `test:releases`, `test:backups` and `test:studio` cover the backend. The frontend was smoke-tested in headless Chromium, including a round trip that opens and saves all 346 existing items and confirms the content hash is unchanged.
