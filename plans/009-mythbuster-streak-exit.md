# 009 — Let the streak banner exit instead of vanishing

- **Status**: TODO
- **Commit**: 58ecc8d
- **Severity**: MEDIUM
- **Category**: 4. Interruptibility / 8. Missed opportunities
- **Estimated scope**: 1 file (`app/mythbuster/index.tsx`), ~1 edit

## Problem

The streak banner enters with `FadeInDown.springify()` but when the streak
breaks it unmounts instantly — in the exact moment it matters (a wrong
answer), the banner pops out of existence. A state change that should
acknowledge the streak's end has zero closing motion.

Current code at `app/mythbuster/index.tsx:1347-1351`:

```tsx
        {streak > 1 && (
          <Animated.View
            entering={FadeInDown.springify()}
            style={styles.streakBannerContainer}
          >
```

## Target

Enter with the app's fixed-duration language (matching the intro container
at line 716), exit with a quick, visible retreat:

```tsx
          <Animated.View
            entering={FadeInDown.duration(260).easing(EASE_OUT)}
            exiting={FadeOutDown.duration(150).easing(EASE_OUT)}
            style={styles.streakBannerContainer}
          >
```

## Repo conventions to follow

- `EASE_OUT` from plan 005 — execute 005 first.
- Fixed-duration entering/exiting with the repo curve matches
  `LinearTransition.duration(260).easing(EASE_OUT)` at
  `app/(tabs)/index.tsx:639`.
- The banner currently uses the default springify — this plan standardizes
  it; no other layout animation in this file uses a custom spring.

## Steps

1. Add `FadeOutDown` to the reanimated import block (line 31-40):

   ```ts
   import Animated, {
     Easing,
     FadeInDown,
     FadeOutDown,
     ...
   ```

2. Replace the streak banner props (lines 1347-1351) with:

   ```tsx
        {streak > 1 && (
          <Animated.View
            entering={FadeInDown.duration(260).easing(EASE_OUT)}
            exiting={FadeOutDown.duration(150).easing(EASE_OUT)}
            style={styles.streakBannerContainer}
          >
   ```

## Boundaries

- Do NOT touch the banner's content (gradient, icon, text) or its styles.
- Do NOT change the `{streak > 1 &&` condition.
- One file only: `app/mythbuster/index.tsx`.

## Verification

- **Mechanical**: `npx tsc --noEmit` passes; `npx eslint app/mythbuster/index.tsx` shows only the 3 pre-existing warnings.
- **Feel check** (play a round, get a 3-streak, then answer wrong):
  - The banner slides down and fades out over ~150ms as the streak breaks.
  - Winning answers still pop the banner in from above.
  - It never exits on the same frame it appears.
- **Done when**: streak-break shows the banner sliding away, and entering
  uses `EASE_OUT`.