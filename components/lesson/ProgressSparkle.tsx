/**
 * A few small four-point stars that twinkle at the leading edge of the lesson progress bar each time it
 * grows. Driven by one shared value (`pop`, 0 to 1): each star scales up and back down on its own slice
 * of it, turning a quarter turn. View transforms only; flat colour. Decorative.
 */

import Animated, { Extrapolation, interpolate, useAnimatedStyle, type SharedValue } from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

import { useTheme } from "@/theme";

const STAR = "M12 0 C12 8 16 12 24 12 C16 12 12 16 12 24 C12 16 8 12 0 12 C8 12 12 8 12 0 Z";

type Spec = { x: number; y: number; size: number; start: number; tone: "gold" | "primaryLight" };

// Offsets are from the end of the fill, at the bar's vertical centre (the bar is 16 high).
const STARS: Spec[] = [
  { x: -2, y: -13, size: 13, start: 0, tone: "gold" },
  { x: 7, y: 5, size: 11, start: 0.14, tone: "primaryLight" },
  { x: 13, y: -7, size: 9, start: 0.28, tone: "gold" },
];

function Twinkle({ spec, pop }: { spec: Spec; pop: SharedValue<number> }) {
  const { theme } = useTheme();
  const { start } = spec;
  const style = useAnimatedStyle(() => {
    const s = interpolate(pop.value, [start, start + 0.25, start + 0.6], [0, 1, 0], Extrapolation.CLAMP);
    const turn = interpolate(pop.value, [start, start + 0.6], [-45, 45], Extrapolation.CLAMP);
    return { opacity: s > 0 ? 1 : 0, transform: [{ scale: s }, { rotate: `${turn}deg` }] };
  });
  return (
    <Animated.View style={[{ position: "absolute", right: -spec.x - spec.size / 2, top: 8 + spec.y - spec.size / 2, width: spec.size, height: spec.size }, style]}>
      <Svg width={spec.size} height={spec.size} viewBox="0 0 24 24">
        <Path d={STAR} fill={theme.colors[spec.tone]} />
      </Svg>
    </Animated.View>
  );
}

/** Place inside an absolutely positioned box whose right edge is the end of the fill. */
export function ProgressSparkle({ pop }: { pop: SharedValue<number> }) {
  return (
    <>
      {STARS.map((spec, i) => (
        <Twinkle key={i} spec={spec} pop={pop} />
      ))}
    </>
  );
}
