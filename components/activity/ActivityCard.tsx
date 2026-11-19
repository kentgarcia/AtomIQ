/**
 * ActivityCard — one section of the streak page, flat on the page like the Profile's StreakCard: a
 * heading (a small tinted icon tile and the title) over its body, with a dashed divider above it when
 * it follows another section. No card, no band. The streak screen, the contribution graph, the day
 * details and the explainer all use it. (The name is kept; it is a section now.)
 */

import React from "react";
import { View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from "react-native";
import Animated from "react-native-reanimated";

import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { createStyles, fontFaces, useTheme, withAlpha } from "@/theme";

export interface ActivityCardProps {
  title: string;
  /** Icon in the tile left of the title. */
  icon?: string;
  /** A control on the right of the heading. */
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  /** A dashed line above the section, for one that follows another. */
  divided?: boolean;
  /** Reanimated entering animation of the whole section. */
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
  divided = true,
  entering,
  onBodyLayout,
  accessibilityLiveRegion,
  style,
  bodyStyle,
}: ActivityCardProps) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  return (
    <Animated.View entering={entering} style={[styles.section, divided && styles.divided, style]} accessibilityLiveRegion={accessibilityLiveRegion}>
      <View style={styles.heading}>
        {icon ? (
          <View style={styles.tile} accessible={false} importantForAccessibility="no-hide-descendants">
            <Icon name={icon} size={18} color={theme.colors.primary} variant="Bold" />
          </View>
        ) : null}
        <Text style={styles.title} accessibilityRole="header" numberOfLines={2}>
          {title}
        </Text>
        {headerRight}
      </View>
      <View style={[styles.body, bodyStyle]} onLayout={onBodyLayout}>
        {children}
      </View>
    </Animated.View>
  );
}

/** A dashed divider between rows. */
export function ActivityRule() {
  const styles = useStyles(useTheme().theme);
  return <View style={styles.rule} />;
}

const useStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    section: { alignSelf: "stretch", gap: 12 },
    divided: { paddingTop: 20, borderTopWidth: 1, borderStyle: "dashed", borderColor: c.border },
    heading: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 32 },
    tile: {
      width: 32,
      height: 32,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: withAlpha(c.primary, 0.14),
    },
    title: { flex: 1, fontSize: 18, ...fontFaces.heavy, color: c.text },
    body: { gap: 14 },
    rule: { height: 0, borderTopWidth: 1, borderStyle: "dashed", borderColor: c.border },
  };
});
