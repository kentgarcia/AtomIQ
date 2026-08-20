# 003 — Pop the "Claimed" pill when a daily mission is claimed

- **Status**: TODO
- **Commit**: 36e3fe3
- **Severity**: MEDIUM
- **Category**: 8. Missed opportunities (state change that teleports)
- **Estimated scope**: 1 file, ~6 lines

## Problem

Claiming a completed daily mission is the day's payoff moment, but the state change is
silent: the claim button is replaced by a "Claimed" pill with zero bridge. The user's
rewardful tap produces… the same pill placement, just different. The claim path
(`hooks/use-daily-missions.ts:38-49`: `addXP` → `claimDailyMission` → `refresh`) flips
`mission.isClaimed` after a DB round-trip, so the swap happens a beat after the tap —
the perfect spot for a small state-indication pop, the one place motion pays for itself
legibly.

Current code at `app/missions.tsx:189-199` (verbatim):

```tsx
                    {mission.isClaimed ? (
                      <View style={styles.claimedPill}>
                        <Icon name="TickCircle" size={15} color="#FFFFFF" variant="Bold" />
                        <Text style={styles.claimedText}>Claimed</Text>
                      </View>
                    ) : showClaim ? (
                      <ActionButton
                        color={BTN_COLOR}
                        lipColor={BTN_LIP}
                        icon="TickCircle"
                        onPress={() => void claim(mission)}
                      />
                    ) : mission.type === "mythbuster" ? (
```

## Target

Wrap the claimed-pill branch in an `Animated.View` that pops in with the repo's own
card-entrance spring (the same config StackCard uses for its game cards), at
`durations.normal` (200ms) spring duration:

```tsx
                    {mission.isClaimed ? (
                      <Animated.View
                        entering={ZoomIn.duration(200)
                          .springify()
                          .damping(20)
                          .stiffness(260)}
                      >
                        <View style={styles.claimedPill}>
                          <Icon name="TickCircle" size={15} color="#FFFFFF" variant="Bold" />
                          <Text style={styles.claimedText}>Claimed</Text>
                        </View>
                      </Animated.View>
                    ) : showClaim ? (
```

`ZoomIn` is the correct motion here: it exhibits the state's arrival (state indication)
at the exact spot the previous button stood, staying under the 200ms popover/dropdown
budget. Entrance-only — the outgoing ActionButton needs no exit animation; the claim
tap already produced the icon's disappearance, and the pop is the reward.

Reduced motion: Reanimated 4 defaults to `ReduceMotion.System`; entering layout
animations built via `springify()` then resolve to a quick opacity-only settle when the
OS "reduce motion" setting is on. No manual gating, no extra code.

## Repo conventions to follow

- The exact spring config mirrors the app's canonical card entrance at `components/games/StackCard.tsx:66-71`:

```tsx
        <Animated.View
            entering={ZoomIn.duration(280)
                .delay(delay)
                .springify()
                .damping(20)
                .stiffness(260)}
        >
```

(no `.delay` here — the pop must be immediate).

- Duration: `durations.normal = 200` (`theme/tokens.ts:347`); inline the literal `200` as the file already does for other timings.
- `ZoomIn` is already used in the app (`app/quiz/[id].tsx:24`, results icon). `Animated` is already imported in `app/missions.tsx:13` — current import: `import Animated, { FadeInDown } from "react-native-reanimated";` — extend it to `import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";`.

## Steps

1. In `app/missions.tsx:13`, extend the reanimated import with `ZoomIn`.
2. Replace the `{mission.isClaimed ? ( <View style={styles.claimedPill}>…</View> ) : …` branch (lines 189-193) with the `Animated.View`-wrapped version from Target above. Indentation: this file uses 2-space indent — match the surrounding 20-space indentation of the ternary branches.
3. Leave the rest of the ternary (showClaim / mythbuster / fact / locked branches) untouched.

## Boundaries

- Do NOT animate the claim ActionButton itself (press feedback is a separate concern and already handled by `activeOpacity`).
- Do NOT touch `hooks/use-daily-missions.ts`, the claim logic, styles, or any other mission card element (progress bar, icon hexagon, header).
- Do NOT add dependencies.
- If the ternary no longer matches the excerpt (drift since commit 36e3fe3), STOP and report instead of improvising.

## Verification

- **Mechanical**: `npx tsc --noEmit` and `npm run lint` from the repo root — must pass with no new errors.
- **Feel check**: complete a mission, open the missions screen, tap the claim check — the "Claimed" pill should pop in with a quick spring (one small overshoot, ~200ms), at the same spot the button occupied. It must never fade-slide, zoom from the screen center, or drift left/right.
- **Done when**: the pill pops-in on claim and the pop is not visible on screen entry (entering animations only run on mount — `isClaimed` is already true on mount after refresh, so the initial screen-load pill must NOT animate; if it does, the branch is being remounted on refresh and the `key` usage needs checking — report rather than improvise).