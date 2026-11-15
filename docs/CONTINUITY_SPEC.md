# AtomIQ — Continuity Specification

**Status:** C1, C2, C3, C6 (prev/next only), C8 (partly) and C10 (partly) implemented (2026-11-14, none verified on a device); the rest are proposals.
**Date:** 2026-11-14
**Owner:** AtomIQ product/engineering
**Applies to:** Expo SDK 58 / React Native 0.88 / React 19 / Expo Router 58 / Reanimated 4.7
**Scope:** How one UI state becomes the next. What each action does, what each screen shows and where things end up do **not** change.

## 1. Goal

Today the app moves between states by hard cut, by sliding a whole screen in from the right, or by fading new content in with no connection to the thing the learner touched. This spec finds the places where that loses the learner and proposes making the important ones **continuous**: the element that was touched carries into what comes next instead of disappearing and being replaced.

Out of scope: window resize and breakpoint changes (not transitions), new dependencies, and new routes. Anything that touches router config is flagged **[needs approval]**.

## 2. What exists today

### 2.1 Stack and navigation

- **Router:** Expo Router 58, typed routes, React Compiler on (`app.json` experiments).
- **Root:** `app/_layout.tsx` is a single `Stack` with `headerShown: false` on every screen. Only `achievement-detail` (and the template `modal`) use `presentation: "modal"`. Every other push uses the platform default.
- **Per-flow layouts:** `lesson/` and `quiz/` set `animation: 'slide_from_right'`. `mythbuster/` sets `slide_from_bottom`. `explorer/` and `periodic-table/` use defaults.
- **Tabs:** `app/(tabs)/_layout.tsx` uses `Tabs` from `expo-router/js-tabs` with a fully custom `ModernTabBar`. The active marker is a triangle that is **mounted only on the focused tab** (`{isFocused && <Svg …/>}`), so it pops in and out rather than travelling. The tab bar already measures its height via `onLayout`.
- **Layouts:** portrait-only phone and tablet (`docs/ANDROID_RESPONSIVE_UI_UX_SPEC.md`). There is no desktop target in scope, although `react-native-web` is installed. Input is touch first; on web, mouse and keyboard.

### 2.2 What animates today

| Mechanism | Where | Notes |
| --- | --- | --- |
| `entering={FadeInDown…springify()}` | `streak`, `settings`, `article-detail` (delays 100–500ms), `LessonPreview`, `LessonRenderer`, `onboarding`, `profile` | Content fades in from below with staggered delays. No `exiting`, so the previous content disappears instantly. |
| `LinearTransition.duration(220)` | `app/encyclopedia.tsx` entry cards only | The one place a list reflows with motion. |
| `withTiming` + `translateX` | `PickAGame` (picker ⇄ difficulty panel, 320ms `Easing.inOut(cubic)`) | Whole layer slides; the tapped card does not carry over. |
| `withSpring` | `StackCard` press, `PickAGame` header arrow flip, MythBuster swipe card | Press and gesture feedback; MythBuster swipe already follows the finger 1:1. |
| RN `<Modal animationType="fade">` | `PickAGame` How to Play, `settings` (version, delete account), `BetaNoticeModal` | System fade of a scrim; the inner card has a `FadeInDown`, or nothing. |
| Native stack slide | every `router.push` | Default platform transition. |

Reanimated **shared element transitions are disabled** in this build: `ENABLE_SHARED_ELEMENT_TRANSITIONS: false` in `node_modules/react-native-reanimated/src/featureFlags/staticFeatureFlags.ts`. `expo-router` 58 exports `Link.AppleZoom`, which is iOS 18+ only, so it cannot be the cross-platform solution. The approach in §4 therefore does not depend on either.

### 2.3 Motion tokens and reduced motion (reuse these)

`theme/motion.ts` already defines the vocabulary:

