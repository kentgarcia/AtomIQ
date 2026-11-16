/**
 * The celebration behind the finish scene: small bursts of rounded rays in the brand colours and
 * one wide arc of gold rays over the figure. The bursts go off again and again like fireworks (rays
 * shoot out, hang, fade; each on its own period so they never sync) and the arc breathes. View
 * transforms and opacity only. Reduced motion shows one still frame. Flat colour,
 * round-capped strokes, no gradients.
 */

import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withTiming } from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

import { useTheme } from "@/theme";

type Ray = { d: string; w: number };

/** Rays of a burst around (0, 0): long and short alternating, like a firework. */
function burst(rays: number, inner: number, long: number, short: number, width: number): Ray[] {
  return Array.from({ length: rays }, (_, i) => {
    const a = (i / rays) * Math.PI * 2 - Math.PI / 2;
    const len = i % 2 === 0 ? long : short;
    const r = (n: number) => Math.round(n * 100) / 100;
    return { d: `M${r(Math.cos(a) * inner)} ${r(Math.sin(a) * inner)} L${r(Math.cos(a) * (inner + len))} ${r(Math.sin(a) * (inner + len))}`, w: i % 2 === 0 ? width : width * 0.7 };
  });
}

/** Rays fanned over the top half, for the arc behind the characters. */
function arc(rays: number, inner: number, long: number, short: number, width: number): Ray[] {
  return Array.from({ length: rays }, (_, i) => {
    const a = Math.PI + (i / (rays - 1)) * Math.PI;
    const len = i % 2 === 0 ? long : short;
    const r = (n: number) => Math.round(n * 100) / 100;
    return { d: `M${r(Math.cos(a) * inner)} ${r(Math.sin(a) * inner)} L${r(Math.cos(a) * (inner + len))} ${r(Math.sin(a) * (inner + len))}`, w: i % 2 === 0 ? width : width * 0.7 };
  });
}

const SMALL = burst(8, 9, 14, 8, 3.2);
const ARC = arc(9, 118, 26, 14, 5);

/** Slow-start-fast-finish curve for a burst's rays shooting out (a worklet, so it runs on the UI thread). */
function easeOutCubic(x: number): number {
  "worklet";
  return 1 - Math.pow(1 - x, 3);
}

/**
 * A firework: the rays shoot out, hang for a moment, fade while drifting a little further, then the
 * burst rests and goes off again. `period` is the whole cycle, so bursts with different periods and
 * delays never go off in step. With reduced motion it shows its full frame and stays.
 */
function Bloom({ rays, color, size, delay, period = 2400, style }: { rays: Ray[]; color: string; size: number; delay: number; period?: number; style: object }) {
  const reduced = useReducedMotion();
  const t = useSharedValue(reduced ? 0.4 : 0);
  useEffect(() => {
    if (reduced) {
      t.value = 0.4;
      return;
    }
    t.value = 0;
    t.value = withDelay(delay, withRepeat(withTiming(1, { duration: period, easing: Easing.linear }), -1, false));
  }, [delay, period, t, reduced]);
  const anim = useAnimatedStyle(() => {
    const x = t.value;
    const grow = easeOutCubic(Math.min(x / 0.3, 1));
    // In over the first 12%, held to 55%, gone by 85%, then resting until the cycle ends.
    const opacity = x < 0.12 ? x / 0.12 : x < 0.55 ? 1 : x < 0.85 ? 1 - (x - 0.55) / 0.3 : 0;
    return { opacity, transform: [{ scale: 0.35 + 0.65 * grow + 0.18 * x }] };
  });
  const half = size / 2;
  return (
    <Animated.View style={[{ position: "absolute", width: size, height: size }, style, anim]}>
      <Svg width={size} height={size} viewBox={`${-half} ${-half} ${size} ${size}`}>
        {rays.map((r, i) => (
          <Path key={i} d={r.d} stroke={color} strokeWidth={r.w} strokeLinecap="round" fill="none" />
        ))}
      </Svg>
    </Animated.View>
  );
}

/** The wide arc behind the figure: blooms once, then breathes slowly (a little scale and glow). */
function Halo({ rays, color, size, style }: { rays: Ray[]; color: string; size: number; style: object }) {
  const reduced = useReducedMotion();
  const intro = useSharedValue(reduced ? 1 : 0);
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduced) {
      intro.value = 1;
      return;
    }
    intro.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) });
    t.value = withRepeat(withTiming(1, { duration: 3200, easing: Easing.linear }), -1, false);
  }, [intro, t, reduced]);
  const anim = useAnimatedStyle(() => {
    const breathe = Math.sin(t.value * Math.PI * 2);
    return { opacity: intro.value * (0.85 + 0.15 * breathe), transform: [{ scale: (0.6 + 0.4 * intro.value) * (1 + 0.025 * breathe) }] };
  });
  const half = size / 2;
  return (
    <Animated.View style={[{ position: "absolute", width: size, height: size }, style, anim]}>
      <Svg width={size} height={size} viewBox={`${-half} ${-half} ${size} ${size}`}>
        {rays.map((r, i) => (
          <Path key={i} d={r.d} stroke={color} strokeWidth={r.w} strokeLinecap="round" fill="none" />
        ))}
      </Svg>
    </Animated.View>
  );
}

/** Fills its parent (a stage) and ignores touches. Decorative: hidden from screen readers. */
export function Sparkles({ width, height }: { width: number; height: number }) {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <View style={[StyleSheet.absoluteFill, { width, height }]} pointerEvents="none" importantForAccessibility="no-hide-descendants" accessible={false}>
      <Halo rays={ARC} color={c.gold} size={300} style={{ left: width / 2 - 150, top: height * 0.62 - 150 }} />
      <Bloom rays={SMALL} color={c.gold} size={64} delay={120} period={2200} style={{ left: width * 0.12, top: 6 }} />
      <Bloom rays={SMALL} color={c.success} size={64} delay={700} period={2600} style={{ right: width * 0.08, top: 2 }} />
      <Bloom rays={SMALL} color={c.info} size={64} delay={1300} period={2400} style={{ left: 2, top: height * 0.3 }} />
      <Bloom rays={SMALL} color={c.error} size={64} delay={400} period={2800} style={{ right: 2, top: height * 0.26 }} />
      <Bloom rays={SMALL} color={c.success} size={56} delay={1700} period={2300} style={{ left: 4, top: height * 0.62 }} />
      <Bloom rays={SMALL} color={c.gold} size={56} delay={1000} period={2700} style={{ right: 4, top: height * 0.6 }} />
    </View>
  );
}
