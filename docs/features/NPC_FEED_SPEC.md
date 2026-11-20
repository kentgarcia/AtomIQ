# AtomIQ: NPC Feed, Mini Blog and Ranks Specification

**Status:** Implemented in part (2026-11-18, revision 4). Done: content tables, validation and seed (phase 1), the cores (phase 2), runtime and hooks (phase 3), and the screens (phases 4 to 7): Discover as the feed with post and blog cards, the reaction row, the two entry cards, the empty state, the unseen dot on the Discover tab, the blog reader with comments, Ranks, the encyclopedia opened from its entry card, and the Settings "Feed posts" switch, with `test:feed`, `test:feed-ui` and `check:feed`. Not verified: nothing has been seen on a screen or a device (layout, the drawn heads in the circles, motion, haptics, TalkBack and VoiceOver, large text, tablets, dark mode), and the bundled `assets/database/content.db` has to be rebuilt with `sync-content` before the feed shows content. The old leaderboard snapshot helpers are already gone from the source.
**Owner:** AtomIQ product, design and engineering
**Applies to:** `app/(tabs)/community.tsx` (Discover becomes the feed), new `app/blog/[id].tsx` (reader) and `app/ranks.tsx`, `services/feed-core.ts` + `services/social-core.ts` + `services/blog-core.ts` + `services/rank-core.ts` + `services/feed.ts`, new content tables (`feed_templates`, `blog_posts`, `blog_comments`, `blog_references`) in `scripts/content-migration/schema.sql`, new user-state tables (`feed_posts`, `reactions`, `blog_reads`) in `services/local-first/schema.ts`, Content Studio, `scripts/lib/content-rules.mjs`
**Builds on:** `docs/features/NPC_TEACHERS_SPEC.md` (the cast, `npcs` / `npc_lines`), `services/curriculum-complete.ts` (lesson, checkpoint and unit completion), `services/activity-log.ts`, `services/missions.ts` + `services/wallet.ts` (chests), the earlier local leaderboard (`services/database.ts`, its tab was removed from the tab bar), the Encyclopedia (`app/encyclopedia.tsx`, `app/explorer/encyclopedia*.tsx`, `components/community/EncyclopediaParts.tsx`), `components/npc/` (drawn characters)

## 1. Goal

Discover used to be a list of articles. Articles are gone. Discover becomes **a social-media-style feed in which the NPC cast posts about the learner's progress**. Mini blog pieces are part of the same feed, as rich cards. The NPCs react to posts (simulated) and the learner can react too; the only comments are NPC comments under blog pieces, there to inform.

| Part | Where | What it is |
|---|---|---|
| **Feed** | Discover tab | Scrolling posts by NPCs about what the learner did, newest first. NPCs react; the learner can react. No comments on posts. |
| **Mini blog** | cards in the feed, opening a reader | An article, but more engaging: a short NPC-written piece to read. NPCs add short informational comments under it (some pieces have none). |
| **Ranks** | an entry card at the top of Discover | The leaderboard, with the NPC cast as the rivals. |
| **Encyclopedia** | an entry card at the top of Discover | The existing encyclopedia, moved here from being Discover's whole content. |

The phone, its home screen and its app grid are a separate feature (`docs/features/PHONE_SPEC.md`); Discover itself stays a feed with no app grid.

Principles:

1. **Simulated, honest and offline.** Everything is generated on the device from content-DB templates and authored blog content. Nothing is sent anywhere. Nothing claims a real person did something.
2. **Triggered by what the learner really did.** A post, a blog piece or a rank change exists because an event happened (§5). No random filler.
3. **In each NPC's voice.** Posters, reactors, commenters, authors and rivals are NPCs from the cast. Wording is authored per NPC in Studio, like `npc_lines`.
4. **Learner reacts, never writes.** The learner's only input is a reaction. Comments exist only under blog pieces, only by NPCs, and are there to inform (§4.3). There is no text input in this feature, so there is nothing to moderate.
5. **Calm.** Few posts, spaced out, no notification storm (§8).
6. **Optional.** The feed can be muted. Nothing needed for learning lives only here.