- Curves: `EASE_OUT` `(0.23,1,0.32,1)`, `EASE_IN_OUT` `(0.77,0,0.175,1)`, `EASE_DRAWER` `(0.32,0.72,0,1)` (identical to the brief's open/close curve), `PRESS_EASING`.
- Durations: `press 150`, `small 180`, `medium 260`, `modal 250`, `flip 400`.
- Spring: `{ damping: 18, stiffness: 220 }`.

Reduced motion: `useReducedMotion()` is honoured in about 16 files (tab bar, Home, Discover, Profile, Guide, achievement detail, Atom Maze, Lab, periodic table, beta modal). The convention is `reducedMotion ? FadeIn.duration(120) : FadeInDown.springify()`. This matches the brief's "keep the change of state, short cross-fade, drop movement". Files that animate but do **not** check it: `streak`, `settings`, `article-detail`, `terms-of-service`, `privacy-policy`, `onboarding`, `PickAGame`, `StackCard`, and `LessonRenderer`. Those must gain the check as part of any item below that touches them.

The theme-colour check (`npm run check:theme-colors`) applies: a moving element is the same themed element, so it keeps its colour roles. Do not introduce literal colours or alpha on literal colours in overlays; use `withAlpha(themeColor, a)`.

## 3. Ranked proposals

Ordered frequent, disorienting and low cost first. Patterns refer to the brief: **a** row → detail, **b** card → full view, **c** bar → panel, **d** search/filter, **e** summary → detail, **f** control → what it controls, **g** tabs/indicators, **h** layout changes.

All values are defaults. Phone is the target; on a wide tablet or web window, scale durations to about two thirds and keep pointer targets still while they move.

### C1. Lesson steps: the progress header persists, content travels

> **Implemented.** `components/lesson/StepTransition.tsx`, `app/lesson/[id].tsx`, tokens in `theme/motion.ts`. Deviations: the progress fill animates `width` (a leaf in a fixed track, so nothing reflows; `scaleX` would squash the rounded end); the outgoing step uses a direction-neutral 150ms fade because it is already unmounted when the direction changes; the inner `FadeInDown` staggers inside step views were left as they were.

- **Where:** `app/lesson/[id].tsx` + `components/lesson/LessonRenderer.tsx`; every "Continue" in every lesson (phone and tablet).
- **Now:** `renderStep()` returns a view with `key={step}`, so React unmounts the old step and mounts the new one in the same frame. Each step then runs its own `FadeInDown`. The progress bar's `width` jumps (`width: ${…}%`). The top bar is conditionally mounted (`!isFirstStep && !isLastStep`), so it pops in on step 2 and out on the last step.
- **Pattern:** g / h. Carried element: the progress fill and the top bar. New content enters from the side of travel.
- **Change:** progress fill animates from its old fraction to the new one with `scaleX` and `transform-origin: left` (not `width`), 400ms `EASE_DRAWER`. Outgoing step fades and shifts about 24px toward the leading edge over 150ms (`exiting`); incoming step starts 24px from the trailing edge and settles over 350ms. The top bar fades in over 180ms instead of popping. Keep the existing in-step `FadeInDown` stagger for secondary content, shortened to 20–40ms apart. Reduced motion: 150ms cross-fade, progress fill changes without travel.
- **Value:** High. Every learner, every step, most sessions.
- **Cost:** Low. One wrapper around `renderStep()`, one animated fill. Risk: `exiting` animations on a view that holds an `Assessment` with option feedback state (must not replay feedback), and keyboard-avoiding views inside steps; check `AssessmentView`, `LabView`, `MythBusterView`.

### C2. Bottom tab bar: one marker travels

> **Implemented** in `app/(tabs)/_layout.tsx` (`TabMarker`). The stretch is a symmetric scaleX 1.15 / scaleY 0.9 pulse over the move, not a true leading-edge-first stretch. The optional tab content shift was not done.

- **Where:** `app/(tabs)/_layout.tsx` (`ModernTabBar`, `TabButton`); every tab switch (phone and tablet).
- **Now:** The triangle marker unmounts from the old tab and mounts on the new one. Tab content swaps with no motion.
- **Pattern:** g. Carried element: the marker.
- **Change:** render one marker outside the tab buttons and translate it along x to `index * (barInnerWidth / tabs.length)`, using the width the bar already measures in `onLayout`. Leading edge moves first, trailing edge follows: animate `translateX` on a spring (`SPRING`) and apply a brief `scaleX` stretch of up to 1.15 mid-move that settles to 1, 400ms overall. Icon press scale (existing) stays. Optional second step, **[needs approval]** because it is router config: enable the tab navigator's `animation: 'shift'` so content enters from the side of the chosen tab. Reduced motion: marker jumps, 120ms fade.
- **Value:** High. The single most repeated navigation action.
- **Cost:** Low for the marker (one file). The content-shift option is unverified: I did not find an `animation` option in the installed `expo-router/js-tabs` typings, so confirm it exists before promising it.

### C3. Games: the tapped card becomes the difficulty panel header

> **Implemented** in `components/games/PickAGame.tsx`, `StackCard.tsx` (new `animateIn` prop, reduced-motion check), `DifficultyPanel.tsx`. Correction to the diagnosis: the difficulty panel has no header of its own, so nothing is added to it. Instead the difficulty stack grows out of the tapped card's slot (other cards fade first, the tapped card hands over at about 25–55%), and folds back into it on close. 450ms `EASE_DRAWER`; a tap during the animation retargets it. The 320ms slide-out of the whole picker is gone.

- **Where:** `components/games/PickAGame.tsx`, `StackCard.tsx`, `DifficultyPanel.tsx`; Atom Maze, MythBuster and Lab entries on the Games tab.
- **Now:** The whole card stack slides left (`gamesX → -windowWidth`) and a separate panel slides in from the right. The card you touched is gone; the panel has its own title and icon.
- **Pattern:** b. Carried element: the card's icon circle and title.
- **Change:** measure the tapped card (`measureInWindow`) and render the icon circle and title as one moving element that travels to the panel header slot, while the other cards fade and drop out over the first 30% and the panel body fades in after about 50%. The existing header arrow flip (`flip` spring) stays. Back reverses it into the same card. Keep the `-4°` slant until the card has left the stack so it does not snap. 450ms `EASE_DRAWER`. Interruptible: the shared value is driven by `withTiming`, so a second tap retargets it. `StackCard` and `PickAGame` need `useReducedMotion`. Reduced motion: keep the state change, 150ms cross-fade.
- **Value:** High. This is how every game starts; the current slide hides which game was picked.
- **Cost:** Medium. Stays inside one component with no router change. Risk: the `-4°` rotation and `StyleSheet` heights complicate measuring; verify the first and last frame on small and tablet heights.

### C4. Home path: node grows into the lesson preview

- **Where:** `app/(tabs)/index.tsx` (`handleNodePress`) → `app/lesson/[id].tsx` → `components/lesson/LessonPreview.tsx`; also `quiz/[id]`.
- **Now:** `router.push` slides a whole new screen in from the right (`slide_from_right`). The preview hero then fades in from below (`FadeInDown.springify()`).
- **Pattern:** b. Carried element: the node's icon circle into the preview hero.
- **Change:** record the node's window rect on press, then draw the node as an overlay above the stack that grows to the hero's rect (frame, corners and icon) while the preview body fades in after about 50%. On back or close, the hero shrinks into the node's current position (re-measure, since the Home map auto-scrolls). Handover: the real node is hidden while the overlay runs and shown again on landing. **[needs approval]** The lesson screen would use `animation: 'fade'` (or `none`) so the system slide does not fight the overlay; that is a change to `app/lesson/_layout.tsx` and `app/quiz/_layout.tsx`.
- **Value:** High. The app's primary action.
- **Cost:** High. Needs the shared-bounds primitive from §4, a safe fallback if the node is scrolled off screen, and care with the Home `ScrollView` auto-scroll (`computeNodeScrollY`).

### C5. Discover feed, Encyclopedia and Explorer: list item opens its detail

- **Where:** `app/(tabs)/community.tsx` (gallery card → `article-detail`), `app/encyclopedia.tsx` and `app/explorer/encyclopedia.tsx` (entry card → `encyclopedia-entry`), `app/explorer/index.tsx` and `journey.tsx` (journey and node cards). Phone and tablet.
- **Now:** `router.push` and a default slide. Detail pages then stagger in with `FadeInDown` (`article-detail` delays of 100–500ms). The card image and title do not carry.
- **Pattern:** a (title → page title, image → header) and b for the image card.
- **Change:** use the §4 primitive with ids `article:<id>:image` and `article:<id>:title`. The image grows into the header image, the title keeps its type and only scales into the page title, secondary content fades in once the move is about half done (the existing stagger already fits that, shortened). Back reverses. Same primitive for `encyclopedia:<id>:term` and `journey:<id>`. Missing image: only the title carries. Reduced motion: current behaviour with a 150ms cross-fade.
- **Value:** High for Discover and the Encyclopedia (frequent, content-heavy); Medium for Explorer.
- **Cost:** Medium. Needs C4's primitive first. Risk: `FlatList` virtualization means the source row may be unmounted when going back; fall back to a plain fade if its rect cannot be measured.

### C6. Periodic table: cell opens its element page, and prev/next swap in place

> **Prev/next implemented** in `app/periodic-table/[symbol].tsx`: the element content (hero and cards) slides out/in from the side of travel (260ms `EASE_IN_OUT`, 150ms fade-out) while the prev/next row stays in place so a second tap lands where it aims. No entrance on first open. **Not done:** the cell → hero shared-element open/close, which waits on the router decision.

- **Where:** `app/periodic-table/index.tsx` (`openElementScreen`), `components/periodic-table/ElementCell.tsx`, `ElementListRow.tsx` → `app/periodic-table/[symbol].tsx`. Prev/next uses `router.setParams`.
- **Now:** Push with a default slide. The detail hero tile (atomic number plus symbol, category colour fill) appears as a new view. Prev/next replaces the whole hero and facts instantly via `setParams`.
- **Pattern:** a / b for open and close; h for prev/next.
- **Change:** the tapped cell's tile (number, symbol, category fill, border) grows into the hero `tile`. Prev/next: the tile and facts slide out toward the direction of travel and the new element's slide in from the opposite side (about 250ms `EASE_IN_OUT`, no router change since params change in place). Grid cell sizes follow the zoom control, so measure at press time, not from constants.
- **Value:** Medium. Reference screen, used less often than the learning loop, but a perfect fit for continuity because the cell and the hero are literally the same object.
- **Cost:** Medium. Grid is a horizontally scrolling `FlatList`; same measurement fallback as C5. **[needs approval]** if the system slide must be disabled for this route.

### C7. Profile: award badge and activity strip open their details

- **Where:** `app/(tabs)/profile.tsx` (award badges → `achievement-detail`, a `presentation: "modal"` screen), `components/activity/RecentActivityStrip.tsx` → `app/streak.tsx` (shows `ContributionGraph`).
- **Now:** Badge: modal slide-up, then a staggered `FadeInDown`. The strip (the last 14 days as small squares) opens the streak screen, where the full contribution graph is drawn fresh.
- **Pattern:** b for the badge; e for the strip (small marks become the large marks).
- **Change:** badge circle and icon grow into the detail hero, rest fades in after about 50%, drag-down on the modal returns it to the badge. Strip: the 14 cells should be the same cells as the most recent 14 in the graph, scaled up with their level colours, with the label moving into the title. Reduced motion: `FadeIn.duration(120)` (`achievement-detail` already does this).
- **Value:** Medium. Occasional but emotionally important (rewards).
- **Cost:** Medium. The graph is a different layout from the strip, so only the last 14 days can match; the rest of the graph fades in.

### C8. Filters and chips: one indicator travels, results reflow

> **Partly implemented.** `components/ui/sliding-highlight.tsx` (`useSlidingHighlight`, `SlidingHighlight`) is used for the Discover category chips in `app/(tabs)/community.tsx`: one orange pill travels (400ms), chips draw their selected look only at rest. **Not done:** the periodic-table grid/list segment and category chips (the selected state changes size and adds a tick icon, so a travelling pill would jump on landing), list reflow, and search-field-to-top-row.

- **Where:** `app/(tabs)/community.tsx` (category chips, search), `app/periodic-table/index.tsx` (grid/list segment, category chips, search), `app/encyclopedia.tsx` (search, letter filter).
- **Now:** The selected chip changes its own fill and border; nothing travels. Results swap instantly except in the Encyclopedia, which already uses `LinearTransition.duration(220)`. Searching does not move the field or show a Cancel.
- **Pattern:** g for chips and segments; h for result lists; d for search (the field moves up while the title leaves).
- **Change:** segmented control (grid/list) gets a travelling thumb (400ms, stretch and settle as in C2). Chip rows keep their per-chip style but add a shared highlight that slides between chips. List results use `layout={LinearTransition…}` with `entering`/`exiting` fades on items that appear or leave, copying what `encyclopedia.tsx` already does. Search-field-to-top-row is **optional** and lower value on these screens, since the field is already at the top; skip unless asked.
- **Value:** Medium (frequent but low disorientation, since the controls stay put).
- **Cost:** Low to Medium. `FlatList` layout animations are limited; `LinearTransition` is only reliable on non-virtualized or short lists. Do not apply it to the periodic table grid.

### C9. Guide: the tapped pill becomes the learner's message

- **Where:** `app/(tabs)/chat.tsx`, `components/guide/Pill.tsx`, `GuideBubble.tsx`. Pills call `handlePillPress` → `applySelection`, which appends turns.
- **Now:** Tapping a pill sets `pendingPill` and the engine appends turns; the new user bubble and Shrodi's reply appear as new rows.
- **Pattern:** c / h. Carried element: the pill's text into the user bubble.
- **Change:** measure the pill, then move its label to the new user-bubble position (about 350ms `EASE_DRAWER`) while sibling pills fade out in the first 30% and the reply fades in after about 50%. New turns appear in place, existing turns shift to make room (`LinearTransition`). Reduced motion: 120ms fade.
- **Value:** Medium. Guide is a major tab, but turns are short and the layout is already chat-shaped, so people are less lost.
- **Cost:** Medium to High. Turns live in an engine state array and a `ScrollView`; auto-scroll and keyboard handling interact with measured positions.

### C10. Modals and small panels grow from their control

> **Partly implemented.** `components/ui/grow-modal.tsx` (`GrowModal`, `GrowCard`, `useModalOrigin`) used for the How to Play modal (`PickAGame.tsx`) and the App Version modal (`app/settings.tsx`). The card scales and translates from the control's centre and shrinks back on close; callers still just toggle `visible`. **Not done:** row stagger inside the card, the delete-account modal (opened from an Alert, no control to grow from), `BetaNoticeModal` (opens on launch). Start position uses `measureInWindow`, so on Android the path may be offset by the status-bar height; the end frames are exact.

- **Where:** `PickAGame` How to Play (`?` button), `settings` version and delete-account modals, `BetaNoticeModal`.
- **Now:** RN `<Modal animationType="fade">`: a scrim fade, with an inner card that either pops in with `FadeInDown` or appears static.
- **Pattern:** f. Carried element: the control that opened it.
- **Change:** the card scales and translates from the button's corner (transform-origin at the button, 350ms `EASE_DRAWER`), the card is opaque the whole way, and its rows fade in about 25ms apart once it is mostly open. Closing reverses to the button. `BetaNoticeModal` already checks `useReducedMotion`; extend it. Focus returns to the control on close (`accessibilityViewIsModal` is already set).
- **Value:** Low. Short, optional panels.
- **Cost:** Low per modal, but RN's `Modal` renders in a separate native window, so measuring the source is the only coupling.

### Not proposed

- **Onboarding steps** (`splash` → `features` → `profile`): a linear first-run flow that already staggers content; continuity gains are small relative to the cost.
- **Quiz and MythBuster results, Lab, Atom Maze** screens: bespoke game surfaces with their own animation logic (and `atom-maze.tsx` is ~2,900 lines); revisit after C1–C5.
- **Settings → Privacy / Terms:** low-frequency text pages.

## 4. How to build it on this stack

One shared mechanism rather than ten bespoke ones.

1. **Shared-bounds registry** (new, `components/layout/` or `theme/`): a tiny module that records `{ id, rect, borderRadius, snapshot }` in window coordinates when a source element is pressed, and exposes the target's rect when the destination mounts. Sources and targets register by `id` (for example `article:abc:image`).
2. **Overlay layer:** a transform-only element rendered above the stack at the root (`app/_layout.tsx`), drawn from the source rect to the target rect with `translateX/Y` and `scale`. Never animate `width`, `height`, `top` or `margin`. Corner radius interpolates between the two. The source and target are hidden (`opacity: 0`) while it runs and restored on landing. Hand-over frame must match exactly.
3. **Reuse tokens:** `EASE_DRAWER` and `DURATION`/`SPRING` from `theme/motion.ts`. Add `DURATION.expand: 500` and `DURATION.sheet: 400` to that file rather than hardcoding in screens.
4. **Reduced motion:** the overlay is skipped; the destination fades in over 150ms (`FadeIn.duration(120–150)`, as already used).
5. **Gestures:** swipe-back and drag-to-dismiss must drive the same progress value as the button. Native-stack swipe-back is system-driven, so C4–C6 either accept a plain system gesture back (the shared element simply is not animated on the gesture path) or the route uses a JS-driven dismiss. Decide per item; this is the main product-level trade-off.
6. **Do not use** Reanimated `sharedTransitionTag` (flag off, experimental) or `Link.AppleZoom` (iOS-only) as the foundation. Revisit if the flag is enabled in a future SDK.

C1, C2, C3, C8 and C10 need none of this: they are single-component changes.

## 5. Constraints

- No new dependency; no router change without asking. Items flagged **[needs approval]**: route `animation` options for `lesson`, `quiz`, `periodic-table`; tab content `animation`.
- Theme rules apply (`createStyles`, semantic roles, `check:theme-colors`); do not add static `StyleSheet.create` with colours, and register any new exception in `docs/THEME_EXCEPTION_REGISTER.md`.
- Layout primitives (`ScreenFrame`, `ResponsiveContainer`, `tab-bar-inset`) must keep their safe-area and tab-bar clearance at every frame of an animation. `npm run check:tab-bar` must still pass.
- Media policy: no change. Transitions must not start or stop Read Aloud on their own; the existing lifecycle in `services/media.ts` stays authoritative.
- Content: no DB change. Nothing in this spec edits `content.db`; `sync-content` is not needed for these changes.

## 6. Acceptance checklist (per item)

- First and last frame equal the real states; nothing jumps at hand-over.
- Real data: long and short titles, missing image, first and last item, empty list, scrolled list, large font scale.
- Fast repeated taps, back during the animation, and a half-way cancelled gesture. A new action takes over from the current position and input is never blocked.
- Phone and tablet widths, light and dark, reduced motion on, TalkBack and VoiceOver.
- Accessibility: focus lands on the new heading or first control and returns to the opener on close; announcements as today.
- At rest, every screen looks identical to before.
- Run: `npm run typecheck`, `npm run lint`, `npm run check:theme-colors`, `npm run test:theme`, `npm run check:tab-bar`, plus `npm run test:visuals` / `test:periodic` for lesson and periodic-table items.
- Verify on a release-like Android build, not only Expo Go (per `CLAUDE.md`).

## 7. Suggested order and next step

| Order | Item | Value | Cost |
| --- | --- | --- | --- |
| 1 | C1 Lesson steps | High | Low |
| 2 | C2 Tab bar marker | High | Low |
| 3 | C3 Games card → panel | High | Medium |
| 4 | C8 Segment and chip indicators | Medium | Low–Medium |
| 5 | C10 Modals from their control | Low | Low |
| 6 | C4 Home node → lesson preview (introduces the §4 primitive) | High | High |
| 7 | C5 List → detail (Discover, Encyclopedia, Explorer) | High | Medium |
| 8 | C6 Periodic table | Medium | Medium |
| 9 | C7 Profile badge and strip | Medium | Medium |
| 10 | C9 Guide pills | Medium | Medium–High |

**Open decisions for the owner:**

1. Which items to build (suggested first batch: C1, C2, C3).
2. Whether C4–C6 may set `animation: 'fade'` on their routes, and whether a non-animated shared element on the system swipe-back gesture is acceptable.
3. Whether the tab content should also shift from the chosen side (C2, optional).

No code changes are made until items are picked and the per-item approach and file list are agreed.
