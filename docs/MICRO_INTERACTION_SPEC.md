# AtomIQ: Micro-interaction and Celebration Motion Specification

**Status:** Priorities 1, 2 and 3 implemented (2026-11-18, revision 4), except 6.1 (purchase), which waits for buying to be built. Priority 3: 6.2 achievement detail, 6.3 ranks, 6.4 game results, 6.5 onboarding, and `Settle` (as `settle()`, `components/motion/settle.ts`) replacing every `springify()` in `app/` (also in Settings, Terms, Privacy, Encyclopedia entry, Lab and `app/streak.tsx`: only the entrance changed there; the `springify()` calls in `components/profile/PassportCard.tsx`, `StreakCard.tsx` and `components/games/StackCard.tsx` are untouched). Differences, priority 3: the achievement badge has no ring fill (the badge has no ring to fill); the game results use a quicker step than the finish screen (stats from 700 ms, 250 ms apart, buttons at about 1.2 s) because they are rows, not hero tiles, and Myth Buster keeps its own cards instead of `StatTile`; only the Atom Maze victory screen was changed, not its defeat or boss screens; the ranks screen compares the learner's place with the last visit regardless of week; the onboarding welcome has a mascot instead of a crown and now holds the learner on a new "welcome" step until they tap "Let's go" (Android back there goes to the app). Priority 3 is also unseen on a device. Previous revision: Priority 1: 4.1 level up, 4.2 rank up, 4.3 streak, 4.4 map unlock. Priority 2: 5.1 header counters, 5.2 Claim ready, 5.3 shop selection, 5.4 reactions, 5.5 right-answer tick, 5.6 daily fact XP flight, 5.7 Feed dot, 5.8 Start shine, with the shared parts they need (`Burst`, `Reveal`, `CountUp`, `PopOnce`, `PopWhen`, `FloatUp`, `ShineSweep`, `useDelayedClock`, `useTriggerClock`, the counter state machine, landing events on the claim bus; `test:burst`, `test:celebration`, `test:counter-pulse`, `test:feedback-fx`). Not built yet: `Settle` and `Celebration` as a general composition (§3), and everything in §6. Differences from the plan, priority 1: the option's own `OptionSurface` was left as it is (the pop is shared by calling the same core); badge text arrives with a reveal instead of a stamp; the level-up button has no shine; the node's progress ring does not draw itself; the unlock reveal is about 0.7 s. Differences, priority 2: (5.1) only `HeaderCurrency` follows the coins; the Profile and Games counters have no flight to follow and are unchanged; `emitFlight` became the existing `emitClaimFlight` with a `skipFill` option plus landing events, not a new function; (5.4) the pill's glyph pops at intensity 0.6, not 0.4, because it is only 22 dp tall; (5.6) the XP is now paid when the learner says "Got it" (or leaves the screen), not when the story opens, which also stops the button label flipping while the story is open; (5.8) the Home unit card has no Start button, so only the lesson preview got the shine. None of it has been seen on a screen or a device: timings, how the bursts sit inside the dialogs, frame rate, sound against picture, and the sparkles at the edge of shop and feed cells (a list may clip them) are all unchecked.
**Owner:** AtomIQ product, design and engineering
**Applies to:** `app/(tabs)/index.tsx` (Home), `app/(tabs)/profile.tsx`, `app/daily-streak.tsx`, `app/achievement-detail.tsx`, `app/shop.tsx`, `app/ranks.tsx`, `app/daily-facts.tsx`, `app/onboarding.tsx`, `app/mythbuster/index.tsx`, `app/explorer/atom-maze.tsx`, `components/quests/*`, `components/feed/ReactionRow.tsx`, `components/lesson/FeedbackDock.tsx`, `components/lesson/LessonPreview.tsx`, `components/path/LessonNode.tsx`, `components/shop/*`, `components/profile/*`, `components/ui/modal-dialog.tsx`, new shared parts in `components/motion/`
**Builds on:** `.claude/skills/duolingo-motion-style/` (the style, tiers and recipes; read it first), `components/motion/MOTION.md`, `docs/SFX_SPEC.md`, `docs/LESSON_VISUAL_SPEC.md`, and the four reference animations: option pop (`option-pop-core.ts`), node bubble (`bubble-motion-core.ts`), finish screen (`stamp-core.ts`, `stat-reveal-core.ts`), quest claim (`claim-fx-core.ts`)

