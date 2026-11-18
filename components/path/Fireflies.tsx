/**
 * Fireflies — small white lights drifting around the current node of the lesson map (maths in
 * `firefly-core.ts`). Decorative: hidden from screen readers and never takes a touch.
 *
 * One loop clock drives them all. The clock freezes (frame 0, a few lights already glowing) with
 * reduced motion and when the screen is not focused. Flat dots only: no glow, no gradient.
 */

import { useIsFocused } from "expo-router";
import React, { memo, useMemo } from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, type SharedValue } from "react-native-reanimated";

import { useLoopClock } from "@/components/motion/motion";
import {
  FIREFLY_LOOP_MS,
  fireflyCount,
  fireflyFrame,
  fireflySpec,
  shadeColor,
  type FireflySpec,
} from "@/components/path/firefly-core";

/** Keep lights off the very edge so their drift stays inside the map. */
const EDGE = 16;

interface FireflyProps {
  spec: FireflySpec;
  width: number;
  height: number;
  clock: SharedValue<number>;
  color: string;
}

function Firefly({ spec, width, height, clock, color }: FireflyProps) {
  const r = spec.radius;
  const left = EDGE + spec.fx * Math.max(0, width - EDGE * 2);
  const top = EDGE + spec.fy * Math.max(0, height - EDGE * 2);

  const style = useAnimatedStyle(() => {
    const f = fireflyFrame(spec, clock.get());
    return { opacity: f.opacity, transform: [{ translateX: f.dx }, { translateY: f.dy }] };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          left: left - r,
          top: top - r,
          width: r * 2,
          height: r * 2,
          borderRadius: r,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

export interface FirefliesProps {
  width: number;
  height: number;
  /** How many lights. Defaults to a share of the height. */
  count?: number;
  /** The base colour (the progress ring's): each dot is a little lighter or darker than it. */
  color: string;
}

function FirefliesBase({ width, height, count, color }: FirefliesProps) {
  const reducedMotion = useReducedMotion();
  const focused = useIsFocused();
  const clock = useLoopClock(FIREFLY_LOOP_MS, focused && !reducedMotion);

  const specs = useMemo(() => Array.from({ length: count ?? fireflyCount(height) }, (_, i) => fireflySpec(i)), [count, height]);

  return (
    <View
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={{ position: "absolute", left: 0, top: 0, width, height }}
    >
      {specs.map((spec, i) => (
        <Firefly key={i} spec={spec} width={width} height={height} clock={clock} color={shadeColor(color, spec.shade)} />
      ))}
    </View>
  );
}

export const Fireflies = memo(FirefliesBase);
