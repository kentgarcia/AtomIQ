# AtomIQ: Tutorial Specification (Shrodi's tour)

**Status:** First pass BUILT 2026-11-20 (phases 0 to 3: `test:tutorial`, `test:tutorial-fx`, `check:tutorial`, typecheck and the related gates pass; **never seen on a screen or a device**, so the device pass in §12 is still open). Built: the catalog and rules (`services/tutorial-core.ts`), the store and runtime (`services/tutorial.ts`), the overlay (`components/tutorial/`), both layer hosts, the three chapters and the five screen intros, the lesson redirect, the diamond reward (5), the Settings rows, the Delete Account wipe. Where the build differs from the draft, §14 says how.
**Owner:** AtomIQ product, design and engineering
**Applies to:** new `components/tutorial/` (`TutorialLayer`, `Spotlight`, `TutorialBubble`, `tutorial-fx-core.ts`, `use-tutorial-target.ts`), new `services/tutorial-core.ts` (framework-free: catalog, rules, SQL), `services/tutorial.ts` (runtime), `hooks/use-tutorial.ts`, a `tutorial_steps` table in `services/local-first/schema.ts`, `app/_layout.tsx` (the layer is mounted here), `app/(tabs)/_layout.tsx` (tab targets), `app/(tabs)/index.tsx` (Home targets), `components/lesson/LessonPreviewLayer.tsx` (a second layer host), `components/ui/modal-dialog.tsx` (the "busy" signal), `app/settings.tsx` (two rows), `services/database.ts` (Delete Account wipe), and a one-line `useTutorialTarget` in each screen that gets a beat.
**Builds on:** `docs/features/ONBOARDING_SPEC.md` (the tour starts where onboarding ends), `docs/features/PHONE_SPEC.md` (the phone's hand-over line and install moments), `docs/features/NPC_FEED_SPEC.md`, `docs/features/PLATFORMER_SPEC.md` (its sign bubbles are the model for short lines), `components/mascot/` (Shrodi), `components/onboarding/ShrodiSays.tsx`, `components/motion/` and `docs/features/MICRO_INTERACTION_SPEC.md`, `.claude/skills/duolingo-motion-style/`, `components/motion/MOTION.md` (project rules win over the skill).

## 1. Goal

Onboarding ends on a welcome and drops the learner on the Home map. Nothing yet tells them *what to do next*, and the app has six tabs and a phone full of apps. This spec adds **Shrodi's tour**: an overlay that dims the screen, lights up only the part that matters (that part, and only that part, can be touched), and has Shrodi say one short thing.

It does three jobs:

1. **Walk the learner through the first loop**, in order: first lesson, then the Feed, then the Phone.
2. **Coach each other screen once**, the first time the learner opens it (Quests, Profile, Games, Shop...), in one to three beats.
3. **Never lose its place.** Every step is recorded as it is done, so if the learner is interrupted anywhere (app killed, lesson left half way, phone call), the tour comes back on that exact step.

Principles:

1. **Quick.** One sentence a beat (12 words at most), a chapter is three beats or fewer, the whole first tour adds about 30 seconds on top of the lesson. If a beat is not worth five seconds, it is cut.
2. **Learn by doing, gacha style.** The model is the guided tutorial of a mobile gacha game (Genshin Impact, Honkai: Star Rail, Pokémon Masters): the screen dims, one control glows with a pointing hand on it, the mascot says a short line, and **the only thing that works is the lit control**, so the learner does the real action on the real control. One new thing at a time, a few words, quick chained beats, a payoff at the end. Reading is the fallback, not the method.
3. **Fun.** Shrodi changes mood a beat at a time, the spotlight glides and pulses, each finished beat gets a small burst, a finished chapter a cheer and a reward. Same motion language as the rest of the app (§8).
4. **Never a trap.** There is always a small Skip, Android back always works, nothing blocks a lesson in progress, a dialog or a celebration.
5. **Derived where possible.** What the learner has already done (finished lesson 1) is read from progress, never asked again. Only the tour's own steps are stored.
6. **Offline, local, private.** No network, no new permission, wiped by Delete Account.

### Non-goals

- Anything inside a lesson run or a platformer level. Lessons already teach with their own teacher; the Atom Maze already teaches with its signs. The tour gets the learner *to* them.
- Video, voice-over or tooltips with images. Shrodi's bubble and the highlighted thing are the whole UI.
- A help centre. Replay lives in Settings (§9); there is no tutorial list screen.
- Generated text. All lines are fixed and reviewed (§5).
- Changing any reward rule beyond the one chapter bonus (§7).

## 2. Current baseline

- Onboarding is nine steps ending on `welcome`, which `router.replace("/(tabs)")` to Home. `(tabs)/_layout.tsx` redirects to `/onboarding` while `onboardingCompleted` is false. Onboarding already played two real lesson-1 questions, so the learner has met a card, but has never seen the map.
- Home node → speech bubble → release → `LessonPreviewLayer` (a transparent RN `Modal` around `LessonPreview`) → Start or Review → `/lesson/<id>?autostart=1&resume=continue|again`. A saved half-finished lesson is asked about *inside* the preview modal (`ResumeLessonOverlay`).
- Lessons save after every card (`lesson_runs`, `lesson-progress-core.ts`); the Home ring adds the saved part.
- Completing a node writes a `levels` row, posts to the Feed at once, adds the unit's teacher to Contacts (`getContactTeacherIds`) and can unlock phone apps and story threads. Level-ups and badges celebrate on Profile in `ModalDialog`s.
- The Phone tab already has a one-time Shrodi hand-over (`STORAGE_KEYS.PHONE_INTRO_SEEN`) and per-app install moments (`phone_seen`).
- Shrodi is `components/mascot/Shrodi.tsx` with eight moods (`idle wave happy cheer think oops wow smile`); `ShrodiSays` is the fox beside a typing bubble.
- Preferences live in `STORAGE_KEYS` (AsyncStorage); progress and "has seen" flags live in the user-state DB (`phone_seen` is the model for a seen-table).
- There is no overlay that can leave a hole to touch through. A `Modal` is its own native window and swallows every touch, so the dimmer cannot be a `Modal`.

## 3. The model: chapters, screen intros and beats

A **beat** is one spotlight and one Shrodi line. Beats are grouped two ways:

| Kind | What it is | Order | Resume |
|---|---|---|---|
| **Chapter** (guided) | A short fixed run of beats that moves the learner through the app. Chapters run in order and each waits for the last. | `first-lesson`, `feed`, `phone` | Yes: comes back to the beat the learner was on (§6) |
| **Screen intro** | One to three beats the first time a screen is opened. Independent of each other. | Whenever the learner first visits | Only "seen or not" |

A beat in the catalog (`tutorial-core.ts`, pure data):

```ts
interface Beat {
  id: string;                 // "first-lesson.node": never renamed or reused once shipped
  screen: ScreenId;           // where it shows: "home" | "preview" | "feed" | "phone" | "quests" | ...
  host: "root" | "preview";   // which layer draws it (§4.4)
  target?: TargetId;          // what is lit; no target = Shrodi alone, centred, no hole
  say: string;                // 12 words at most
  mood: Mood;
  mode: "tap" | "look";       // tap: the learner presses the real control. look: Shrodi's "Got it" button
  until?: TutorialEvent;      // for "tap": the event that completes it (§6.2)
  stable: boolean;            // false when the lit thing is transient (a bubble, a preview): resume goes back to the last stable beat
  shape?: "round" | number;   // hole corner radius, default from the target
}
```

A chapter is `{ id, trigger, beats, goal?, reward? }`. Triggers are `after-onboarding`, `chapter-done:<id>` and `lesson-done:<first lesson>`; a screen intro's trigger is `first-focus:<screen>`.

## 4. The overlay

### 4.1 Layers

`TutorialLayer` is mounted once in `app/_layout.tsx`, as an absolutely-filling sibling **above** the `Stack` (not a `Modal`). It draws, bottom to top:

1. **The dim**: plain `View`s, **no SVG and no mask** (this project has already met SVG rendering differences on device, EX-10). One `View` is sized to the hole plus a very large border `B` (at least the screen's longer side), with `borderColor` the theme's scrim colour (the one modal scrims use, through `withAlpha`, so `check:theme-colors` passes) and `borderRadius = B + r`. The border *is* the dim, and its inner edge is a rounded hole of radius `r`; the outer corners are far off screen. Position, size and `r` are Reanimated values, so the hole glides. It is one view, so the alpha has no overlap seams. A beat with no target uses a plain full-screen `View` in the same colour. `pointerEvents="none"`. (Whether Android and iOS both draw the inner radius of a very wide border the same way is the first thing the device pass checks, §12; the fallback is four plain rectangles with square corners.)
2. **Four touch strips** (top, bottom, left, right of the hole): transparent `Pressable`s that swallow touches. **The hole itself has no view over it**, so a tap there reaches the real control underneath. That is the whole trick: "only the highlighted part is interactable".
3. **The ring and the hand**: a lit outline round the hole that pulses, and on every `tap` beat a flat pointing hand (AtomIQ's own art, drawn like the other `Aq` pictures) that bobs toward the lit control, the way gacha tutorials do (§8). Both `pointerEvents="none"`.
4. **Shrodi and his bubble** (`TutorialBubble`, §4.3), above or below the hole, and a small "Skip tour" text at a screen corner.

A tap on a strip is a **nudge**, not a dismiss: the ring flashes once and the bubble gives a small shake (`Shake`). While the hole is gliding to a new target (260 ms) one full-screen strip blocks everything, so no tap lands on a half-moved hole.

A `look` beat has the same dim and hole, but the strips also cover the hole: the only live control is Shrodi's "Got it".

### 4.2 Targets

```ts
const t = useTutorialTarget("home.node.current"); // { ref, onLayout }
<Pressable ref={t.ref} onLayout={t.onLayout} ... />
```

A target registers its view in a registry (`target-registry.ts`) keyed by `TargetId` (`home.node.current`, `tab.feed`, `tab.phone`, `feed.reaction`, `phone.app.chats`, `quests.chest.daily`, `profile.shop`...). While a beat is active the layer measures the view with `measureInWindow` every 100 ms (one view, cheap), so a node that is popping, a list that is still scrolling or a layout that moved is followed by the hole. When the target is not on screen (a scroll view), the layer asks the screen to scroll it in (`scrollIntoView` registered with the target) and waits.

**Lit in place by default, cloned only when it must be.** The real control is lit where it is, so nothing is duplicated and nothing drifts from the real UI. A target may opt in to a **clone** (`useTutorialTarget(id, { clone: () => <Thing .../> })`): the layer draws that element above the dim at the measured rectangle, and its press calls the real handler. Use it only where lighting in place cannot work: a control inside a moving scroll view that must hold still, or a transient piece (the Home bubble, a preview button) that would otherwise need its own host (§4.4). Every other target stays in place. The clone is a render prop of the real component with the same props, never a redrawn copy.

**Fallback, never a dead end:** if a target has not appeared after 1.5 s the beat is shown as Shrodi alone, centred, as a `look` beat. If a `tap` beat's real control is somehow unreachable, "Got it" is offered after 3 s and records the beat as `skipped`, not `done`.

### 4.3 Shrodi and the bubble

`TutorialBubble` is the compact cousin of `ShrodiSays`: fox about 64 dp, one bubble, a tail pointing at the hole. The sentence types out quickly (the platformer sign's rate, a tap finishes it), no blips. It sits on the side of the hole with room (`chooseBubbleSide` in `node-bubble-core.ts` is the model: below, else above, else centred). For a chapter it shows small progress dots (`● ○ ○`). Text scales with the system font size; the bubble grows, the hole does not.

### 4.4 Two hosts

The lesson preview is a `Modal`, which sits **over** the root layer, so the Start button cannot be lit from the root. `TutorialLayer` is a component over one shared store, so it is mounted a second time **inside** `LessonPreviewLayer`'s modal (`host: "preview"`). A beat names its host; only the matching layer draws it. Any future modal that holds a target gets its own host the same way. (Modal and root coordinates can differ by the status bar on Android; verified in the device pass, §12.)

### 4.5 When the layer stays out of the way ("busy")

The layer hides, and the tour holds its place, while any of these is true; it returns 400 ms after the last one clears:

- A `ModalDialog` is open (level-up, badge, streak, any dialog): `ModalDialog` reports mount and unmount to a small `tutorialBusy` counter. Celebrations are `ModalDialog`s, so they always win.
- The keyboard is open.
- The route is not the beat's `screen` (the learner backed out). Coming back shows it again.
- The route is a lesson run, practice, a game level, onboarding or the Dev screens.
- `TUTORIAL_ENABLED` is off, or reduced motion is on and the beat is a `tap` beat that needs a glide (it then simply jumps; it is never skipped).

Android back is never intercepted. It does what it does today, and the beat's own `screen` rule decides whether the overlay is still showing.

## 5. The tour, beat by beat

All lines are fixed copy in `tutorial-core.ts` (decision D1: TypeScript like the phone catalog and the onboarding lines, not the content DB, because they are tied to screen targets). Copy is a first draft to tune in playtest. Moods in brackets.

### 5.1 Chapter `first-lesson` (trigger: after onboarding)

| # | Screen | Lit | Shrodi says | Completes when | Stable |
|---|---|---|---|---|---|
| 1 | Home | the current node | "This is your path. Tap the first circle!" [wave] | `node-bubble-opened` | yes |
| 2 | Home | the bubble's button | "Press it to peek inside." [happy] | `preview-opened` | no |
| 3 | Home (preview host) | the Start button | "Start your first lesson!" [cheer] | `lesson-started` | no |

After beat 3 the chapter is **waiting for its goal**: lesson 1's `levels` row. The overlay stays out of the lesson. A learner who finishes the lesson ends the chapter; one who leaves half way gets the resume in §6.3.

### 5.2 Chapter `feed` (trigger: first lesson done, back on Home)

Waits for the map's own unlock moment (the node stamps, the next one pops) and any celebration, then 600 ms.

| # | Screen | Lit | Shrodi says | Completes when |
|---|---|---|---|---|
| 1 | Home | the Feed tab (it has its dot) | "Nice! Your teachers noticed. See what they posted." [happy] | `tab-feed-opened` |
| 2 | Feed | the first post's reaction pill | "Tap the heart to react!" [smile] | `reaction-opened` |

Feed posts are made the moment a lesson completes, so a post about the lesson is there. If the Feed is empty (the learner switched Feed posts off), beat 2 falls back to a `look` beat on the page.

### 5.3 Chapter `phone` (trigger: `feed` done)

| # | Screen | Lit | Shrodi says | Completes when |
|---|---|---|---|---|
| 1 | Feed | the Phone tab | "Now check your phone." [wave] | `tab-phone-opened` |
| 2 | Phone | the Chats icon (its badge) | "Ada wrote to you. Tap Chats!" [wow] | `app-opened:chats` |

This chapter **replaces** the Phone's one-time Shrodi hand-over while the tour is on: beat 2 *is* the hand-over, and finishing it also sets `PHONE_INTRO_SEEN`, so the learner never sees both. An app install moment that is playing finishes first (it is not interrupted).

When the last beat completes the guided tour is done: Shrodi cheers, a burst, the chapter reward (§7), the dim fades.

### 5.4 Screen intros (once, on first focus, only after `first-lesson` is done)

| Screen | Beats | Lit, in order |
|---|---|---|
| Quests | 2 | the daily chest ("Finish quests to open chests.", look), the first quest row ("Claim your XP here.", look) |
| Profile | 2 | the avatar's Shop button ("Dress up your avatar!", tap, opens the Shop), the badges row ("Badges go here.", look) |
| Shop | 1 | the item grid ("Tap an item to try it on.", look) |
| Games | 2 | the Atom Maze card ("Run, jump, answer.", look), the Myth Buster card ("Fact or myth? Be quick.", look) |
| Atom Maze map | 1 | level 1's stop ("Start here. The signs will teach you.", tap, opens the level; its own signs take over) |

Rules for intros: at most **one intro per screen visit**; an intro never starts within a chapter's beat or while the learner is mid-chapter; the Home tab has no intro (chapter 1 is its intro). A new screen gets an intro by adding a catalog entry and one `useTutorialTarget` per beat. Later units' own apps can add theirs.

## 6. Every step is recorded

### 6.1 What is stored

One table in the user-state DB, in the shape of `phone_seen` (local-first columns included):

```sql
CREATE TABLE IF NOT EXISTS tutorial_steps (
  step_id TEXT PRIMARY KEY,         -- a beat id, or "<chapter>.goal"
  status  TEXT NOT NULL,            -- 'done' | 'skipped'
  at      INTEGER NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT 0, synced_at INTEGER, is_dirty INTEGER DEFAULT 1,
  deleted_at INTEGER, version INTEGER DEFAULT 1
);
```

A beat is written **the instant its real action happens** (the `until` event), not when it was shown. So the learner who sees beat 2 and kills the app has beat 1 recorded and beat 2 not, and comes back to beat 2. Writes go through one queue, like `lesson-runs.ts`, so a quick succession cannot land out of order. The "current beat" is never stored: it is the first beat of the first unfinished chapter (or screen intro) whose conditions hold, worked out by a pure function `nextBeat(catalog, progress, record, ctx)`.

Preferences are AsyncStorage keys: `TUTORIAL_ENABLED` (default on) and `TUTORIAL_SEEN_VERSION` (reserved).

### 6.2 Events

Screens report what the learner did with `emitTutorial("preview-opened")`, in the manner of the feed's `emit*` hooks: one line at the choke point, never throws, does nothing when the tour is off. Navigation beats (`tab-feed-opened`) are derived by the layer from the route, so tab code does not change. Beat ids and event names are a closed union in `tutorial-core.ts`; `check:tutorial` fails when a beat names an event that nothing emits or a target nobody declares.

### 6.3 Coming back after an interruption

| Where the learner was | When they return |
|---|---|
| Killed the app on a stable beat | That beat, lit again, after the splash and `ContentGate` |
| Killed it on an unstable beat (bubble or preview open) | The last stable beat before it (Home, node lit); the transient screens are not recreated |
| Left lesson 1 half way (chapter waiting on its goal) | **Redirected into the lesson**: the app pushes `/lesson/<id>?autostart=1&resume=continue` (the saved run, so the card, the answers and the bar are where they left them). Home is underneath, so Back lands on the map |
| Finished lesson 1 but left before the Feed beat | The `feed` chapter, beat 1, on Home |
| Mid-chapter, on another screen | Nothing, until they are back on the beat's screen (the overlay is bound to its route) |

The lesson redirect fires **once per app session** (a cold start, or foregrounding after 5 minutes away), never on in-app navigation, so it can not fight the Back button or loop. If the saved run was dropped (the lesson's cards changed) the redirect starts the lesson from card 1. A learner who tapped Skip is never redirected.

### 6.4 Existing learners and edge cases

- **Already past it.** On the first launch of the tutorial, an `onboardingCompleted` learner with at least one finished lesson gets all three chapters recorded `skipped` (they know the app). Screen intros still show once, because they are short and new to them.
- **Goal already met.** A chapter whose goal is already true when it would start (lesson 1 already finished) is recorded `done` without being shown.
- **New chapters in an update** are just rows nobody has; a finished tour is never reopened. Ids are never reused.
- **Skip tour** marks every unfinished chapter beat `skipped` and stops redirects; screen intros stay unless the learner turns Tips off.
- **Delete Account** wipes `tutorial_steps` and resets both preferences, so the next onboarding starts the tour again.
- **Replay** (§9) deletes the chapter rows (and, separately, the intro rows).

## 7. Reward

Finishing the guided tour pays a one-time **diamond bonus of 5** (in `services/wallet.ts` through the existing path), shown with the existing diamond burst to the counter (`ClaimCoinLayer`, `kind: "diamond"`). No XP, so `xp-core.ts` is untouched and replaying the tour never pays twice (the reward row is `tutorial.reward` in `tutorial_steps`). Screen intros pay nothing; they are help, not a task.

## 8. Motion and sound

Built from the existing pieces (`Burst`, `PopOnce`, `Shake`, `settle`, `cascade-fx`), with one pure timeline file `tutorial-fx-core.ts`, one linear clock, and a `node --test` suite (`test:tutorial-fx`).

| Moment | Move |
|---|---|
| Overlay arrives | dim fades 0 to scrim in 200 ms; hole already in place |
| Shrodi and bubble | fox pops 0.5 to 1 with a small overshoot at 120 ms; bubble pops 0.35 to 1 in 200 ms, no overshoot, from the fox's side; text types after the pop |
| Hole between beats | rectangle and radius glide 260 ms, ease-out; the bubble follows |
| Ring | pulses (scale 1 to 1.06 and fade) on a 1.2 s loop while a `tap` beat waits; one clock for the layer |
| Pointing hand | on a `tap` beat it bobs toward the control (about 8 dp, 700 ms loop, same clock as the ring) and presses down once as the learner taps; none on a `look` beat; still with reduced motion |
| Beat done | ring bursts (small `Burst`, four-point sparkles), 120 ms hold, then the next beat |
| Nudge (dim tapped) | ring flashes once, bubble shakes (`shake-core.ts`) |
| Chapter done | Shrodi `cheer`, bigger burst, the reward flies if there is one, dim out 200 ms |
| Dismiss | dim and bubble fade 160 ms; Shrodi shrinks a little as he goes |

Interface moves stay under 300 ms, ease-out. **Reduced motion:** the hole jumps, nothing pops, text appears whole, the ring is a still outline. **Frozen when not focused**, like Shrodi elsewhere.

Sound: reuse the existing cues (`lesson.bubble` for the bubble pop, `reward.pop` for a done beat, a soft existing cue for the nudge), all through `playSfx`. No new sound file in v1. Pick the exact cues in the build and list them in this file.

## 9. Settings

Two rows in a "Tutorial" group on Settings (the Feed posts switch is the pattern):

- **Tips from Shrodi**: a switch on `TUTORIAL_ENABLED`. Off hides the layer and every intro. Chapter progress is kept, so turning it on resumes.
- **Replay the tour**: asks in a `ModalDialog`, clears the chapter and intro rows (not the reward), and returns to Home where `first-lesson` begins again. Beat 3 and the lesson redirect behave as for a new learner, except a finished lesson 1 counts as the goal being met.

## 10. Accessibility

- The bubble is a polite live region, so its sentence is read when it arrives.
- The strips are `accessible={false}`. Screen-reader users move through the real controls as always; `look` beats also have a visible and focusable "Got it", and **Skip tour** is always reachable.
- Targets keep their own labels; the hole is a visual, not a control.
- The dim meets the dark-mode rules (the theme's scrim, not a literal colour); Shrodi's colours are his own (EX-10).
- Touch targets: "Got it" and "Skip tour" are at least 44 dp.

## 11. Code layout and tests

```
services/tutorial-core.ts      catalog (beats, chapters, intros), nextBeat, legacy rules, SQL     [framework-free]
services/tutorial.ts           storage, event bus, emitTutorial, progress gathering
hooks/use-tutorial.ts          the current beat, busy, enabled
components/tutorial/
  TutorialLayer.tsx            dim, strips, ring, bubble; host="root" | "preview"
  Spotlight.tsx                the border-trick dim, the ring, the hand and their glide (plain Views)
  TutorialBubble.tsx           Shrodi and the line
  use-tutorial-target.ts       ref and onLayout, registry, scrollIntoView
  tutorial-fx-core.ts          timelines                                                            [framework-free]
```

Tests (`node --test`, erasable syntax, `.ts` imports; scripts in `package.json` like the others):

- `test:tutorial` (`services/tutorial-core.ts`): chapters run in order and each waits for the last; a beat is recorded only by its event; **resume** goes to the right beat for every row of §6.3 (including "unstable goes back to stable"); legacy learners skip chapters but keep intros; a met goal is `done` unshown; at most one intro per visit; intros never inside a chapter; Skip and Tips-off; the word limit (12) and the beat limit (3 per chapter, 3 per intro) are enforced; ids are unique; the redirect fires once per session; the reward is paid once.
- `test:tutorial-fx` (`tutorial-fx-core.ts`): beats are in order and end under budget, the hole glide is monotonic, reduced motion is a single frame.
- `check:tutorial`: every beat's `target` is declared by a `useTutorialTarget` in source, every `until` event is emitted somewhere, and `app/lesson/`, `app/practice/` and `app/explorer/platformer.tsx` contain no `TutorialLayer` (the tour stays out of lessons and levels).
- Add `tutorial_steps` to the Delete Account list in `services/database.ts` (next to `phone_seen`) and to its test, and run `test:legal` (no permission or network is added).

Before hand-off, as always: `sync-content` (nothing changes), `typecheck`, `lint`, `check:theme-colors`, `check:tab-bar`, `check:icons`, `check:sfx`, and the two tests above.

## 12. Build order

| Phase | Scope | Done when |
|---|---|---|
| 0 | `tutorial-core`, the table, the event bus, the busy counter, tests | `test:tutorial` passes with the catalog; no UI yet |
| 1 | `TutorialLayer`, `Spotlight`, `TutorialBubble`, the registry, both hosts; chapter `first-lesson`; the lesson redirect | a new learner is taken from Home to a started lesson, and killing the app at any point returns to the right beat |
| 2 | Chapters `feed` and `phone`; the reward; the Phone hand-over replaced | the whole first loop plays in about 30 s of tour |
| 3 | Screen intros; Settings rows; Replay; legacy rules; Delete Account | each intro shows once and never again; Replay works |
| 4 | Device pass | see below |

**Device pass (not skippable, none of this can be proved in Node):** the border-trick hole draws the same rounded inner edge on Android and iOS (else the four-rectangle fallback); the hole follows a moving target; touches really pass through the hole and nowhere else, on Android and iOS; the preview host lines up with the root host (status bar offsets); the overlay never shows over a dialog or a celebration and returns after it; Android back; a very large system font; reduced motion; dark mode; a low-end Android phone holds 60 fps while the ring pulses; a kill-and-reopen at every beat.

## 13. Decisions to confirm

| | Question | Draft answer |
|---|---|---|
| D1 | Copy in TypeScript (like the phone and onboarding) or in the content DB (editable in Studio)? | TypeScript. The lines are bound to screen targets and rarely change |
| D2 | Leaving lesson 1 half way: go straight back into the lesson, or to Home with the node lit? | Straight back in, once per session (as asked); Home is under it |
| D3 | Existing learners: skip the chapters? Show the screen intros? | Skip chapters, show intros |
| D4 | The chapter reward | **Decided: 10 diamonds once, no XP** (was 5; changed in the fourth pass) |
| D5 | "Same as the 2D games" | **Decided: gacha-style guided tutorial** (dim, glowing control, pointing hand, mascot line, forced tap), not the Atom Maze's sign style. The Atom Maze's own signs are left alone |
| D6 | Skip tour: one tap with an inline "Sure?", or a `ModalDialog`? | Inline, to keep it quick |
| D7 | Dim by SVG mask, by recreating the lit UI, or by plain Views | **Decided: plain Views (border trick), lit in place.** Clones are opt-in per target (§4.2) |

## 14. As built: where it differs from the draft

- **Event `reaction-opened`, not `reacted`.** The lit pill only opens the picker; the four reactions are outside the hole, so waiting for a chosen reaction would have trapped the learner. The beat ends when the pill is pressed and the learner picks (or not) on their own.
- **The Phone hand-over is kept, not replaced.** The phone's own first-open hand-over and install moments still play; the Phone screen holds the tour (`useTutorialBusy`) until they have finished, then `phone.chats` lights Chats. This avoids touching the phone's intro code.
- **Screen intros are recorded per beat,** not "seen or not" (a learner who leaves an intro half way resumes at its next beat). They still never repeat once finished.
- **Resume is a step-back rule** (`resumeAdjust`): while the next beat of an unfinished chapter is unstable, the beat before it is forgotten until the next one is stable. It runs on the first read of a session and whenever a lit transient thing disappears (`missingAction` returns `step-back`).
- **A screen is left alone for 900 ms after it opens** (`screenHoldMs`) before a beat shows, so the Home map's own unlock moment plays first. The preview host is unaffected (it opens on the same screen).
- **After a beat ends the old hole stays as a picture** while the next control settles, but a full-screen strip blocks touches until the new one is measured (`spot.id` must equal the current beat).
- **Not built:** the `clone` opt-in of §4.2 (no target needs it yet, so `useTutorialTarget` has no `clone` option); intros for Daily facts, Lab and the Periodic table (§5.4 lists none).
- **Known failing, not from this work:** `test:chats` test 6 (the Camera app is expected "planned") is from the Phone catalog work already uncommitted in the tree.

## 15. Second pass: locked tabs, the story, a longer Feed beat

- **Feed chapter is three beats.** `feed.react` (the pill, until `reaction-opened`), then `feed.pick` (the open picker's four reactions, until `reacted`; unstable, so a closed picker steps back to the pill). Only the first card registers `feed.picker`.
- **Phone chapter is three beats.** After `phone.chats` the tour follows to the Chats list (`chats` is a screen now) and lights Shrodi's story `Your first lesson!` (`chats.story`, until `story-thread-opened`, also sent by the thread screen however it was opened). The story (`chat-shrodi-up-first` plus `chat-shrodi-tour-*`) is a short walk round the app; the migration is `scripts/content-migration/update-shrodi-tour-chat.mjs`.
- **Tabs are locked** (§ rules in `tabLocked`): Home always open; Feed from its chapter; Phone from its chapter; Quests, Games, Profile and everything else when the tour ends. Ends = Skip tour, an existing learner, Tips off, a replay (it writes `MARK_FREE` first), or the last beat. A locked tab sounds `ui.invalid` and opens a dialog ("Finish your first lesson..." or "Follow Shrodi's tour..."); a locked tab reached any other way is sent Home.
- **Profile intro** is about the profile: `profile.passport` (look), `profile.badges` (look), `profile.flip` (tap the flip button, until `passport-flipped`). The Shop beat is gone from it; the Shop intro (`shop.grid`) shows on visiting the Shop. The Profile's Shop button is locked until the Shop app is on the phone (finish the second lesson; the Shop used to open after the first).
- **Waits are shorter** (a learner could leave before a late beat): a new screen 300 ms (Home 700 ms, for the map's unlock moment), a dialog's hold 250 ms, the settle check 120 ms at a 60 ms poll.
- **Stored rows:** `tutorial.free` is a marker like `tutorial.reward`. A skipped or existing learner counts every chapter as done whatever beats were added later (`chapterState`), so a new beat never reopens it.
- **Not done:** a lesson run or a game level is still outside the tour; the closing moment ("Tour done! 10 diamonds") waits for a screen the tour knows, so it plays when the learner leaves the story for the Chats list, the Phone or any tab.
- **Games text (third pass):** the Games intro says what each game is (Atom Maze: answer enemy questions to fight; Myth Buster: swipe left for myth, right for fact; Lab: build atoms and shields, watch decay), and the Atom Maze map has a look beat (`story.how`) before "Tap level 1". New target `games.lab`.
- **The hand (fifth pass):** one outlined hand (`hand-art.ts`, `node scripts/render-tutorial-hand.mjs <dir>` for a picture), always upright and always from below with the fingertip on the control (`HAND_TIP`), leaning 12 degrees about the tip; it is no longer turned upside down when the bubble is above.
- **Beta notice (sixth pass):** the "Welcome to the Beta" dialog on Home waits until the tour is over (`useTourOver`), so it never covers the first beat.
- **Locked presses (seventh pass):** a cold start no longer lets a locked tab through (until the tour has been read, a press on any tab but Home waits; nothing is drawn locked yet). While the dim is up, a tap on a locked tab or the locked header avatar opens its "Locked" dialog instead of nudging (`lock-hits.ts`: each locked thing registers its rectangle; the layer asks before it nudges).

## 16. Third pass: reward moment, tour pictures, no phone intro line

- **Reward animation.** The closing "Tour done" card is now `components/tutorial/TourReward.tsx` on the timeline `TOUR_REWARD_FX` (`celebration-core.ts`, `test:celebration`): Shrodi is stamped in with a burst as he lands, "Tour complete!" is stamped, the diamond pops with its own burst and the amount counts up beside it, a line and the "Thanks!" button arrive last (within about two seconds). The diamonds fly to the counter when the learner presses the button, taps away or after 10 s, so the number rises as they land. Reduced motion shows the end state.
- **Pictures in Shrodi's tour chat.** Each stop (`chat-shrodi-tour-map|quests|games|profile|phone`) now shows a flat scene of its screen after its first bubble. A text part that is only `[[pic:<id>]]` is a picture (`pictureOf`, `chat-core.ts`); scenes are pure data in `components/phone/tour-art.ts`; no schema change, Studio edits the marker as text. Rules `chat-picture-marker|id|first` stop a typo shipping.
- **Phone intro line removed.** The first-open line from Shrodi on the Phone tab is gone (the tour covers it); the icons still arrive with the install moment. `PHONE_INTRO_SEEN` is no longer read or written.
- Not verifiable here: how the scenes and the reward moment look and feel on a device.

### 16.1 Performance notes

- The hole no longer glides by animating its size and place (left, top, width, height, border width and radius of a screen-sized bordered View, every frame). The new dim is laid out once at the new control and fades in over the old one, which then fades out (`dimOpacities`, opacity only); the ring is laid out at the new control; the hand slides by transform.
- `useTabLocks` and `useTourOver` re-render their component only when their own answer changes, not on every store change; the lit control is polled every 250 ms once it has settled (`restPollMs`); the debug log line is behind `TOUR_DEBUG`.