### Non-goals

- Real social features (friends, real comments, real users). `community_posts` and `comments` in the local-first schema stay for a future sync; this feature does not use them (§7.1).
- Generated or network text (no LLM). Fixed, reviewed content only.
- Anything a learner must do to progress. This feature celebrates and teaches; it never gates.
- Comments under feed posts, and any phone or app metaphor inside the feed (the phone is `docs/features/PHONE_SPEC.md`).

## 2. Current baseline

- Articles and posts (content DB `articles` / `posts`, read tracking, article-detail, Guide links, the `article_read` activity kind) were removed in a separate step; this spec assumes they are gone. Discover currently shows only a search field, the periodic-table banner and the A to Z encyclopedia list.
- The cast exists: Ada, Hal, Ray, Mina, Kofi, Tess and Sage, each owning one unit (`units.teacher_npc_id`), drawn by `components/npc/` as data. Their lines live in `npc_lines`.
- Completion events have one choke point: `completeNode` / `completeTestOut` in `services/curriculum-complete.ts`. Activity events go through `recordActivity`. Chests open in `openChest` (`services/missions.ts`). Streaks are on the user profile (`current_streak`).
- The old Leaderboard tab read a local snapshot (`getLeaderboardSnapshot`, `LocalLeaderboardUser`). Its tab file is removed; the data helpers remain in `services/database.ts`.
- The user-state DB creates tables from `services/local-first/schema.ts` and migrates by adding columns in code (`ensureTableColumns`).

## 3. Discover: the feed

One scrolling list under a large "Feed" title, newest first, like a social app. Posts are **flat on the page**: no cards, no lips.

At the top, two blocks that are not posts and scroll away with the feed (they are not part of its history):

- a **row of four round shortcuts**: AtomDex, Periodic table, Reacted and Blogs (a soft circle inside a dashed ring, an icon, a small label; each opens its screen, §4.5). **Reacted** (`app/reacted.tsx`) lists the posts the learner reacted to. Daily facts is no longer on the Feed (still opened from the daily quest and the phone). It (`app/daily-facts.tsx`) holds today's "Did you know?" card (reading it completes the daily fact quest once a day) and the list of facts already read, newest first, each reopening its story (`daily_facts_read` in the user-state DB, `services/daily-facts*.ts`, `test:daily-facts`);
- the **Weekly ranking banner**, a soft rounded panel with "You're 3rd this week" and a second line ("Pass Mina to climb", or "Be the first to earn XP this week" with no XP yet) and a trophy; it opens Ranks (§4.4).

A **post** has, from the top:

- a header row: the poster's drawn head as a large circle, then "**Ada** cheered you on" (the light phrase follows the post's kind: *cheered you on*, *shared a milestone*, *has a nudge*, *has a teaser*; a blog card says *wrote a blog piece*) and under it the relative time and the title ("2h · Atom teacher");
- the post text (1 to 3 lines) large and bold in a **soft speech bubble** about two thirds of the width, with a small tail pointing right at the poster's **figure** (the drawn NPC at bust size, in a pose that fits the kind) beside it;
- an optional **chip** as a lighter tappable line inside the bubble, with a chevron ("Open lesson ›"; it opens the lesson, the unit on the map, Quests or the weekly ranking);
- a **reaction pill** (§4.2): a chunky outlined pill with a heart (the learner's own reaction filled in when set) and the count of everyone who reacted; tapping it opens the four-reaction picker;
- a "**Liked by Mina and others**" line with a small overlapping stack of up to three reactor heads (left out when no NPC reacted); tapping it lists who reacted with what;
- a full-width divider and generous spacing before the next post.

A **blog card** is the same pattern, kept compact: a single soft rounded row in place of the bubble, with a small cover picture on the left and the title (two lines at most), the hook (two lines at most) and the reading time beside it. The whole row opens the reader (§4.3); there is no separate button and no figure. It has the same header, reaction pill, "Liked by" line and divider. When the piece has NPC comments, a "View 3 comments" button sits beside the reaction pill and opens the reader, where the comments are. Blog cards are feed items like any other, in the same time order.

Pull to refresh. Empty state: Shrodi and one line ("Finish a lesson and your teachers will start posting."). A new post fades in at the top (at most 200 ms, ease-out); with reduced motion it appears without movement. There is no delay: a post is in the feed the moment its event happens, with its reactions already in place (§8).

## 4. The parts

### 4.1 Who can do what

| | NPCs | Learner |
|---|---|---|
| Post to the feed | yes (triggered, §5) | no |
| React (like and friends) to a post or a blog piece | yes, simulated: selected plus random NPCs | **yes, one reaction per target, can change or remove it** |
| Comment | **yes, only under blog pieces, only informational, only some pieces** | **no** |

### 4.2 Reactions

- **Reaction set:** `like`, `love`, `clap`, `wow`. One per actor per target.
- **NPC reactors.** When a post is created (or a blog piece appears), its reactor list is decided once, with a seeded RNG from the target id so it is stable. **Selected** NPCs come from the template's `reactors` (for example the unit's teacher always reacts to a unit milestone); **random** NPCs are drawn from the rest of the cast, never the poster or author, 0 to 4 of them. Each picks a reaction by weight (a `celebrate` skews to `clap` and `love`, a `tease` to `wow`). All are in place when the post appears.
- **Learner reaction.** Tapping the button sets or toggles the learner's reaction, with a haptic and a 150 ms pop (none with reduced motion). It is local only and changes nothing except a small "You and 3 others" line. NPCs never respond to it.
- **Display.** The row shows up to 3 reactor heads and "+N", the winning reaction glyphs, and the learner's reaction filled in. Tapping the row lists who reacted with what.

### 4.3 Mini blog

A mini blog piece is **an article, but engaging**: NPC-written, short, in a human voice. Each has an author, a title, a one-line hook, a cover (a lesson figure or object from the existing Duolingo-style art, never a photo), and a reading time ("3 min").

**Reader** (`app/blog/[id].tsx`, opened from a blog card). One piece, one calm column:

