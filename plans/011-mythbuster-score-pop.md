# 011 — Pop the score badge on XP gain

- **Status**: TODO
- **Commit**: 58ecc8d
- **Severity**: LOW
- **Category**: 8. Missed opportunities (delight)
- **Estimated scope**: 1 file (`app/mythbuster/index.tsx`), ~3 edits

## Problem

Earning XP is the game's payoff signal, and it arrives as silent digits
changing in a badge — ~10× per round, always with zero feedback. The badge
already reads as a "coin counter"; a small scale pulse lands the gain.

Current code at `app/mythbuster/index.tsx:1316-1326`:

```tsx
            <View
              style={[
                styles.scoreContainer,
                { backgroundColor: cardColor, borderColor },
              ]}
            >
              <Icon name="Flash" size={16} color={THEME.gold} variant="Bold" />
              <Text style={[styles.scoreText, { color: textColor }]}>
                {score}
              </Text>
            </View>
```

Score state is declared at line 157: `const [score, setScore] = useState(0);`.

## Target

When the score increases, the badge pops: scale up 12% and lift 4px over a
fast ease-out, then settle back over 200ms. Falls (game restart) are
excluded — only increases pulse.

```tsx
            <Animated.View
              style={[
                styles.scoreContainer,
                { backgroundColor: cardColor, borderColor },
                scorePulseStyle,
              ]}
            >
              <Icon name="Flash" size={16} color={THEME.gold} variant="Bold" />
              <Text style={[styles.scoreText, { color: textColor }]}>
                {score}
              </Text>
            </Animated.View>
```

## Repo conventions to follow

- `EASE_OUT` from plan 005 — execute 005 first.
- `withSequence` is exported by `react-native-reanimated` (import it).
- Pop-burst shape — fast in (120ms ease-out), slow return (200ms ease-out)
  — mirrors plan 004's claimed-pop timing on the shared Button
  (`plans/004-button-press-scale.md`) and stays under the 300ms UI budget.

## Steps

1. Add `withSequence` to the reanimated import block (line 31-40).

2. Next to the other shared values (~line 176), add:

   ```ts
   const scorePulse = useSharedValue(0);
   const prevScore = useRef(score);
   const scorePulseStyle = useAnimatedStyle(() => ({
     transform: [
       { scale: 1 + 0.12 * scorePulse.value },
       { translateY: -4 * scorePulse.value },
     ],
   }));
   ```

   Add this effect (top-level, with the other effects, e.g. after the
   wiggle effect at line 248):

   ```ts
   useEffect(() => {
     if (score > prevScore.current) {
       prevScore.current = score;
       scorePulse.value = withSequence(
         withTiming(1, { duration: 120, easing: EASE_OUT }),
         withTiming(0, { duration: 200, easing: EASE_OUT }),
       );
     }
   }, [score, scorePulse]);
   ```

3. Change the score badge's outer `<View` (line 1316) to `<Animated.View`
   and add `scorePulseStyle` to its style array; close with
   `</Animated.View>` (line 1326). Lines 1317-1325 stay identical.

   Note: `prevScore` must be updated on reset too, or a restart could
   pulse-first-answer wrongly — the `score > prevScore.current` guard
   already prevents that: restart drops the score, so no pulse fires.

## Boundaries

- Do NOT animate the score Text, the XP badge on the results screen, or
  any other component.
- Do NOT add audio/haptics.
- One file only: `app/mythbuster/index.tsx`.

## Verification

- **Mechanical**: `npx tsc --noEmit` passes; `npx eslint app/mythbuster/index.tsx` shows only the 3 pre-existing warnings.
- **Feel check** (play one round):
  - On every correct answer the badge grows ~12% and lifts a hair, then
    settles — noticeable but not loud.
  - Wrong answers / no-XP rounds: no pulse.
  - Restarting the game with a high score → answering correctly: pulses
    normally, and the restart itself does not pulse.
- **Done when**: badge pops on XP gain and the sequence is 120ms in /
  200ms out.