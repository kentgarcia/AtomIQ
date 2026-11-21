/**
 * The panel that takes the footer's place after an answer is checked, like Duolingo's: a full-width
 * tinted sheet with square top corners (green when right, red when not) with a check or cross, a short title, the
 * explanation and the Continue button inside it. Flat, no mascot; the colours settle in with a short
 * ease-out rise. The sheet's colours come from the theme's success and error roles.
 */

import { View } from "react-native";
import { Text } from "@/components/ui/text";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useReducedMotion } from "@/components/motion/use-reduced-motion";

import { EASE_OUT } from "@/components/motion/motion";
import { FooterRow } from "@/components/lesson/FooterRow";
import { Button } from "@/components/ui/button";
import { PopOnce } from "@/components/motion/PopOnce";
import { Icon } from "@/components/ui/icon";
import type { ItemResult } from "@/content/curriculum/types";
import { createStyles, fontFaces, fontSizes, spacing, useTheme, withAlpha } from "@/theme";

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
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  head: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  title: { ...fontFaces.heavy, flex: 1, fontSize: fontSizes["4xl"] },
  body: { ...fontFaces.medium, fontSize: fontSizes.xl, lineHeight: 22 },
  note: { ...fontFaces.bold, fontSize: fontSizes.xl, lineHeight: 22 },
}));

export function FeedbackDock({
  result,
  explanation,
  seed,
  onContinue,
  onBack,
  paddingHorizontal,
  paddingBottom,
}: {
  result: ItemResult;
  explanation: string;
  /** Picks the title for a right answer (the card id). */
  seed: string;
  onContinue: () => void;
  /** Steps back to the previous card; the Back button shows beside Continue when given. */
  onBack?: (() => void) | null;
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
        {/* A right answer's tick pops once the sheet has come up (a wrong one stays quiet: the option already shook) */}
        {ok ? (
          <PopOnce at={120} sparkleColor={ink} intensity={0.8}>
            <Icon name="TickCircle" size={28} color={ink} />
          </PopOnce>
        ) : (
          <Icon name="CloseCircle" size={28} color={ink} />
        )}
        <Text accessibilityRole="header" style={[styles.title, { color: ink }]}>
          {ok ? correctTitleFor(seed) : WRONG_TITLE}
        </Text>
      </View>
      {/* Why the picked option is not the answer (a choice's per-option note): said here, not inside the option, so the option never changes size */}
      {!ok && result.note ? <Text style={[styles.note, { color: ink }]}>{result.note}</Text> : null}
      {explanation ? <Text style={[styles.body, { color: ink }]}>{explanation}</Text> : null}
      <FooterRow onBack={onBack}>
        <Button label="Continue" variant={ok ? "success" : "destructive"} onPress={onContinue} />
      </FooterRow>
    </Animated.View>
  );
}
