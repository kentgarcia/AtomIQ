/**
 * The loading screen of a level: shown while its pictures and questions load and the world is built
 * under it, so the level never starts half drawn. Shrodi waits on the left, with the level's name and
 * the lessons' own progress bar. It leaves by fading, onto the level.
 */

import { View } from "react-native";
import Animated, { FadeOut, useSharedValue, withTiming } from "react-native-reanimated";
import { useFillStyle } from "@/components/ui/progress-fill";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { createStyles, fontFaces, fontSizes, radius, spacing, useTheme, withAlpha } from "@/theme";
import { EASE_OUT } from "@/theme/motion";

import { HeroClip } from "./HeroSprite";

const useStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    screen: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, alignItems: "center", justifyContent: "center", gap: 14, padding: 28, backgroundColor: c.mapBackground },
    tag: { ...fontFaces.heavy, fontSize: fontSizes.sm, color: c.primary, textTransform: "uppercase", letterSpacing: 1.2 },
    title: { ...fontFaces.heavy, fontSize: 28, lineHeight: 34, color: c.text, textAlign: "center" },
    note: { ...fontFaces.semibold, fontSize: fontSizes.md, lineHeight: 22, color: c.textSecondary, textAlign: "center" },
    bar: { width: "70%", maxWidth: 280, height: 16, borderRadius: radius.full, backgroundColor: withAlpha(c.border, 0.9), overflow: "hidden", marginTop: spacing.sm },
    fill: { width: "100%", height: "100%", borderRadius: radius.full, backgroundColor: c.primary },
    shine: { position: "absolute", top: 3, left: spacing.sm, right: spacing.sm, height: 4, borderRadius: radius.full, backgroundColor: withAlpha(c.onPrimary, 0.3) },
    actions: { width: "100%", maxWidth: 280, paddingTop: spacing.sm },
  };
});

export function LoadingScreen({ title, levelNumber, progress, failed, onBack }: { title: string; levelNumber: number; progress: number; failed: boolean; onBack: () => void }) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const shown = useSharedValue(0);
  useEffect(() => {
    shown.set(withTiming(Math.max(0.04, Math.min(1, progress)), { duration: 220, easing: EASE_OUT }));
  }, [progress, shown]);
  const fill = useFillStyle(shown);
  return (
    <Animated.View exiting={FadeOut.duration(260)} style={styles.screen} accessibilityLabel={`Loading level ${levelNumber}, ${title}`}>
      <HeroClip size={132} mode="idle" />
      <Text style={styles.tag}>Level {levelNumber}</Text>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      {failed ? (
        <>
          <Text style={styles.note}>The questions could not be loaded. Go back and try again.</Text>
          <View style={styles.actions}>
            <Button label="Back" variant="secondary" onPress={onBack} />
          </View>
        </>
      ) : (
        <>
          <View style={styles.bar} accessible accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}>
            <Animated.View style={[styles.fill, fill]}>
              <View style={styles.shine} />
            </Animated.View>
          </View>
          <Text style={styles.note}>Getting the level ready…</Text>
        </>
      )}
    </Animated.View>
  );
}
