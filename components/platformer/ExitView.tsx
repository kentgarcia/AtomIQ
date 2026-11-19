/**
 * The end of a level on the map (timeline in `exit-core.ts`): the title stamped over the top of the
 * screen ("Level complete!" or "Out of hearts"), and, in the zoomed layer, the stars popping out over
 * the door one by one (an earned one the gold star with a burst, an unearned one the grey empty star; both drawn like the HUD's coin and heart).
 */

import { Image, View } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, type SharedValue } from "react-native-reanimated";

import { Stamp } from "@/components/lesson/Stamp";
import { Burst } from "@/components/motion/Burst";
import { Text } from "@/components/ui/text";
import { createStyles, fontFaces, useTheme } from "@/theme";

import { starAt, starPop } from "./exit-core";
import { HUD_ICON_COLOR, HUD_SHADOW_COLOR, PROP_SPRITES } from "./sprites";

const useStyles = createStyles(() => ({
  title: { ...fontFaces.heavy, fontSize: 36, lineHeight: 42, color: HUD_ICON_COLOR, textAlign: "center", letterSpacing: 0.5, textShadowColor: HUD_SHADOW_COLOR, textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 3 },
}));

/** The stamped title, over the top of the screen; mount it when it should land. */
export function ExitTitle({ text, top }: { text: string; top: number }) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 20, right: 20, top, alignItems: "center" }}>
      <Stamp at={0}>
        <Text style={styles.title} accessibilityRole="header">
          {text}
        </Text>
      </Stamp>
    </View>
  );
}

/** Where each star sits over the door, in tiles from the door's top middle, and how big it is (tiles). */
const SPOTS: readonly { x: number; y: number; size: number }[] = [
  { x: -1.3, y: -0.35, size: 1.05 },
  { x: 0, y: -1.1, size: 1.35 },
  { x: 1.3, y: -0.35, size: 1.05 },
];

function Star({ i, earned, clock, tile, at }: { i: number; earned: boolean; clock: SharedValue<number>; tile: number; at: { x: number; y: number } }) {
  const { theme } = useTheme();
  const spot = SPOTS[i];
  const size = Math.round(spot.size * tile);
  const cx = at.x + spot.x * tile;
  const cy = at.y + spot.y * tile;
  const reduced = useReducedMotion();
  const anim = useAnimatedStyle(() => {
    // With reduced motion the stars are simply there, at rest
    const f = starPop(reduced ? 10000 : clock.get() - starAt(i), earned);
    return { opacity: f.opacity, transform: [{ translateY: f.dy * tile }, { rotate: `${f.rotate}deg` }, { scale: f.scale }] };
  });
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: cx - size / 2, top: cy - size / 2, width: size, height: size }}>
      <Animated.View style={[{ width: size, height: size, opacity: 0 }, anim]}>
        <Image source={earned ? PROP_SPRITES.star : PROP_SPRITES.starEmpty} style={{ width: size, height: size }} fadeDuration={0} />
      </Animated.View>
      {earned ? <Burst clock={clock} at={starAt(i)} diameter={size} color={theme.colors.gold} ringColor={theme.colors.warning} reach={tile * 1.2} count={7} /> : null}
    </View>
  );
}

/** The three stars over the door (`at` is the door's top middle in the unzoomed screen's px). */
export function ExitStars({ clock, at, tile, stars }: { clock: SharedValue<number>; at: { x: number; y: number }; tile: number; stars: number }) {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <Star key={i} i={i} earned={i < stars} clock={clock} tile={tile} at={at} />
      ))}
    </>
  );
}
