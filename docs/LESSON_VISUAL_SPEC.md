# AtomIQ — Lesson Visual and UX Redesign Specification

**Status:** Draft for review
**Date:** 2026-11-16
**Owner:** AtomIQ product/engineering
**Applies to:** the lesson runner and the screens around it (`app/lesson/[id].tsx`, `app/practice/[id].tsx`, `components/lesson/**`)
**Builds on:** `docs/LESSON_RESTRUCTURE_SPEC.md` (structure and content, done for Unit 1), `components/motion/MOTION.md` (motion rules), `docs/THEME_EXCEPTION_REGISTER.md`

## 1. Goal

The lesson restructure gave AtomIQ a working curriculum: cards, an item bank, mastery, a runner. It was built to get the features right, so its screens are plain. The older lesson design (before the restructure) felt like AtomIQ. The current one does not.

This pass changes **how lessons look and feel**, not what they teach or how they are scored. The target is a lesson that a learner recognises as AtomIQ in five seconds: orange-first, tactile, guided by Shrodi, with an atomic motif, and calm in motion.

### Non-goals

- No change to the content model, the item bank, mastery, scoring, or the run state machine (`services/lesson-core.ts` and the other pure cores stay as they are).
- No new learning features (hearts, combo meters, leagues, new item types). If a visual idea needs one, it goes to §13 as a later proposal.
- No new content. Authoring limits (words per card, etc.) stay.
- No change to the tab screens (Home, Guide, Games, Profile). They are the reference, not the target.

## 2. Evidence base and its limits

This spec comes from reading code, not from looking at the running app.

- **Read:** `LessonRun`, `LessonPreview`, `LessonFinish`, `cards/shared.tsx`, `TeachCard`, `ItemCard`, `Button`, `PageBackground`, `theme/tokens.ts`, `top-row-header.tsx`, the Home screen styles, and the pre-restructure lesson views (`git show HEAD:components/lesson/*`).
- **Not done:** no device screenshots of the current lessons, no user testing, no frame-rate measurement. Findings marked *(verify)* are judgement from code and must be confirmed in Phase 0 (§10) before they drive work.
- Anything about how it renders on a device is unproven until someone runs it. Past lesson work had two device-only surprises (an animated SVG `transform` crash, and SVG gradients rendering black), so every phase ends with a device check.

## 3. Current baseline

### 3.1 What the old lesson design had

| Element | Old design (pre-restructure) | Now |
|---|---|---|
| Page surface | Plain `bg` | Plain `colors.background` (no brand wash) |
| Mascot | Large PNG on briefing, learn header, lab and debrief | Shrodi on preview, feedback and finish only |
| Step identity | Coloured badge per step with an icon: LEARN, QUIZ, LAB | One small uppercase tag, story cards only |
| Myth or fact | Full-screen swipe card with red and green gradient indicators and MYTH / FACT labels | A plain choice item; the charge is gone |
| Buttons | Orange face with darker lip, big (64 px on preview) | Shared `Button` (orange face, 4 px lip); same family |
| Rewards | Pills with orange and gold icon wells: XP, Stars | Plain bordered stat boxes; gold stars |
| Progress | Primary-colour bar | **Green** (`success`) bar |
| Decoration | Rotating ring behind the debrief mascot | None |

### 3.2 Findings

