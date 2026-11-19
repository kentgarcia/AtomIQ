# Lesson cascade: bringing the onboarding's micro animations into lessons

**Status:** first pass BUILT 2026-11-19 (typecheck, lint, `test:lecture`, `test:onboarding` and a Metro bundle pass; **unseen on a device**). Built: the shared parts moved to `components/motion/` (`cascade-fx.ts`, `cascade-context.tsx`, `use-cascade-sfx.ts`, with `CascadeIn`), his bubble popping for item questions (`TeacherSays`) and lecture bubbles (the teacher's own pop-in and its sound were taken out again at the user's request: he stands still) (`TeacherBubble arriving`, typing after the pop via `TypedTermText startAt`), the item title and the question rising, and the options rising one by one with a soft tick each (`OptionsArea`), with the onboarding's own timings (no smaller lesson profile yet, a decision from the user: "copy actually the sfx and animation"). Not built: the leaving page (`pageOut`, it needs absolutely laid pages and a ScrollView does not allow that), per-item-type staggering beyond `OptionsArea` (a picture grid arrives as one block), the Continue whoosh, a lesson timing profile. Written after the onboarding revision was approved ("i love the micro animations ... we will implement it on lessons").
**Applies to:** `components/lesson/LessonRun.tsx` (the page wrapper), `components/lesson/cards/ItemCard.tsx` and the item types under it, `components/lesson/LecturePage.tsx`, `components/lesson/TeacherBubble`, `components/lesson/FooterRow.tsx`, `components/lesson/FeedbackDock.tsx`, the progress header. New shared parts move from `components/onboarding/` to `components/motion/`.
**Builds on:** `docs/ONBOARDING_SPEC.md` (section 5, the "Step change" row), `components/motion/cascade-fx.ts`, `components/motion/use-cascade-sfx.ts`, `components/onboarding/QuestionFlow.tsx`, `docs/MICRO_INTERACTION_SPEC.md`, `.claude/skills/duolingo-motion-style/`, `components/motion/MOTION.md` (project rules win over the skill), `docs/SFX_SPEC.md`.

## 1. What the onboarding does that lessons should get

On the onboarding's question pages the frame is permanent and only the content changes, and the content builds itself as a **cascade**: one thing after another, each a short way (16 dp up, a little drift sideways the way the learner is going), fading up, ease-out, no springs, with a sound on each beat.

| Beat | Onboarding | Piece |
|---|---|---|
| Frame stays | Progress bar and Continue button are mounted once; the bar glides, the button goes off and on | `QuestionFlow` |
| Old page leaves | fade and drift 22 dp, 150 ms | `pageOut(direction)` |
| Title | rises at 40 ms | `riseIn` |
| Character | pops in at 160 ms (0.5 to 1, small overshoot) | `popIn` |
| Speech | bubble pops at 400 ms (0.35 to 1, no overshoot), types 200 ms later, no blips | `bubbleInAt` + `TypedTermText startAt` |
| Options | rise one by one from 300 ms, 80 ms apart, 0.96 to 1 | `riseIn(..., 0.96)` |
| Direction | forward drifts in from the right, Back from the left, the first page from nowhere | shared value `direction` (1, -1, 0) |
| Sound | whoosh on Continue, tab on Back, pop for the character, bubble pop, a soft tick per option | `useCascadeSfx` |

Why a **shared value** for the direction: an exiting view reads its animation from its last render, before anyone knows where the learner is going. The step machine sets the value just before it changes the page.

## 2. Principle for lessons: the same language, a smaller budget

The onboarding is seen once, so a page can take about 1.2 s to build. A lesson is seen hundreds of times a week. Frequency decides the budget (`duolingo-motion-style`): **lessons get the cascade at about a third of the length, and nothing in it may delay what the learner can do.**

