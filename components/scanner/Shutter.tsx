/**
 * The scan button, drawn like a camera's shutter: a white ring round a white disc. The disc turns the success colour when a thing is
 * locked on and shrinks a little while pressed; while scanning, a progress ring fills round it (the scan clock, scanner-core.ts
 * `scanFrame`). Not available (nothing locked) it is dimmed. Reduced motion: no shrink, the ring still fills.
 */

import { memo } from "react";
import { Pressable, View } from "react-native";
import Animated, {
  useAnimatedProps,
  type SharedValue,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";

import { scanFrame } from "./scanner-core";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export const SHUTTER = 84;
const RING_W = 5;
const R = (SHUTTER - RING_W) / 2;
const C = 2 * Math.PI * R;
const DISC = 58;

export const Shutter = memo(function Shutter({
  clock,
  scanning,
  locked,
  reduced,
  onPress,
  label,
  ringColor,
  discColor,
  lockedColor,
  progressColor,
}: {
  clock: SharedValue<number>;
  scanning: boolean;
  locked: boolean;
  reduced: boolean;
  onPress: () => void;
  label: string;
  ringColor: string;
  discColor: string;
  lockedColor: string;
  progressColor: string;
}) {
  const progress = useAnimatedProps(() => ({
    strokeDashoffset: C * (1 - scanFrame(clock.get(), reduced).ring),
  }));
  return (
    <Pressable
      onPress={onPress}
      // Pressed with nothing locked, it only says so (a short "miss"), so it is disabled only while a scan runs
      disabled={scanning}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: scanning }}
      style={{
        width: SHUTTER,
        height: SHUTTER,
        alignItems: "center",
        justifyContent: "center",
        opacity: locked || scanning ? 1 : 0.55,
      }}
    >
      {({ pressed }) => (
        <>
          <Svg
            width={SHUTTER}
            height={SHUTTER}
            style={{ position: "absolute" }}
          >
            <Circle
              cx={SHUTTER / 2}
              cy={SHUTTER / 2}
              r={R}
              fill="none"
              stroke={ringColor}
              strokeWidth={RING_W}
            />
            {scanning ? (
              <AnimatedCircle
                cx={SHUTTER / 2}
                cy={SHUTTER / 2}
                r={R}
                fill="none"
                stroke={progressColor}
                strokeWidth={RING_W}
                strokeLinecap="round"
                strokeDasharray={C}
                rotation={-90}
                origin={`${SHUTTER / 2}, ${SHUTTER / 2}`}
                animatedProps={progress}
              />
            ) : null}
          </Svg>
          <View
            style={{
              width: DISC,
              height: DISC,
              borderRadius: DISC / 2,
              backgroundColor: locked ? lockedColor : discColor,
              transform: [
                { scale: scanning ? 0.7 : pressed && !reduced ? 0.88 : 1 },
              ],
            }}
          />
        </>
      )}
    </Pressable>
  );
});
