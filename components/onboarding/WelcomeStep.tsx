/**
 * The end, on a peak (the welcome moment, tier D, once in the app's life): Shrodi is stamped in with
 * a burst as he lands, "Welcome, {name}!" is stamped, a line follows, then three recap tiles
 * (daily goal, first day of a streak, where the path starts) are revealed one after another with
 * the finish screen's hero-then-settle, and the button arrives last. Timeline: `WELCOME_FX`
 * (celebration-core.ts) plus `WELCOME_TILES` here; the tiles start after the line and the button
 * after the last tile has landed. Sound at the fox's landing; one haptic.
 */

import { useEffect } from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/text";

import { WELCOME_FX, WELCOME_TOTAL } from "@/components/celebration/celebration-core";
import { Stamp } from "@/components/lesson/Stamp";
import { STAMP_LANDS } from "@/components/lesson/stamp-core";
import { STAT_TOTAL } from "@/components/lesson/stat-reveal-core";
import { StatTile } from "@/components/lesson/StatTile";
import { Shrodi } from "@/components/mascot/Shrodi";
import { Burst } from "@/components/motion/Burst";
import { Reveal } from "@/components/motion/Reveal";
import { useDelayedClock } from "@/components/motion/use-delayed-clock";
import { ContinueFooter, StepLayout } from "@/components/onboarding/StepLayout";
import { Icon } from "@/components/ui/icon";
import { recapFor, type Answers } from "@/services/onboarding-core";
import { notifySuccess } from "@/services/haptics";
import { playSfx } from "@/services/sfx";
import { createStyles, fontFaces, fontSizes, spacing, useTheme } from "@/theme";

/** The recap tiles: the first starts after the line, each next 400 ms later; the button follows the last. */
export const WELCOME_TILES = { start: 1000, step: 400 } as const;
export const welcomeTileAt = (n: number): number => WELCOME_TILES.start + n * WELCOME_TILES.step;
export const welcomeButtonAt = (count: number): number => welcomeTileAt(count - 1) + Math.round(STAT_TOTAL * 0.6);

const useStyles = createStyles((theme) => ({
  hero: { alignItems: "center", gap: spacing.lg },
  foxWrap: { alignItems: "center", justifyContent: "center" },
  title: { ...fontFaces.heavy, fontSize: fontSizes["7xl"], lineHeight: 40, letterSpacing: -0.5, color: theme.colors.text, textAlign: "center" },
  line: { ...fontFaces.semibold, fontSize: fontSizes["2xl"], lineHeight: 26, color: theme.colors.textSecondary, textAlign: "center", maxWidth: 320 },
  tiles: { flexDirection: "row", justifyContent: "center", gap: spacing.sm, marginTop: spacing.md, alignSelf: "stretch" },
}));

export function WelcomeStep({ name, answers, onGo }: { name: string; answers: Answers; onGo: () => void }) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const c = theme.colors;
  const clock = useDelayedClock(WELCOME_TOTAL, 0);
  const tiles = recapFor(answers);
  const tones = { goal: c.info, streak: c.warning, unit: c.success } as const;

  const count = tiles.length;
  useEffect(() => {
    // The peak, then a pop for each recap tile as it is revealed, then a sparkle as the button arrives
    const ids = [
      setTimeout(() => {
        notifySuccess();
        void playSfx("lesson.complete");
      }, WELCOME_FX.mascot + STAMP_LANDS),
      setTimeout(() => void playSfx("lesson.stamp"), WELCOME_FX.title + STAMP_LANDS),
      ...Array.from({ length: count }, (_, i) => setTimeout(() => void playSfx("reward.pop", { index: i }), welcomeTileAt(i))),
      setTimeout(() => void playSfx("reward.sparkle"), welcomeButtonAt(count)),
    ];
    return () => ids.forEach(clearTimeout);
  }, [count]);

  return (
    <StepLayout center footer={<Reveal at={welcomeButtonAt(tiles.length)} blockUntilShown><ContinueFooter label="Let's go" onPress={onGo} /></Reveal>}>
      <View style={styles.hero}>
        <View style={styles.foxWrap}>
          <Stamp at={WELCOME_FX.mascot}>
            <Shrodi mood="cheer" size={150} />
          </Stamp>
          <Burst clock={clock} at={WELCOME_FX.burst} diameter={150} color={c.gold} ringColor={c.primary} reach={90} />
        </View>
        <Stamp at={WELCOME_FX.title} tilt={-1}>
          <Text accessibilityRole="header" style={styles.title} numberOfLines={2}>
            Welcome, {name}!
          </Text>
        </Stamp>
        <Reveal at={WELCOME_FX.line}>
          <Text style={styles.line}>Your path is ready. Your first lesson is waiting.</Text>
        </Reveal>
        <View style={styles.tiles}>
          {tiles.map((t, i) => (
            <StatTile
              key={t.id}
              tone={tones[t.id]}
              label={t.label}
              value={`${t.value}${t.unit}`}
              countTo={t.value}
              format={(n) => `${n}${t.unit}`}
              revealAt={welcomeTileAt(i)}
              icon={<Icon name={t.icon} size={26} color={tones[t.id]} variant="Bold" />}
              accessibilityLabel={`${t.label}: ${t.value}${t.unit}`}
            />
          ))}
        </View>
      </View>
    </StepLayout>
  );
}