| # | Finding | Where | Confidence |
|---|---|---|---|
| V1 | Lessons sit on a flat `background`. Home, Guide, Games, Profile and Discovery share the pale-orange `PageBackground` wash, so entering a lesson drops the brand surface. | `LessonRun`, `LessonPreview`, `LessonFinish` | Read in code |
| V2 | The progress bar fills green. The app's identity colour is orange, and orange is what Home uses for XP and the path. | `LessonRun.tsx` `barFill` | Read in code |
| V3 | Teaching cards are title, figure and body in plain text. Explain, story and reveal look alike apart from a small tag. There is no hook. | `TeachCard.tsx` | Read in code |
| V4 | Item cards share one look: prompt plus neutral option rows, orange only on selection. Nothing says what kind of task this is (order, match, sort, estimate, tap). | `shared.tsx` `OptionRow` | Read in code |
| V5 | True or myth lost its identity. The old myth card had a strong red and green charge; the new one is two ordinary rows. | `ChoiceItems.tsx` | Read in code |
| V6 | Figures float on the page with no frame. A flat scene reads better on a defined stage. | `FigureView` | Judgement *(verify)* |
| V7 | Shrodi is absent while the learner works. He appears at three moments, so the guide feels like decoration. | `LessonRun` | Read in code |
| V8 | Preview is text-first. It has no visual of what the lesson is about and no unit identity. | `LessonPreview` | Read in code |
| V9 | Finish shows data in plain boxes. XP has no brand icon even though `xp.png`, `fire.png`, `diamond.png` and `medal.png` already carry that language in the Home header. | `LessonFinish`, `top-row-header.tsx` | Read in code |
| V10 | Sources (all of them) are listed in full on the finish screen, a long block of small text at the moment of reward. | `LessonFinish` | Read in code |
| V11 | The atomic motif (orbits, nucleus, shells) exists as scene motion data but is used nowhere as brand decoration. | `SceneFigure`, `scenes.mjs` | Read in code |
| V12 | Correct and wrong give a coloured panel and nothing else: no haptic, no sound. Only a button click sound exists. | `Feedback`, `services/ui-sfx.ts`, `services/haptics.ts` | Read in code |
| V13 | Practice, checkpoint, test-out and review share the lesson frame and look identical, only the banner text differs. | `LessonRun` `label` | Read in code |

## 4. Brand language: what "looks like AtomIQ" means here

Drawn from what already exists and ships, not invented.

| # | Pillar | Evidence in the app | Rule for lessons |
|---|---|---|---|
| B1 | **Orange-first** | `primary` `#EA580C`, `primaryDark` lip `#C2410C`, orange 400 `#FB923C`, `primarySurface` wash, orange path nodes | The accent of every lesson screen is orange: progress, active controls, headers' eyebrows, primary button. Green and red are reserved for correct and wrong. |
| B2 | **Shrodi guides** | Mascot art, Guide tab, preview and finish | Shrodi appears at defined moments (§6.4), always in a mood that matches the moment. Decorative: hidden from screen readers. |
| B3 | **Chunky and tactile** | 2 px border, 4 px lip, press sinks 4 px (`controls`), `Button`, `OptionRow` | Every tappable thing has the lip. Pressing sinks it. No flat tappables in lessons. |
| B4 | **Atomic motif** | Atom Maze, scene `orbit` motion, shell periods | A recurring graphic: a nucleus with orbiting electrons. Used behind Shrodi on preview and finish, and as the empty and loading state. Drawn from scene data; same engine. |
| B5 | **Calm motion, rare delight** | `MOTION.md`: interface moves under 300 ms, ease-out, everything freezes on frame 0 with reduced motion | Cards move barely. Delight (stars, burst, hop) only at rare moments: finish, three-star, correct streak is out of scope. |
| B6 | **Light and dark equal** | Dark-mode compliance spec, `theme.mode` | Every new surface is designed in both modes from the start. Invariant art (Shrodi, atom motif) is registered as an exception. |
| B7 | **Plain words** | Content limits, reading-level rules | The redesign adds no copy beyond short labels. |

## 5. Constraints (non-negotiable)

- Styles through `createStyles((theme) => …)` and semantic roles. No hardcoded neutral colours, no alpha on literal colours (`withAlpha(themeColor, a)`). `npm run check:theme-colors` must pass. Genuinely invariant colours are registered in `docs/THEME_EXCEPTION_REGISTER.md`.
- Icons only through `components/ui/icon.tsx` (`check:icons`). Brand PNG icons (`xp`, `fire`, `diamond`, `medal`) are used the way `top-row-header.tsx` uses them.
- **No SVG gradients.** They rendered black on a device (cause not found). A gradient that is not SVG, such as `expo-linear-gradient` in `PageBackground`, is already shipped and fine on a View. Do not put gradients inside `react-native-svg`.
- **No animated SVG `transform` strings.** Move things with native view transforms or by recomputing geometry (see `shrodi-art.ts`).
- Read Aloud, SFX and music only through `services/media*` and `<ReadAloudButton>`. New sounds need a media-policy review (`docs/MEDIA_POLICY.md`).
- Motion follows `components/motion/MOTION.md`: one clock per figure, interface moves under 300 ms, reduced motion shows frame 0, pause when the screen is not focused.
- Touch targets at least 48 dp (`layout.minTouchTarget`). Contrast stays at or above the bars enforced by `npm run test:contrast`.
- Content width is capped by `useResponsiveLayout().contentFrameStyle` (tablets). Scrollable screens clear the tab bar where one is present (`check:tab-bar`).
- Pure cores and the lesson run machine are not touched.

