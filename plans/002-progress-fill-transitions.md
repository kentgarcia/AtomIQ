# 002 — Animate the two progress-bar fills (quiz header, missions hero)

- **Status**: TODO
- **Commit**: 36e3fe3
- **Severity**: MEDIUM
- **Category**: 8. Missed opportunities (state that teleports)
- **Estimated scope**: 2 files, ~15 lines each

## Problem

Two progress bars jump in whole steps with no bridge — the visual equivalent of a
teleporting state. The fill snaps to its new width the instant the underlying state
changes, so the user never sees the movement between "question 3 of 10" and
"question 4 of 10".

Site A — quiz header, `app/quiz/[id].tsx:344-346` (verbatim):

```tsx
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
          </View>
```

`progress` is a percentage computed at `app/quiz/[id].tsx:92`:
`const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;`

`progressBarFill` is `app/quiz/[id].tsx:609-613` (verbatim):

```ts
    progressBarFill: {
      height: "100%",
      backgroundColor: theme.primary,
      borderRadius: 6,
    },
```

Site B — missions hero, `app/missions.tsx:126-133` (verbatim):

```tsx
            {/* Progress bar */}
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.max(6, progressFraction * 100)}%` },
                ]}
              />
            </View>
```

`progressFraction` is `app/missions.tsx:85`:
`const progressFraction = missions.length ? completedCount / missions.length : 0;`
`progressFill` is `app/missions.tsx:359-363` (height 100%, borderRadius 6, backgroundColor BTN_COLOR).

## Target

Both fills glide to their new value with `withTiming` at `durations.slow` (300ms,
`theme/tokens.ts:344-350`) — under the 300ms UI budget, and retargetable so rapid
question/claim transitions never restart from zero (audit rule 4: use transitions,
not keyframes, for rapidly-triggered UI).

Implementation: the fill becomes a fixed full-width bar whose `scaleX` is animated from
a shared value, with `transformOrigin: "left"` so it grows left→right. This keeps the
motion on the GPU (transform only — audit rule 5) instead of animating `width` (layout).

Site A target — IMPORTANT correction: in `app/quiz/[id].tsx` the `progress` computation
sits at line 92, AFTER two early returns (`if (isLoading)` at line 67, `if (!quiz)` at
line 75). Hooks (useSharedValue/useEffect/useAnimatedStyle) may NOT be placed after
conditional returns — `react-hooks/rules-of-hooks` errors. The shared value, effect and
animated style must be declared at component top level, BEFORE the `if (isLoading)`
guard, with a null-safe progress value; the old `progress` line at line 92 is then
deleted (the header bar only renders in the main return, where `quiz` is non-null and
the formula is identical):

```tsx
  const loadingStyles = React.useMemo(() => createStyles(THEME), [THEME]);

  const progress = quiz
    ? ((currentQuestionIndex + 1) / Math.max(1, quiz.questions.length)) * 100
    : 0;
  const fillProgress = useSharedValue(progress / 100);
  useEffect(() => {
    fillProgress.value = withTiming(progress / 100, { duration: 300 });
  }, [progress, fillProgress]);
  const fillStyle = useAnimatedStyle(() => ({
    transformOrigin: "left",
    transform: [{ scaleX: fillProgress.value }],
  }));

  if (isLoading) {
```

(`Math.max(1, ...)` is a division-by-zero guard only; with a non-empty quiz it computes
the same value as `totalQuestions`. The first mount's `withTiming` call targets the same
value the shared value was initialized to, so no sweep happens on screen entry — the
bar only moves when `progress` actually changes, i.e. per answered question.)

Progress bar JSX — the inline `width` template literal is removed and the fill gets a
full-width base:

```tsx
          <View style={styles.progressBarBg}>
            <Animated.View style={[styles.progressBarFill, fillStyle]} />
          </View>
```

with `styles.progressBarFill` gaining `width: "100%"` (keep height, backgroundColor,
borderRadius as-is). `scaleX` of 1 = 100% of the track; the existing full-height pill
shape (radius 6 on a 12pt bar) is preserved at every scale value.

Site B target: identical pattern, value `Math.max(0.06, progressFraction)` (keeps the
existing 6% minimum so an empty bar still shows a sliver — never `scaleX` 0):

```tsx
  const heroFill = useSharedValue(Math.max(0.06, progressFraction));
  useEffect(() => {
    heroFill.value = withTiming(Math.max(0.06, progressFraction), { duration: 300 });
  }, [progressFraction, heroFill]);
  const heroFillStyle = useAnimatedStyle(() => ({
    transformOrigin: "left",
    transform: [{ scaleX: heroFill.value }],
  }));
```

JSX:

```tsx
            <View style={styles.progressTrack}>
              <Animated.View style={[styles.progressFill, heroFillStyle]} />
            </View>
```

with `styles.progressFill` gaining `width: "100%"`.

Reduced motion: Reanimated 4 defaults to `ReduceMotion.System`, so when the OS setting
is on these `withTiming` calls resolve to near-instant — the bar still updates (feedback
stays), movement drops. No manual gating.

Note: file 001 is independent of this file; both may be executed in any order.

## Repo conventions to follow

- Reanimated is already imported in both files: `Animated, { … } from "react-native-reanimated"`. Site A additionally imports `Easing, FadeInDown, FadeOutDown, useAnimatedStyle, useSharedValue, withRepeat, withTiming` (line 25-32); `withTiming` is already available. Site B imports only `FadeInDown` today (line 13) — extend that import with `useAnimatedStyle, useSharedValue, withTiming`; `useEffect` is already imported (line 11).
- Shared-value + `useAnimatedStyle` pattern already used across the app, e.g. `components/games/StackCard.tsx:60-63`:

```tsx
  const pressScale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));
