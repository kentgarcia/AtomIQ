/**
 * The boss's defeat, on screen (timeline in `boss-victory-core.ts`): letterbox bars that slide in with
 * the boss's name stamped on the bottom one ("... defeated!", then "The door is open!"), confetti that
 * rains over the whole screen after the burst, and (in the zoomed layer, `BossBlastFx`) a double ring of
 * stars where the boss bursts. `bars` and `clock` are set once per frame by the screen's clock. It always
 * plays through (there is no skip: it is short). Reduced motion: the screen skips the whole thing.
 */

import { View } from "react-native";
import Animated, { useAnimatedStyle, type SharedValue } from "react-native-reanimated";
import { useReducedMotion } from "@/components/motion/use-reduced-motion";

import { Stamp } from "@/components/lesson/Stamp";
import { Burst } from "@/components/motion/Burst";
import { Text } from "@/components/ui/text";
import { createStyles, fontFaces, useTheme } from "@/theme";

import { CONFETTI, VICTORY, confettiPiece } from "./boss-victory-core";

const BAR_COLOR = "#000000"; // theme-allow: the cinematic bars are black over the game picture in light and dark (EX-16)
const BAR_TEXT = "#FFFFFF"; // theme-allow: the boss's name over the black bar, game art (EX-16)

const useStyles = createStyles((theme) => ({
  bar: { position: "absolute", left: 0, right: 0, backgroundColor: BAR_COLOR },
  title: { ...fontFaces.heavy, fontSize: 30, color: BAR_TEXT, letterSpacing: 1, textTransform: "uppercase", textAlign: "center" },
  subtitle: { ...fontFaces.bold, fontSize: 15, color: theme.colors.warning, textAlign: "center", marginTop: 2 },
}));

function ConfettiPiece({ i, clock, width, height, colors }: { i: number; clock: SharedValue<number>; width: number; height: number; colors: readonly string[] }) {
  const anim = useAnimatedStyle(() => {
    const p = confettiPiece(i, clock.get());
    return { opacity: p.opacity, transform: [{ translateX: p.x * width }, { translateY: p.y * height }, { rotate: `${p.rotate}deg` }] };
  });
  const base = confettiPiece(i, 0);
  return <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, top: 0, width: base.size, height: base.size * 0.5, borderRadius: 2, backgroundColor: colors[base.color], opacity: 0 }, anim]} />;
}

export interface BossVictoryProps {
  bars: SharedValue<number>;
  clock: SharedValue<number>;
  name: string;
  topHeight: number;
  bottomHeight: number;
  width: number;
  height: number;
}

export function BossVictory({ bars, clock, name, topHeight, bottomHeight, width, height }: BossVictoryProps) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const reduced = useReducedMotion();
  const c = theme.colors;
  const colors = [c.warning, c.primary, c.success, c.error, c.info] as const;
  const top = useAnimatedStyle(() => ({ transform: [{ translateY: -topHeight * (1 - bars.get()) }] }));
  const bottom = useAnimatedStyle(() => ({ transform: [{ translateY: bottomHeight * (1 - bars.get()) }] }));
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
      {reduced ? null : (
        <View pointerEvents="none" style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0, overflow: "hidden" }}>
          {Array.from({ length: CONFETTI }, (_, i) => (
            <ConfettiPiece key={i} i={i} clock={clock} width={width} height={height} colors={colors} />
          ))}
        </View>
      )}
      <Animated.View pointerEvents="none" style={[styles.bar, { top: 0, height: topHeight }, top]} />
      <Animated.View pointerEvents="none" style={[styles.bar, { bottom: 0, height: bottomHeight, alignItems: "center", paddingTop: 18 }, bottom]}>
        <Stamp at={VICTORY.titleAt}>
          <Text style={styles.title}>{name} defeated!</Text>
        </Stamp>
        <Stamp at={VICTORY.subtitleAt} tilt={-1}>
          <Text style={styles.subtitle}>The door is open!</Text>
        </Stamp>
      </Animated.View>
    </View>
  );
}

/** Two rings of stars where the boss bursts; sits in the zoomed layer (px in the unzoomed screen). */
export function BossBlastFx({ clock, at, tile }: { clock: SharedValue<number>; at: { x: number; y: number }; tile: number }) {
  const { theme } = useTheme();
  const reduced = useReducedMotion();
  if (reduced) return null;
  const diameter = Math.round(tile * 3);
  return (
    <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={{ position: "absolute", left: at.x - diameter / 2, top: at.y - diameter / 2, width: diameter, height: diameter }}>
      <Burst clock={clock} at={VICTORY.explodeAt} diameter={diameter} color={theme.colors.warning} ringColor={theme.colors.error} reach={tile * 3.4} count={14} />
      <Burst clock={clock} at={VICTORY.explodeAt + 140} diameter={diameter * 0.7} color={theme.colors.primary} ringColor={theme.colors.warning} reach={tile * 2.2} count={9} />
    </View>
  );
}
