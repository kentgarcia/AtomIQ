/**
 * An event button for the Home map, in the manner of a streak-event button in a language app: a rounded square tile with
 * the 3D face-and-lip look of the app icons (`components/phone/AppIcon.tsx`), a picture on its face, and across its bottom a
 * flat band, a darker tone of the tile's own colour, that names the event; the lip under the tile is darker still. A round "!"
 * badge sits on the corner while the event has something the learner has not looked at.
 *
 * A press sinks it to 92%, takes the face to the band's colour and dips the picture; the tap itself makes the picture hop (130 ms up,
 * 170 ms back down). Reduced motion: only the colour changes. The picture's own idle life is the caller's (a live `Shrodi`).
 */

import { memo, type ReactNode } from "react";
import { Pressable, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withTiming } from "react-native-reanimated";
import { useReducedMotion } from "@/components/motion/use-reduced-motion";

import { darken } from "@/components/lesson/visual/color-math";
import { PRESS } from "@/components/phone/phone-fx-core";
import { Text } from "@/components/ui/text";
import { createStyles, fontFaces, useTheme } from "@/theme";
import { EASE_OUT } from "@/theme/motion";

const LIP = 4;
const BAND_H = 22;
/** How far the picture may stand above the tile (the head pops out of the shape), and out to each side. */
export const EVENT_POP = 18;
const SIDE = 10;

/* The tile's picture-side background (100 x 100 frame, flat, white at low strength so it is a lighter tone of the face): rays
   turning out from behind the head, a soft glow, and a few twinkles. */
const BACKDROP = {
  rays: "M50 40 L50.0 -70.0 L78.5 -66.3 Z M50 40 L105.0 -55.3 L127.8 -37.8 Z M50 40 L145.3 -15.0 L156.3 11.5 Z M50 40 L160.0 40.0 L156.3 68.5 Z M50 40 L145.3 95.0 L127.8 117.8 Z M50 40 L105.0 135.3 L78.5 146.3 Z M50 40 L50.0 150.0 L21.5 146.3 Z M50 40 L-5.0 135.3 L-27.8 117.8 Z M50 40 L-45.3 95.0 L-56.3 68.5 Z M50 40 L-60.0 40.0 L-56.3 11.5 Z M50 40 L-45.3 -15.0 L-27.8 -37.8 Z M50 40 L-5.0 -55.3 L21.5 -66.3 Z",
  sparkles: ["M10 14 Q10 20 16 20 Q10 20 10 26 Q10 20 4 20 Q10 20 10 14 Z", "M91 11 Q91 16 96 16 Q91 16 91 21 Q91 16 86 16 Q91 16 91 11 Z", "M92 42 Q92 46 96 46 Q92 46 92 50 Q92 46 88 46 Q92 46 92 42 Z", "M8 49 Q8 52 11 52 Q8 52 8 55 Q8 52 5 52 Q8 52 8 49 Z"],
} as const;

export interface EventButtonProps {
  /** The event's name on the band: a word or two, shown in capitals. */
  label: string;
  /**
   * The picture, placed from the tile's top-left corner (so it may start above or beside it). It stands behind the band and
   * may reach outside the tile at the top and the sides, but is cut off where the band begins.
   */
  children: ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
  /** Show the "!" badge. */
  badge?: boolean;
  /** Tile width and height, dp. */
  size?: number;
  style?: StyleProp<ViewStyle>;
}

/** Height of the whole button for a tile of `size`: the room for the picture above it, the tile and its lip. */
export const eventButtonHeight = (size: number) => EVENT_POP + size + LIP;

