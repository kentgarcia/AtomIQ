/**
 * The explosion that ends a lost Myth Buster round (timeline in `explosion-core.ts`): a flash, a
 * spiky blast that pops past its size and settles with a hotter one inside it, a white core, two
 * shock rings, flat debris flung out on arcs, a dimmed page and a stamped BOOM!. Flat colour from
 * the theme's danger roles, no gradients (SVG gradients render black on device). `clock` is the
 * moment's clock in ms (0 up to `EXPLOSION.total`); the screen also shakes through
 * `useExplosionShake`. Decorative: never takes a touch. With reduced motion it is only the dimmed
 * page and a still BOOM!, no movement.
 */

import { StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle, type SharedValue } from "react-native-reanimated";
import { useReducedMotion } from "@/components/motion/use-reduced-motion";
import Svg, { Path } from "react-native-svg";

import { Sparkle } from "@/components/lesson/Sparkle";
import { Text } from "@/components/ui/text";
import { createStyles, fontFaces, useTheme } from "@/theme";

import { EXPLOSION, explosionDebris, explosionFrame, explosionRing, explosionShake, starburstPath } from "./explosion-core";

const BOX = 320;
const OUTER_PATH = starburstPath(12, 150, 104);
const INNER_PATH = starburstPath(10, 104, 66, 3);
const RING_SIZE = 240;
const CORE = 84;

const useStyles = createStyles((theme) => ({
  overlay: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center", zIndex: 40 },
  fill: { ...StyleSheet.absoluteFill },
  center: { position: "absolute", width: 0, height: 0, alignItems: "center", justifyContent: "center", overflow: "visible" },
  ring: { position: "absolute", width: RING_SIZE, height: RING_SIZE, borderRadius: RING_SIZE / 2, borderWidth: 6, left: -RING_SIZE / 2, top: -RING_SIZE / 2 },
  core: { position: "absolute", width: CORE, height: CORE, borderRadius: CORE / 2, left: -CORE / 2, top: -CORE / 2 },
  blast: { position: "absolute", left: -BOX / 2, top: -BOX / 2 },
  label: { position: "absolute", left: -140, top: -34, width: 280, alignItems: "center" },
  labelText: {
    fontSize: 54,
    lineHeight: 62,
    letterSpacing: 2,
    ...fontFaces.black,
    color: theme.colors.onPrimary,
    textShadowColor: theme.colors.dangerDark,
    textShadowOffset: { width: 0, height: 5 },
    textShadowRadius: 0,
  },
}));

/** The throw of the whole screen: put the style on the page's root view. */
export function useExplosionShake(clock: SharedValue<number>) {
  const reduced = useReducedMotion();
  return useAnimatedStyle(() => {
    if (reduced) return {};
    const s = explosionShake(clock.get());
    return { transform: [{ translateX: s.x }, { translateY: s.y }] };
  });
}

function Ring({ i, clock, color }: { i: number; clock: SharedValue<number>; color: string }) {
  const styles = useStyles(useTheme().theme);
  const anim = useAnimatedStyle(() => {
    const r = explosionRing(i, clock.get());
    return { opacity: r.opacity, transform: [{ scale: r.scale }] };
  });
  return <Animated.View pointerEvents="none" style={[styles.ring, { borderColor: color, opacity: 0 }, anim]} />;
}

function Debris({ i, clock, color }: { i: number; clock: SharedValue<number>; color: string }) {
  const anim = useAnimatedStyle(() => {
    const d = explosionDebris(i, clock.get());
    return { opacity: d.opacity, transform: [{ translateX: d.x }, { translateY: d.y }, { rotate: `${d.rotate}deg` }, { scale: d.scale }] };
  });
  const kind = i % 3;
  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", left: -11, top: -11, opacity: 0 }, anim]}>
      {kind === 0 ? <View style={{ width: 16, height: 16, borderRadius: 8, margin: 3, backgroundColor: color }} /> : null}
      {kind === 1 ? <View style={{ width: 18, height: 18, borderRadius: 5, margin: 2, backgroundColor: color }} /> : null}
      {kind === 2 ? <Sparkle size={24} color={color} /> : null}
    </Animated.View>
  );
}

export function Explosion({ clock }: { clock: SharedValue<number> }) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const c = theme.colors;
  const reduced = useReducedMotion();
  const white = theme.palettes.tab.white;
  const debrisColors = [c.error, c.warning, c.gold, c.dangerDark];

  const flash = useAnimatedStyle(() => ({ opacity: explosionFrame(clock.get()).flash }));
  const dim = useAnimatedStyle(() => ({ opacity: explosionFrame(clock.get()).dim }));
  const blast = useAnimatedStyle(() => {
    const f = explosionFrame(clock.get());
    return { opacity: f.blastOpacity, transform: [{ rotate: `${f.blastRotate}deg` }, { scale: f.blastScale }] };
  });
  const inner = useAnimatedStyle(() => {
    const f = explosionFrame(clock.get());
    return { opacity: f.blastOpacity, transform: [{ rotate: `${-f.blastRotate * 0.6}deg` }, { scale: f.innerScale }] };
  });
  const core = useAnimatedStyle(() => {
    const f = explosionFrame(clock.get());
    return { opacity: f.coreOpacity, transform: [{ scale: f.coreScale }] };
  });
  const label = useAnimatedStyle(() => {
    const f = explosionFrame(clock.get());
    return { opacity: f.labelOpacity, transform: [{ rotate: `${f.labelRotate}deg` }, { scale: f.labelScale }] };
  });

  if (reduced) {
    return (
      <View style={styles.overlay} pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants">
        <View style={[styles.fill, { backgroundColor: c.dangerDark, opacity: 0.5 }]} />
        <Text style={styles.labelText}>BOOM!</Text>
      </View>
    );
  }

  return (
    <View style={styles.overlay} pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants">
      <Animated.View style={[styles.fill, { backgroundColor: c.dangerDark, opacity: 0 }, dim]} />
      <View style={styles.center}>
        {Array.from({ length: EXPLOSION.ringCount }, (_, i) => (
          <Ring key={i} i={i} clock={clock} color={i === 0 ? c.warning : c.error} />
        ))}
        <Animated.View style={[styles.blast, { opacity: 0 }, blast]}>
          <Svg width={BOX} height={BOX} viewBox={`${-BOX / 2} ${-BOX / 2} ${BOX} ${BOX}`}>
            <Path d={OUTER_PATH} fill={c.error} stroke={c.error} strokeWidth={14} strokeLinejoin="round" />
          </Svg>
        </Animated.View>
        <Animated.View style={[styles.blast, { opacity: 0 }, inner]}>
          <Svg width={BOX} height={BOX} viewBox={`${-BOX / 2} ${-BOX / 2} ${BOX} ${BOX}`}>
            <Path d={INNER_PATH} fill={c.warning} stroke={c.warning} strokeWidth={12} strokeLinejoin="round" />
          </Svg>
        </Animated.View>
        <Animated.View style={[styles.core, { backgroundColor: white, opacity: 0 }, core]} />
        {Array.from({ length: EXPLOSION.debrisCount }, (_, i) => (
          <Debris key={i} i={i} clock={clock} color={debrisColors[i % debrisColors.length]!} />
        ))}
        <Animated.View style={[styles.label, { opacity: 0 }, label]}>
          <Text style={styles.labelText}>BOOM!</Text>
        </Animated.View>
      </View>
      <Animated.View style={[styles.fill, { backgroundColor: white, opacity: 0 }, flash]} />
    </View>
  );
}
