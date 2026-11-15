import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, Text, View, type LayoutChangeEvent } from "react-native";

import { addDays, activityCountLabel, type ActivityLevel } from "@/services/activity-core";
import { createStyles, fontFaces, useTheme } from "@/theme";

import { levelStyleFor } from "./levels";
import { useActivityDays } from "./use-activity-days";

const DAYS = 14;
const GAP = 4;
const MAX_CELL = 32;

/**
 * Compact "recent activity" strip: the last 14 days, oldest to newest, each
 * with its level numeral (not colour alone). Tapping opens the streak screen
 * with the full contribution graph.
 */
export function RecentActivityStrip() {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const router = useRouter();
  const { days, todayKey } = useActivityDays();
  const [rowWidth, setRowWidth] = useState(0);
  // Square cells sized from the measured row width, capped for tablets.
  const cellSize =
    rowWidth > 0 ? Math.min(MAX_CELL, Math.floor((rowWidth - GAP * (DAYS - 1)) / DAYS)) : 0;
  const onRowLayout = (e: LayoutChangeEvent) => setRowWidth(e.nativeEvent.layout.width);

  const cells = useMemo(
    () =>
      Array.from({ length: DAYS }, (_, i) => {
        const key = addDays(todayKey, i - (DAYS - 1));
        return { key, level: (days[key]?.level ?? 0) as ActivityLevel };
      }),
    [days, todayKey],
  );
  const active = cells.filter((c) => (days[c.key]?.total ?? 0) > 0).length;
  const today = days[todayKey]?.total ?? 0;
  const summary = `Recent activity: ${active} active ${active === 1 ? "day" : "days"} in the last ${DAYS} days. Today: ${activityCountLabel(today)}.`;

  return (
    <Pressable
      onPress={() => router.push("/streak")}
      accessibilityRole="button"
      accessibilityLabel={`${summary} Opens your activity history.`}
      style={styles.wrap}
    >
      <Text style={styles.title}>Recent activity</Text>
      <View
        style={styles.row}
        onLayout={onRowLayout}
        importantForAccessibility="no-hide-descendants"
      >
        {cells.map((c) => {
          const ls = levelStyleFor(theme, c.level);
          return (
            <View
              key={c.key}
              style={[
                styles.cell,
                {
                  width: cellSize,
                  height: cellSize,
                  backgroundColor: ls.backgroundColor,
                  borderColor: ls.borderColor,
                  borderWidth: ls.borderWidth,
                  borderStyle: ls.borderStyle,
                },
              ]}
            >
              {c.level > 0 ? (
                <Text allowFontScaling={false} style={[styles.glyph, { color: ls.glyphColor }]}>
                  {c.level}
                </Text>
              ) : null}
            </View>
          );
        })}
      </View>
      <Text style={styles.sub}>
        {active} active {active === 1 ? "day" : "days"} in the last {DAYS} · tap for details
      </Text>
    </Pressable>
  );
}

const makeStyles = createStyles((theme) => ({
  wrap: {
    // Matches the profile `sectionCard` / `streakCard` rhythm.
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: theme.palettes.ui.card,
    borderRadius: 24,
    padding: 20,
    minHeight: 48,
    elevation: 5,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  title: { fontSize: 16, ...fontFaces.heavy, color: theme.palettes.ui.text, marginBottom: 12 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", minHeight: 20 },
  cell: {
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  glyph: { fontSize: 10, ...fontFaces.heavy, includeFontPadding: false },
  sub: { fontSize: 11, ...fontFaces.regular, color: theme.colors.textMuted, marginTop: 10 },
}));
