/**
 * A number that counts from one value to another and gives a small pulse as it lands (timelines in
 * `reveal-core.ts`), `at` ms after it mounts. The number is text, so it is set on the JS thread, one
 * update per new whole number, like the finish screen's stat tiles. Give it the text style; it adds
 * no layout of its own. With reduced motion it shows the final number.
 */

import { useState } from "react";
import type { StyleProp, TextStyle } from "react-native";
import Animated, { runOnJS, useAnimatedReaction, useAnimatedStyle, useReducedMotion } from "react-native-reanimated";

import { useDelayedClock } from "@/components/motion/use-delayed-clock";
import { PULSE, countBetween, pulseScale } from "@/components/motion/reveal-core";
import { Text } from "@/components/ui/text";

export function CountUp({ from, to, at, duration, style, format }: { from: number; to: number; at: number; duration: number; style?: StyleProp<TextStyle>; format?: (n: number) => string }) {
  const reduced = useReducedMotion();
  const clock = useDelayedClock(duration + PULSE.ms, at);
  const [shown, setShown] = useState(reduced ? to : from);

  useAnimatedReaction(
    () => countBetween(clock.get(), from, to, duration),
    (v, prev) => {
      if (v !== prev) runOnJS(setShown)(v);
    },
    [from, to, duration],
  );
  const pulse = useAnimatedStyle(() => ({ transform: [{ scale: pulseScale(clock.get() - duration) }] }));

  return (
    <Animated.View style={pulse}>
      <Text style={style}>{format ? format(shown) : String(shown)}</Text>
    </Animated.View>
  );
}
