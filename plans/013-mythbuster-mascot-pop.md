# 013 — Pop the results mascot into view

- **Status**: TODO
- **Commit**: 58ecc8d
- **Severity**: LOW
- **Category**: 8. Missed opportunities (payoff moment)
- **Estimated scope**: 1 file (`app/mythbuster/index.tsx`), ~1 edit

## Problem

The results card's mascot (`happy.png` or `fix.png`) and its emoji are the
payoff's emotional tether, and they simply appear when the screen mounts —
a dead-image pop on the game's celebration screen.

Current code at `app/mythbuster/index.tsx:1016-1038` (excerpt):

```tsx
                    <View style={styles.resultHeroArea}>
                      <Image
                        source={
                          accuracy >= 50
                            ? require("@/assets/images/mascot/happy.png")
                            : require("@/assets/images/mascot/fix.png")
                        }
                        style={styles.resultHeroMascot}
                        resizeMode="contain"
                      />
                      <Text style={styles.resultHeroEmoji}>
                        {performance.emoji}
                      </Text>
```

## Target

The mascot + emoji group rises and un-fades into place on screen mount —
`FadeInUp`, 260ms, `EASE_OUT` — same curves and durations as the statement
card entrance (plan 006). Small movement (FadeInUp's default offset) so it
reads as settling, not bouncing.

## Repo conventions to follow

- `EASE_OUT` from plan 005 — execute 005 first.
- `FadeInUp` needs adding to the reanimated import (line 31-40); the
  existing file already uses `FadeInDown` for its other entrances — this is
  the first upward entrance on the results screen.
- Fixed 260ms + `EASE_OUT` matches plan 006's entering and the app's
  `LinearTransition.duration(260).easing(EASE_OUT)` exemplar.

## Steps

1. Add `FadeInUp` to the reanimated import block:

   ```ts
   import Animated, {
     Easing,
     FadeInDown,
     FadeInUp,
     FadeOutDown,
     ...
   ```

2. Wrap the mascot + emoji group (lines 1017-1037 in their current form)
   in an entering-animated view:

   ```tsx
                    <View style={styles.resultHeroArea}>
                      <Animated.View
                        entering={FadeInUp.duration(260).easing(EASE_OUT)}
                        style={{ alignItems: "center" }}
                      >
                        <Image
                          source={
                            accuracy >= 50
                              ? require("@/assets/images/mascot/happy.png")
                              : require("@/assets/images/mascot/fix.png")
                          }
                          style={styles.resultHeroMascot}
                          resizeMode="contain"
                        />
                        <Text style={styles.resultHeroEmoji}>
                          {performance.emoji}
                        </Text>
                      </Animated.View>
   ```

   (The wrapper's `alignItems: "center"` preserves the current centering of
   the emoji under the mascot; `resultHeroArea` already centers its own
   children. Keep the closing tags balanced — the wrapper closes before
   the XP badge block.)

## Boundaries

- Do NOT animate the XP badge, the performance title, or the stats; the
  count-up plan 012 handles the stats separately.
- Do NOT re-key or re-entrance the card itself.
- One file only: `app/mythbuster/index.tsx`.

## Verification

- **Mechanical**: `npx tsc --noEmit` passes; `npx eslint app/mythbuster/index.tsx` shows only the 3 pre-existing warnings.
- **Feel check** (finish a round with ≥50% and one with <50%):
  - The mascot rises ~24px and un-fades into place over ~260ms on results.
  - The emoji rides with it; nothing else on the card moves.
- **Done when**: both mascot variants enter with FadeInUp + EASE_OUT.