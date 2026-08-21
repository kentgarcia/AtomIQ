# 018 — Branch all motion on prefers-reduced-motion (keep opacity, drop movement)

- **Status**: TODO
- **Commit**: 45c9f92
- **Severity**: MEDIUM
- **Category**: Accessibility
- **Estimated scope**: 4 files, ~40 lines

## Problem

Only `app/explorer/atom-maze.tsx:39,274,280` respects reduced motion:

```ts
// app/explorer/atom-maze.tsx:39 — current (the only handling)
    useReducedMotion,
...
// app/explorer/atom-maze.tsx:274 — current
  const reducedMotion = useReducedMotion();
...
// app/explorer/atom-maze.tsx:280 — current
    if (reducedMotion) {
```

Every other animated surface ignores it — per AUDIT.md §6 this is a finding. Movement with no `prefers-reduced-motion` handling fails accessibility, and the correct implementation is *fewer and gentler* animations, not zero (keep `opacity`/`color`, drop `transform`/`translate`/`scale`/`rotate`).

Affected surfaces (grep `reanimated` without `useReducedMotion`):

- `app/(tabs)/profile.tsx:31` `Animated` + `FadeInDown` / `LinearTransition` / `withTiming(550)` flip — no branching
- `app/(tabs)/leaderboard.tsx:26` `FadeInDown` / `LinearTransition` / `withRepeat` pulse — no branching
- `app/(tabs)/index.tsx:27` `FadeInDown` / `ZoomIn` / `withRepeat` pulse — no branching
- `app/(tabs)/community.tsx:13` mascot float `withTiming` — no branching
- `app/achievement-detail.tsx:8` `FadeInDown` group — no branching

Hover gating is not needed in React Native, but reduced-motion is.

## Target

Branch every motion value on `useReducedMotion()` — keep `opacity`/`color`, drop `transform` movement, shorten durations:

```ts
// target — pattern to apply in each file
import { useReducedMotion } from "react-native-reanimated";
// inside component
const reducedMotion = useReducedMotion();

// example: profile flip
  const frontStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 800 }, { rotateY: `${flipped.value * (reducedMotion ? 0 : 180)}deg` }],
    opacity: reducedMotion ? 1 : (flipped.value < 0.5 ? 1 : 0),
  }));

// example: entering
  entering={reducedMotion ? FadeIn.duration(120) : FadeInDown.springify()}
  layout={reducedMotion ? undefined : LinearTransition.duration(260).easing(EASE_OUT)}

// example: pulse
  useEffect(() => {
    if (reducedMotion) { pulse.value = 1; return; }
    pulse.value = withRepeat(withTiming(1.02, { duration: 1000 }), -1, true);
  }, [reducedMotion]);
```

Keep `FadeIn`/`FadeOut` opacity-only for reduced-motion, drop `scale`/`translateY`/`rotateY`.

## Repo conventions to follow

- Exemplar: `app/explorer/atom-maze.tsx:274-290` already does `const reducedMotion = useReducedMotion(); if (reducedMotion) { … }` and branches `progress` animation — imitate this file's import and early-return pattern.
- Do not nuke all feedback — per AUDIT.md §6, "Reduced motion means fewer and gentler animations, not zero" — keep `opacity` transitions at `120-180ms`.
- Use the existing `EASE_OUT` where timing remains; for reduced-motion use `duration: 120` with `Easing.linear` or `FadeIn`.

## Steps

1. **Add import** in each target file (`profile.tsx:31`, `leaderboard.tsx:26`, `index.tsx:27`, `community.tsx:13`, `achievement-detail.tsx:8`):
   ```ts
   import { useReducedMotion } from "react-native-reanimated";
   ```

2. **Add hook** at top of each component:
   ```ts
   const reducedMotion = useReducedMotion();
   ```

3. **Branch `profile.tsx`**:
   - `frontStyle`/`backStyle` at `profile.tsx:248-261`: wrap `rotateY` in `reducedMotion ? 0 : …`, keep `opacity` as above (no `perspective` rotation when reduced).
   - `cardHeightStyle` is being removed by plan 015; if still present, branch to `height: frontHeight || 240` with no interpolation.
   - `entering` props at `profile.tsx:322,431` and `celebrationOverlay`: `reducedMotion ? FadeIn.duration(120) : FadeInDown…`
   - `layout` props: `reducedMotion ? undefined : LinearTransition…`

4. **Branch `leaderboard.tsx`**:
   - `pulse` at `leaderboard.tsx:224-228`: early return when `reducedMotion`.
   - `entering`/`layout` at `leaderboard.tsx:388,534,597`: branch as above.

5. **Branch `index.tsx`**:
   - `pulse` at `index.tsx:1097`, `pressed` at `1108`, `fill` at `352`, `entering` at `642,718,835` etc.: branch to `withTiming` `120ms` opacity-only or `scale 0.99`.

6. **Branch `community.tsx` mascot float** at `community.tsx:142-147`: when `reducedMotion`, set `mascotY`/`mascotRotate` to `0` with no `withRepeat`.

7. **Branch `achievement-detail.tsx`** at `achievement-detail.tsx:116-229`: replace `FadeInDown.delay(n).springify()` with `reducedMotion ? FadeIn.duration(120) : FadeInDown…`.

## Boundaries

- Do NOT remove motion entirely — keep `opacity`/`color` for comprehension.
- Do NOT add `prefers-reduced-motion` CSS media queries (React Native uses JS hook).
- Do NOT change non-motion logic, data fetching, or navigation.
- If a file already has `useReducedMotion` at commit `45c9f92` (only `atom-maze.tsx` should), skip it.

## Verification

- **Mechanical**: `npx tsc --noEmit` 0 errors; `npx eslint app/\(tabs\)/profile.tsx app/\(tabs\)/leaderboard.tsx app/\(tabs\)/index.tsx` 0 errors.
- **Feel check**: Enable `prefers-reduced-motion` in OS (or `Accessibility > Reduce motion` on iOS, `Rendering > Emulate prefers-reduced-motion` in DevTools):
  - Profile flip becomes a cross-fade (no `rotateY`), title panel height still animates but without `scale`.
  - Leaderboard podium pulse stops, list still fades in via `opacity` only.
  - Home nodes still press but with `scale 0.99` max, no bounce.
  - No surface teleports or vanishes — `opacity` bridges remain.
- **Done when**: Every file that imports `react-native-reanimated` also imports `useReducedMotion` and branches at least one `transform`/`layout` prop.

