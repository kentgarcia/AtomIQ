# 014 — Fade between the game's three screens

- **Status**: TODO
- **Commit**: 58ecc8d
- **Severity**: LOW
- **Category**: 8. Missed opportunities (state-change continuity)
- **Estimated scope**: 1 file (`app/mythbuster/index.tsx`), ~2 edits

## Problem

The game swaps between `intro → playing → results` by replacing the entire
render tree — the backdrop gradient and all content change on one frame
(no router transition; it's a `gameState` switch inside one screen). The
tree rose in once on intro (line 716's `FadeInDown`), then playing and
results both just appear with a hard cut.

Current code — playing root at `app/mythbuster/index.tsx:1257-1262`:

```tsx
  // Playing state
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.fullScreen}>
        <LinearGradient
          colors={appSky}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
```

Results root at lines 862-873 (same shape — `<View style={styles.fullScreen}>`
+ absolute-fill gradient). Both roots close with `</View>` just before
`</GestureHandlerRootView>`.

## Target

The playing and results roots fade in over 200ms (`FadeIn`, linear-free —
uses `EASE_OUT`), bridging the tree swap without touching gesture code.
Intro is left alone — it has its own staged `FadeInDown.delay(200)`.

## Repo conventions to follow

- `EASE_OUT` from plan 005 — execute 005 first.
- `FadeIn` needs adding to the reanimated import (line 31-40).
- 200ms = `durations.normal` in `theme/tokens.ts:344-350`; deliberate —
  fast enough that the game never feels delayed, slow enough to read as a
  screen change.

## Steps

1. Add `FadeIn` to the reanimated import block:

   ```ts
   import Animated, {
     Easing,
     FadeIn,
     FadeInDown,
     FadeInUp,
     FadeOutDown,
     ...
   ```

2. Playing root (line 1260): `<View style={styles.fullScreen}>` →
   `<Animated.View entering={FadeIn.duration(200).easing(EASE_OUT)} style={styles.fullScreen}>`,
   and its closing `</View>` (just before `</GestureHandlerRootView>` at
   the end of the playing return, ~line 1625) → `</Animated.View>`.

3. Results root (line 867): same two transforms applied to the results
   `return`. Locate the results closing `</View>` before
   `</GestureHandlerRootView>` (~line 1252) and change it to
   `</Animated.View>`.

   Verify the pairing by indentation and the `{/* Header */}` comment
   inside results and the `cardContainer` inside playing.

## Boundaries

- Do NOT touch the intro `return` (line 648) — it keeps its own entrance.
- Do NOT add `exiting` or keyed transitions; unmounting screens vanish, the
  fade covers the mount.
- Do NOT touch the `<LinearGradient>` absolute-fill inside either root.
- One file only: `app/mythbuster/index.tsx`.

## Verification

- **Mechanical**: `npx tsc --noEmit` passes; `npx eslint app/mythbuster/index.tsx` shows only the 3 pre-existing warnings.
- **Feel check**:
  - `Start` → the playing screen fades in (content + backdrop together)
    instead of popping.
  - Finishing a round → the results screen fades in.
  - Intro keeps its existing delayed rise (unchanged).
  - Cards still swipe mid-fade; buttons remain tappable during the 200ms
    (fade is one-shot, no `pointerEvents` games).
- **Done when**: both transitions read as a ~200ms fade and no gesture
  regressions appear in a full round.