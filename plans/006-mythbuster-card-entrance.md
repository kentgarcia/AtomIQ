# 006 — Animate the statement card into place instead of teleporting

- **Status**: TODO
- **Commit**: 58ecc8d
- **Severity**: HIGH
- **Category**: 1. Purpose & frequency / 3. Physicality & origin
- **Estimated scope**: 1 file (`app/mythbuster/index.tsx`), ~3 edits

## Problem

Every statement swap in the game teleports. Sequence: the card springs off to
±screen-width, a static ghost card ("Next statement...") sits revealed for
300ms, then `setTimeout` resets `translateX/rotate/opacity` to 0 (lines
432-439 and 470-475) and the SAME `Animated.View` instance now shows the new
statement — instantly re-appearing at center with zero motion. The game's
~10×-per-round moment has no entrance, and the "Next statement..." ghost
(`app/mythbuster/index.tsx:1398-1405`) reads like unfinished scaffolding.

Current code — the ghost and card (lines 1398-1420):

```tsx
          {/* Next card preview (if exists) */}
          {currentIndex < myths.length - 1 && (
            <View style={[styles.card, styles.cardBehind]}>
              <View style={styles.cardContent}>
                <Text style={styles.cardStatement}>Next statement...</Text>
              </View>
            </View>
          )}

          {/* Current card */}
          {currentMyth && (
            <GestureDetector gesture={gesture}>
              <Animated.View style={[styles.card, animatedStyle]}>
```

The reset callbacks (lines 432-439, excerpt):

```ts
      setTimeout(() => {
        setCurrentIndex((i) => i + 1);
        translateX.value = 0;
        translateY.value = 0;
        rotate.value = 0;
        opacity.value = 1;
        setIsAnimating(false); // Re-enable buttons
      }, 300);
```

## Target

The front card remounts per round (key) and enters with the app's motion
language — the same `FadeInDown` the rest of this screen already uses
(intro container line 716, streak banner line 1349), now with the repo's
`EASE_OUT` curve. The ghost card is deleted; the revealed background during
the 300ms exit gap is plain, and the new card rises+unfades into place.

## Repo conventions to follow

- `EASE_OUT` const comes from plan 005 — execute 005 first.
- `FadeInDown` is already imported (line 32); fixed-duration entering with
  explicit easing matches the app's `LinearTransition.duration(260).easing(EASE_OUT)`
  pattern at `app/(tabs)/index.tsx:639`.
- The swap logic (`setTimeout` + value resets) stays untouched — the keyed
  remount makes the entrance play on the new statement with no logic change.

## Steps

1. Delete the ghost block (lines 1398-1405, quoted above) entirely —
   the `{/* Next card preview (if exists) */}` comment and its JSX.

2. Key the card and give it an entrance (lines ~1408-1410):

   ```tsx
   {currentMyth && (
     <GestureDetector gesture={gesture}>
       <Animated.View
         key={`${currentMyth.id}-${currentIndex}`}
         entering={FadeInDown.duration(260).easing(EASE_OUT)}
         style={[styles.card, animatedStyle]}
       >
   ```

   The key includes `currentIndex` so every round remounts even if the same
   myth repeats back-to-back (endless mode after all myths have been shown).

3. Remove the now-dead `cardBehind` style (lines 1925-1928):

   ```ts
   cardBehind: {
     transform: [{ scale: 0.95 }],
     opacity: 0.5,
   },
   ```

   `cardContent` and `cardStatement` are still used by the main card (lines
   1484-1489) — do NOT remove them.

## Boundaries

- Do NOT touch the `setTimeout` swap callbacks (432-439, 470-475) or the
  gesture/animated values.
- Do NOT restyle the card, the statement text, or `styles.card`.
- `cardBehind` is the only style removed here.
- One file only: `app/mythbuster/index.tsx`.

## Verification

- **Mechanical**: from repo root, `npx tsc --noEmit` passes; `npx eslint app/mythbuster/index.tsx` shows only the 3 pre-existing warnings.
- **Feel check** (play one quick round):
  - After swiping a card away, a moment later the next statement rises up
    and fades in from just below its final position — never pops.
  - The "Next statement..." placeholder is gone.
  - At 10% playback (slow-motion animator): entrance resolves top-to-bottom
    with a fast start (ease-out).
  - In endless mode (repeat answers until a myth repeats): every round still
    animates in.
- **Done when**: no ghost text is visible anywhere and each new statement
  animates in.