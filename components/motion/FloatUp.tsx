/**
 * Little icons that float up out of whatever it sits in when `trigger` changes (timeline in
 * `float-up-core.ts`): three, one after another, each in its own sideways spot, rising 24 px while they
 * fade. Put it inside a relatively positioned View (a reaction pill): it centres itself on it and takes
 * no room. It does not play when it mounts, and `active` false (a reaction taken back) plays nothing.
 * Reduced motion draws nothing. Decorative: hidden from screen readers, never takes a touch.
 */

import type { ReactNode } from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle, type SharedValue } from "react-native-reanimated";
import { useReducedMotion } from "@/components/motion/use-reduced-motion";

import { FLOAT, FLOAT_TOTAL, floatFrame } from "@/components/motion/float-up-core";
import { useTriggerClock } from "@/components/motion/use-trigger-clock";

function Floater({ i, clock, size, children }: { i: number; clock: SharedValue<number>; size: number; children: ReactNode }) {
  const anim = useAnimatedStyle(() => {
    const f = floatFrame(i, clock.get());
    return { opacity: f.opacity, transform: [{ translateX: f.x }, { translateY: f.y }, { rotate: `${f.rotate}deg` }, { scale: f.scale }] };
  });
  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", left: -size / 2, top: -size / 2, opacity: 0 }, anim]}>
      {children}
    </Animated.View>
  );
}

export function FloatUp({ trigger, active = true, size, render }: { trigger: unknown; active?: boolean; /** Width and height of one icon, px. */ size: number; render: (i: number) => ReactNode }) {
  const reduced = useReducedMotion();
  const clock = useTriggerClock(FLOAT_TOTAL, trigger, active);
  if (reduced) return null;
  return (
    <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={{ position: "absolute", left: "50%", top: "50%", width: 0, height: 0, overflow: "visible" }}>
      {Array.from({ length: FLOAT.count }, (_, i) => (
        <Floater key={i} i={i} clock={clock} size={size}>
          {render(i)}
        </Floater>
      ))}
    </View>
  );
}
