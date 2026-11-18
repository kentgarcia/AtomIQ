/**
 * UnitDivider — what separates one unit of the lesson map from the next: a dotted line on each side
 * of the unit's title ("Unit 2: Radioactivity"), all in gray (the caller passes the colour). Decorative layout only: it takes no touches, and the title is read as a header.
 */

import React, { memo, useState } from "react";
import { View } from "react-native";
import Svg, { Line } from "react-native-svg";

import { Text } from "@/components/ui/text";
import { createStyles, fontFaces, useTheme } from "@/theme";

/** How tall the divider is, dp. The map reserves this much room for it (see SECTION_PAD in the Home screen). */
export const UNIT_DIVIDER_HEIGHT = 24;

const DOT = 4;
const DOT_GAP = 9;

const useStyles = createStyles(() => ({
  row: { height: UNIT_DIVIDER_HEIGHT, flexDirection: "row", alignItems: "center", gap: 12 },
  line: { flex: 1, height: DOT },
  title: { ...fontFaces.heavy, fontSize: 13, letterSpacing: 0.8, textTransform: "uppercase", flexShrink: 1, textAlign: "center" },
}));

/** A row of round dots: a dashed line with zero-length dashes and round caps. */
function Dots({ color }: { color: string }) {
  const [width, setWidth] = useState(0);
  const styles = useStyles(useTheme().theme);
  return (
    <View style={styles.line} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 ? (
        <Svg width={width} height={DOT}>
          <Line x1={DOT / 2} y1={DOT / 2} x2={Math.max(DOT / 2, width - DOT / 2)} y2={DOT / 2} stroke={color} strokeWidth={DOT} strokeLinecap="round" strokeDasharray={`0 ${DOT_GAP}`} />
        </Svg>
      ) : null}
    </View>
  );
}

function UnitDividerBase({ title, color, top, horizontalPadding = 0 }: { title: string; color: string; top: number; horizontalPadding?: number }) {
  const styles = useStyles(useTheme().theme);
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: horizontalPadding, right: horizontalPadding, top }}>
      <View style={styles.row}>
        <Dots color={color} />
        <Text accessibilityRole="header" style={[styles.title, { color }]} numberOfLines={1}>
          {title}
        </Text>
        <Dots color={color} />
      </View>
    </View>
  );
}

export const UnitDivider = memo(UnitDividerBase);