## 1. Goal

The lesson run, the finish screen and the quest claim already have the app's "juicy but flat" motion. The rest of the app does not: **the biggest rewards in the app (level up, badge rank up, daily streak, unlocking the next lesson, buying an item) arrive with a fanfare sound and a static screen.** Other places that deserve a small response (header counters, the Claim button becoming ready, reactions, shop selection) have almost none, and some use default springs that wobble without a landing.

This spec lists where the motion language should go, what each moment should do (in the skill's tiers and recipes), what to leave alone, and the shared parts to build first so each moment is a few lines instead of a new system.

Principles (from the skill):
1. Frequency decides the budget. Rare, earned moments get the full treatment; things seen all day stay quiet or stay as they are (§8).
2. State changes at once, motion follows; the thing the learner must do next is never blocked behind a show.
3. Reuse a recipe before inventing one. Every item below names the existing piece it copies.
4. Each moment is a pure `*-core.ts` timeline with a `node --test` suite, one linear clock in the component, sound and haptic on the beat that means it, reduced motion shows the final frame.

## 2. What is there today (findings)

| # | Finding | Where | Evidence |
|---|---|---|---|
| F1 | Fanfare sound, static visual | Level-up dialog (Home), Badge ranked up dialog (Profile) | `reward.level-up` (1374 ms), `reward.rank-up` (2500 ms) play on open; the dialog body is an icon, a text line and a sentence |
| F2 | Daily streak is a fade-in list | `app/daily-streak.tsx` | `FadeInDown.delay(n).duration(380)` on three blocks, a looping Lottie flame, the number and today's check are static; `reward.achievement` (2115 ms) plays on mount |
| F3 | Unlocking the next lesson has a sound, no motion | Home map | `lesson.unlock` plays when `currentNodeId` changes; the completed node's check badge (`LessonNode` ~line 193) is static, the new current node does not announce itself |
| F4 | Counters do not react to what lands on them | `HeaderCurrency.tsx` | coins fly in and a ring flashes at the target, but the number just changes; no pulse, no per-landing tick-up |
| F5 | Default springs on reveals | `app/achievement-detail.tsx`, `app/onboarding.tsx` | `FadeInDown.delay(n).springify()` (the skill's "spring with default damping and no landing" anti-pattern); the badge itself does not move |
| F6 | The shop selects with an opacity change | `components/shop/ItemTile.tsx`, `app/shop.tsx` | pressed = `opacity: 0.7`, selected = a border colour; the preview avatar swaps instantly; `ui.equip` plays. Buying is not built yet (`reward.purchase` cue exists) |
| F7 | Claim becoming available is silent | `QuestRow` / `MissionsSection` | the button flips from disabled "Claim" to enabled "Claim +N" with no motion (the chest does have a ready nudge and `reward.chest-ready`) |
| F8 | Reading the daily fact pays XP with no flight | `FactStory.tsx` ("Got it · +N XP") | XP is added; the quest claim has coins flying to the counter, this does not |
| F9 | Reaction pop is a bare scale | `components/feed/ReactionRow.tsx` | `1 -> 1.2 -> 1` over `POP_MS`; no anticipation, no landing, nothing leaves the pill |
| F10 | Correct feedback is a slide-up only | `FeedbackDock.tsx` | `FadeInDown 180 ms`; the tick icon is static on both outcomes |
| F11 | Ranks is a static podium | `app/ranks.tsx` | podium blocks and rows appear at once, the learner's row is only tinted |
| F12 | Two result screens are hand-rolled | `app/mythbuster/index.tsx`, `app/explorer/atom-maze.tsx` | their own score pulse / explosion / result art; they do not use `Stamp` or `StatTile`, so a finished game feels different from a finished lesson |
| F13 | Idle attention is missing on the main call to action | `LessonPreview.tsx` Start button, Home lesson card button | static; the stat tiles on the finish page already have a shine that repeats every 4.6 s |
| F14 | A new Feed dot appears without a pop | `app/(tabs)/_layout.tsx` `dot` | rendered or not |

What is already right and should not be re-done: lesson option pop and shake, node bubble and launch, finish stamps and stat tiles, quest claim fill/burst/coins, chest open (sprite sheets), progress bar glide, `Toggle` thumb, `GrowModal` open/close, tab press scale, the daily-quest header currency landing targets.

## 3. Shared parts to build first (phase 0)

Most items below are the same four pieces. Build them once, in `components/motion/`, each with its core and test, extracted from the existing code so the originals keep behaving the same.

| Part | What it is | Extracted from | Used by |
|---|---|---|---|
| **`usePop(trigger)` + `<PopBand/>` + `<PopStar/>`** | The option-pop clock, face style and accents as a hook/pieces any pressable can use, so a tile, a chip or an avatar can pop when its state becomes selected/earned. `OptionSurface` becomes a user of it. | `cards/shared.tsx` (`OptionSurface`, `PopBand`, `PopStar`), `option-pop-core.ts` (`popAction`, `faceFrame`) | F6, F7, F9, F10, F13 |
| **`useCounterPulse(value)`** | Pulses a number (scale 1 to 1.12 to 1 in 200 ms with `bell`, at most once per 100 ms) and optionally ticks it up by the delta over the landings. | new, `bell` from `motion-core.ts`, ring from `landingRing` | F4, F3 (XP/diamonds), shop price, Profile |
| **`<Burst/>`** | Stars/dots out (ease-out), hang with seeded drift, gather (ease-in), plus the ring flash and two corner sparkles, around any hero element. | `stat-reveal-core.ts` (`starFrame`, `cornerStarFrame`, ring in `statFrame`) | F1, F2, F3, F5, F6 |
| **`<Celebration/>` composition** | The tier D body for dialogs and screens: a stamped title, a hero element that drops in and settles, `Burst`, an optional count-up, a pinned button that appears last. Takes slots, not art. | `Stamp.tsx`, `LessonFinish.tsx` timing (`FINISH_STAMPS`), `statStart` | F1, F2, F3 |
| **`emitFlight(from, to, kind)`** | Generalise `emitClaimFlight`: any origin (a measured rect) to any registered target (`xp`, `diamond`, plus `profile` tab), any count. Already almost there (`claim-fx-bus.ts`, `ClaimCoinLayer`). | `claim-fx-bus.ts` | F4, F8, F6 (purchase) |
| **`<Settle/>` entrance** | The replacement for `FadeInDown.springify()`: opacity plus a 12 dp rise over 220 ms, ease-out, no spring, staggered by 60 ms; reduced motion = plain fade 120 ms. | `FadeInDown.duration(...).easing(EASE_OUT)` already used by `FeedbackDock` | F5, F11 |
| **`<ShineSweep/>`** | The band of light on a loop: 700 ms sweep, 4.6 s repeat, with a first-delay, frozen with reduced motion and off-focus. | `StatTile.tsx` shine, `SHINE_SWEEP_MS`, `SHINE_REPEAT_MS` | F13, F7 |

Rules for phase 0: no behaviour change to the lesson run, finish or claim; their existing tests (`test:option-pop`, `test:stamp`, `test:stat-reveal`, `test:claim-fx`) keep passing unchanged. New cores get `test:pop`, `test:counter-pulse`, `test:burst`, `test:celebration`.

## 4. Priority 1: the big reward moments (tier D / C)

These have a sound already and are the biggest visible gap. Each total below is chosen to sit inside the sound it plays with (durations are in `services/sfx-core.ts`).

### 4.1 Level up (Home dialog)

- **Where:** `app/(tabs)/index.tsx` level-up `ModalDialog` (`levelUpLevel`); sound `reward.level-up` (about 1.4 s) plays when it opens.
- **Today:** crown icon, "Level N", a sentence, a yellow "Keep going" button.
- **Proposed (`Celebration`, about 1.4 s):**
  - The dialog grows in as now (`GrowModal`). The show starts when the grow settles, so nothing plays behind a moving card.
  - `0 to 400` crown **drops** like a stamp (1.6x, 7 degrees, `stampFrame`), squashes on contact (`STAMP_LANDS` at 140 ms is the `reward.level-up` hit: schedule the cue with `SfxOnMount delay` if its hit is not at 0).
  - `140 to 700` a `Burst` of 6 gold stars round the crown, and the ring flashes once.
  - `300 to 1000` "Level N" is **stamped** (tilt flipped), and the number counts from N-1 to N with `countValue` so the learner sees the level change.
  - `900 to 1300` the sentence fades in (tier A), then "Keep going" appears last with a single `ShineSweep`.
- **Tier:** D. **Sound/haptic:** existing `reward.level-up`; `notifySuccess()` on the crown's contact. **Reduced motion:** final frame (crown, "Level N", sentence, button).
- **Core/tests:** `components/motion/celebration-core.ts` timeline constants for this composition; `test:celebration` (title lands before the sentence, button last, final frame is the plain dialog).

### 4.2 Badge ranked up (Profile dialog)

- **Where:** `app/(tabs)/profile.tsx` "Badge(s) ranked up!" `ModalDialog` (`celebrationAwards`); sound `reward.rank-up` (2.5 s).
- **Today:** one row per badge: picture, title, requirement text.
- **Proposed (2.5 s, longer than 4.1 because the cue is):**
  - Each badge row enters one after another (400 ms apart, max 3 animated, the rest plain): the **old level's badge** shows, a ring fills around it (ease-in-out, 600 ms), the badge **pops** (`usePop` recipe: squash, spring up, hang, land) *as it changes to the new level's picture* (the picture flips on the first frame of the pop, not a cross-fade, rule 1), band of light and two sparkles cross it.
  - A `Burst` of stars in the badge's own colour at the hang.
  - Title text stamps; the requirement line fades in under it.
- **Tier:** D. **Sound/haptic:** `reward.rank-up`, `impactMedium` at the pop, one per badge. **Reduced motion:** new badge shown, no ring, no burst.
- **Reuse:** `AchievementBadge` (`components/achievements/`) draws the badge; wrap it, do not redraw it.

### 4.3 Daily streak screen

- **Where:** `app/daily-streak.tsx`; sound `reward.achievement` (about 2.1 s) and `notifySuccess()` already fire on mount.
- **Today:** `FadeInDown` on the headline, the card and the footer; a looping Lottie flame with the streak number printed on it; the mascot settles from 0.94; today's cell is a static tick.
- **Proposed (about 2.1 s, then idle):**
  - `0 to 500` flame **drops** in from above the page (stamp curve), the Lottie starts on landing; the streak number counts from `streak - 1` to `streak` and **pulses** with the flame (`bell`, +12%).
  - `400 to 900` headline stamps (not a slide), the sub line fades.
  - `700 to 1500` the week row: past days' ticks appear one by one (60 ms apart, tick circle pops from 85%), then **today's** tick **pops** like an option (the one main action of the card) with a ring and two sparkles.
  - `1500 to 2100` Continue rises last. The streak-milestone days (7, 30, 100; `isMilestone` helper in a new core) add a second `Burst` around the flame.
- **Tier:** C (D on a milestone). **Sound/haptic:** unchanged cue, but moved to the flame's landing; `impactLight` on today's tick. **Reduced motion:** final frame, flame holds one frame (already done).
- **Not changed:** the Lottie art and the theme-allow colours for the number.

### 4.4 Lesson done, the next node unlocks (Home map)

- **Where:** `app/(tabs)/index.tsx` (the `lesson.unlock` effect on `currentNodeId`), `components/path/LessonNode.tsx`, `NodeBubble`, `unit-theme.ts`.
- **Today:** sound only. The completed node's check badge is static; the new current node just has the ring.
- **Proposed (about 1 s, on returning to the map after a finish, never on first load; keep the existing "first value is not an unlock" rule):**
  - The node that was just completed: its check badge **stamps in** (tilt flip, 140 ms drop, squash) with a single ring.
  - The next node: face **pops** (`usePop`, same recipe as an option; it is the one main action), the progress ring draws from 0, the lock glyph (if it was locked) is replaced at the first frame of the pop, a band of light crosses the face once.
  - The map scrolls so the new current node is in view first (tier A, 300 ms), the pop starts after that.
  - One Fireflies burst (existing `Fireflies` clock restarts) is optional; do not add particles beyond the pop's two sparkles.
- **Tier:** C. **Sound/haptic:** `lesson.unlock` on the next node's contact; `impactLight`. **Reduced motion:** states change, no pop.
- **Core/tests:** `components/path/node-unlock-core.ts` (re-uses `faceFrame`); extend `test:path-nodes`.

### 4.5 Unit completed (not reviewed in code)

A unit finishing (all its nodes, the checkpoint) is the biggest progress moment on the map and `UnitDivider` / the unit card are the natural stage. Not enough read to spec it; see §9. Proposed shape: the §4.1 composition on the unit card in the unit's own colour (`unit-theme.ts`), once.

## 5. Priority 2: small responses to things happening all the time (tier B / A)

| # | Moment | Change | Recipe | Notes |
|---|---|---|---|---|
| 5.1 | **Header counters** (XP, diamonds; `HeaderCurrency.tsx`, also Profile and Games) | When a coin lands (`landingRing` time), the number ticks up by that coin's share and the icon pulses 1 to 1.12 to 1 in 200 ms. At most one pulse per 100 ms. Ring already exists. | `useCounterPulse` | Tabular numerals already used. Sound stays `ui.tick` stepped per coin. Reduced motion: number changes, no pulse. |
| 5.2 | **Claim becomes ready** (`QuestRow`, `MissionsSection`) | When progress reaches target the button flips at once and **pops once** with the band of light and one sparkle; then a `ShineSweep` every 4.6 s while it waits. Stops when claimed or the screen loses focus. | `usePop`, `ShineSweep` | Only on the change, never on mount (same rule as `reward.chest-ready`). Keep the chest's own nudge. |
| 5.3 | **Shop tile selected** (`ItemTile.tsx`) | Selecting a tile pops it (squash, up, land) and its border colour flips at once; the avatar preview swaps look with a small squash and a band across the avatar (`Avatar` crop), one sparkle. Deselecting does not pop. | `usePop` | Sound `ui.equip` / `ui.unequip` already; add `select()` haptic. Remove the `opacity: 0.7` pressed state in favour of the 4 dp press sink. |
| 5.4 | **Reaction** (`ReactionRow.tsx`) | The pill pops with the option recipe (scaled down: 40% of the vertical offset, no band) and 3 small icons of the reaction float up 24 dp and fade (500 ms, seeded x offsets). Picker items rise in 40 ms apart. Removing a reaction only fades. | `usePop`, `Burst` (3 items) | Sound `reward.pop` with its per-reaction `rate` stays. Tier B, keep short (under 500 ms). |
| 5.5 | **Correct answer sheet** (`FeedbackDock.tsx`) | On a correct answer the tick icon **pops** from 85% with two sparkles (tier B); the title does not move. A wrong answer keeps its quiet slide (the option already shook). | `usePop`-lite | The dock is seen on every card: no particles beyond the two sparkles, under 300 ms for the slide as now. |
| 5.6 | **Daily fact read** (`FactStory.tsx`, `DailyFactCard.tsx`) | "Got it · +N XP" first claim of the day: coins fly from the button to the XP counter (`emitFlight`) and the counter pulses (5.1). Already-claimed facts show no flight. | `emitFlight` | Save on the first landing, as in `claim-fx-core` (`CLAIM_AT`). |
| 5.7 | **Feed tab dot** (`app/(tabs)/_layout.tsx`) | The dot pops in from 85% (180 ms, ease-out) when the unseen count goes 0 to above 0; never on mount. | `usePop`-lite | Layout does not move (the dot sits over the icon already). |
| 5.8 | **Start / Continue buttons** (`LessonPreview.tsx`, Home lesson card) | After 2 s of waiting, one `ShineSweep` every 4.6 s on the main button; press sink as now. Stops when pressed or off focus. | `ShineSweep` | Seen once per lesson, so one quiet loop is fine. Do not add it to other buttons. |

## 6. Priority 3: purchases and reveals

### 6.1 Shop purchase (when buying is built)

`app/shop.tsx` is UI only; `reward.purchase` (about 0.9 s) and the wallet exist. When purchase is built, the motion should be ready:
- **Buy press:** the price button sinks (4 dp), the diamond icon in the price **flies** to the wallet counter as a magnet flight of 1 coin (`emitFlight`, kind `diamond`, reversed: from the counter's icon to the item), counter ticks down (not up) and pulses.
- **Item arrives:** tile **pops**, a `Burst` in the item's colour, "Owned" stamps in over the price (140 ms drop), then a one-time `ShineSweep`.
- **Equip:** the avatar squashes and pops as the new part appears; `ui.equip`.
- **Not enough diamonds:** the price shakes (`SHAKE`) and turns red at once; `notifyError`; no dialog.
- **Tier:** C for the purchase, B for equip and the shake.

### 6.2 Achievement detail (`app/achievement-detail.tsx`)

Replace the five `FadeInDown.delay(n).springify()` wrappers with `<Settle>` (60 ms stagger, no spring). The big badge **stamps in** once (tier C) with the ring fill ending on the earned level and a `Burst` only when this level was just earned (`justEarned`, from the same data that triggers 4.2). `social.achievement-scroll` stays on the scroll.

### 6.3 Ranks (`app/ranks.tsx`)

- The three podium blocks **rise** from their base in order 3rd, 2nd, 1st (200 ms apart, ease-out, 320 ms each), and the head on each lands with a small squash at the end of the rise; first place gets one sparkle.
- The learner's row (or podium place) pops once when the screen opens if their position **changed since the last visit** (store last rank; arrow icon up/down fades in); otherwise it only has the tint.
- Rows themselves: `<Settle>` stagger for the first 8, the rest plain. Tier B/C, weekly screen, seen rarely.

### 6.4 Result screens of the games (Myth Buster, Atom Maze)

`app/mythbuster/index.tsx` (`results` state) and `app/explorer/atom-maze.tsx` (`complete`) keep their own art and colours (the maze's are `theme-allow` exceptions). Change only the **sequence**: the title and the score line **stamp** (`Stamp`, `FINISH_STAMPS` timing), the stat numbers use **`StatTile`**-style reveal with count-up (reuse `statStart`, `STAT_STEP`), then the result cards or buttons appear. A finished game then feels like a finished lesson. Keep Myth Buster's swipe deck, score pulse and lose explosion as they are. Tier C.

### 6.5 Onboarding (`app/onboarding.tsx`)

> Superseded 2026-11-19 by `docs/ONBOARDING_SPEC.md`, which replaces the three-card tour with a nine-step flow; the paragraph below describes the earlier revision.

Replace `FadeInDown.springify()` on the mascot, hero card and bottom area with `<Settle>`; the mascot lands with a stamp drop on the splash step (once). The final "profile" step's completion (`lesson.complete` sound) plays the §4.1 composition with a welcome line instead of a crown. Tier C, shown once in the app's life.

## 7. Timeline numbers to settle in implementation

Start from the skill's recipes; adjust after seeing it on a device.

| Moment | Total | Beats |
|---|---|---|
| Level up | 1400 ms | crown drop 0 to 400, burst 140 to 700, title stamp 300 to 700, count 300 to 1000, sentence 900, button 1300 |
| Rank up (per badge) | 900 ms, 400 ms apart | ring 0 to 600, pop 500 to 1070, burst at hang, text 800 |
| Streak | 2100 ms | flame drop 0 to 500, count 100 to 700, headline 400, week ticks 700 to 1500 (60 ms apart), today pop 1200, Continue 1500 |
| Node unlock | 1000 ms | scroll 0 to 300, check stamp 300 to 700, next pop 400 to 970, ring draw 500 to 1000 |
| Counter pulse | 200 ms | 1 to 1.12 to 1, min gap 100 ms |
| Claim ready pop | 567 ms | the option pop; shine repeats 4.6 s |
| Reaction | 480 ms | pop 0 to 340 (scaled), icons float 100 to 480 |
| Purchase | 1600 ms | flight 0 to 650, tile pop 650 to 1217, owned stamp 800 to 1200 |
| Podium | 1000 ms | 3rd 0, 2nd 200, 1st 400 (320 ms each), heads land at each end |

## 8. Leave alone (on purpose)

Frequency says these stay quiet. Do not add pops, particles or sounds:
- Tab switches, screen headers, list scrolling, card entrances, filters, search (tier A already).
- Reference screens: Periodic Table (`app/periodic-table/*`), Encyclopedia (`app/encyclopedia.tsx`, `app/explorer/encyclopedia*.tsx`), Settings rows, Terms and Privacy. `Toggle`'s thumb glide stays.
- Modal open and close (`GrowModal` is right). Only a modal's *celebration body* gets the tier D treatment.
- Lesson cards and the lecture page typing; the progress bar glide and sparkle; the lesson option pop and shake (finished).
- Text of NPC feed posts, blog reading, Guide chat (not reviewed; see §9).
- Idle loops: only the ones already named (chest nudge, stat shine, fireflies, Shrodi) plus the Start button shine (5.8). No new decorative loops elsewhere.

## 9. Not reviewed

Read only by name or grep, so not specified here: `app/(tabs)/chat.tsx` (Guide: message send, pills), `app/lab/index.tsx`, the internals of `app/explorer/atom-maze.tsx` and the Myth Buster game (only the end states and the existing score and lose effects), `components/profile/PassportCard.tsx` (it already animates the level bar), `components/streak/Flame.tsx`, the unit card and `UnitDivider` for a unit-complete moment (§4.5), `components/guide/*`, and dark-mode appearance of anything proposed. Review these before adding them to a later revision.

## 10. Phases

| Phase | Scope | Gate |
|---|---|---|
| 0 | Shared parts (§3): `usePop` and pieces, `useCounterPulse`, `Burst`, `Celebration`, `emitFlight`, `Settle`, `ShineSweep`, each with a core and test; `OptionSurface` moved onto `usePop` with no visible change | existing tests still pass; new `test:*` pass |
| 1 | Level up (4.1), streak (4.3), rank up (4.2) | seen on a device with sound; durations match their cues |
| 2 | Counters (5.1), Claim ready (5.2), node unlock (4.4), fact flight (5.6) | one claim end to end: counter ticks per coin, saved on first landing |
| 3 | Shop selection (5.3), reactions (5.4), feedback tick (5.5), Feed dot (5.7), Start shine (5.8) | frame-rate check on a mid-range Android with the shop grid scrolling |
| 4 | Achievement detail (6.2), ranks (6.3), game results (6.4), onboarding (6.5) | `Settle` replaces every `springify()` in `app/` |
| 5 | Purchase (6.1), after buying exists | with the wallet service and `reward.purchase` |

Every phase: `npm run typecheck`, `npm run lint`, `npm run check:theme-colors`, the new `test:*`, `npm run check:sfx` if a cue is added, and a short screen recording of each moment in light and dark, with reduced motion on once. Add each finished piece to `.claude/skills/duolingo-motion-style/reference/catalog.md`, one sentence to `CLAUDE.md`, and register any colour exception in `docs/THEME_EXCEPTION_REGISTER.md`.

## 11. Risks and open questions

1. **Dialogs are the house `ModalDialog`** (`GrowModal`). Celebration bodies must start after the grow settles and must not make the card change size (reserve every slot, the way an option reserves its mark). If that proves clumsy, a celebration may become a full-screen route like `daily-streak.tsx`; that is a design decision, not a code one.
2. **Sound alignment.** The cues are 0.9 to 2.5 s long and some have their hit later than 0. Check each cue's hit point by ear before fixing `*_LANDS` constants; schedule the cue with `<SfxOnMount delay>` or a `setTimeout` off the core's landing constant, as `LessonFinish.tsx` does (`playSfx` itself takes no delay).
3. **Particle count on low-end Android.** Cap at about 24 animated views on screen at once; `Burst` should draw its stars in one `Svg` if the count grows.
4. **Counter pulses and the claim flight** both touch `HeaderCurrency`; build `useCounterPulse` and `emitFlight` together so the number cannot tick before the coin lands.
5. **Restraint.** Phase 3 touches things seen constantly (feedback sheet, reactions, shop tiles). If a change feels like noise on the device, cut it rather than tune it; the tier table in the skill is the tie-breaker.
6. **Reduced motion and sound.** Verdict sounds and haptics remain on with reduced motion; decorative ones (ticks per coin, sparkles) follow the existing media policy (`docs/MEDIA_POLICY.md`).
7. **Is the streak screen a full route or a dialog on the map?** It is a route now and this spec keeps it so.
