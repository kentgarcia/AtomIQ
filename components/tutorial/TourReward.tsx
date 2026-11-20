/**
 * The tour's closing moment (tier D, once in the app's life; timeline `TOUR_REWARD_FX` in `celebration-core.ts`): Shrodi is
 * stamped in with a burst as he lands, "Tour complete!" is stamped, the diamond pops with its own burst while the amount counts up
 * beside it, a line and the button arrive last. `onDone` runs when the learner presses the button, taps the dim, or the moment
 * times out; the layer then sends the diamonds flying to the counter. Sound and one haptic at the beats; reduced motion shows the end.
 */

import { useEffect } from "react";
import { Image, StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import { TOUR_REWARD_FX, TOUR_REWARD_TIMEOUT_MS, TOUR_REWARD_TOTAL } from "@/components/celebration/celebration-core";
import { Stamp } from "@/components/lesson/Stamp";
import { STAMP_LANDS } from "@/components/lesson/stamp-core";
import { Shrodi } from "@/components/mascot/Shrodi";
import { Burst } from "@/components/motion/Burst";
import { CountUp } from "@/components/motion/CountUp";
import { PopOnce } from "@/components/motion/PopOnce";
import { Reveal } from "@/components/motion/Reveal";
import { useDelayedClock } from "@/components/motion/use-delayed-clock";
import { TUTORIAL_FX } from "@/components/tutorial/tutorial-fx-core";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { notifySuccess } from "@/services/haptics";
import { playSfx } from "@/services/sfx";
import { createStyles, fontFaces, fontSizes, spacing, useTheme } from "@/theme";

const DIAMOND = require("@/assets/images/icons/diamond.png");
const GEM = 76;
const FOX = 132;

const useStyles = createStyles((theme) => ({
  dim: { ...StyleSheet.absoluteFill, backgroundColor: theme.colors.overlay, justifyContent: "center", paddingHorizontal: spacing.lg },
  hero: { alignItems: "center", gap: spacing.md },
  foxWrap: { alignItems: "center", justifyContent: "center" },
  title: { ...fontFaces.heavy, fontSize: fontSizes["7xl"], lineHeight: 40, letterSpacing: -0.5, color: theme.colors.text, textAlign: "center" },
  prize: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.md, marginVertical: spacing.xs },
  gemWrap: { width: GEM, height: GEM, alignItems: "center", justifyContent: "center" },
  gem: { width: GEM, height: GEM },
  amount: { ...fontFaces.heavy, fontSize: fontSizes["7xl"], lineHeight: 44, color: theme.colors.info },
  line: { ...fontFaces.semibold, fontSize: fontSizes["xl"], lineHeight: 26, color: theme.colors.textSecondary, textAlign: "center", maxWidth: 320 },
  footer: { alignSelf: "stretch", maxWidth: 360, width: "100%", alignItems: "center" },
}));

export function TourReward({ amount, onDone }: { amount: number; onDone: () => void }) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const c = theme.colors;
  const clock = useDelayedClock(TOUR_REWARD_TOTAL, 0);

  useEffect(() => {
    // The peak, the stamped title, the diamond's pop, the number landing, the button's sparkle
    const ids = [
      setTimeout(() => {
        notifySuccess();
        void playSfx("lesson.complete");
      }, TOUR_REWARD_FX.mascot + STAMP_LANDS),
      setTimeout(() => void playSfx("lesson.stamp"), TOUR_REWARD_FX.title + STAMP_LANDS),
      setTimeout(() => void playSfx("reward.pop"), TOUR_REWARD_FX.gem),
      setTimeout(() => void playSfx("reward.sparkle"), TOUR_REWARD_FX.count + TOUR_REWARD_FX.countMs),
      setTimeout(onDone, TOUR_REWARD_TIMEOUT_MS),
    ];
    return () => ids.forEach(clearTimeout);
  }, [onDone]);

  return (
    <Animated.View entering={FadeIn.duration(TUTORIAL_FX.dimMs)} exiting={FadeOut.duration(TUTORIAL_FX.outMs)} style={styles.dim}>
      <View style={styles.hero}>
        <View style={styles.foxWrap}>
          <Stamp at={TOUR_REWARD_FX.mascot}>
            <Shrodi mood="cheer" size={FOX} />
          </Stamp>
          <Burst clock={clock} at={TOUR_REWARD_FX.burst} diameter={FOX} color={c.gold} ringColor={c.primary} reach={90} />
        </View>

        <Stamp at={TOUR_REWARD_FX.title} tilt={-1}>
          <Text accessibilityRole="header" style={styles.title}>
            Tour complete!
          </Text>
        </Stamp>

        <View style={styles.prize} accessible accessibilityLabel={`${amount} diamonds`}>
          <View style={styles.gemWrap}>
            <PopOnce at={TOUR_REWARD_FX.gem} sparkleColor={c.info} style={styles.gemWrap}>
              <Image source={DIAMOND} style={styles.gem} resizeMode="contain" accessible={false} />
            </PopOnce>
            <Burst clock={clock} at={TOUR_REWARD_FX.gemBurst} diameter={GEM} color={c.info} ringColor={c.info} reach={56} count={8} />
          </View>
          <CountUp from={0} to={amount} at={TOUR_REWARD_FX.count} duration={TOUR_REWARD_FX.countMs} style={styles.amount} format={(n) => `+${n}`} />
        </View>

        <Reveal at={TOUR_REWARD_FX.line}>
          <Text style={styles.line}>You know your way around now. Here is a thank you from me!</Text>
        </Reveal>
      </View>

      <Reveal at={TOUR_REWARD_FX.button} blockUntilShown style={styles.footer}>
        <Button label="Thanks!" onPress={onDone} />
      </Reveal>
    </Animated.View>
  );
}
