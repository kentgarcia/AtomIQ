# Activity tracker

Implements `docs/qa/ATOMIQ_FEEDBACK_SUMMARY_SPEC.md` section 5.3: an on-device,
GitHub-style learning activity history. It is a personal view, not social
comparison.

## What is stored

One row per local calendar day in the SQLite progress database (`atomiq.db`,
table `activity_days`, plus a small `activity_meta` table). The bundled content
database is never touched, so content reseeds/updates cannot affect this data.
Per day: counts per event kind, total, weighted points, level (0-4), a small
dedupe ledger (`kind -> id -> times counted`, ids are lesson/quiz/
element ids), the ISO timestamp of the last event and the timezone offset at
that moment (diagnostics only). Nothing leaves the device: no network, no
sharing/export UI, no leaderboard. "Delete Account" clears both tables.

## What counts

| Kind | Where it is recorded | Points | Dedupe (per day) |
| --- | --- | --- | --- |
| `lesson_step` | `app/lesson/[id].tsx` step advance | 1 | once per step id, max 60 |
| `lesson_complete` | `components/lesson/DebriefView.tsx` when progress is saved | 2 | once per lesson |
| `quiz_attempt` | `app/quiz/[id].tsx` when a quiz is finished (any score) | 1 | max 3 per quiz |
| `quiz_complete` | same, when passed | 2 | once per quiz |
| `lab_session` | `app/lab/index.tsx` when a lab challenge is solved | 2 | once per lab/challenge |
| `game_session` | MythBuster `finishGame`; Atom Maze defeat/complete | 2 | max 5 per game, 10 total |
| `periodic_table_explore` | `recordActivity('periodic_table_explore', { id })` (called by the periodic-table feature) | 1 | once per element id |
| `blog_read` | `services/feed.ts` `markBlogRead` when a mini blog piece is opened (docs/features/NPC_FEED_SPEC.md); reactions do not count | 1 | once per piece, max 10 |

Opening the app is not learning activity (it only feeds the existing streak).

## Intensity scale

Fixed: level 0 = none, 1 = 1 point, 2 = 2-3, 3 = 4-6, 4 = 7 or more. Level 4 is
a ceiling, and the dedupe rules plus per-kind daily caps stop repetition from
inflating the day. Colours derive from one brand hue (orange accent) with
alpha, so they work in light and dark; every level also has a distinct border
(dashed, thin, medium, thick, heavy) and a level numeral, so colour is never
the only signal.

## Timezone and clock rules

- A day key is the local `YYYY-MM-DD` at the time of the event, from the
  instant plus the device timezone offset at that instant (never UTC slicing).
  Day arithmetic is civil-calendar math, so DST days (23/25 h) never skip or
  repeat a key.
- Events are recorded under the local date at event time. Past days are never
  rewritten or deleted. If the clock moves backwards, new events extend the
  earlier day through the same dedupe ledger, so nothing is double counted.
- The grid never renders future cells. A stored record dated in the future
  (clock was set forward earlier) is kept, not shown, and not counted.
- Week rule: Sunday-first (matches GitHub and the streak screen's S M T W T F
  S row); `buildWeekGrid({ weekStart: 1 })` gives Monday-first.
- Writes are debounced (1.5 s) and flushed when the app leaves the foreground.
  If the database is not ready, events wait in memory with their original
  timestamps and are replayed after the next successful load.

## History import

On first load the app imports, once and idempotently, completed lessons/quizzes
(`levels.completed_at`) and game scores (`game_scores.created_at`) that
already exist with real timestamps. Imported days are flagged and the details
panel says so. No activity is invented; future or unreadable timestamps are
skipped.

## How this relates to the existing streak

The streak is unchanged. It is the app-open check-in state machine in
`services/utils.ts` (`checkDailyStreak`) driven by `StorageContext`, stored in
`user_profile.current_streak/longest_streak` and AsyncStorage
`last_active_date`. The heat-map does not compute a competing streak: the
streak screen passes `userProfile.current_streak` (the same value as the hero
card) into the summary line. Quirks inherited from the existing system, left
as is: the streak is the number of consecutive days the app was opened; after
a gap of 2+ days it resets to 0 on the return day and becomes 1 the next day.
`simulateExistingStreak` in `services/activity-core.ts` models these rules and
`scripts/test-activity.mjs` proves it equals the real `checkDailyStreak`
(loaded from source with the clock pinned) on shared fixtures across several
timezones and DST transitions. Because the streak counts app opens and the
grid counts learning actions, a day can be in the streak with an empty cell;
the explanation card says this.

## Files

- `services/activity-core.ts` - pure logic and storage-agnostic engine.
- `services/activity-log.ts` - SQLite store, `recordActivity`, history import.
- `components/activity/` - `ContributionGraph`, `ActivityExplainer`,
  `levels`, `use-activity-days`.
- `scripts/test-activity.mjs` - `npm run test:activity`.
