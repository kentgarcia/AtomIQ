# Onboarding revision

**Status:** built 2026-11-19 (typecheck, lint, `check:theme-colors`, `check:icons` and `test:onboarding` pass, and Metro bundles it). **Not seen on a screen or a device**: timings, Shrodi's bubble beside four choices on a small phone, the keyboard on the profile step, dark mode, sound against picture. **Applies to:** `app/onboarding.tsx`, new `components/onboarding/*`, `services/onboarding-core.ts`, `services/storage.ts` (one key), `components/celebration/celebration-core.ts` (welcome).
**Look and motion:** `duolingo-motion-style` (tiers, stamp, hero-then-settle, option pop, burst) over `rossark-motion-skill` (Shrodi's idle life). Project rules in `components/motion/MOTION.md` override both.

## 1. The formulas being copied

Onboarding in the apps that grew by it (Duolingo, Brilliant, Headspace, Noom, Finch, Cal AI) is one recipe with seven ingredients. This is each one, what it does to the learner, and where it lands in AtomIQ.

| # | Formula | Who does it | Why it works | AtomIQ |
|---|---|---|---|---|
| 1 | **One promise, one button.** The first screen is the mascot and a single line. No tour, no menu. | Duolingo, Finch | Nothing to decide, nothing to skip | `hello` |
| 2 | **Questions before content, one per screen, a progress bar on top.** Big tappable choices; a tap answers it, a bottom button moves on. | Duolingo, Noom, Headspace | Small asks beat a form; the bar promises an end | `why`, `level`, `goal` |
| 3 | **The mascot answers back.** After each pick the character reacts in a speech bubble that echoes the choice. | Duolingo | The questions feel like a conversation, not a survey | Shrodi's typed reply under each question |
| 4 | **Personalise the pitch.** The feature explanation is rewritten from the answers. | Headspace, Noom, Brilliant | "For you" lands better than "for everyone" | `how` (rows reordered and worded by the reason picked) |
| 5 | **Commitment device.** The learner picks their own daily goal, in minutes. | Duolingo | Consistency: people keep what they chose | `goal` |
| 6 | **"Building your plan" moment.** A short stepped build with a checklist that repeats their answers back. | Noom, Cal AI, Duolingo | Effort illusion plus a recap; it ends on "ready" | `plan` |
| 7 | **Value before the form.** The learner answers real questions from the real app before being asked their name. | Duolingo, Brilliant | The first win comes before the first demand | `taste`, then `profile` |
| 8 | **End on a peak.** The last thing is a celebration with the learner's own name and plan. | Duolingo, Finch | Peak-end rule: they remember the end | `welcome` |

Not copied, on purpose: account wall (AtomIQ is offline, no accounts), notification permission (the app has no push dependency, and adding one means a native module and a Privacy Policy change), fake social proof or fake numbers, a paywall, long surveys (Noom's 30 screens). Nine screens, about two minutes.

## 2. The flow

```
hello -> why -> level -> how -> goal -> plan -> taste -> profile -> welcome
 0       1/7    2/7      3/7    4/7     (holds 4/7) 5/7     6/7      1
```

| Step | Screen | Learner does | Stored (in memory until `welcome`) |
|---|---|---|---|
| `hello` | A yellow hero (the primary button's `buttonFace` yellow, flat blobs in its lip colour) with Shrodi waving, a cloud edge of big humps in two layers, then a white sheet (at least 48% of the screen) with the AtomIQ name and the subtitle "Learn nuclear science with short lessons, games and myth busting." (at most 270 dp wide) centred in it, then "Works offline. No account needed." right above a taller, narrower Get started button (large size, 76% wide, at most 300 dp) (`hello-core.ts` holds the cloud; `test:onboarding`) | Get started | |
| `why` | "What brings you here?" five choices | picks one | `reason`: `curious` `school` `career` `news` `fun` |
| `level` | "How much do you know about atoms?" three choices | picks one | `level`: `new` `basics` `solid` |
| `how` | "Here is how AtomIQ gets you there", four rows (lessons, games, streak, Shrodi) ordered and worded by `reason` | Continue | |
| `goal` | "Pick a daily goal" four tiers | picks one | `goalMinutes`: 5 10 15 20 |
| `plan` | "Building your path" with a three-line checklist; moves on by itself | | |
| `taste` | "Try your first questions": two real bank items, graded at once, the lesson's own feedback sheet | answers 2 | nothing (practice, not recorded) |
| `profile` | "What should we call you?", the big avatar with two to pick from underneath (`STARTER_AVATARS`: the short-haired default and a bun version; the big one pops when it changes, the chosen one gets a blue ring), then the name and the Terms and Privacy tick (the box pops with two gold sparkles, the tick springs in, `ui.toggle-on` then a sparkle 90 ms later) | picks an avatar, name, tick | `username`, `avatar_url` |
| `welcome` | Stamped Shrodi, burst, "Welcome, {name}!", recap tiles (goal, streak day 1, unit), Let's go | Let's go | `handleFinish` (in `app/onboarding.tsx`) writes the profile, the taste XP, the answers and the completed flag before this step shows |

Skip rules: Android back walks one step back (from `welcome` to the app). `plan` has no back and no bar (it is a transition). The answers are chosen, never typed, except the name. Every question has a default-less state: Continue is off until a choice is made, then on at once. `taste` has a "Skip" text button (never a trap); a bank that fails to load skips the step.

Nothing is saved before consent. The answers live in component state; `welcome` is entered only after the profile, the consent tick and `setOnboardingCompleted(true)`, in that order, as today.

## 3. What each answer changes

- `reason` picks Shrodi's reply to the question, the order and wording of the four rows on `how`, and the line on `plan`.
- `level` picks Shrodi's reply and the line on `plan` ("Starting at the very beginning" / "Starting with a quick refresher").
- `goalMinutes` picks Shrodi's reply (a goal of 5 is "Small steps add up", 20 is "Big plans, I like it") and appears on `plan` and `welcome`. It is stored as a preference. **Nothing in the app reads it yet** (follow-up: show it on Quests or Profile); the text never promises a feature that does not exist, so it says "Your goal: 10 minutes a day".
- Answers are written once, to `STORAGE_KEYS.ONBOARDING_ANSWERS` (AsyncStorage, `@atomiq:onboarding_answers`), as JSON `{ v: 1, reason, level, goalMinutes, at }`, read back through `parseAnswers` which drops anything it does not know.

## 4. Look

The page is the plain theme background (the lesson surface). Colours are theme roles only: `primary` (the lesson yellow/orange of the progress bar), `success`, `card`, `border`, text roles. No hardcoded hex (`check:theme-colors`). Pieces reused, not redrawn:

- `Shrodi` (live idle life, mood glides: `wave` on hello, `think` while a question is open, `happy` after a pick, `cheer` at the end).
- `TeacherBubble` speech bubble with Shrodi beside it, text typed by `TypedTermText` with `blips` (he talks).
- `OptionRow` for every choice, with its pop (selection), so choosing feels like answering a lesson card.
- `Button` (`large`) pinned in a bottom bar for Continue; `FooterRow` rise.
- The lesson progress bar, copied as `OnboardingBar` (same bar, shine and `ProgressSparkle`; the X is replaced by Back).
- `ItemCard`, `evaluateItem`, `checkModeOf`, `FeedbackDock`, `FooterRow` for `taste`.
- `Stamp`, `Reveal`, `Burst`, `CountUp`, `StatTile` for hello, plan and welcome.

## 5. Motion

One new core, `components/onboarding/onboarding-fx-core.ts` (framework-free, tested by `test:onboarding`), holds the build timeline; everything else is an existing piece with new timing.

| Moment | Tier | Beats |
|---|---|---|
| Step change | B | Between `why`, `level`, `how` and `goal` the screen is one place (`QuestionFlow`): the bar and the Continue button stay mounted (the bar glides, the button only goes off and on). The old page fades and drifts off in 150 ms while the new one builds itself as a cascade (`cascade-fx.ts`): title rises at 40 ms, Shrodi pops at 160, his bubble pops at 400 and types 200 ms later (no blips), the options rise one by one from 300 ms, 80 ms apart; on the pitch each picture pops and its sentence rises 90 ms later, 170 ms per row. Each piece drifts in from the side the learner is going to (a shared `direction`; the first page waits 260 ms for the hello scroll). Sound: whoosh on Continue, tab on Back, a pop for Shrodi, `lesson.bubble` for his bubble, a soft tick per option, a pop per pitch picture. Other steps still mount fresh with `settle(0)`. Reduced motion: everything is simply there |
| Hello | C (once) | Shrodi stamped at 120 ms (waving), name stamped at 420, line 700, footnote 800, button 900. Tap Shrodi: the option pop at 1.5 times with gold corner sparkles, eight stars burst from his head, he cheers for 1.3 s, `reward.pop` stepping its pitch and a light haptic; taps in a row restart it. The sky is the one loop: two pale clouds drift (about 10 dp a second) and three sparkles twinkle on one 240 s clock, frozen with reduced motion or when the page is not in front |
| A choice picked | B | colour flips at once, `OptionRow` pop; Shrodi's mood glides to `happy`; his reply bubble pops in 150 ms later and types; Continue enables on the first frame, not after the typing |
| Progress bar | A | glides 450 ms to the new step, sparkle at its end when it grows |
| `plan` | C | bar (the lesson's own design with its shine strip, 62% wide at most 240 dp) fills 0 to 2600 (`easeInOut`); line 1 ticks at 700, line 2 at 1500, line 3 at 2300 (each tick pops 0.35 to 1 in 200 ms with a ring); 2600 burst at the bar end; 3000 moves on. Tapping does nothing (it is 3 s) |
| `taste` | B | the lesson's own pop, shake and sheet; after the second answer the result is the finish screen's: Shrodi is stamped in with a burst, the title "Nice start!" at 300 ms, the line under it (at most 270 dp wide) at 560, then an "XP earned" `StatTile` (xp icon, gold, "+10" counting up, a shine later) at 760, and Continue after it lands (about 1.8 s). The XP is banked once, by `handleFinish` |
| `welcome` | D (once) | `WELCOME_FX` (mascot stamp 0, burst at its landing, title 300, line 700) then three recap tiles at 1000, 1400, 1800 (hero-then-settle through `StatTile`, `WELCOME_TILES`), button when the last tile is mostly in (about 2.6 s). Sound `lesson.complete` at the mascot's landing |

Everything on screen finishes inside 2.6 s except `plan` (3.0 s, and it is not a place the learner has to act). Sound: `ui.select` on a choice (hello also stamps the name and sparkles; the welcome pops each recap tile; the Terms tick toggles) (the row already plays it through `select()` haptic), `lesson.start` on `hello` Continue, `reward.fill` on the plan bar, `reward.pop` per plan tick, `lesson.answer-correct`/`wrong` in `taste` (the lesson components already play them), `reward.coin` on the XP count. Haptics: one per beat. Reduced motion: every one-shot shows its final frame, `plan` shows the finished checklist for 600 ms and moves on, Shrodi is still.

## 6. Files

- `services/onboarding-core.ts` (new, framework-free): types, `REASONS`, `LEVELS`, `GOALS`, `parseAnswers`, `canContinue`, `stepProgress`, `nextStep`, `previousStep`, `rowsFor(reason)`, `reply(step, choice)`, `planLines(answers)`, `recapFor(answers)`, `TASTE_ITEM_IDS`. Test: `scripts/test-onboarding.mjs`.
- `components/onboarding/onboarding-fx-core.ts` (new): `PLAN_FX`, `planBarFrame`, `planTickFrame`, totals. Same test file.
- `components/onboarding/` (new): `OnboardingBar`, `StepLayout` (with `ContinueFooter`), `ShrodiSays`, `HelloStep`, `QuestionFlow` (the persistent frame) with `ChoiceStep` (`ChoicePage`) and `HowStep` (`HowPage`) as its pages, `PlanStep`, `TasteStep`, `ProfileStep`, `WelcomeStep`.
- `components/lesson/cards/shared.tsx`: `OptionRow` gained optional `icon` (tinted tile) and `hint` (second line); nothing else about it changed.
- `app/onboarding.tsx`: only the step machine, Android back and the finish (`completeOnboarding`).
- `services/storage.ts`: `ONBOARDING_ANSWERS` key, `setOnboardingAnswers`, `getOnboardingAnswers`.
- `package.json`: `test:onboarding`.
- `CLAUDE.md`, `docs/MICRO_INTERACTION_SPEC.md` §6.5: one sentence each.

## 7. Differences from the first plan

- The theme switch is only on `hello` now (Settings has it); the old one floated on every step.
- The welcome's recap and the taste's reward both reuse `Stamp`, `Burst`, `CountUp` and `StatTile` rather than a new core; the only new timeline is the plan's.
- `taste` has no Check button: both items are single taps, which `test:onboarding` asserts.
- Shrodi's bubble on `profile` is not typed (it changes as the learner types).

## 8. Risks

1. **`taste` items are bank ids.** If a lesson edit retires one, the step skips itself rather than showing an empty card; `test:onboarding` checks the ids exist in `assets/database/content.db`.
2. **The Settings "Reset onboarding" path** (`app/settings.tsx:228`) re-enters at `hello`; the stored answers are overwritten at the end, never read at the start.
3. **Not seen on a device.** Timings, Shrodi's bubble beside a four-choice question on a small phone (the page scrolls under a pinned button), keyboard on `profile`, dark mode.
4. **The daily goal is cosmetic** until something reads it (section 3).