## 6. Design

### 6.1 The lesson frame (all runs: lesson, practice, checkpoint, test-out, review)

- **Surface.** `PageBackground` behind everything. Under an item card the wash is quieter (so options read), which means rendering it once at the frame level and not per card.
- **Top bar.** Close button, then the progress bar, then (new) a small **identity chip** for non-lesson runs (§6.3).
- **Progress bar.** Orange (`primary`) fill, rounded, with a thin lighter highlight along the top of the fill (a nested view in `withAlpha(c.onPrimary, 0.25)`; no gradient). The fill glides to its value (already done). A final tick turns it to `success` only when the run ends.
- **Footer.** Unchanged in structure (feedback panel above the main button). Visual change only: top border becomes the wash edge, not a hard line.

### 6.2 Teaching cards (explain, story, reveal)

Each type gets its own header and a stage for the figure.

| Type | Header | Extra |
|---|---|---|
| explain | Orange eyebrow badge: `Book` icon + "EXPLAIN" | none |
| story | Eyebrow badge: `Message` icon + story tag text | A Shrodi "voice" chip beside the title (small, `idle`), the story is Shrodi telling it *(open decision O3)* |
| reveal | Eyebrow badge: `Flash` icon + "REVEAL" | The learner's guess shows as a chip row ("You guessed: …") above the answer, with the true value emphasised in orange |

- **Figure stage.** The figure sits in a card: `surfaceSoft` fill, 2 px `border`, `radius.xl`, inner padding. The scene already has a flat same-hue rim; the stage gives it a floor. Caption sits under the stage.
- **Body text.** Keep 18/28 `book`. Glossary terms stay orange-link underlined (`TermText`).
- Entry stays the 200 ms ease-out nudge. Nothing else moves.

### 6.3 Item cards

- **Kind badge** above the prompt, one per item type. Same pill shape as the teaching eyebrow, so the run reads as one system.

| Type | Badge |
|---|---|
| choice | `Mouse` "PICK ONE" |
| true_or_myth | `Danger` "MYTH OR FACT" |
| order | `Sort` "PUT IN ORDER" |
| match | `Link` "MATCH" |
| sort | `Category` "SORT" |
| fill | `Edit` "FILL IN" |
| estimate | `Ruler` "ESTIMATE" |
| hotspot | `Location` "TAP IT" |
| predict | `Flash` "YOUR GUESS" |

  The icon names above are proposals. Each exists as an export of the installed `iconsax-react-native` (checked against its files on 2026-11-16), so they will pass `check:icons`. Swap any that look wrong in context.
- **OptionRow.** Keep the chunky anatomy. Changes: the letter badge becomes an orange outline circle that fills orange on selection (white letter); correct and wrong states get a short 160 ms colour settle (already instant today); the lip colour follows state (`successDark`, `dangerDark`).
- **True or myth** returns to a strong identity, using theme roles only:
  - Two large chunky buttons side by side, **MYTH** (`error` roles) and **FACT** (`success` roles) with icons, instead of two rows.
  - The statement sits in a large quote card above them, with the quotation marks as a brand glyph.
  - On check, the wrong button dims and the right one gets the check, then the standard feedback panel.
- **Prompt header** unchanged (prompt plus Read Aloud).

### 6.4 Shrodi moments

Shrodi is the guide, not wallpaper. Defined moments only, at most **two Shrodi instances on screen at once** (frame budget, *verify on a mid-range Android*).

| Moment | Mood | Size | Notes |
|---|---|---|---|
| Preview hero | wave | 170 | On the atom motif (§6.7) |
| Lesson start of a story card | idle | 56 | Chip beside the title (O3) |
| Correct feedback | happy | 76 | Existing |
| Wrong feedback | oops | 76 | Existing; copy stays kind |
| Deeper offer | think | 120 | New; replaces the lightning icon |
| Replay banner ("try the ones you missed") | idle | 44 | In the banner |
| Finish (3 stars) | cheer | 190 | Existing |
| Finish (1–2 stars) | happy | 190 | Existing |
| Checkpoint not passed | think | 190 | Existing |

