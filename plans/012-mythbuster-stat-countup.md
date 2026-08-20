# 012 — Count the results stats up on the summary card

- **Status**: TODO
- **Commit**: 58ecc8d
- **Severity**: LOW
- **Category**: 8. Missed opportunities (payoff moment)
- **Estimated scope**: 1 file (`app/mythbuster/index.tsx`), ~3 edits

## Problem

The results summary card is the game's payoff screen, and its three stat
numbers (`Correct`, `Wrong`, `Accuracy`) arrive as dead text. Stat counts
that settle into place are the cheapest way to make a results moment feel
earned.

Current code at `app/mythbuster/index.tsx:1069-1110` (excerpt — the three
value `Text`s):

```tsx
                          <Text
                            style={[styles.resultStatValue, { color: textColor }]}
                          >
                            {correctAnswers}
                          </Text>
...
                          <Text
                            style={[styles.resultStatValue, { color: textColor }]}
                          >
                            {wrongAnswers}
                          </Text>
...
                          <Text
                            style={[styles.resultStatValue, { color: textColor }]}
                          >
                            {accuracy}%
                          </Text>
```

Targets are computed at lines 853-858:
`const correctAnswers = answers.filter((a) => a).length;` / `accuracy` /
`wrongAnswers = totalAnswered - correctAnswers;`.

## Target

On entering the results screen, each number springs from 0 to its value
(spring: `damping 20, stiffness 120` — a slow, single settle, spread over
~600ms), rendered via `useAnimatedProps` on a `createAnimatedComponent(Text)`:

- Correct → `0 → correctAnswers`
- Wrong → `0 → wrongAnswers`
- Accuracy → `0 → accuracy`, rendered with a trailing `%`

## Repo conventions to follow

- `Animated.createAnimatedComponent(Text)` + `useAnimatedProps` is the
  standard Reanimated pattern for animating text content; `withSpring`
  is already imported (line 38).
- Spring shape follows AUDIT.md: `{ duration: 0.5, bounce: 0.2 }` — with
  Reanimated's `spring`-params that's `damping ≈ 16-20, stiffness ≈
  100-140`; the plan uses `damping: 20, stiffness: 120` (near-zero bounce,
  count-up feel).
- The counts ride the same spring target so all three settle in time.

## Steps

1. Next to the other shared values (~line 176), add:

   ```ts
   const statCorrect = useSharedValue(0);
   const statWrong = useSharedValue(0);
   const statAccuracy = useSharedValue(0);
   const statCorrectProps = useAnimatedProps(() => ({
     text: `${Math.round(statCorrect.value)}`,
   }));
   const statWrongProps = useAnimatedProps(() => ({
     text: `${Math.round(statWrong.value)}`,
   }));
   const statAccuracyProps = useAnimatedProps(() => ({
     text: `${Math.round(statAccuracy.value)}%`,
   }));
   ```

   And near the other `useEffect`s (e.g. after the progress effect from
   plan 007):

   ```ts
   useEffect(() => {
     if (gameState === "results") {
       statCorrect.value = withSpring(correctAnswers, { damping: 20, stiffness: 120 });
       statWrong.value = withSpring(wrongAnswers, { damping: 20, stiffness: 120 });
       statAccuracy.value = withSpring(accuracy, { damping: 20, stiffness: 120 });
     }
   }, [gameState, correctAnswers, wrongAnswers, accuracy, statCorrect, statWrong, statAccuracy]);
   ```

   (Access `correctAnswers` / `accuracy` / `wrongAnswers` from the same
   computation as the results JSX — they are local consts inside the
   results branch at lines 853-858, so compute them at the top level of
   the component instead: `const correctAnswers = myths.slice(0, resultsAnsweredCount).filter((m) => answers[m.originalIndex]).length;` —
   or, minimally, add a second computation `const totalAnswered = ...;
   const correctAnswers = ...; const wrongAnswers = ...; const accuracy =
   ...;` from `answers` at the top level next to the other stats used by
   hooks. Keep the exact same math as lines 846-858 and do not duplicate
   mode filters.)

2. Add the animated Text component after the reanimated import block:

   ```ts
   const AnimatedText = Animated.createAnimatedComponent(Text);
   ```

3. Replace the three value `Text` elements (lines 1069-1110) with
   `AnimatedText` carrying the props:

   ```tsx
   <AnimatedText
     animatedProps={statCorrectProps}
     style={[styles.resultStatValue, { color: textColor }]}
   />
   ```

   Same for `statWrongProps` / `statAccuracyProps` (the accuracy one keeps
   the trailing `%` purely inside `statAccuracyProps`).

## Boundaries

- Do NOT touch the stat labels, the header pill, XP badge, or the mascot.
- Do NOT change the results pager/gesture code from plan 005.
- If `animatedProps` text fails to render on a platform (known quirk with
  older bridged builds), STOP and report — do NOT swap to a JS-interval
  countdown without checking in.
- One file only: `app/mythbuster/index.tsx`.

## Verification

- **Mechanical**: `npx tsc --noEmit` passes; `npx eslint app/mythbuster/index.tsx` shows only the 3 pre-existing warnings.
- **Feel check** (finish a round, watch card 1):
  - The three stats visibly count up from 0 and settle within ~0.7s of the
    results screen appearing.
  - The `%` sign is present the whole time (it's baked into the text prop).
  - Switching All/Missed tabs and back: values stay settled (no re-count).
- **Done when**: correct/wrong/accuracy count up on the results screen and
  stay rendered after tab switches.