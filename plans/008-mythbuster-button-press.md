# 008 — Give MYTH/FACT presses the app's 150ms press motion

- **Status**: TODO
- **Commit**: 58ecc8d
- **Severity**: MEDIUM
- **Category**: 3. Physicality & origin / 7. Cohesion & tokens
- **Estimated scope**: 1 file (`app/mythbuster/index.tsx`), ~4 edits

## Problem

The MYTH and FACT buttons snap: `onPressIn` toggles React state
(`pressedBtn`) and styles swap instantly (button translateY 4, lip 4→2,
face inset 4→2) with no timing — every tap in the game has zero press
motion. The home tab's buttons animate presses with a shared value and
`PRESS_EASING` at 150ms (`app/(tabs)/index.tsx:1080-1083`).

Current code (excerpts at `app/mythbuster/index.tsx`, commit 58ecc8d):

State at line 164:
```ts
  const [pressedBtn, setPressedBtn] = useState<"myth" | "truth" | null>(null);
```

MYTH button wrapper (lines ~1500-1531, excerpt):
```tsx
            <TouchableOpacity
              style={[
                styles.actionButton,
                pressedBtn === "myth" && styles.actionButtonPressed,
              ]}
              onPress={() => { ... }}
              onPressIn={() => setPressedBtn("myth")}
              onPressOut={() => setPressedBtn(null)}
              activeOpacity={1}
              disabled={isAnimating}
            >
              <View
                style={[
                  styles.actionButtonLip,
                  { backgroundColor: THEME.dangerDark },
                  pressedBtn === "myth" && styles.actionButtonLipPressed,
                ]}
              />
              <View
                style={[
                  styles.actionButtonFace,
                  { backgroundColor: THEME.error },
                  pressedBtn === "myth" && styles.actionButtonFacePressed,
                ]}
              >
```
(The FACT button mirrors this with `"truth"` / `THEME.success` /
`THEME.successDark`.)

Pressed styles (lines ~2060-2080):
```ts
  actionButtonPressed: {
    transform: [{ translateY: 4 }],
  },
  actionButtonLipPressed: {
    top: 2,
  },
  actionButtonFacePressed: {
    bottom: 2,
  },
```

## Target

Press motion driven by shared values with `withTiming(..., { duration: 150,
easing: PRESS_EASING })` — the button sinks 4px, the lip compresses from 4
to 2, the face descends from `bottom: 4` to `bottom: 2` — all smoothly, all
retargetable (press again mid-animation just re-runs it).

- Unpressed: lip `top: 0`, face `bottom: 4`, button `translateY 0`
- Pressed: lip `top: 2`, face `bottom: 2`, button `translateY 4`

i.e. lip top = `pressed * 2`, face bottom = `4 - pressed * 2`,
button translateY = `pressed * 4`.

## Repo conventions to follow

- `PRESS_EASING` and `EASE_OUT` consts come from plan 005 — execute 005
  first.
- Press-by-shared-value exemplar: `app/(tabs)/index.tsx:1080-1083`
  (`pressed.value = withTiming(1, { duration: 150, easing: PRESS_EASING })`)
  and the `nodeStyle` transform at `:1085-1090`.
- `Animated.createAnimatedComponent(TouchableOpacity)` is the standard
  Reanimated way to get animated styles onto a `TouchableOpacity`.

## Steps

1. Delete the `pressedBtn` state (line 164).

2. Next to the other shared values (~line 176, after `timerWiggle`), add:

   ```ts
   const mythPressed = useSharedValue(0);
   const truthPressed = useSharedValue(0);
   const pressButtonStyle = useAnimatedStyle(() => ({
     transform: [{ translateY: mythPressed.value * 4 }],
   }));
   const pressLipStyle = useAnimatedStyle(() => ({
     top: mythPressed.value * 2,
   }));
   const pressFaceStyle = useAnimatedStyle(() => ({
     bottom: 4 - mythPressed.value * 2,
   }));
   ```

   (One `myth`-flavored set; add an identical `truth*` set for the FACT
   button: `truthPressButtonStyle` / `truthPressLipStyle` /
   `truthPressFaceStyle` driven by `truthPressed`.)

3. Add near the other consts (after the `RESULTS_CARD_OFFSET` const, ~line
   49):

   ```ts
   const AnimatedTouchableOpacity =
     Animated.createAnimatedComponent(TouchableOpacity);
   ```

4. Rewrite the MYTH button wrapper:

   - `<TouchableOpacity` → `<AnimatedTouchableOpacity`
   - style array: drop `pressedBtn === "myth" && styles.actionButtonPressed`,
     add `pressButtonStyle`
   - the lip `View`: `[styles.actionButtonLip, { backgroundColor: THEME.dangerDark }]`
     + `pressLipStyle`; the face `View`:
     `[styles.actionButtonFace, { backgroundColor: THEME.error }]` +
     `pressFaceStyle`
   - `onPressIn={() => { mythPressed.value = withTiming(1, { duration: 150, easing: PRESS_EASING }); }}`
   - `onPressOut={() => { mythPressed.value = withTiming(0, { duration: 150, easing: PRESS_EASING }); }}`
   - closing tag `</TouchableOpacity>` → `</AnimatedTouchableOpacity>`

   Apply the same transformation to the FACT button with the `truth*`
   styles and `truthPressed`.

5. Delete the three dead pressed styles
   (`actionButtonPressed`, `actionButtonLipPressed`,
   `actionButtonFacePressed`) from the stylesheet.

## Boundaries

- Do NOT change the button `onPress` logic, the quads from plan 006/007,
  the lip/face colors, or `styles.actionButton` / `actionButtonLip` /
  `actionButtonFace` base geometry.
- The other `TouchableOpacity`s in this file (header back, End button,
  results Home/Play Again) are out of scope.
- One file only: `app/mythbuster/index.tsx`.

## Verification

- **Mechanical**: `npx tsc --noEmit` passes; `npx eslint app/mythbuster/index.tsx` shows only the 3 pre-existing warnings.
- **Feel check** (play one round):
  - Press and hold MYTH: the button sinks 4px and the bottom lip thins
    over ~150ms — no snap.
  - Release: it returns the same way. Rapid double-press: motion retargets
    (never restarts from a jump).
  - The lip still hugs the button's rounded corners at all times (it should
    now move with the face instead of static).
- **Done when**: press/release is visibly eased and the three pressed
  styles are gone from the file.