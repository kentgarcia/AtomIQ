/**
 * The panel that takes the footer's place after an answer is checked, like Duolingo's: a full-width
 * tinted sheet (green when right, red when not) with a check or cross, a short title, the
 * explanation and the Continue button inside it. Flat, no mascot; the colours settle in with a short
 * ease-out rise. The sheet's colours come from the theme's success and error roles.
 */

import { Text, View } from "react-native";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";

import { EASE_OUT } from "@/components/motion/motion";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import type { ItemResult } from "@/content/curriculum/types";
import { createStyles, fontFaces, fontSizes, radius, spacing, useTheme, withAlpha } from "@/theme";

/** Said when the answer is right; one is picked from the card, so a card always says the same thing. */
export const CORRECT_TITLES = ["Nicely done!", "Great job!", "That's right!", "Well done!", "Spot on!"] as const;
export const WRONG_TITLE = "Not quite";

/** A stable pick from the right-answer titles for this card. */
export function correctTitleFor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return CORRECT_TITLES[h % CORRECT_TITLES.length];
}

const useStyles = createStyles(() => ({
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  head: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  title: { ...fontFaces.heavy, flex: 1, fontSize: fontSizes["4xl"] },
  body: { ...fontFaces.medium, fontSize: fontSizes.xl, lineHeight: 22 },
}));

export function FeedbackDock({
  result,
  explanation,
  seed,
  onContinue,
  paddingHorizontal,
  paddingBottom,
}: {
  result: ItemResult;
  explanation: string;
  /** Picks the title for a right answer (the card id). */
  seed: string;
  onContinue: () => void;
  paddingHorizontal: number;
  paddingBottom: number;
}) {
  const { theme, isDark } = useTheme();
  const styles = useStyles(theme);
  const reduced = useReducedMotion();
  const c = theme.colors;
  const ok = result.correct;
  // Dark green on a pale green sheet in light mode; the bright role colour on the dark one.
  const ink = ok ? (isDark ? c.success : c.successDark) : isDark ? c.error : c.dangerDark;
  const tint = withAlpha(ok ? c.success : c.error, isDark ? 0.2 : 0.24);
  return (
    <Animated.View
      entering={reduced ? undefined : FadeInDown.duration(180).easing(EASE_OUT)}
      accessibilityLiveRegion="polite"
      style={[styles.sheet, { backgroundColor: tint, paddingHorizontal, paddingBottom }]}
    >
      <View style={styles.head}>
        <Icon name={ok ? "TickCircle" : "CloseCircle"} size={28} color={ink} />
        <Text accessibilityRole="header" style={[styles.title, { color: ink }]}>
          {ok ? correctTitleFor(seed) : WRONG_TITLE}
        </Text>
      </View>
      {explanation ? <Text style={[styles.body, { color: ink }]}>{explanation}</Text> : null}
      <Button label="Continue" variant={ok ? "success" : "destructive"} onPress={onContinue} />
    </Animated.View>
  );
}
