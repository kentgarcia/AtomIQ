import React, { useId } from "react";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";

/**
 * Flame drawn in SVG so it stays sharp at any size (the bundled fire icon is
 * only 64 px). Colors are passed in from theme roles.
 */
export function Flame({
  size,
  top,
  bottom,
  inner,
}: {
  /** Width in px; height is 1.2x. */
  size: number;
  top: string;
  bottom: string;
  /** Color of the inner flame. */
  inner: string;
}) {
  const gradientId = useId().replace(/:/g, "");
  return (
    <Svg width={size} height={size * 1.2} viewBox="0 0 100 120">
      <Defs>
        <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={top} />
          <Stop offset="1" stopColor={bottom} />
        </LinearGradient>
      </Defs>
      <Path
        d="M50 3 C58 24 84 40 84 74 C84 98 69 114 50 114 C31 114 16 98 16 74 C16 57 25 46 34 35 C36 46 42 52 47 52 C44 34 44 18 50 3 Z"
        fill={`url(#${gradientId})`}
      />
      <Path
        d="M50 56 C57 70 69 79 69 92 C69 104 61 112 50 112 C39 112 31 104 31 92 C31 79 43 70 50 56 Z"
        fill={inner}
      />
    </Svg>
  );
}
