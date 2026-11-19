/**
 * The progress bar across the top of onboarding's question steps: the lesson's own bar (same height,
 * orange fill with a strip of shine, the sparkles at its end each time it grows, 450 ms glide) with
 * a Back arrow where a lesson has its close button. Interrupted glides continue from where they are.
 * Reduced motion: the bar jumps to its value and no sparkles are drawn.
 */

import { useEffect, useRef } from "react";
import { Pressable, View } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";

import { ProgressSparkle } from "@/components/lesson/ProgressSparkle";
import { EASE_OUT } from "@/components/motion/motion";
import { Icon } from "@/components/ui/icon";
import { createStyles, radius, spacing, useTheme, withAlpha } from "@/theme";

const useStyles = createStyles((theme) => ({
  top: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingBottom: spacing.sm },
  back: { width: 40, height: 40, alignItems: "center", justifyContent: "center", marginLeft: -spacing.sm },
  barWrap: { flex: 1, height: 16 },
  bar: { position: "absolute", top: 0, bottom: 0, left: 0, right: 0, borderRadius: radius.full, backgroundColor: theme.colors.border, overflow: "hidden" },
  fill: { height: "100%", borderRadius: radius.full, backgroundColor: theme.colors.primary },
  shine: { position: "absolute", top: 3, left: spacing.sm, right: spacing.sm, height: 4, borderRadius: radius.full, backgroundColor: withAlpha(theme.colors.onPrimary, 0.3) },
  sparkAnchor: { position: "absolute", top: 0, bottom: 0, left: 0 },
}));

export function OnboardingBar({ progress, onBack }: { progress: number; onBack?: (() => void) | null }) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const reduced = useReducedMotion();
  const fill = useSharedValue(Math.max(0.04, progress));
  const pop = useSharedValue(0);
  const last = useRef(progress);

  useEffect(() => {
    const target = Math.max(0.04, progress);
    const grew = progress > last.current;
    last.current = progress;
    if (reduced) {
      fill.set(target);
      return;
    }
    fill.set(withTiming(target, { duration: 450, easing: EASE_OUT }));
    if (grew) {
      pop.set(0);
      pop.set(withTiming(1, { duration: 700, easing: EASE_OUT }));
    }
  }, [progress, reduced, fill, pop]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.get() * 100}%` }));

  return (
    <View style={styles.top}>
      {onBack ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" hitSlop={8} onPress={onBack} style={styles.back}>
          <Icon name="ArrowLeft2" size={26} color={theme.colors.textSecondary} />
        </Pressable>
      ) : (
        <View style={styles.back} />
      )}
      <View style={styles.barWrap} accessible accessibilityRole="progressbar" accessibilityLabel="Setup progress" accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}>
        <View style={styles.bar}>
          <Animated.View style={[styles.fill, fillStyle]}>
            <View style={styles.shine} />
          </Animated.View>
        </View>
        {reduced ? null : (
          <Animated.View pointerEvents="none" style={[styles.sparkAnchor, fillStyle]}>
            <ProgressSparkle pop={pop} />
          </Animated.View>
        )}
      </View>
    </View>
  );
}
