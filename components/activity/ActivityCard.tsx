/**
 * ActivityCard — the card of the streak page, in the Profile cards' construction: a face on a lip, a
 * yellow header band with the title and a white circle (an icon, or a button such as "close"), and
 * a white body. The streak screen, the contribution graph, the day details and the explainer all use
 * it, so the page reads as the full-size sibling of the Profile's StreakCard.
 */

import React from "react";
import { View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from "react-native";
import { Text } from "@/components/ui/text";
import Animated from "react-native-reanimated";

import { Icon } from "@/components/ui/icon";
import { createStyles, fontFaces, useTheme } from "@/theme";
import { controls } from "@/theme/tokens";

export interface ActivityCardProps {
  title: string;
  /** Icon in the white circle on the band (ignored when `headerRight` is given). */
  icon?: string;
  /** Replaces the icon circle, e.g. a close button (a 36 px white circle, like the icon one). */
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  /** Reanimated entering animation of the whole card. */
  entering?: React.ComponentProps<typeof Animated.View>["entering"];
  onBodyLayout?: (event: LayoutChangeEvent) => void;
  accessibilityLiveRegion?: "none" | "polite" | "assertive";
  style?: StyleProp<ViewStyle>;
  bodyStyle?: StyleProp<ViewStyle>;
}

export function ActivityCard({
  title,
  icon,
  headerRight,
  children,
  entering,
  onBodyLayout,
  accessibilityLiveRegion,
  style,
  bodyStyle,
}: ActivityCardProps) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const c = theme.colors;
  return (
    <Animated.View entering={entering} style={[styles.card, style]} accessibilityLiveRegion={accessibilityLiveRegion}>
      {/* The lip: its own layer under the face, so it shows only along the bottom edge */}
      <View pointerEvents="none" style={styles.lip} />
      <View style={styles.face}>
        <View style={styles.header}>
          <Text style={styles.title} accessibilityRole="header" numberOfLines={2}>
            {title}
          </Text>
          {headerRight ??
            (icon ? (
              <View style={styles.circle} accessible={false} importantForAccessibility="no-hide-descendants">
                <Icon name={icon} size={20} color={c.lessonHeader} variant="Bold" />
              </View>
            ) : null)}
        </View>
        <View style={[styles.body, bodyStyle]} onLayout={onBodyLayout}>
          {children}
        </View>
      </View>
    </Animated.View>
  );
}

/** A soft divider between rows, the same line the Profile and Settings cards use. */
export function ActivityRule() {
  const styles = makeStyles(useTheme().theme);
  return <View style={styles.rule} />;
}

const makeStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    card: { alignSelf: "stretch", marginBottom: 20, paddingBottom: controls.lip },
    lip: {
      position: "absolute",
      top: controls.lip,
      left: 0,
      right: 0,
      bottom: 0,
      borderRadius: 20,
      backgroundColor: c.lessonLip,
    },
    face: { borderRadius: 20, overflow: "hidden", backgroundColor: c.card },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 10,
      minHeight: 56,
      backgroundColor: c.lessonHeader,
    },
    title: { flex: 1, fontSize: 20, ...fontFaces.heavy, color: c.lessonHeaderText },
    /* White circle on the yellow band; the icon takes the band's colour */
    circle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.onPrimary,
    },
    body: { padding: 16, gap: 14 },
    rule: { height: 1, backgroundColor: c.borderSubtle },
  };
});