export const EventButton = memo(function EventButton({ label, children, onPress, accessibilityLabel, badge = false, size = 60, style }: EventButtonProps) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const c = theme.colors;
  const reduced = useReducedMotion();
  const pressed = useSharedValue(0);
  const radius = Math.round(size * 0.27);

  const sink = useAnimatedStyle(() => ({ transform: [{ scale: reduced ? 1 : 1 + (PRESS.scale - 1) * pressed.get() }] }));
  const lip = darken(c.skyLip, 0.2);
  const hop = useSharedValue(0);
  const pictureStyle = useAnimatedStyle(() => ({ transform: [{ translateY: hop.get() + 3 * pressed.get() }] }));
  const handlePress = () => {
    if (!reduced) hop.set(withSequence(withTiming(-10, { duration: 130, easing: EASE_OUT }), withTiming(0, { duration: 170, easing: Easing.in(Easing.quad) })));
    onPress();
  };
  const bandStyle = useAnimatedStyle(() => ({ backgroundColor: pressed.get() > 0.5 ? lip : c.skyLip }));
  const faceStyle = useAnimatedStyle(() => ({ backgroundColor: pressed.get() > 0.5 ? c.skyLip : c.sky }));

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={() => pressed.set(withTiming(1, { duration: 60, easing: EASE_OUT }))}
      onPressOut={() => pressed.set(withTiming(0, { duration: PRESS.releaseMs, easing: EASE_OUT }))}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={6}
      style={[{ width: size, height: eventButtonHeight(size) }, style]}
    >
      <Animated.View style={[{ width: size, height: eventButtonHeight(size) }, sink]}>
        {/* Everything below is laid out from the tile's own top-left corner, EVENT_POP down from the top */}
        <View pointerEvents="none" style={{ position: "absolute", left: 0, top: EVENT_POP, width: size, height: size + LIP }}>
          {/* The lip, then the face over it */}
          <View style={{ position: "absolute", left: 0, top: LIP, width: size, height: size, borderRadius: radius, borderCurve: "continuous", backgroundColor: lip }} />
          <Animated.View style={[{ width: size, height: size, borderRadius: radius, borderCurve: "continuous", overflow: "hidden" }, faceStyle]}>
            <Svg width={size} height={size} viewBox="0 0 100 100">
              <Path d={BACKDROP.rays} fill={c.lessonHeaderText} fillOpacity={0.2} />
              <Circle cx={50} cy={42} r={44} fill={c.lessonHeaderText} fillOpacity={0.1} />
              <Circle cx={50} cy={42} r={30} fill={c.lessonHeaderText} fillOpacity={0.12} />
              {BACKDROP.sparkles.map((d, i) => (
                <Path key={i} d={d} fill={c.lessonHeaderText} fillOpacity={0.75} />
              ))}
            </Svg>
          </Animated.View>

          {/* The picture: behind the band, free to stand out of the tile above and beside it, cut off under the band's top */}
          <View style={{ position: "absolute", left: -SIDE, top: -EVENT_POP, width: size + SIDE * 2, height: EVENT_POP + size - BAND_H + 6, overflow: "hidden" }}>
            <Animated.View style={[{ position: "absolute", left: SIDE, top: EVENT_POP, width: size, height: size }, pictureStyle]}>{children}</Animated.View>
          </View>

          {/* The band: the tile's own bottom, flat and darker, over the picture */}
          <View style={{ position: "absolute", left: 0, top: 0, width: size, height: size, borderRadius: radius, borderCurve: "continuous", overflow: "hidden" }}>
            <Animated.View style={[styles.band, bandStyle]}>
              <Text style={styles.bandText} numberOfLines={1}>
                {label.toUpperCase()}
              </Text>
            </Animated.View>
          </View>
        </View>

        {badge ? (
          <View pointerEvents="none" style={styles.badge}>
            <Text style={styles.badgeText}>!</Text>
          </View>
        ) : null}
      </Animated.View>
    </Pressable>
  );
});

const useStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    band: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: BAND_H,
      alignItems: "center",
      justifyContent: "center",
    },
    bandText: { ...fontFaces.heavy, fontSize: 12, lineHeight: 16, letterSpacing: 0.5, color: c.lessonHeaderText },
    badge: {
      position: "absolute",
      top: EVENT_POP - 7,
      right: -7,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: c.lessonHeaderText,
      alignItems: "center",
      justifyContent: "center",
    },
    badgeText: { ...fontFaces.heavy, fontSize: 14, lineHeight: 18, color: c.error },
  };
});
