# 004 — Spring press scale on the shared Button

- **Status**: TODO
- **Commit**: 36e3fe3
- **Severity**: MEDIUM
- **Category**: 3. Physicality & origin (press feedback) / 7. Cohesion
- **Estimated scope**: 1 file (~20 lines)

## Problem

The shared `Button` is the only pressable in the app without physical press feedback:
pressing it drops its opacity to 50% (`theme.opacity.strong`) instantly, with no
transition. Everywhere else — lesson nodes on the home map (sink + lip-shallow press,
`app/(tabs)/index.tsx:844-863`), game cards (`components/games/StackCard.tsx:84-89`) —
presses are physical springs. The Button carries the onboarding "Get Started" CTA
(`app/onboarding.tsx:297`), the app's first-run marquee moment, and its flat, dead press
feels like a placeholder next to the rest of the product.

Current code at `components/ui/button.tsx:127-148` (verbatim):

```tsx
    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel ?? title}
            style={({ pressed: isPressed }: { pressed: boolean }) => [
                base.base,
                palette[variant],
                isPressed && { opacity: theme.opacity.strong },
                style,
            ]}
        >
            {icon ? <Icon name={icon} size={20} color={textColors[variant]} /> : null}
            <Text
                variant="button"
                style={{ fontSize: SIZE_FONT[size], color: textColors[variant] }}
            >
                {title}
            </Text>
        </Pressable>
    );
```

(this file is 4-space indented; `Button` is imported only by `app/onboarding.tsx:297,392,481` today but is the app-wide component.)

## Target

Press feedback becomes `scale(0.97)` (within the audit's 0.95–0.98 "keep it subtle"
range) driven by reanimated springs, using the repo's own press-spring config verbatim
from StackCard — quick press-in, damped release. The harsh opacity snap is dropped
(scale alone reads as feedback; the app's other physical buttons use no opacity on
press).

```tsx
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
```

Inside the component (after the existing `useMemo` for palette styles):

```tsx
    const pressScale = useSharedValue(1);
    const pressStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pressScale.value }],
    }));
```

Returned JSX:

```tsx
    return (
        <AnimatedPressable
            onPress={onPress}
            onPressIn={() => {
                pressScale.value = withSpring(0.97, {
                    damping: 12,
                    stiffness: 400,
                    mass: 0.3,
                });
            }}
            onPressOut={() => {
                pressScale.value = withSpring(1, {
                    damping: 16,
                    stiffness: 260,
                    mass: 0.5,
                });
            }}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel ?? title}
            style={[base.base, palette[variant], pressStyle, style]}
        >
            {icon ? <Icon name={icon} size={20} color={textColors[variant]} /> : null}
            <Text
                variant="button"
                style={{ fontSize: SIZE_FONT[size], color: textColors[variant] }}
            >
                {title}
            </Text>
        </AnimatedPressable>
    );
```

Imports to add at `components/ui/button.tsx:11-18`:

```tsx
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from "react-native-reanimated";
```

The press-in config (`damping: 12, stiffness: 400, mass: 0.3`) compresses to ~120ms of
visible travel (press budget 100–160ms); the release (`damping: 16, stiffness: 260,
mass: 0.5`) settles in ~250ms with a barely-perceptible overshoot — the same feel every
other pressable in the app already has.

Reduced motion: Reanimated 4 defaults to `ReduceMotion.System` — with OS "reduce
motion" enabled, these springs resolve to near-instant (the button still visually
states (no scale travel) without delay). No manual gating.

## Repo conventions to follow

- The exact spring configs come from the app's canonical press feedback, `components/games/StackCard.tsx:20-23` (verbatim):

```tsx
const springPressIn = () =>
    withSpring(0.92, { damping: 12, stiffness: 400, mass: 0.3 });
const springPressOut = () =>
    withSpring(1, { damping: 16, stiffness: 260, mass: 0.5 });
```

  (Button uses 0.97 instead of StackCard's 0.92 — a wide button at 0.92 reads as a
  squash, 0.97 is the subtle tier.)
- The `createAnimatedComponent` + shared-value pattern is standard reanimated and used in this repo's pattern families (`components/games/StackCard.tsx:60-63` for shared values; `app/(tabs)/index.tsx:24-32` for `Animated.createAnimatedComponent` style usage).

## Steps

1. Add the `react-native-reanimated` import at `components/ui/button.tsx:11-18`.
2. After the `SIZE_FONT` constants (line 47), add `const AnimatedPressable = Animated.createAnimatedComponent(Pressable);` at module scope.
3. Inside the `Button` component (after the `useMemo` returning `{ base, palette, textColors }`, before the disabled branch at line 105), add `pressScale` and `pressStyle` (Target above).
4. Replace the returned JSX (lines 127-148) with the `AnimatedPressable` version from Target — the `style` function with `isPressed` is gone, replaced by `onPressIn`/`onPressOut` driving `withSpring`.

## Boundaries

- Do NOT change the disabled/loading branch (lines 105-125) — it stays a plain `Pressable` with no press animation (correct: disabled buttons don't respond).
- Do NOT touch variants, sizes, palette, or any styling values.
- Do NOT add dependencies (reanimated is already a direct dependency, `package.json:52`).
- Do NOT convert other components to this pattern — the shared Button only.
- If the file no longer matches the excerpts above (drift since commit 36e3fe3), STOP and report instead of improvising.

## Verification

- **Mechanical**: `npx tsc --noEmit` and `npm run lint` from the repo root — must pass with no new errors.
- **Feel check** (onboarding flow — "Get Started" CTA on the first screen, device or simulator):
  - Press and hold: the button compresses to 97% in about a beat (≤160ms), without flicker or opacity dip.
  - Release: it springs back with one small overshoot — it must overshoot slightly (spring), not ease back.
  - Rapid double-tap: the scale retargets smoothly (springs carry velocity when interrupted — audit rule 4); it must never snap to 100% mid-press.
  - OS "reduce motion" on: no scale travel, tap works normally.
- **Done when**: press shows a quick 0.97 compress + springy release, tsc/lint pass.