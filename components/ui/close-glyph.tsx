/**
 * CloseGlyph — a plain X (two rounded strokes) with no circle or square around it, for a close
 * button that already has its own circle (the ModalCard header). Iconsax has no bare X, so it is
 * drawn here.
 */

import Svg, { Path } from "react-native-svg";

export function CloseGlyph({ size = 18, color, strokeWidth = 3 }: { size?: number; color: string; strokeWidth?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Path d="M6 6L18 18M18 6L6 18" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" fill="none" />
    </Svg>
  );
}
