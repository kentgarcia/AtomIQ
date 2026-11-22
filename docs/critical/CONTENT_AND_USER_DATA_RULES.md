# Content changes and learner data

Written 2026-11-22, before the first public release. Content ships inside a build (no OTA: `expo-updates` is not installed), so a content change is a new build, and every phone that updates keeps its learner data.

## The two databases

- **Content DB** (`content.db`): replaced whole by the bundled one when `CONTENT_DB_VERSION` differs (`services/content-db.ts`: copy, verify, swap, rollback). Safe to change.
- **User-state DB** (`atomiq.db`): lives on the phone for years and refers to content by plain text ids, with no foreign keys. This is where a content change can hurt.

## What the user DB holds about content

| Table | Refers to | If the content id goes away or changes |
| --- | --- | --- |
| `levels`, `lesson_runs` | path node / lesson ids | progress for that node stops counting; a saved run is dropped when the lesson's card ids change (`contentKeyOf`) |
| `item_attempts`, `objective_mastery` | item / objective ids | orphan rows, harmless, that history stops counting |
| `shop_owned`, `story_progress`, `scans`, `daily_facts_read` | shop item / level / scan target / fact ids | an owned item or a scan is lost to the screen that reads it |
| `chat_threads`, `chat_messages` | chat node ids (`entry_node_id`, `node_id`), `event` unlock key | a thread whose last node is gone is ended when opened (`isStuck`, `services/chat-core.ts`) and its Replay is hidden if its entry node is gone; stored message text never changes |
| `feed_posts` | template, blog ids | text is rendered once and stored, so edited templates never change old posts |

## Rules

1. **Ids are permanent.** Fix text in place. To replace a lesson, node, item or story, add a new one and retire the old one with a reason (`--retire`). After the first publish `shipped-ids.json` enforces this. Before it nothing does, so publish `1.0.0` first.
2. **Never reuse an id for something different.** A learner's progress would silently attach to the wrong thing.
3. **A chat story is unlocked once per key.** Rewriting a story's text does not give it again to people who have it; a new story needs a new trigger key or a new node id.
4. **Adding is safe, removing is not.** A new lesson in the middle of a finished unit just becomes that learner's current node.
5. **Release size** (`release:content` suggests it): edits are a patch, rows added a minor, a shipped id retired or `CONTENT_SCHEMA_VERSION` changed a major, and a major needs an app build that understands it.
6. **Every source verified before publish** (`verified = 1`), safety and health content first.

## Changing the user DB

`services/user-db-migrations-core.ts` (`test:user-db`). `PRAGMA user_version` is the record of what a phone has done.

- Version 1 is the baseline: everything `initDatabase` did before the first release (the old ad hoc repairs stay in `database.ts`).
- A change to a table that already shipped is a numbered `Migration` (2, 3, 4, ... at the END of `MIGRATIONS`). Never edit, reorder or renumber a shipped one.
- `services/local-first/schema.ts` and the `CREATE TABLE`s in `database.ts` always describe the NEWEST shape, in the same commit as the migration. A brand new install is stamped with the newest version and runs no migration.
- Each migration runs in one transaction with its version bump (all or nothing); a failure is logged and retried on the next start, the app still opens (so keep the old shape readable until it succeeds). No `PRAGMA foreign_keys` inside one.
- Never lose progress in a migration: copy what you cannot translate.
- A database newer than the app (an older build installed over a newer one) is left untouched.
- Adding a column to a table the old way (`ensureTableColumns`) still works for a quick additive change, but from the first release use a migration instead so the version records it.

## Delete Account is not a fix

`clearAllData` empties rows; it never repairs a changed shape. If a feature only works after Delete Account, that is a missing migration or an id rule broken, and it will hit every real learner. Test an upgrade the way a learner gets it: install the previous build, make progress (lessons, a half-played chat, a shop buy), install the new build over it, and check all of it still works.
