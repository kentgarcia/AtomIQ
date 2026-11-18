/** A four-pointed sparkle with curved sides, flat colour (the finish stats and the option buttons use it). */

import Svg, { Path } from "react-native-svg";

/** In a 2 x 2 box around (0, 0). */
const SPARKLE_PATH = "M0 -1 Q0.16 -0.16 1 0 Q0.16 0.16 0 1 Q-0.16 0.16 -1 0 Q-0.16 -0.16 0 -1 Z";

export function Sparkle({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="-1 -1 2 2">
      <Path d={SPARKLE_PATH} fill={color} />
    </Svg>
  );
}