- the cover, then title, author line ("by Ada") and reading time;
- a body of **blocks** from a small fixed set (§6): `p` paragraph, `h` heading, `quote` (a line in the author's voice, set large, with their head), `fact` ("Did you know?" callout), `figure` (a lesson scene or object with a caption), `list`, and `next` (the closing teaser with a button that opens a lesson or unit);
- written in the second person with short paragraphs, a hook in the first two lines and a question or small surprise per screen, so it reads like a person talking, not a textbook;
- 120 to 350 words; Read Aloud through the shared `<ReadAloudButton>` (never `expo-speech` directly; docs/critical/MEDIA_POLICY.md);
- the sources (verified `content_references`, the same rule as lessons) and the reaction row at the foot.

**Comments (blog only).** Under the piece, 0 to 4 short comments from NPCs other than the author, each in that NPC's voice and each **informational**: an extra detail, a plain-words clarification of a term, a pointer to a related lesson or encyclopedia entry (a small chip), or a gentle correction of a common myth. They are **authored with the piece** (not random), so they can be reviewed: a piece either has some or has none. A comment's facts must be backed by the piece's verified sources or by a lesson. The thread is read-only; the learner cannot reply and NPCs never reply to a reaction. Comments show once the piece has been opened.

**How pieces reach the feed.** A piece appears as a blog card when its unlock trigger fires (§5.2). Pieces that are open from the start (`none`) are added the first time Discover opens. A blog card is never deleted by retention (§8), so a piece can be reread. Opening a piece records a `blog_read` activity (§7.3).

### 4.4 Ranks (leaderboard)

The removed leaderboard returns as its own screen (`app/ranks.tsx`), opened from the entry card: a weekly ranking of the learner among **the NPC cast as rivals** (Ada, Hal, Ray, Mina, Kofi, Tess, Sage), a podium for the top three drawn with their NPC heads, the learner's row highlighted, and pull to refresh. The learner's number is their real XP this week. Each rival's weekly XP is **simulated, deterministically**, in `services/rank-core.ts`: a function of the NPC id, the week key and the learner's own pace (so rivals are beatable and the table moves a little each week, and is identical on every open). It replaces the old snapshot rivals; `getLeaderboardSnapshot` and its helpers are removed in the same change. The Profile tab's personal-bests card (`GameLeaderboardCard`) stays where it is.

Rank changes are a feed trigger (§5.1, `rank_change`), so "Mina passed you this week" appears as a post.

### 4.5 Encyclopedia

The existing encyclopedia, unchanged in content and routes (search, periodic-table banner, A to Z, "Open full encyclopedia"), opened from the entry card. It moves from being Discover's whole content to one screen in the existing explorer stack. Lessons that link to entries keep working. It has no feed triggers.

## 5. Triggers

### 5.1 Feed posts (v1)

| Trigger key | Fires when | Condition fields | Dedupe key |
|---|---|---|---|
| `lesson_complete` | a lesson node completes (first time only) | `unitId`, `lessonId`, `perfect` | `lesson:<lessonId>` |
| `checkpoint_pass` | a checkpoint completes | `unitId` | `checkpoint:<unitId>` |
| `unit_complete` | the last node of a unit completes | `unitId` | `unit:<unitId>` |
| `testout_pass` | a unit is tested out | `unitId` | `testout:<unitId>` |
| `streak` | `current_streak` reaches 3, 7, 14, 30, 60, 100 | `days` | `streak:<days>` |
| `chest_opened` | a daily or weekly chest is opened | `period` | `chest:<period>:<dayKey>` |
| `first_lesson` | the learner's very first lesson completes | none | `first-lesson` |
| `comeback` | the app opens after 3 or more days away | `minDays` | `comeback:<dayKey>` |
| `daily_quests_done` | every daily quest is claimed | none | `quests:<dayKey>` |
| `blog_unlocked` | a blog piece unlocks (§5.2); this creates the blog card | `blogId` | `blog:<blogId>` |
| `rank_change` | the learner passes or is passed by a rival in the weekly ranking (at most once a day) | `direction`, `npcId` | `rank:<dayKey>` |

Replays do not post again: the dedupe key is unique in `feed_posts`.

### 5.2 Blog unlocks

A blog piece names its unlock in the same vocabulary: `{ "trigger": "lesson_complete", "lessonId": "…" }`, `unit_complete`, `streak`, or `none` (open from the start, for an introduction). Whether a piece is unlocked is derived from the learner's completed nodes and streak, never stored, like path status; the blog card is created once, by `blog_unlocked`. Every unit gets at least one piece at its start (`none` or the unit's first lesson) and one at its end.

### 5.3 Voice

A post may speak to the learner ("You finished *What is an atom?*") or about them ("Just watched someone finish *What is an atom?*"), whichever suits the template and the NPC. Both styles are allowed and mixed across variants; no rule fixes one. `{name}` is available but optional.

## 6. Content (values only, edited in Studio)

Added between `feed` markers in `schema.sql`, seeded by `scripts/content-migration/feed-content.mjs`, like `npcs`.

