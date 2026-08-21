# 016 — Tone down tab bar press to 0.97 and remove spring bounce

- **Status**: TODO
- **Commit**: 45c9f92
- **Severity**: HIGH
- **Category**: Purpose & frequency / Physicality & origin
- **Estimated scope**: 1 file, ~6 lines

## Problem

`app/(tabs)/_layout.tsx:58` animates core navigation on every tab tap:

```tsx
// app/(tabs)/_layout.tsx:58 — current
  const handlePress = () => {
    void playButtonClickSfx();
    scale.value = withSpring(0.9, { damping: 10 }, () => {
      scale.value = withSpring(1, { damping: 10 });
    });
    onPress();
  };
```

With `scale` applied at `app/(tabs)/_layout.tsx:64-65`:

```tsx
// app/(tabs)/_layout.tsx:64 — current
  <Animated.View style={animatedStyle}>
    <View style={styles.iconContainer}>
```

Per AUDIT.md §1, tab bar is hit tens/day (core navigation) — "tens of times/day: Remove or drastically reduce". `scale(0.9)` is a 10% shrink, far outside the subtle `0.95–0.98` press band, and `withSpring` adds visible bounce (damping 10) on an element that should feel instant like Raycast's palette (no animation is optimal). The spring is also non-deterministic and stacks when tabs are spammed.

Existing press token in the repo is `PRESS_EASING = Easing.bezier(0.4, 0, 0.2, 1)` with `150ms` at `app/(tabs)/index.tsx:109` and `withTiming(150)` at `app/(tabs)/index.tsx:1108`, and the shared `EASE_OUT` for UI.

## Target

Replace the bouncy heavy press with the repo's subtle, interruptible transition:

```tsx
// target
  const handlePress = () => {
    void playButtonClickSfx();
    scale.value = withTiming(0.97, { duration: 100, easing: Easing.bezier(0.23, 1, 0.32, 1) });
    onPress();
  };
  // release back via withTiming 160ms EASE_OUT — or drive via isFocused re-render
```

Or, if the spring is kept, at least `scale(0.97)` with `withSpring({ damping: 20, stiffness: 400 })` and no second spring. The bar should feel crisp, not bouncy. Keep `transform: scale` + `opacity` only.

## Repo conventions to follow

- Press feedback exemplar: `app/(tabs)/index.tsx:1108` `pressed.value = withTiming(1, { duration: 150, easing: PRESS_EASING })` for lesson nodes — subtle, `150ms`, `0.95–0.98` band.
- Easing token `EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1)` is defined at `app/(tabs)/index.tsx:113` and `app/(tabs)/profile.tsx:44` — use it, do not introduce a new bezier.
- Do not add `transition: all`; keep `transform` only (already via `animatedStyle`).

## Steps

1. **Edit `app/(tabs)/_layout.tsx:48-59`**: Replace `withSpring(0.9…)` / `withSpring(1…)` with:
   ```ts
   import { Easing, withTiming } from "react-native-reanimated";
   const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
   // in handlePress
   scale.value = withTiming(0.97, { duration: 100, easing: EASE_OUT });
   setTimeout(() => { scale.value = withTiming(1, { duration: 160, easing: EASE_OUT }); }, 100);
   ```
   Alternatively, drive `scale` from `isFocused` or press state via `useAnimatedStyle` + `withTiming`, no manual `setTimeout` if already using `pressed` shared value pattern. Keep the single `Animated.View` wrapper.

2. **Remove the nested `withSpring` callback**. The second `withSpring(1…)` inside the first's completion is the bounce source — delete.

3. **Verify no `scale(0.9)` remains** in `_layout.tsx`.

## Boundaries

- Do NOT change `ModernTabBar` layout, `TAB_ICONS`, `activeMarker`, or navigation logic.
- Do NOT change `playButtonClickSfx` timing.
- Do NOT switch to CSS `transition: all`.
- If `scale` is not at `_layout.tsx:48` at commit `45c9f92`, STOP.

## Verification

- **Mechanical**: `npx tsc --noEmit` 0 errors; `npx eslint app/\(tabs\)/_layout.tsx` 0 errors.
- **Feel check**: Tap tabs rapidly 10× on a real device:
  - Each tap shows a subtle 3% shrink, no bounce, snaps back in ~160ms.
  - At 10% playback in DevTools Animations panel, confirm `transform: scale` only, `EASE_OUT`, no spring overshoot.
  - Spam taps never queues a bouncy tail.
  - With `prefers-reduced-motion` (future), scale should degrade to `0.99` or opacity only — note for plan 018.
- **Done when**: `scale(0.9)` and `withSpring` with damping 10 are gone from `_layout.tsx`, and tab taps feel instant, not playful.

