# 010 — Give the timer's last-3-seconds warning a physical wiggle

- **Status**: TODO
- **Commit**: 58ecc8d
- **Severity**: LOW
- **Category**: 2. Easing & duration
- **Estimated scope**: 1 file (`app/mythbuster/index.tsx`), ~2 edits

## Problem

In challenge mode, when time hits ≤3s the timer icon trembles with a fixed
120ms timing pulse at ±2.5px / ±10deg (a `withRepeat` of `withTiming` with
the default even easing). It reads as a mechanical glitch rather than
agitation — dead-even amplitude, no personality.

Current code at `app/mythbuster/index.tsx:239-248`:

```ts
      timerWiggle.value = withRepeat(
        withTiming(1, { duration: 120 }),
        -1,
        true,
      );
      return;
    }

    timerWiggle.value = withTiming(0, { duration: 120 });
```

And the style mapping at lines 626-631:

```ts
  const timerIconWiggleStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(timerWiggle.value, [0, 1], [-2.5, 2.5]) },
      { rotate: `${interpolate(timerWiggle.value, [0, 1], [-10, 10])}deg` },
    ],
  }));
```

## Target

A spring-driven pulse — each half-cycle eases naturally, so the icon
"shakes" with friction instead of square-wave jitter. Slightly larger
amplitude for legibility; the retarget-to-zero on clear stays a quick
120ms ease-out.

```ts
      timerWiggle.value = withRepeat(
        withSpring(1, { damping: 10, stiffness: 180 }),
        -1,
        true,
      );
      return;
    }

    timerWiggle.value = withTiming(0, { duration: 120, easing: EASE_OUT });
```

Amplitudes become ±3.5px translate and ±12deg rotate.

## Repo conventions to follow

- `EASE_OUT` from plan 005 — execute 005 first.
- Springs carry the app's other repeating ambient motion
  (`app/(tabs)/community.tsx:141-147` uses `withRepeat` + `withTiming` for a
  mascot bob — this plan is the first repeating *spring*; damping 10 /
  stiffness 180 gives a gentle double-settle per cycle, not a hard bounce).
- The two other `withTiming` calls in this effect are handled by plan 005
  (the `easing: EASE_OUT` on line 247) — if 005 already ran, line 247 is
  already updated.

## Steps

1. Replace the warning repeat (lines 239-243) with:

   ```ts
      timerWiggle.value = withRepeat(
        withSpring(1, { damping: 10, stiffness: 180 }),
        -1,
        true,
      );
   ```

2. Update the interpolation ranges (lines 628-629):

   ```ts
   { translateX: interpolate(timerWiggle.value, [0, 1], [-3.5, 3.5]) },
   { rotate: `${interpolate(timerWiggle.value, [0, 1], [-12, 12])}deg` },
   ```

## Boundaries

- Do NOT change when the wiggle starts (the `timeLeft <= 3` condition) or
  the `timerBadge` styles.
- Do NOT change the timer's countdown text behavior.
- One file only: `app/mythbuster/index.tsx`.

## Verification

- **Mechanical**: `npx tsc --noEmit` passes; `npx eslint app/mythbuster/index.tsx` shows only the 3 pre-existing warnings.
- **Feel check** (play challenge mode, let the timer hit 3s):
  - The icon shakes with a springy settle per cycle — not a uniform
    metronome tremble.
  - The pulse is still clearly a warning (readable as agitation).
  - Answer or timer reset: the icon returns to rest with a quick ease-out.
- **Done when**: the wiggle reads as agitation with friction and the clear
  uses `EASE_OUT`.