1. **Never block input.** Options are tappable from the first frame even while they rise. (The onboarding's rows are also tappable while rising; keep it.)
2. **Total cascade at most 450 ms** from page start to the last option landing (the onboarding's is about 700 ms for four options).
3. **Quiet sound.** One soft cue at the start of a page; no per-option tick by default (the tick is the one thing most likely to annoy by card 12). Decide in the review (section 7).
4. **Instant things stay instant.** Selecting, grading, the pop, the shake and the feedback sheet already have their own timelines (`option-pop-core.ts`, `shake-core.ts`); the cascade only controls how a page *arrives*.
5. **Reduced motion:** everything simply there (`ReduceMotion.System` in the factories already does this).
6. **Frame stays, as in onboarding:** the lesson's progress bar and footer already persist across cards (the bar glides). Keep that; do not remount them.

## 3. Where each piece lands in a lesson

### 3.1 Item cards (the high-volume case)

`LessonRun.tsx` wraps every page in `<Animated.View key={pageId} entering={enter}>` (one `FadeInDown`). `ItemCard` is: `ItemTitle`, then `ItemBody` (question on top, `OptionsArea` in the middle).

Replace the single wrapper entrance with a cascade of its own blocks:

| Order | Block | Delay | Move |
|---|---|---|---|
| 1 | `ItemTitle` (icon tile and task name) | 0 | `riseIn`, drift only by `direction` |
| 2 | The question text / prompt | 50 | `riseIn` |
| 3 | The figure or picture, if any | 90 | `popIn` (pictures pop, text rises) |
| 4 | Each option | 130 + 50 per option | `riseIn(0.96)` |
| 5 | Check button / footer | already `FooterRow` rise | unchanged |

Four options finish at 130 + 150 + 340 = about 620 ms, so shorten the step to 40 ms and the rise to 280 ms for lessons (a `PAGE_FX.lesson` variant: `ms: 280`, `optionStep: 40`), giving about 450 ms. Pass `PAGE_FX` variant as an argument instead of duplicating the factories.

Interaction types to cover, in order of how often they appear: `choice`, `true_or_myth` (two big buttons: both rise together, no stagger), `fill` (the sentence rises, the word bank words rise one by one), `order` and `sort` (the pieces rise one by one, the legend first), `match` (left column then right column), `estimate` and `predict` (the question, then the control), `hotspot` (the picture pops, the hotspots appear after). Each is a few `Animated.View entering={...}` wrappers inside its existing layout; none changes its layout or hit areas.

### 3.2 Lectures (teaching cards)

`LecturePage` already builds itself step by step: each step is a `TeacherBubble` (the newest types itself out) or a figure, with `FadeInDown` and `lesson.bubble` / `reward.pop` already playing. This **is** the cascade, driven by the learner's taps. The only changes:

- Title (the phrase top-left) rises with the same `riseIn` so a page does not start with a bare title.
- The teacher's first bubble uses `bubbleInAt` and `startAt` exactly like `ShrodiSays`, so typing begins after the pop (today it starts at mount).
- Figures use `popIn` (today `FadeInDown`).
- Keep the 1.2 s Continue hold and "a tap shows the next step at once" rules untouched.

### 3.3 Page change between cards

Today every card is a fresh `FadeInDown`. With a persistent frame and a `direction` value (forward on Continue, back on the stepped-back page and the mistakes replay) the old card fades and drifts off in 150 ms while the new one cascades in. Implementation: `exiting={pageOut(direction)}` on the page wrapper; the wrapper stays `key={pageId}`. The step machine in `LessonRun` sets `direction` before `run` changes (forward on Continue, -1 on stepped back, 0 on the first card).

### 3.4 Not touched

Lesson preview, finish screen, feedback sheet, the lesson map and its bubble: they have their own, finished choreography (section 4 of `MICRO_INTERACTION_SPEC.md`).

## 4. Shared code to build first

1. Move `components/motion/cascade-fx.ts` and `use-cascade-sfx.ts` to `components/motion/` (`cascade-fx.ts`, `use-cascade-sfx.ts`), keep re-exports in `components/onboarding/` or update the imports. They are already framework-light (Reanimated factories plus constants).
2. Make the timings a **profile**: `CASCADE.onboarding` (today's `PAGE_FX`) and `CASCADE.lesson` (`ms 280`, `rise 12`, `drift 16`, `title 0`, `options 130`, `optionStep 40`). Every factory takes the profile.
3. Extract the pure parts into a framework-free `cascade-core.ts` (the beat times, `optionTimes(count, profile)`, the total, the lead) with a **small** `node --test` suite: the cascade ends before the budget (450 ms for lessons), beats are in order, every time is finite. The onboarding deliberately has no such test now; the lesson one should keep exactly that small.
4. `direction` as a shared value created by the screen (`useSharedValue`) and passed down by context so card components do not need a new prop each: `CascadeProvider direction profile`, `useCascade()`.

## 5. Sound

`SFX_SPEC.md` has the rules (the bus ducking, the gaps). Proposed for lessons:

| Moment | Cue | Notes |
|---|---|---|
| A new card appears | `lesson.whoosh` at volume 0.4 (the Continue sound moves from the button to the arrival so it matches picture) | one per card |
| A speech bubble pops | `lesson.bubble` | already there |
| A picture or figure pops | `reward.pop` at 0.5 | already there for figures |
| Options landing | none by default | optional `ui.tick` behind a flag, see section 7 |

The talking blip stays off in lessons (and is off in onboarding too now).

## 6. Order of work

1. Move the shared parts and add the profiles (section 4); onboarding keeps working unchanged (it uses the `onboarding` profile).
2. `choice` and `true_or_myth` item cards plus the page wrapper and `pageOut`: the two most-seen cards. Look at them on a device before going on.
3. The remaining item types (3.1), one commit each.
4. Lectures (3.2).
5. Sound pass (section 5) and the small test.
6. Update `CLAUDE.md` (the curriculum paragraph names the page entrance) and `docs/MICRO_INTERACTION_SPEC.md`.

## 7. Decisions to make before building

1. **Options tick or not?** The onboarding ticks once per option. In lessons that sound fires on every card; my recommendation is no, and a quiet whoosh per card instead.
2. **Is a 450 ms cascade too long for lessons?** The learner can tap throughout, but a card that is still settling can feel slow. Measure on a device; the profile makes 300 ms a one-line change.
3. **Back and the mistakes replay:** should they drift in from the left like the onboarding's Back? It is cheap, and it keeps the "one place" feeling.
4. **Do pictures pop (`popIn` overshoot) in lessons?** The overshoot is the only one in the onboarding. Lesson figures are teaching material; a plain `riseIn` may be calmer.

## 8. Risks

- Items that measure their layout on mount (`HotspotItem`, `SortItem` legend, anything using `onLayout` for geometry) must not be given a transform that changes their measured size; the entrance only moves and fades them, never scales a measured container (the `0.96` scale goes on the option row wrapper only).
- Many `entering` animations on one page cost frames on low-end Android; cap the number of animated blocks per page (stagger at most 8 options, then the rest arrive together).
- A page that is replayed (mistakes replay, stepped back) must not re-announce itself to screen readers twice: the `accessibilityLiveRegion` on the bubble stays, nothing else.
- Everything in this spec was designed from the onboarding, which is itself **unseen on a device**. Look at the onboarding on a phone first; if its timings need tuning, tune the profile before porting.