```

- Duration from tokens: `durations.slow = 300` (`theme/tokens.ts:348`). Inline the literal `300` (these files don't import the tokens module; co-locating the shared value in each component stays consistent with the codebase's inline `withTiming(0, { duration: 200 })` style).

## Steps

Site A (`app/quiz/[id].tsx`):

1. Extend the reanimated import (line 24, currently `import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";`) with `useAnimatedStyle, useSharedValue, withTiming`.
2. Immediately after the `loadingStyles` memo (line 65) and BEFORE the `if (isLoading)` guard (line 67), insert the null-safe `progress` computation + shared value + effect + animated style (Target above).
3. Delete the old `const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;` line (line 92) — `totalQuestions` and `currentQuestion` stay.
4. Replace lines 344-346 JSX with the `Animated.View` version.
5. In `createStyles` (line 609), add `width: "100%"` to `progressBarFill`.

Site B (`app/missions.tsx`):

4. Extend the reanimated import (line 13) with `useAnimatedStyle, useSharedValue, withTiming`.
5. After `progressFraction` (line 85), add the shared value + effect + animated style (as in Target above).
6. Replace lines 126-133 JSX with the `Animated.View` version.
7. In `createStyles` (line 359), add `width: "100%"` to `progressFill`.

## Boundaries

- Do NOT change track styles, colors, border radii, or the 6% minimum logic.
- Do NOT introduce a shared/util module — the shared value stays local per component.
- Do NOT animate any other element on either screen (question card, options, mission cards, result screens are all out of scope).
- Do NOT add dependencies.
- If either excerpt no longer matches the code at the cited lines (drift since commit 36e3fe3), STOP and report instead of improvising.

## Verification

- **Mechanical**: `npx tsc --noEmit` and `npm run lint` from the repo root — must pass.
- **Feel check**:
  - Quiz: answer a question, tap CONTINUE — the header fill glides to the next step over ~300ms. It must not jump, and must not lag a beat after the question card swaps (both change on the same state flip; if the fill feels late, move the effect's `withTiming` onto the same render as the question — it already is: the effect fires on `progress` change, which is the same render as the new question).
  - Spam-proofing: answer questions as fast as possible; the fill smoothly retargets mid-flight, never snaps back to zero and re-animates (that would mean it is being remounted — check keys are untouched).
  - Missions: claim a mission from the missions screen — hero fill glides up one step; claim nothing — no fill movement on screen open (initial value is set, effect runs once harmlessly).
  - OS "reduce motion" on: fills still update but without travel.
- **Done when**: both fills glide at 300ms when their state changes, jump-free, and typecheck/lint pass.