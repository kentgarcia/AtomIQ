# 007 — Make the game progress bar glide via scaleX

- **Status**: TODO
- **Commit**: 58ecc8d
- **Severity**: MEDIUM
- **Category**: 5. Performance / 8. Missed opportunities
- **Estimated scope**: 1 file (`app/mythbuster/index.tsx`), ~3 edits

## Problem

The Myth Buster progress fill teleports: each answer re-renders it with a new
percentage `width` style (a layout jump, not an animation), ~10× per game.
Its `entering={FadeInDown.duration(300)}` only fires on first mount (the
component never remounts during a round) and slides the wrong way for a
progress bar. The app already owns the correct pattern one file over:
`app/(tabs)/index.tsx:346-355` animates a fill with `scaleX` +
`transformOrigin: "left"`.

Current code — JSX at `app/mythbuster/index.tsx:1301-1312`:

```tsx
                {selectedMode.id !== "endless" && (
                  <Animated.View
                    entering={FadeInDown.duration(300)}
                    style={[
                      styles.progressFill,
                      {
                        width: `${((currentIndex + 1) / myths.length) * 100}%`,
                        backgroundColor: selectedMode.color,
                      },
                    ]}
                  />
                )}
```

Current style at line 1828-1831:

```ts
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
```

## Target

A UI-thread glide: a shared value goes `0 → (currentIndex+1)/myths.length`
with `withTiming(..., { duration: 300, easing: EASE_OUT })`, and the fill
renders it as `scaleX` from a left origin. The misleading `entering` is
removed.

## Repo conventions to follow

- `EASE_OUT` const from plan 005 — execute 005 first.
- Fill-at-scale exemplar: `app/(tabs)/index.tsx:346-355` —
  `transformOrigin: "left"`, `transform: [{ scaleX: Math.max(0.08, fill.get()) }]`,
  driven by `withTiming(fill.set(...), { duration: 300, easing: EASE_OUT })`.
  (This game bar uses a smaller `Math.max(0.001, ...)` floor since 0% is a
  legitimate state at round start.)
- Reanimated 4's `ReduceMotion.System` default handles OS reduced motion.

## Steps

1. Add the shared value, animated style, and effect next to the other
   game shared values (near lines 171-179, after `loseExplosionFlashOpacity`):

   ```ts
   const progress = useSharedValue(0);
   const progressFillStyle = useAnimatedStyle(() => ({
     transformOrigin: "left",
     transform: [{ scaleX: Math.max(0.001, progress.value) }],
   }));
   ```

2. Add this effect anywhere among the component's other top-level
   `useEffect`s (example location: right after the timer-wiggle effect
   ending at line 248):

   ```ts
   useEffect(() => {
     progress.value = withTiming(
       selectedMode.id === "endless" ? 0 : (currentIndex + 1) / myths.length,
       { duration: 300, easing: EASE_OUT },
     );
   }, [currentIndex, myths.length, selectedMode.id, progress]);
   ```

3. Replace the progress fill JSX (lines 1301-1312) with:

   ```tsx
                {selectedMode.id !== "endless" && (
                  <Animated.View
                    style={[
                      styles.progressFill,
                      { backgroundColor: selectedMode.color },
                      progressFillStyle,
                    ]}
                  />
                )}
   ```

   (Drops the `entering` and the inline percentage width.)

4. In `progressFill` (line 1828-1831) add a full-width base so scaleX has
   something to scale:

   ```ts
   progressFill: {
     height: "100%",
     width: "100%",
     borderRadius: 4,
   },
   ```

## Boundaries

- Do NOT touch `progressBar` (the track) or anything else in the header.
- Do NOT restyle other bars; the results screen is not in scope.
- One file only: `app/mythbuster/index.tsx`.

## Verification

- **Mechanical**: `npx tsc --noEmit` passes; `npx eslint app/mythbuster/index.tsx` shows only the 3 pre-existing warnings (the new `useEffect` deps are complete — no new warnings expected).
- **Feel check** (play one quick round):
  - Between questions the bar glides smoothly from one position to the next
    (fast start, gentle stop) — never jumps.
  - It starts empty (or near-empty) at round start, grows left-to-right only.
  - Challenge-mode restart: bar resets with an animated glide, not a flash.
  - At 10% playback, the fill grows from the left edge.
- **Done when**: the fill width never appears to jump and scaleX drives it.