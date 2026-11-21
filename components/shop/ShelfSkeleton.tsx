/**
 * The shelf's placeholder while a tab switch is still building its tiles: grey tiles in the exact size and place of the real ones (the
 * same face, a 64 dp picture block and a price bar), so the shelf is there the moment the learner taps and the real tiles take over
 * their places. Plain views with no animation and no avatar (each real tile is a drawn figure, which is what makes the switch slow),
 * so it costs next to nothing. Hidden from screen readers but for one "Loading items" label.
 */

import { memo } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";

import { createStyles, useTheme, withAlpha } from "@/theme";
import { controls } from "@/theme/tokens";

const useStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    tile: { alignItems: "center", gap: 6, paddingTop: 10, paddingBottom: 8, borderRadius: 18, backgroundColor: c.surfaceSoft, borderWidth: controls.border, borderColor: "transparent" },
    picture: { width: 64, height: 64, borderRadius: 16, backgroundColor: withAlpha(c.textMuted, 0.16) },
    // The price row is 16 dp tall in a real tile
    priceSlot: { height: 16, justifyContent: "center" },
    price: { width: 44, height: 10, borderRadius: 5, backgroundColor: withAlpha(c.textMuted, 0.16) },
  };
});

export const ShelfSkeleton = memo(function ShelfSkeleton({
  count,
  columns,
  itemWidth,
  contentStyle,
  rowStyle,
}: {
  /** How many placeholder tiles (the real shelf's count, up to a screenful). */
  count: number;
  columns: number;
  itemWidth: number;
  /** The shelf's own content and row styles, so a placeholder sits exactly where a real tile will. */
  contentStyle: StyleProp<ViewStyle>;
  rowStyle: StyleProp<ViewStyle>;
}) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const rows = Math.ceil(count / columns);
  return (
    <View style={contentStyle} accessible accessibilityLabel="Loading items" importantForAccessibility="yes">
      {Array.from({ length: rows }, (_, r) => (
        <View key={r} style={[{ flexDirection: "row" }, rowStyle]} accessible={false} importantForAccessibility="no-hide-descendants">
          {Array.from({ length: Math.min(columns, count - r * columns) }, (_, i) => (
            <View key={i} style={{ width: itemWidth }}>
              <View style={styles.tile}>
                <View style={styles.picture} />
                <View style={styles.priceSlot}>
                  <View style={styles.price} />
                </View>
              </View>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
});
