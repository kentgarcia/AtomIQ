# 001 — Make the Myth Buster swipe dismiss on fling velocity

- **Status**: TODO
- **Commit**: 36e3fe3
- **Severity**: HIGH
- **Category**: 4. Interruptibility (velocity-based gesture dismissal)
- **Estimated scope**: 1 file, ~6 lines

## Problem

In the Myth Buster game, the truth/myth card dismissal is decided purely by a distance
threshold. A fast, decisive fling that travels less than 30% of the screen width snaps
back to center instead of dismissing — the card fights the user's gesture. Nothing else
in the app feels like this; the swipe is the game's primary gesture and it is the only
non-physical interaction in the codebase.

Current code at `app/mythbuster/index.tsx:528-555` (verbatim):

```ts
  const gesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
      rotate.value = interpolate(
        event.translationX,
        [-width / 2, 0, width / 2],
        [-15, 0, 15],
      );
    })
    .onEnd((event) => {
      if (Math.abs(event.translationX) > SWIPE_THRESHOLD) {
        const direction = event.translationX > 0 ? "truth" : "myth";

        // Animate out
        translateX.value = withSpring(event.translationX > 0 ? width : -width, {
          velocity: event.velocityX,
        });
        opacity.value = withTiming(0, { duration: 200 });

        runOnJS(handleSwipe)(direction);
      } else {
        // Spring back
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        rotate.value = withSpring(0);
      }
    });
```

`SWIPE_THRESHOLD` is defined at `app/mythbuster/index.tsx:44` as `const SWIPE_THRESHOLD = width * 0.3;`.

The exit already passes `velocity: event.velocityX` into `withSpring` — that half is right.
The bug is the *decision* to dismiss, which ignores velocity entirely.

## Target

Dismiss when the user is either past the distance threshold **or** flinging fast enough.
Velocity-only dismissal bound, per the audit rule "dismiss on
`Math.abs(distance)/elapsedMs > ~0.11`, not distance thresholds alone": 0.11 px/ms ≈
110 px/s, and Gesture Handler reports `velocityX` in px/s.

The `.onEnd` block becomes:

```ts
    .onEnd((event) => {
      const isFling =
        Math.abs(event.velocityX) > 110; // |Δd|/Δt > 0.11 px/ms, per audit rule
      if (Math.abs(event.translationX) > SWIPE_THRESHOLD || isFling) {
        const direction = event.translationX > 0 ? "truth" : "myth";

        // Animate out
        translateX.value = withSpring(event.translationX > 0 ? width : -width, {
          velocity: event.velocityX,
        });
        opacity.value = withTiming(0, { duration: 200 });

        runOnJS(handleSwipe)(direction);
      } else {
        // Spring back
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        rotate.value = withSpring(0);
      }
    });
```

Direction still comes from `event.translationX` — a fling must keep the sign of the
release position, so the card always flies out on the same side it was heading.
`110` is the audit-derived bound; if the feel-check below shows casual slow drags
dismissing, raise it to `250` — that is the intended tuning range (roughly a swipe
across a third of a ~375pt-wide screen in under 300ms).

## Repo conventions to follow

- The exit spring already existed: `withSpring(event.translationX > 0 ? width : -width, { velocity: event.velocityX })` — do not change it, do not restyle the card.
- `withTiming(0, { duration: 200 })` for the fade-out stays as-is (matches `durations.normal: 200` in `theme/tokens.ts:344-350`).
- Reanimated 4 defaults to `ReduceMotion.System` — with OS "reduce motion" enabled, the springs and timings resolve to near-instant automatically. No manual gating needed; do not add any.

## Steps

1. In `app/mythbuster/index.tsx`, in the `Gesture.Pan().onEnd` callback (line 538),
   replace the single condition:

   ```ts
       if (Math.abs(event.translationX) > SWIPE_THRESHOLD) {
   ```

   with:

   ```ts
       const isFling =
         Math.abs(event.velocityX) > 110; // |Δd|/Δt > 0.11 px/ms, per audit rule
       if (Math.abs(event.translationX) > SWIPE_THRESHOLD || isFling) {
   ```

2. Leave everything else in the callback untouched (direction string, exit spring,
   opacity timing, `runOnJS(handleSwipe)`, and the spring-back branch).

## Boundaries

- Do NOT touch `SWIPE_THRESHOLD` (line 44) or any other part of the game logic.
- Do NOT change the exit spring config, the `translateY`/`rotate` gestures, or any styles.
- Do NOT add dependencies or modify other files.
- If the `.onEnd` block no longer matches the excerpt above (drift since commit
  36e3fe3), STOP and report instead of improvising.

## Verification

- **Mechanical**: `npx tsc --noEmit` and `npm run lint` from the repo root — must pass with no new errors.
- **Feel check** (run `npm start`, play one Myth Buster round on a real device or simulator):
  - Slow drag past 30% of screen width: card flies out (unchanged behavior).
  - Slow drag under 30% and release: card springs back (unchanged behavior).
  - **Fast flick** — finger moves ~25% of the width and releases at speed: card flies out in the flick direction. This is the fix; before it, the card snapped back.
  - Fast flick at 10% playback (Android/iOS slow-motion animator) still resolves outward, never mid-air reversal.
- **Done when**: a short-but-fast flick dismisses the card, a slow drag of the same distance does not, and `tsc`/lint pass.