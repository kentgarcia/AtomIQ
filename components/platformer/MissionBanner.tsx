/**
 * The mission, shown at the top when a level begins ("Reach the door!"): a card that drops in under
 * the HUD with the goal door, stays a few seconds and leaves again. The screen decides how long.
 */

import { Image, View } from "react-native";
import Animated, { FadeInDown, FadeOutUp } from "react-native-reanimated";

import { Text } from "@/components/ui/text";
import { createStyles, fontFaces, fontSizes, radius, useTheme } from "@/theme";

import { PROP_SPRITES } from "./sprites";

const useStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    wrap: { position: "absolute", left: 20, right: 20, alignItems: "center" },
    card: { flexDirection: "row", alignItems: "center", gap: 12, maxWidth: 420, paddingVertical: 10, paddingHorizontal: 16, borderRadius: radius.lg, borderWidth: 2, borderBottomWidth: 5, borderColor: c.border, borderBottomColor: c.borderStrong, backgroundColor: c.surface },
    copy: { flexShrink: 1, gap: 1 },
    tag: { ...fontFaces.heavy, fontSize: fontSizes.xs, color: c.primary, textTransform: "uppercase", letterSpacing: 1.2 },
    text: { ...fontFaces.heavy, fontSize: fontSizes.lg, lineHeight: 24, color: c.text },
  };
});

export function MissionBanner({ text, top }: { text: string; top: number }) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  return (
    <Animated.View entering={FadeInDown.duration(260)} exiting={FadeOutUp.duration(220)} style={[styles.wrap, { top }]} pointerEvents="none" accessible accessibilityLiveRegion="polite" accessibilityLabel={`Mission: ${text}`}>
      <View style={styles.card}>
        <Image source={PROP_SPRITES.doorClosedTop} style={{ width: 40, height: 40 }} fadeDuration={0} />
        <View style={styles.copy}>
          <Text style={styles.tag}>Mission</Text>
          <Text style={styles.text}>{text}</Text>
        </View>
      </View>
    </Animated.View>
  );
}
