/**
 * Shrodi as one still picture (`assets/images/mascot/happy_2.png`, cheering with a wink), the same one the daily streak
 * screen shows. Onboarding uses it instead of the drawn, moving `Shrodi`: a picture costs the UI thread nothing, where the
 * drawn figure animates SVG props every frame, which is what made the opener sluggish on Android
 * (docs/features/PERFORMANCE_AND_SOUND_SPEC.md). The box is `size` square and the picture sits on its bottom edge,
 * so it replaces `<Shrodi size>` without moving anything around it.
 */

import { memo } from "react";
import { Image } from "expo-image";
import type { ImageStyle, StyleProp } from "react-native";

const SOURCE = require("@/assets/images/mascot/happy_2.png");

export const ShrodiStill = memo(function ShrodiStill({ size = 160, style }: { size?: number; style?: StyleProp<ImageStyle> }) {
  return (
    <Image
      source={SOURCE}
      style={[{ width: size, height: size }, style]}
      contentFit="contain"
      contentPosition="bottom"
      transition={0}
      accessible={false}
      accessibilityElementsHidden
    />
  );
});