```sql
CREATE TABLE IF NOT EXISTS feed_templates (
  id          TEXT PRIMARY KEY,              -- 'ft-ada-lesson-1' (shipped id once published)
  npc_id      TEXT REFERENCES npcs(id),      -- poster; NULL = chosen from poster_pool
  poster_pool TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(poster_pool)),
  kind        TEXT NOT NULL CHECK (kind IN ('celebrate','milestone','nudge','tease')),
  trigger     TEXT NOT NULL,                 -- a trigger key from §5.1 (not blog_unlocked: a blog card's text is the piece's hook)
  condition   TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(condition)),
  text        TEXT NOT NULL,                 -- {placeholders}: {lesson} {unit} {days} {rival} {name}
  chip        TEXT CHECK (chip IN ('lesson','unit','quests','ranks') OR chip IS NULL),
  reactors    TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(reactors)),  -- npc ids that always react
  weight      INTEGER NOT NULL DEFAULT 1,
  created_at  INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  updated_at  INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

CREATE TABLE IF NOT EXISTS blog_posts (
  id          TEXT PRIMARY KEY,              -- 'blog-the-smallest-thing' (shipped id)
  npc_id      TEXT NOT NULL REFERENCES npcs(id),   -- author
  unit_id     TEXT REFERENCES units(id),
  lesson_id   TEXT REFERENCES lessons(id),
  position    INTEGER NOT NULL,
  title       TEXT NOT NULL,
  hook        TEXT NOT NULL,                 -- one line, shown on the blog card
  cover       TEXT NOT NULL,                 -- a lesson figure / object id from the existing art
  read_min    INTEGER NOT NULL,
  unlock      TEXT NOT NULL DEFAULT '{"trigger":"none"}' CHECK (json_valid(unlock)),
  blocks      TEXT NOT NULL CHECK (json_valid(blocks)),  -- vocabulary below
  reactors    TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(reactors)),
  created_at  INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  updated_at  INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

CREATE TABLE IF NOT EXISTS blog_comments (   -- authored with the piece; a piece may have none
  id          TEXT PRIMARY KEY,
  blog_id     TEXT NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  npc_id      TEXT NOT NULL REFERENCES npcs(id),   -- commenter, never the author
  position    INTEGER NOT NULL,
  text        TEXT NOT NULL,
  chip        TEXT CHECK (chip IS NULL OR json_valid(chip)),  -- optional {"lessonId":..} / {"entryId":..}
  created_at  INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  updated_at  INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

CREATE TABLE IF NOT EXISTS blog_references (   -- same shape as lesson_references
  blog_id      TEXT NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  reference_id TEXT NOT NULL REFERENCES content_references(id),
  PRIMARY KEY (blog_id, reference_id)
);
```

**Block vocabulary** (`blog_posts.blocks`, an array; every block is a hardcoded component like lesson cards): `{t:"p",text}`, `{t:"h",text}`, `{t:"quote",text}` (spoken by the author), `{t:"fact",text}`, `{t:"figure",ref,caption}`, `{t:"list",items:[…]}`, `{t:"next",label,lessonId|unitId}`.

**Rules** (run in `validate:content` and on Studio saves; unverified references are warnings in a draft and errors at the publish gate, like the rest):
- feed templates: known `trigger` keys and conditions; placeholders only the trigger can supply; text ≤ 220 characters, no exclamation-mark runs; every unit has at least one `lesson_complete` and one `unit_complete` template; every §5.1 trigger except `blog_unlocked` has at least one template; a `reactors` or `npc_id` that is not an NPC is an error.
- blog pieces: at least one verified source, 120 to 350 words in `p`/`quote`/`fact`/`list` blocks, a hook ≤ 120 characters, a cover that exists, an unlock that points at a real lesson or unit, and a closing `next` block.
- blog comments: 0 to 4 per piece, the commenter is not the author, no commenter twice on one piece, each ≤ 200 characters, and a comment that points at a lesson or encyclopedia entry points at one that exists.
- a published id can be retired, never orphaned.

## 7. Data and engine

### 7.1 User-state DB (the learner's feed)

Created in `services/local-first/schema.ts` with the usual sync columns. New tables, not `community_posts` (generated locally, no author account).

| Table | Columns |
|---|---|
| `feed_posts` | `id`, `dedupe_key` (unique), `template_id`, `npc_id`, `kind`, `trigger`, **`text` rendered once at creation**, `chip_kind`, `chip_target`, `blog_id` (set for a blog card), `created_at`, `seen_at` |
| `reactions` | `id`, `target_type` (`post` or `blog`), `target_id`, `actor_type` (`npc` or `user`), `actor_id` (npc id or `me`), `reaction` (`like`, `love`, `clap`, `wow`), `created_at`; unique on (`target_type`, `target_id`, `actor_type`, `actor_id`); the one `user` row is the learner's |
| `blog_reads` | `blog_id` (primary key), `read_at` |

There is no table or function for a learner comment: comments are content (`blog_comments`), and `services/feed.ts` exposes `react()` and nothing like `comment()`. Ranks are computed, not stored.

