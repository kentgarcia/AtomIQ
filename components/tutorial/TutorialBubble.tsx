/**
 * Shrodi and his line for a beat (docs/features/TUTORIAL_SPEC.md §4.3): the fox beside a typing bubble (`ShrodiSays`, which
 * pops, types and plays the bubble's own sound), small progress dots for a chapter, and the one or two ways to move
 * on: "Got it" on a `look` beat, a quiet "Skip this step" when a `tap` beat has waited, and "Skip tour".
 */

import { useEffect } from "react";
import { Pressable, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming, Easing, type SharedValue } from "react-native-reanimated";

import { ShrodiSays } from "@/components/onboarding/ShrodiSays";
import { TUTORIAL_FX, nudgeX } from "@/components/tutorial/tutorial-fx-core";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import type { TutorialMood } from "@/services/tutorial-core";
import { createStyles, fontFaces, fontSizes, spacing, useTheme } from "@/theme";

const useStyles = createStyles((theme) => ({
  wrap: { gap: spacing.sm },
  dots: { flexDirection: "row", alignSelf: "center", gap: 6, marginTop: 2 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  actions: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.xs },
  link: { paddingVertical: spacing.sm, paddingHorizontal: spacing.xs, minHeight: 44, justifyContent: "center" },
  linkText: { ...fontFaces.bold, fontSize: fontSizes.sm, color: theme.colors.textMuted },
  gotIt: { minWidth: 120 },
}));

export interface TutorialBubbleProps {
  text: string;
  mood: TutorialMood;
  /** Progress through the chapter or intro (dots when `total` > 1). */
  index: number;
  total: number;
  direction: SharedValue<number>;
  /** "Got it" (a `look` beat, or a fallback). */
  onGotIt?: () => void;
  /** A quiet "Skip this step" under a `tap` beat that has waited. */
  onSkipStep?: () => void;
  /** "Skip tour" (chapters only), and whether the first tap has been made ("Sure?"). */
  onSkipTour?: () => void;
  confirmSkip: boolean;
  /** Bumps on every tap of the dim: the bubble shakes. */
  nudge: number;
  onMeasure: (height: number) => void;
}

export function TutorialBubble({ text, mood, index, total, direction, onGotIt, onSkipStep, onSkipTour, confirmSkip, nudge, onMeasure }: TutorialBubbleProps) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const shake = useSharedValue<number>(TUTORIAL_FX.nudgeMs);
  useEffect(() => {
    if (nudge === 0) return;
    shake.set(0);
    shake.set(withTiming(TUTORIAL_FX.nudgeMs, { duration: TUTORIAL_FX.nudgeMs, easing: Easing.linear }));
  }, [nudge, shake]);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: nudgeX(shake.get()) }] }));

  return (
    <Animated.View style={[styles.wrap, shakeStyle]} onLayout={(e) => onMeasure(e.nativeEvent.layout.height)}>
      <ShrodiSays text={text} mood={mood} size={64} arrive={{ direction, at: TUTORIAL_FX.foxAt }} />
      {total > 1 ? (
        <View style={styles.dots} accessibilityLabel={`Step ${index} of ${total}`} accessible>
          {Array.from({ length: total }, (_, i) => (
            <View key={i} style={[styles.dot, { backgroundColor: i < index ? theme.colors.primary : theme.colors.borderStrong }]} />
          ))}
        </View>
      ) : null}
      {onGotIt ? <Button label="Got it" onPress={onGotIt} style={styles.gotIt} /> : null}
      <View style={styles.actions}>
        {onSkipStep ? (
          <Pressable onPress={onSkipStep} accessibilityRole="button" accessibilityLabel="Skip this step" style={styles.link} hitSlop={6}>
            <Text style={styles.linkText}>Skip this step</Text>
          </Pressable>
        ) : (
          <View />
        )}
        {onSkipTour ? (
          <Pressable onPress={onSkipTour} accessibilityRole="button" accessibilityLabel={confirmSkip ? "Sure? Skip the tour" : "Skip tour"} style={styles.link} hitSlop={6}>
            <Text style={styles.linkText}>{confirmSkip ? "Sure? Skip" : "Skip tour"}</Text>
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
}