### 6.5 Feedback panel

- Docked to the footer as a rounded sheet (`radius.xl` top corners) with `successSurface` or `errorSurface`, a 4 px lip in the state colour, Shrodi on the left, title, explanation, Read Aloud.
- Enters with the existing 180 ms ease-out. The main button's colour follows (`success` after right, `primary` after wrong).
- **Haptics:** `notifySuccess()` on correct, `notifyError()` on wrong, `select()` on option tap (already exposed by `services/haptics.ts`, gated by the user's setting).
- **Sound:** a correct and a wrong cue would be new media. Out of the first pass; see O4.

### 6.6 Preview ("mission card")

- Shrodi (wave) stands on the **atom motif** (§6.7) over the page wash. Unit title as an orange eyebrow chip; lesson title below.
- Facts become three pills (time, cards, sources) with the Icon set, `surfaceSoft` fill.
- "You will learn to…" stays a checklist card but each row gets a lip-less orange `TickCircle`; completed objectives (replay) show a check.
- Start button is the primary `Button`. Close stays top left.
- **Scene thumbnail** of the lesson's first figure (if any) as a small stage under the title, so the learner sees what the lesson is about *(open decision O5)*.

### 6.7 The atom motif (brand decoration)

A decorative component, `AtomOrbit`, a nucleus with 2 or 3 orbit rings and electrons orbiting. It is built from the existing scene data and motion engine (`orbit` shapes, `SHELL_PERIODS`), so it follows the same rules: one clock, frame 0 on reduced motion, paused when unfocused. Flat colours from theme roles: rings `border`, nucleus `primary`, electrons `info`. Used on:

- the preview behind Shrodi (large, low contrast, behind the character);
- the finish screen behind the celebration;
- loading and empty states inside lessons (small).

It is decoration only: hidden from screen readers.

### 6.8 Deeper offer and replay

- Deeper offer: Shrodi `think` instead of the Flash icon; the two buttons keep their roles.
- Replay: banner becomes a chip with the small Shrodi and the same words.

### 6.9 Run identity (practice, checkpoint, test-out, review)

A small chip in the top bar tells the learner what kind of run this is. Colour is by role, so it works in both modes.

| Run | Chip | Colour role |
|---|---|---|
| lesson | none | primary |
| practice | `Repeat` "PRACTICE" | primary |
| checkpoint | `Medal` "CHECKPOINT" | gold |
| test-out | `Flash` "TEST OUT" | info |
| review | `Refresh` "REVIEW" | info |

Final colours are open (O2). The progress bar stays orange in all runs.

### 6.10 Finish

- Celebration stage: Shrodi on the atom motif; stars stay (gold, staggered pop already built) but each earned star lands with a short orange ring flash behind it.
- **Reward pills** replace the stat boxes: XP uses `xp.png`, accuracy is a small ring (a flat arc, no gradient), streak (if the run extended it) uses `fire.png`. These mirror the Home header so the reward is recognisable.
- "What you worked on" stays as a card.
- **Sources** collapse to one row, "Sources (3)", that opens the list. The detail is still one tap away.
- Buttons unchanged.

### 6.11 Simulations (atom builder, scale zoom)

- Sit on the same stage card as figures.
- Controls use the chunky pattern. The atom builder's electron shells use the atom motif colours.
- No new behaviour.

### 6.12 Dark mode

- The wash uses `primarySurface` (dark `#3A2A20` tint) so dark lessons are warm, not black.
- The stage uses `surfaceSoft`. Flat scene rims already switch to the bright fill in dark mode.
- Shrodi's coat stays pale in dark mode (EX-10).
- Verified per phase against `docs/DARK_MODE_SMOKE_MATRIX.md`.

## 7. Motion, haptics and sound

| Moment | Move | Duration, curve | Reduced motion |
|---|---|---|---|
| Card enter | 8 px nudge up + fade | 200 ms ease-out (exists) | none |
| Progress | width glide | 300 ms ease-out (exists) | jump |
| Option press | sink 4 px | instant (exists) | same |
| Option state change | colour settle | 160 ms ease-out | instant |
| Feedback panel | slide up + fade | 180 ms ease-out (exists) | none |
| Shrodi mood change | pose glide | 450 ms (exists, a character move, not an interface move) | frame 0 pose |
| Star pop | scale 0.7 → 1 | 320 ms, 160 ms stagger (exists) | none |
| Ring flash on star | scale + fade | 280 ms ease-out | none |
| Atom motif | orbit | 6, 10, 15 s periods | frame 0 |

Haptics only for: option select (light), correct (success), wrong (error). Respect the user's haptics setting (the gate already exists).

## 8. Accessibility and responsiveness

- Each new element has a text equivalent: badges are text, the atom motif and Shrodi are hidden, reward pills read as one label ("XP earned: 12").
- Correct and wrong never rely on colour alone (icons exist already; the feedback title says it).
- 48 dp targets; MYTH / FACT buttons are large.
- Font scale 1.3: badges wrap, never clip; the progress bar and close button stay put.
- Tablets: everything inside `contentFrameStyle` (max 720).
- Screen-reader order: top bar, card, footer (unchanged).

## 9. New and changed building blocks

| Block | Kind | Purpose |
|---|---|---|
| `LessonFrame` | new | `PageBackground` + top bar + progress + footer slot; used by run, preview, finish |
| `CardBadge` | new | The eyebrow pill (icon + label) for teaching and item types |
| `FigureStage` | new | The framed figure container |
| `AtomOrbit` | new | Decorative nucleus and orbits from scene data |
| `StatTile` | new | Coloured shell, label and rounded face with icon and value (XP, time, accuracy) for finish; replaced `RewardPill` |
| `FeedbackDock` | changed | Replaces the inline `Feedback` in `LessonRun` |
| `MythFactChoice` | new | The two-button true or myth interaction |
| `OptionRow` | changed | Badge states, colour settle |
| `LessonRun`, `LessonPreview`, `LessonFinish`, `TeachCard`, `shared.tsx` | changed | Use the blocks above |

No new dependencies are expected (`expo-linear-gradient`, Reanimated, `react-native-svg` are in the app).

## 10. Phases

Each phase ends with: `npx tsc --noEmit`, `npm run lint`, `npm run check:theme-colors`, `npm run check:icons`, `npm run test:contrast`, `npm run test:mascot`, `npm run test:visuals`, and a look at the screen in light and dark **on a device**.

| Phase | Scope | Done when |
|---|---|---|
| **0 Baseline** | Capture screenshots of today's preview, a teach card, each item type, feedback right and wrong, the sims, finish, practice, checkpoint, review, in light and dark, on a phone and a tablet. Confirm or drop each *(verify)* finding. Measure frame rate with Shrodi plus an orbiting scene. | A folder of screenshots exists; the findings table is marked confirmed or dropped. |
| **1 Frame and feedback** | `LessonFrame`, wash, orange progress bar, `FeedbackDock`, haptics, run identity chips. | Every run type uses one frame; feedback docks; haptics fire and obey the setting. |
| **2 Teach and figures** | `CardBadge`, `FigureStage`, explain, story and reveal headers. | Three teach types are distinguishable at a glance; figures sit on a stage. |
| **3 Items** | Kind badges, `OptionRow` states, `MythFactChoice`. | All nine item types show a badge; true or myth is two large buttons. |
| **4 Preview and finish** | `AtomOrbit` (since removed), `StatTile`, a finish celebration scene (`Sparkles`), collapsed sources, deeper offer and replay with Shrodi. | Preview and finish match the brand; sources collapse. |
| **5 Sims and polish** | Sim stages, dark-mode pass, motion review, reduced-motion pass, a11y pass. | Smoke matrix passes; reduced motion shows no movement; font scale 1.3 does not clip. |

Phases 1 to 3 can each ship alone.

## 11. Tests and gates

- **Contrast:** extend `scripts/test-option-contrast.mjs` (or add a sibling) with the new pairs: badge text on its fill, MYTH and FACT labels on their faces, reward pill text, chip text on each role, in light and dark. Same bars as today.
- **Atom motif data:** a `node --test` check that the scene data validates with `checkScene` (periods divide the loop, amounts within limits), as for figures.
- **Theme exceptions:** any new invariant colour is registered (EX-11 onward) and `check:theme-colors` passes.
- **Static checks:** no `expo-linear-gradient` or gradient element inside an SVG file under `components/lesson` or `components/mascot` (a small grep test), no animated SVG `transform`.
- **Manual:** the smoke matrix in `docs/DARK_MODE_SMOKE_MATRIX.md` extended with the lesson screens.

## 12. Success measures

| Measure | Target | How |
|---|---|---|
| "Is this AtomIQ?" five-second test | At least 8 of 10 testers identify the app from a lesson screenshot with the logo hidden | Informal test, Phase 5 |
| Readability | No text under the contrast bars in either mode | `test:contrast` |
| Performance | No visible dropped frames while a card is entered with Shrodi and an orbiting scene on screen, on a mid-range Android | Device check *(unmeasured today)* |
| Reduced motion | Zero motion with the OS setting on | Manual |
| Consistency | Zero new hardcoded colours; zero new SVG gradients | Gates |
| Feel | Testers describe the lesson as "fun" or "friendly", not "plain" or "like a form" | Informal test |

The first and last are small informal checks, not a study. They guide the work and are not evidence of learning outcomes.

## 13. Out of scope, parked for later

- Hearts, combo or streak-in-lesson indicators, leagues, XP boosts.
- Sound cues for correct and wrong (needs assets and a media-policy review, O4).
- Unit-specific colour themes on the path and in lessons (units carry no colour in the curriculum data; Home derives its own).
- Shrodi voice lines or speech bubbles on every card.
- Localised layouts for longer languages (content translations table exists, empty).
- Landscape.

## 14. Open decisions

| # | Question | Recommendation |
|---|---|---|
| O1 | How warm should the lesson wash be? Same as tab screens, or quieter while answering? | Same wash at the frame, with a lighter overlay under item cards. Decide after Phase 0 screenshots. |
| O2 | Colours for checkpoint, test-out and review chips | gold, info, info (existing roles, no new tokens). |
| O3 | Does Shrodi "tell" story cards (a chip beside the title) or stay out of teaching cards? | Add the small chip on story cards only; revisit after device testing. |
| O4 | Add correct and wrong sound cues? | Not in the first pass. If wanted: two short cues, reviewed under `MEDIA_POLICY.md`. |
| O5 | Show a scene thumbnail of the first figure on the preview? | Yes if the first card has a figure; otherwise the atom motif only. |
| O6 | Replace the green progress bar with orange everywhere? | Yes; green stays only for the finished state. |
| O7 | Should the brand PNG icons (xp, fire) appear inside lessons, or only on finish? | Finish only. |


## 15. Revision after first implementation (owner direction)

- **Background:** the page wash is gone. Lesson screens use the plain theme background (white in light, the dark surface in dark). `LessonFrame` is just that background plus the `LESSON_FRAME` column.
- **Cards and buttons:** every card is the shared 3D `Card` (`components/ui/card.tsx`: 2 px border, 4 px lip, sinks when pressed) and every button is the shared `Button`. This covers the figure stage, quote card, sort rows, feedback dock, reward pills, preview and finish cards, sim stages, MYTH / FACT, the fill-in bank, estimate nudges, the atom builder steppers and zoom buttons. `OptionRow` has the same lip and face anatomy.
- **Figures:** drawn in the Duolingo-style palette (`components/lesson/visual/duo-palette.ts`, exception EX-11): a bright face over a darker lip that drops below it, no outlines, no gradients. The figure sits on a `Card`, so the scene's own plate is off there (`plate={false}`).
- **Dead space:** 12 px gutters and an 840 px column instead of the app's 16 to 24 px / 720 px; tighter top bar, footer and scroll padding; footer border lines removed; smaller heroes on preview and finish.
- **Atom motif removed:** the orbiting atom (`AtomOrbit`, §6.7) was dropped as unattractive. Shrodi stands alone on the preview and finish screens; ignore the `AtomOrbit` rows in §§6.6, 6.7, 9 and 10.
- **Preview rebuilt as one sheet (owner direction, second pass):** a single top bar (close, "Lesson preview"), one hero stage (`Card tone="primary"`: the unit's teacher in a speech bubble, or Shrodi when the unit has none), then one lesson card carrying the unit badge, title, description, a three-cell facts strip (time, cards, sources), and the "You will learn to" rows. The pinned CTA reads `Start +<xp> XP` (or `Review lesson` on a replay). The isolated first-figure block is gone: it read as a scattered extra block and its scene labels clipped at preview width. V8's figure finding and O5 are superseded.
