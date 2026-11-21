/**
 * The band of light that waits on the one button that is waiting to be pressed (timeline in
 * `shine-core.ts`; the stat tiles of the finish screen have the same one). Put it inside the button's
 * face and give it the face's corner radius: it fills its parent, clips to the radius, and sweeps once
 * every few seconds after a first look at the button.
 *
 * Quiet by design: it stops when `enabled` is false, when the screen is not in front and with reduced
 * motion, and it never takes a touch.
 */

import { useEffect, useState } from "react";
import { View } from "react-native";
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming } from "react-native-reanimated";
import { useIdleStill } from "@/components/motion/use-reduced-motion";
import { useIsFocused } from "expo-router";

import { SHINE, shineFrame } from "@/components/motion/shine-core";
import { useTheme, withAlpha } from "@/theme";

export function ShineSweep({ radius, enabled = true }: { radius: number; enabled?: boolean }) {
  const { theme } = useTheme();
  const reduced = useIdleStill();
  const focused = useIsFocused();
  const live = enabled && !reduced && focused;
  const clock = useSharedValue(0);
  const width = useSharedValue(0);
  const [measured, setMeasured] = useState(0);

  useEffect(() => {
    cancelAnimation(clock);
    clock.set(0);
    if (!live) return;
    clock.set(withDelay(SHINE.firstDelay, withRepeat(withTiming(SHINE.periodMs, { duration: SHINE.periodMs, easing: Easing.linear }), -1, false)));
    return () => cancelAnimation(clock);
  }, [live, clock]);

  const band = useAnimatedStyle(() => {
    const f = shineFrame(clock.get());
    return { opacity: f.opacity, transform: [{ translateX: f.left * width.get() }, { skewX: `-${SHINE.lean}deg` }] };
  });

  return (
    <View
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0, borderRadius: radius, overflow: "hidden" }}
      onLayout={(e) => {
        width.set(e.nativeEvent.layout.width);
        setMeasured(e.nativeEvent.layout.width);
      }}
    >
      {live && measured > 0 ? (
        <Animated.View
          style={[{ position: "absolute", top: -6, bottom: -6, left: 0, width: measured * SHINE.bandWidth, backgroundColor: withAlpha(theme.palettes.tab.white, 0.3), opacity: 0 }, band]}
        />
      ) : null}
    </View>
  );
}