### 7.2 Cores

Framework-free (erasable syntax, `.ts` import extensions, `node --test`):

- `services/feed-core.ts`: `pickTemplate(event, templates, history, rng)`, `renderText(template, values)` (refuses an unknown placeholder), `applyLimits(now, existing, candidate)` (§8).
- `services/social-core.ts`: `planReactions(target, reactors, npcs, rng)` returns the NPC reaction rows (selected plus random, each with a reaction), seeded from the target id; `toggleUserReaction(existing, reaction)` returns the new state.
- `services/blog-core.ts`: `isUnlocked(blog, progress)`, `wordCount(blocks)`, `readingMinutes(blocks)` (also used by the validator).
- `services/rank-core.ts`: `simulateRivalXp(npcId, weekKey, learnerPace)`, `buildRanking(learnerXp, rivals)`, `rankChange(before, after)` (returns who passed whom, or none).

### 7.3 Runtime and activity

`services/feed.ts` subscribes to the existing choke points (`completeNode`, `completeTestOut`, `openChest`, the streak update, the app-open check, XP changes for `rank_change`), builds an event, calls the cores with templates read through `contentRepository`, and inserts the post and its reactions in one write. A failure here never fails the action that caused it (try/catch, log, continue). The RNG is injectable so tests are deterministic.

A new `blog_read` kind in `activity-core.ts` (`weight: 1`, `maxPerId: 1`, `maxPerDay: 10`) records opening a piece. Reactions do not count as activity (they are not learning).

## 8. Pacing and limits

- **No delay.** A post, its NPC reactions and a blog card's reactions exist from the moment the event happens. The feed shows them when Discover is next on screen (pull to refresh also works); the new item fades in at the top.
- **Cap.** At most 4 top-level posts per local day; a `milestone`, `unit_complete` or `blog_unlocked` may exceed it by one. Over the cap, lower-weight templates are dropped (no queue). A blog card is never dropped.
- **Spacing.** Two top-level posts from the same NPC are at least 30 minutes apart (by `created_at`); a later one that would break this is dropped.
- **Retention.** The newest 200 posts and their reactions are kept; older rows are deleted at app start, except blog cards (and their reactions), `blog_reads` and the learner's own reactions, which are kept.
- **Mute.** A "Feed posts" switch in Settings stops new posts being created; existing ones stay, the entry cards stay, and the unread dot hides. Default on. Blog cards still unlock when muted (they are content, not chatter).
- **Unread.** A dot on the Discover tab icon while there are posts not yet seen (`seen_at`), cleared as they scroll into view.

## 9. Content authoring

Templates and blog pieces are authored in Content Studio (new panels: Feed templates by trigger and NPC; Blog with a live reader preview, a word-count and reading-time readout and its comments) and seeded from `scripts/content-migration/feed-content.mjs`. Voice per NPC follows their `bio`. Initial set: feed ≈ 70 templates (per unit: 3 `lesson_complete`, 1 `checkpoint_pass`, 2 `unit_complete`, 1 `tease`; shared: 3 each for `streak`, `chest_opened`, `rank_change`; 2 each for `first_lesson`, `comeback`, `daily_quests_done`), in both voices (§5.3); blog: 2 pieces per unit (14), each with 0 to 3 informational comments, the first two written first so the format can be judged.

## 10. Open decisions

- **O1. Reading length and register.** 120 to 350 words in the second person is proposed. Shorter (a "story" of 3 cards) or longer?
- **O2. Entry cards.** The Ranks and Encyclopedia entry cards sit at the top of Discover and scroll away (proposed). Alternatives: pinned above the feed, a row in the Discover header, or entries elsewhere (Home, Profile).
- **O3. Tab name and icon.** Keep "Discover" (proposed) or rename to "Feed".
- **O4.** *Decided: four reactions (`like`, `love`, `clap`, `wow`).*
- **O5.** *Decided: the NPC cast are the rivals on Ranks.*
- **O6.** *Decided: either voice, mixed across variants (§5.3).*
- **O7.** *Decided: no delay.*
- **O8.** *Decided: blog pieces are part of the feed, as blog cards.*
- **O9. Does the learner see locked blog pieces?** Proposed: no, a piece simply appears when it unlocks (nothing is shown dimmed), since there is no separate blog list.

