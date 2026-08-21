# 015 — Replace profile flip height layout animation with transform-friendly layout

- **Status**: TODO
- **Commit**: 45c9f92
- **Severity**: HIGH
- **Category**: Performance
- **Estimated scope**: 1 file, ~15 lines

## Problem

`app/(tabs)/profile.tsx:263` animates layout via `height` — a non-composited property that triggers layout + paint + composite on every frame:

```ts
// app/(tabs)/profile.tsx:263 — current
  const cardHeightStyle = useAnimatedStyle(() => ({
    height: interpolate(
      flipped.value,
      [0, 1],
      [frontHeight || 240, backHeight || 240],
    ),
  }));
```

Used at `app/(tabs)/profile.tsx:353`:

```tsx
// app/(tabs)/profile.tsx:353 — current
          <Animated.View style={cardHeightStyle}>
```

The flip container's height is driven by `flipped.value` (0→1, 550ms `withTiming`). While `transform`/`opacity` on `frontStyle`/`backStyle` are GPU-composited, the parent `height` forces Yoga layout recalculation for the amber outer `profileCard` and its siblings on every frame. On mid-tier Android this drops frames during the 550ms 3D rotation — the only full-screen card flip in the app. Audit §5 requires `transform`/`opacity` only.

The outer already has `layout={LinearTransition.duration(260).easing(EASE_OUT)}` at `app/(tabs)/profile.tsx:322`, which will animate its own height via Reanimated's layout system when children change, making the manual `height` redundant and double-animating.

## Target

Remove the manual `height` style and let Reanimated layout handle the height change. The flip still rotates via `frontStyle`/`backStyle` (GPU), while the outer `profileCard` resizes via `LinearTransition`:

```tsx
// target — app/(tabs)/profile.tsx:263 removed, outer keeps layout
        <Animated.View
          entering={FadeInDown.springify()}
          layout={LinearTransition.duration(260).easing(EASE_OUT)}
          style={styles.profileCard}
        >
          <View style={styles.profileCardHeader}>…</View>
          {/* No cardHeightStyle — natural height, faces remain absolute */}
          <View style={styles.flipClip}>
            <Animated.View style={[styles.cardFace, frontStyle]}>…</Animated.View>
            <Animated.View style={[styles.cardFace, backStyle]}>…</Animated.View>
          </View>
          {showTitleProgress && <Animated.View … style={styles.titleProgressPanel} />}
        </Animated.View>
```

If a fixed-height clip is still needed to avoid overlap during rotation, use a non-animated `minHeight: 240` placeholder or `transform: scaleY` on an inner wrapper — never animated `height`/`width`.

## Repo conventions to follow

- Easing token `EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1)` is already defined at `app/(tabs)/profile.tsx:44` and `app/(tabs)/index.tsx:113` — reuse, do not re-declare.
- Layout animation exemplar: `app/(tabs)/profile.tsx:322` already does `layout={LinearTransition.duration(260).easing(EASE_OUT)}` on the outer; extend this pattern, do not add a parallel `withTiming` height.
- Flip exemplar: `app/(tabs)/profile.tsx:248-261` `frontStyle`/`backStyle` correctly use `transform: rotateY` + `opacity` — keep.

## Steps

1. **Delete `cardHeightStyle`** at `app/(tabs)/profile.tsx:263-269`:
   ```ts
   const cardHeightStyle = useAnimatedStyle(() => ({
     height: interpolate(
       flipped.value,
       [0, 1],
       [frontHeight || 240, backHeight || 240],
     ),
   }));
   ```
   Remove the `interpolate` import if now unused (keep `useAnimatedStyle` for `frontStyle`/`backStyle`).

2. **Replace the height-driven wrapper** at `app/(tabs)/profile.tsx:353`:
   ```tsx
   // before
   <Animated.View style={cardHeightStyle}>
   // after
   <View style={styles.flipClip}>
   ```
   Define `flipClip` in `createStyles` as `{ position: "relative", minHeight: 240 }` (no animated height). Keep the two `Animated.View` faces inside with `position: "absolute", top:0, left:0, right:0` as they already are — they do not need a height parent.

3. **Ensure outer retains layout**. Confirm `app/(tabs)/profile.tsx:322` still reads:
   ```tsx
   <Animated.View
     entering={FadeInDown.springify()}
     layout={LinearTransition.duration(260).easing(EASE_OUT)}
     style={styles.profileCard}
   >
   ```
   No change needed; this now drives the height change when `frontHeight`/`backHeight` update via `onLayout`.

4. **Keep `frontHeight`/`backHeight` state** for measurement only (used for `minHeight` fallback) — do not animate from them.

## Boundaries

- Do NOT touch `frontStyle`/`backStyle` transforms, `flipped` shared value, `withTiming(550)`, or `LinearTransition` duration/easing.
- Do NOT change markup beyond replacing `Animated.View style={cardHeightStyle}` with a static `View`.
- Do NOT add new dependencies.
- If `cardHeightStyle` no longer exists at commit `45c9f92` (drift), STOP and report.

## Verification

- **Mechanical**: `npx tsc --noEmit` — 0 errors. `npx eslint app/\(tabs\)/profile.tsx` — 0 errors (pre-existing warnings okay).
- **Feel check**: On a mid-tier Android device, tap the `ChartSquare` flip button (header) repeatedly, including mid-flip:
  - Outer amber card resizes smoothly via layout, no jank or content jump.
  - In DevTools Animations panel at 10%, confirm no `height` frames — only `transform: rotateY` + `opacity` on faces, `layout` on outer.
  - Spamming the flip never leaves the card at a half-height or clipped; faces remain hidden via `opacity` guard + `backfaceVisibility`.
  - Toggle `prefers-reduced-motion` (not yet implemented, but check no regression).
- **Done when**: No `height`/`width` in any `useAnimatedStyle` in `profile.tsx`, and flip at 60fps on a 2021 Android.

