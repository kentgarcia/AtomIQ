/**
 * The boss introduction's screen furniture (timeline in `boss-intro-core.ts`): two letterbox bars that
 * slide in from the top and bottom, the boss's name stamped on the bottom bar with a line under it,
 * and a ring of stars where the boss slams down (that one lives in
 * the zoomed layer, `BossSlamFx`). `bars` is the bars' 0..1 value, set once per frame by the screen's
 * clock. It always plays through (there is no skip: it is short).
 */

import { View } from "react-native";
import Animated, { useAnimatedStyle, type SharedValue } from "react-native-reanimated";
import { useReducedMotion } from "@/components/motion/use-reduced-motion";

import { Burst } from "@/components/motion/Burst";
import { Stamp } from "@/components/lesson/Stamp";
import { Text } from "@/components/ui/text";
import { createStyles, fontFaces, useTheme } from "@/theme";

import { INTRO, SLAM_AT } from "./boss-intro-core";

const BAR_COLOR = "#000000"; // theme-allow: the cinematic bars are black over the game picture in light and dark (EX-16)
const BAR_TEXT = "#FFFFFF"; // theme-allow: the boss's name over the black bar, game art (EX-16)

const useStyles = createStyles((theme) => ({
  bar: { position: "absolute", left: 0, right: 0, backgroundColor: BAR_COLOR },
  title: { ...fontFaces.heavy, fontSize: 34, color: BAR_TEXT, letterSpacing: 1, textTransform: "uppercase", textAlign: "center" },
  subtitle: { ...fontFaces.bold, fontSize: 15, color: theme.colors.warning, textAlign: "center", marginTop: 2 },
}));

export interface BossIntroProps {
  bars: SharedValue<number>;
  name: string;
  topHeight: number;
  bottomHeight: number;
}

export function BossIntro({ bars, name, topHeight, bottomHeight }: BossIntroProps) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const top = useAnimatedStyle(() => ({ transform: [{ translateY: -topHeight * (1 - bars.get()) }] }));
  const bottom = useAnimatedStyle(() => ({ transform: [{ translateY: bottomHeight * (1 - bars.get()) }] }));
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
      <Animated.View pointerEvents="none" style={[styles.bar, { top: 0, height: topHeight }, top]} />
      <Animated.View pointerEvents="none" style={[styles.bar, { bottom: 0, height: bottomHeight, alignItems: "center", paddingTop: 18 }, bottom]}>
        <Stamp at={INTRO.titleAt}>
          <Text style={styles.title}>{name}</Text>
        </Stamp>
        <Stamp at={INTRO.subtitleAt} tilt={-1}>
          <Text style={styles.subtitle}>Guardian of the flag</Text>
        </Stamp>
      </Animated.View>
    </View>
  );
}

/** A ring of stars where the boss lands; sits in the zoomed layer at the boss's feet (px in the unzoomed screen). */
export function BossSlamFx({ clock, at, tile }: { clock: SharedValue<number>; at: { x: number; y: number }; tile: number }) {
  const { theme } = useTheme();
  const reduced = useReducedMotion();
  if (reduced) return null;
  const diameter = Math.round(tile * 2.2);
  return (
    <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={{ position: "absolute", left: at.x - diameter / 2, top: at.y - diameter / 2, width: diameter, height: diameter }}>
      <Burst clock={clock} at={SLAM_AT} diameter={diameter} color={theme.colors.warning} ringColor={theme.colors.primary} reach={tile * 2} count={10} />
    </View>
  );
}