## 11. Accessibility and responsiveness

Heads and decorative art are hidden from screen readers; every post reads as one item ("Ada, Atom teacher, 2 hours ago: …, 3 reactions"); the reaction button is a labelled toggle ("React: clap, selected"); blog comments read as "Mina, comment: …"; entry cards are labelled buttons; touch targets ≥ 48 dp; the reader supports large text; nothing relies on colour alone; all motion respects reduced motion; light and dark modes follow theme roles; tablets keep the readable-width frame.

## 12. Phases

1. **Content.** Schema (`feed_templates`, `blog_posts`, `blog_comments`, `blog_references`), validation rules, seed script with a first set (draft, unpublished), Studio panels.
2. **Cores.** `feed-core`, `social-core`, `blog-core`, `rank-core` with tests.
3. **Runtime.** User-state tables, `services/feed.ts`, hooks at the choke points (never blocking them), `blog_read` activity kind.
4. **Feed.** Discover as the feed: post and blog cards, reactions, empty state, mute switch, unread dot, the two entry cards.
5. **Blog reader.** Reader with blocks, Read Aloud, comments, unlocks creating blog cards.
6. **Ranks and Encyclopedia.** `app/ranks.tsx` with the NPC rivals and the rank-change trigger; the Encyclopedia as a screen opened from its entry card; remove the old leaderboard snapshot helpers.
7. **Polish.** Reduced motion, accessibility labels, dark mode, small screens.

## 13. Later (not v1)

More triggers (mastery levels, mythbuster streaks, new unit unlocked), NPC-to-NPC banter threads, seasonal posts, optional local notifications, a saved-facts notebook, real sync through `community_posts` if friends ever exist.

## 14. Tests and gates

- `test:feed` (new, covers the four cores): picking is deterministic with a seeded RNG; a dedupe key never posts twice; limits (4 a day, 30 minutes per NPC, +1 for milestones, blog cards never dropped); `renderText` throws on an unknown placeholder; `planReactions` never uses the poster or author, never repeats an NPC on one target and is stable for the same target id; the learner toggle sets, changes and clears one row; `isUnlocked` for each unlock kind; `wordCount` and `readingMinutes`; `simulateRivalXp` is deterministic per NPC and week, `buildRanking` orders correctly with ties broken by id, and `rankChange` reports a pass only when the order changes.
- `validate:content`: the §6 rules. `test:studio`: the panels save and reject an invalid template, blog piece and comment.
- A source check (`check:feed`) greps `app/blog`, the feed screen and `services/feed.ts` for any text input or any comment insert, so a learner comment path cannot appear by accident.
- Existing gates still pass: `typecheck`, `lint`, `check:theme-colors`, `check:icons`, `check:tab-bar`, `test:npc`, `test:curriculum-content`, `test:activity`.

## 15. Risks

| Risk | Mitigation |
|---|---|
| The feed feels fake or repetitive | Several variants per trigger chosen by weight, both voices, a daily cap, unit-specific voices, honest framing (NPCs, never "users") |
| A post fires on every replay | Unique dedupe key per event (§5.1, §7.1) |
| A feed failure breaks lesson completion | Feed code runs last, wrapped in try/catch, never on the caller's critical path |
| Edited templates rewrite history | Post text is rendered and stored at creation |
| Blog pieces and comments become unreviewed content | Verified sources, word limits and comment rules are validation errors at the publish gate; comments are authored with the piece, not random; the first two pieces are written and reviewed before the rest |
| Blog cards get buried under posts | Blog cards are exempt from retention and the daily cap, and always have their own larger card shape |
| Without delay, a post can feel less alive | The fade-in at the top and the instant reactions carry it; revisit with a short delay if testing says the feed feels mechanical |
| Content debt (~70 posts, 14 pieces with comments) | Small first set, Studio live preview, one table per kind |
