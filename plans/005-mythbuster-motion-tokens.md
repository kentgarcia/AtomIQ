# 005 — Adopt the app's motion tokens in Myth Buster

- **Status**: TODO
- **Commit**: 58ecc8d
- **Severity**: MEDIUM
- **Category**: 2. Easing & duration / 7. Cohesion & tokens
- **Estimated scope**: 1 file (`app/mythbuster/index.tsx`), ~10 edits

## Problem

Every `withTiming` in the Myth Buster game uses Reanimated's default easing
(symmetric in/out — starts slow), so the results-pager snap, the lose
explosion, and the three swipe-out card fades all ease in slowly before moving.
The app already has a motion-token convention that this file ignores:
`app/(tabs)/index.tsx:110-113` defines `PRESS_EASING` and `EASE_OUT` per file.
This plan introduces the same curves here and applies `EASE_OUT` to every
fixed-duration timing in the game.

Current code (all at `app/mythbuster/index.tsx`, commit 58ecc8d):

At line 31-40 — reanimated import block (no `Easing`):

```ts
import Animated, {
  FadeInDown,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from "react-native-reanimated";
```

At line 68 — `const APP_SKY_LIGHT: [string, string] = ["#FFF3E0", "#FFE4C4"];`
(the last const before the `type GameState` declarations).

Timing sites with default easing:

1. Line 247 — `timerWiggle.value = withTiming(0, { duration: 120 });`
2. Lines 513-524 — four calls:
   `loseExplosionScale.value = withTiming(1.45, { duration: LOSE_EXPLOSION_DURATION_MS });`,
   `loseExplosionRingScale.value = withTiming(2.4, { duration: LOSE_EXPLOSION_DURATION_MS });`,
   `loseExplosionOpacity.value = withTiming(0, { duration: LOSE_EXPLOSION_DURATION_MS });`,
   `loseExplosionFlashOpacity.value = withTiming(0, { duration: LOSE_EXPLOSION_DURATION_MS });`
3. Line 557 (card gesture `.onEnd`) — `opacity.value = withTiming(0, { duration: 200 });`
4. Lines ~1510 and ~1550 (MYTH / FACT button `onPress`) —
   `opacity.value = withTiming(0, { duration: 200 });`
5. Lines 601-608 (results pager snap) —
   `resultRowX.value = withTiming(-next * RESULTS_STEP + RESULTS_CARD_OFFSET, { duration: 250 });`

## Target

The same two curves the rest of the app already uses, defined locally (the
repo convention is per-file consts, not a shared module):

```ts
// Motion tokens — same curves as app/(tabs)/index.tsx:110-113
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const PRESS_EASING = Easing.bezier(0.4, 0, 0.2, 1);
```

Every timing site above gains `easing: EASE_OUT`. Durations stay exactly as
they are (120 / 200 / 250 / 700ms) — this plan changes easing only.

## Repo conventions to follow

- Home tab exemplar: `app/(tabs)/index.tsx:110-113` defines the same two
  consts; `:354` uses `{ duration: 300, easing: EASE_OUT }`; `:1080-1083` uses
  `{ duration: 150, easing: PRESS_EASING }`.
- `PRESS_EASING` is defined here as a prerequisite for plan 008 — do not use
  it in this plan.
- Do not touch any `withSpring` call; spring configs are out of scope.

## Steps

1. In `app/mythbuster/index.tsx` line 31-40, add `Easing` to the reanimated
   named imports:

   ```ts
   import Animated, {
     Easing,
     FadeInDown,
     interpolate,
     runOnJS,
     useAnimatedStyle,
     useSharedValue,
     withRepeat,
     withSpring,
     withTiming,
   } from "react-native-reanimated";
   ```

2. Immediately after the `APP_SKY_LIGHT` const (line 68), add:

   ```ts
   // Motion tokens — same curves as app/(tabs)/index.tsx:110-113
   const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
   const PRESS_EASING = Easing.bezier(0.4, 0, 0.2, 1);
   ```

3. Line 247:
   `timerWiggle.value = withTiming(0, { duration: 120 });` →
   `timerWiggle.value = withTiming(0, { duration: 120, easing: EASE_OUT });`

4. Lines 513-524: add `easing: EASE_OUT` to all four explosion timings
   (scale, ring, opacity, flash). Example result:

   ```ts
   loseExplosionScale.value = withTiming(1.45, {
     duration: LOSE_EXPLOSION_DURATION_MS,
     easing: EASE_OUT,
   });
   ```

5. Line 557 (gesture `.onEnd` fade-out):
   `opacity.value = withTiming(0, { duration: 200 });` →
   `opacity.value = withTiming(0, { duration: 200, easing: EASE_OUT });`

6. The same change at the two button `onPress` callbacks (~lines 1510 and
   1550).

7. Lines 601-608 (results pager snap): add `easing: EASE_OUT` to the timing
   options object.

## Boundaries

- Do NOT change any duration value.
- Do NOT touch `withSpring` calls, gesture handlers, or styles.
- `PRESS_EASING` is defined but unused in this plan (plan 008 uses it) — ESLint
  will not flag top-level consts, but if it does, the plan is wrong somewhere:
  STOP and report.
- If any excerpt above no longer matches the file (drift since 58ecc8d),
  locate the same code by content and apply the same change; only skip the
  step if the site no longer exists.
- One file only: `app/mythbuster/index.tsx`.

## Verification

- **Mechanical**: from repo root, `npx tsc --noEmit` must pass; `npx eslint app/mythbuster/index.tsx` must show only the 3 pre-existing hook-dependency warnings.
- **Feel check** (run `npm start`, play one round):
  - Results: swiping to the next review card now decelerates into place
    (fast start, gentle stop) instead of moving at even speed.
  - Lose explosion in endless mode: the burst starts snappy instead of
    easing in.
  - Swipe a card away in slow motion (10% playback): the card is near-faded
    out well before it leaves the screen — the fade is quick to start.
- **Done when**: all timing sites carry `easing: EASE_OUT` and the results
  snap visibly decelerates.