/**
 * The fixed reticle over the middle of the scene: four corner brackets that tighten and take the success colour when
 * a target is locked on and a line sweeping through the box while it scans (scanner-core.ts `scanFrame`; the progress
 * ring is on the shutter button). Reduced motion: no sweep and no tightening.
 */

import { View } from "react-native";
import Animated, {
  useAnimatedStyle,
  type SharedValue,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

import { scanFrame } from "./scanner-core";

export const RETICLE = 170;
const ARM = 26;

// A bracket is an L in each corner of the box.
const BRACKETS = `M2 ${ARM} V10 a8 8 0 0 1 8 -8 H${ARM} M${RETICLE - ARM} 2 H${RETICLE - 10} a8 8 0 0 1 8 8 V${ARM} M${RETICLE - 2} ${RETICLE - ARM} V${RETICLE - 10} a8 8 0 0 1 -8 8 H${RETICLE - ARM} M${ARM} ${RETICLE - 2} H10 a8 8 0 0 1 -8 -8 V${RETICLE - ARM}`;

export function Reticle({
  locked,
  clock,
  scanning,
  reduced,
  idleColor,
  lockedColor,
  sweepColor,
}: {
  locked: boolean;
  /** Scan clock in ms (0 when not scanning). */
  clock: SharedValue<number>;
  scanning: boolean;
  reduced: boolean;
  idleColor: string;
  lockedColor: string;
  sweepColor: string;
}) {
  const sweepStyle = useAnimatedStyle(() => ({
    opacity: scanning && !reduced ? 1 : 0,
    transform: [
      { translateY: scanFrame(clock.value, reduced).sweep * (RETICLE - 6) },
    ],
  }));
  const color = locked ? lockedColor : idleColor;
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        width: RETICLE,
        height: RETICLE,
        left: "50%",
        top: "50%",
        marginLeft: -RETICLE / 2,
        marginTop: -RETICLE / 2,
      }}
    >
      <Svg
        width={RETICLE}
        height={RETICLE}
        viewBox={`0 0 ${RETICLE} ${RETICLE}`}
        style={{ transform: [{ scale: locked && !reduced ? 0.94 : 1 }] }}
      >
        <Path
          d={BRACKETS}
          fill="none"
          stroke={color}
          strokeWidth={4}
          strokeLinecap="round"
        />
      </Svg>
      <Animated.View
        style={[
          {
            position: "absolute",
            left: 6,
            right: 6,
            top: 3,
            height: 3,
            borderRadius: 2,
            backgroundColor: sweepColor,
          },
          sweepStyle,
        ]}
      />
    </View>
  );
}
