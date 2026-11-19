/**
 * "Building your path": a 3 s moment that repeats the learner's answers back (timeline in
 * `onboarding-fx-core.ts`, tier C, seen once). A bar fills while three lines appear and are ticked
 * off one by one (each tick pops with a ring), the bar bursts at its end, Shrodi cheers, and the
 * step moves on by itself. One clock for all of it. Sound and haptics hang off the same constants:
 * the fill sound at the start, a pop on each tick, a sparkle on the burst. Nothing here is waited
 * on for correctness: the step simply ends. Reduced motion: the finished list for a moment, then on.
 */

import { useEffect, useRef } from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/text";
import Animated, { useAnimatedStyle, useReducedMotion, type SharedValue } from "react-native-reanimated";

import { Burst } from "@/components/motion/Burst";
import { useDelayedClock } from "@/components/motion/use-delayed-clock";
import { Shrodi } from "@/components/mascot/Shrodi";
import { settle } from "@/components/motion/settle";
import { StepLayout } from "@/components/onboarding/StepLayout";
import { PLAN_FX, PLAN_REDUCED_HOLD, planBarFrame, planLineFrame, planTickFrame } from "@/components/onboarding/onboarding-fx-core";
import { Icon } from "@/components/ui/icon";
import { planLines, type Answers, type PlanLine } from "@/services/onboarding-core";
import { impactLight } from "@/services/haptics";
import { playSfx } from "@/services/sfx";
import { createStyles, fontFaces, fontSizes, radius, spacing, useTheme, withAlpha } from "@/theme";

/** The wait before the clock starts, so the page has settled in first. */
const START_DELAY = 250;
const TICK = 28;
const BAR_MAX_WIDTH = 240;

const useStyles = createStyles((theme) => ({
  hero: { alignItems: "center", gap: spacing.xl },
  title: { ...fontFaces.heavy, fontSize: fontSizes["6xl"], lineHeight: 34, color: theme.colors.text, textAlign: "center" },
  // The lesson's own bar (track, orange fill, a strip of shine along its top), narrower: it is a moment, not a header
  barWrap: { alignSelf: "center", width: "62%", maxWidth: BAR_MAX_WIDTH, height: 16 },
  bar: { position: "absolute", top: 0, bottom: 0, left: 0, right: 0, borderRadius: radius.full, backgroundColor: theme.colors.border, overflow: "hidden" },
  fill: { height: "100%", borderRadius: radius.full, backgroundColor: theme.colors.primary },
  shine: { position: "absolute", top: 3, left: spacing.sm, right: spacing.sm, height: 4, borderRadius: radius.full, backgroundColor: withAlpha(theme.colors.onPrimary, 0.3) },
  endAnchor: { position: "absolute", top: 0, bottom: 0, left: 0 },
  endPoint: { position: "absolute", right: 0, top: 8, width: 0, height: 0 },
  list: { alignSelf: "stretch", gap: spacing.lg, paddingTop: spacing.md },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  slot: { width: TICK, height: TICK, alignItems: "center", justifyContent: "center" },
  empty: { width: TICK - 6, height: TICK - 6, borderRadius: radius.full, borderWidth: 2, borderColor: theme.colors.border },
  ring: { position: "absolute", width: TICK, height: TICK, borderRadius: radius.full, borderWidth: 3, borderColor: theme.colors.success },
  text: { flex: 1, ...fontFaces.semibold, fontSize: fontSizes["2xl"], lineHeight: 24, color: theme.colors.text },
}));

function PlanRow({ i, line, clock }: { i: number; line: PlanLine; clock: SharedValue<number> }) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const rowStyle = useAnimatedStyle(() => {
    const f = planLineFrame(clock.get(), i);
    return { opacity: f.opacity, transform: [{ translateY: f.y }] };
  });
  const tickStyle = useAnimatedStyle(() => {
    const f = planTickFrame(clock.get(), i);
    return { opacity: f.opacity, transform: [{ scale: f.scale }] };
  });
  const ringStyle = useAnimatedStyle(() => {
    const f = planTickFrame(clock.get(), i);
    return { opacity: f.ringOpacity, transform: [{ scale: f.ringScale }] };
  });
  return (
    <Animated.View style={[styles.row, rowStyle]}>
      <View style={styles.slot}>
        <View style={styles.empty} />
        <Animated.View pointerEvents="none" style={[styles.ring, ringStyle]} />
        <Animated.View style={[{ position: "absolute" }, tickStyle]}>
          <Icon name="TickCircle" size={TICK} color={theme.colors.success} variant="Bold" />
        </Animated.View>
      </View>
      <Text style={styles.text}>{line.text}</Text>
    </Animated.View>
  );
}

export function PlanStep({ answers, onDone }: { answers: Answers; onDone: () => void }) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const reduced = useReducedMotion();
  const clock = useDelayedClock(PLAN_FX.total, START_DELAY);
  const lines = planLines(answers);
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  });

  const fillStyle = useAnimatedStyle(() => ({ width: `${planBarFrame(clock.get()) * 100}%` }));

  // Sounds and the hand-off hang off the same constants as the picture; every timer is cleared on leaving
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const at = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));
    if (reduced) {
      at(PLAN_REDUCED_HOLD, () => done.current());
    } else {
      at(START_DELAY, () => void playSfx("reward.fill"));
      PLAN_FX.ticks.forEach((t) =>
        at(START_DELAY + t, () => {
          impactLight();
          void playSfx("reward.pop");
        }),
      );
      at(START_DELAY + PLAN_FX.burst, () => void playSfx("reward.sparkle"));
      at(START_DELAY + PLAN_FX.total, () => done.current());
    }
    return () => timers.forEach(clearTimeout);
  }, [reduced]);

  return (
    <StepLayout center>
      <Animated.View entering={settle()} style={styles.hero}>
        <Shrodi mood="think" size={132} />
        <Text accessibilityRole="header" style={styles.title}>
          Building your path
        </Text>
        <View style={styles.barWrap} accessible accessibilityRole="progressbar" accessibilityLabel="Building your path">
          <View style={styles.bar}>
            <Animated.View style={[styles.fill, fillStyle]}>
              <View style={styles.shine} />
            </Animated.View>
          </View>
          {/* A box that grows with the fill; its right edge is where the burst comes out of the bar */}
          <Animated.View pointerEvents="none" style={[styles.endAnchor, fillStyle]}>
            <View style={styles.endPoint}>
              <Burst clock={clock} at={PLAN_FX.burst} diameter={28} color={theme.colors.gold} ringColor={theme.colors.primary} reach={56} count={8} />
            </View>
          </Animated.View>
        </View>
        <View style={styles.list}>
          {lines.map((line, i) => (
            <PlanRow key={line.id} i={i} line={line} clock={clock} />
          ))}
        </View>
      </Animated.View>
    </StepLayout>
  );
}
