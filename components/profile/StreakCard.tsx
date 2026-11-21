/**
 * StreakCard — the Profile tab's one streak widget, flat on the page (no card): a "Daily streak"
 * heading with an arrow, the current streak and the longest one, then the last 14 days as small
 * level cells (each with its level numeral, so colour is never the only signal). The whole widget
 * is one button that opens the streak screen with the full contribution graph.
 */

import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, View, type LayoutChangeEvent } from "react-native";
import { Text } from "@/components/ui/text";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useReducedMotion } from "@/components/motion/use-reduced-motion";

import { levelStyleFor } from "@/components/activity/levels";
import { useActivityDays } from "@/components/activity/use-activity-days";
import { Icon } from "@/components/ui/icon";
import { activityCountLabel, addDays, type ActivityLevel } from "@/services/activity-core";
import { createStyles, fontFaces, useTheme, withAlpha } from "@/theme";

const DAYS = 14;
const GAP = 4;
const MAX_CELL = 32;

const dayLabel = (n: number) => `${n} ${n === 1 ? "day" : "days"}`;

export function StreakCard({ streak, longest }: { streak: number; longest: number }) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const c = theme.colors;
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const { days, todayKey } = useActivityDays();
  const [rowWidth, setRowWidth] = useState(0);
  // Square cells sized from the measured row width, capped for tablets.
  const cellSize = rowWidth > 0 ? Math.min(MAX_CELL, Math.floor((rowWidth - GAP * (DAYS - 1)) / DAYS)) : 0;
  const onRowLayout = (e: LayoutChangeEvent) => setRowWidth(e.nativeEvent.layout.width);

  const cells = useMemo(
    () =>
      Array.from({ length: DAYS }, (_, i) => {
        const key = addDays(todayKey, i - (DAYS - 1));
        return { key, level: (days[key]?.level ?? 0) as ActivityLevel };
      }),
    [days, todayKey],
  );
  const active = cells.filter((cell) => (days[cell.key]?.total ?? 0) > 0).length;
  const today = days[todayKey]?.total ?? 0;
  const summary = `Streak: ${dayLabel(streak)}, longest ${dayLabel(longest)}. ${active} active ${active === 1 ? "day" : "days"} in the last ${DAYS} days. Today: ${activityCountLabel(today)}.`;

  return (
    <Animated.View entering={reducedMotion ? FadeIn.duration(120) : FadeInDown.delay(100).springify()}>
      <Pressable
        onPress={() => router.push("/streak")}
        accessibilityRole="button"
        accessibilityLabel={`${summary} Opens your activity history.`}
        style={({ pressed }) => [styles.root, pressed && styles.pressed]}
      >
        <View style={styles.heading}>
          <Text style={styles.headingTitle} accessibilityRole="header">
            Daily streak
          </Text>
          <Icon name="ArrowRight2" size={22} color={c.textMuted} variant="Bold" />
        </View>

        <View style={styles.hero}>
          <View style={styles.sun}>
            <Icon name="Sun" size={28} color={c.primary} variant="Bold" />
          </View>
          <View style={styles.heroText}>
            <Text style={styles.streak}>{dayLabel(streak)} streak</Text>
            <Text style={styles.longest}>Longest: {dayLabel(longest)}</Text>
          </View>
        </View>

        <View style={styles.captionRow}>
          <Text style={styles.caption}>Last {DAYS} days</Text>
          <Text style={styles.captionValue}>{active} active</Text>
        </View>
        <View style={styles.row} onLayout={onRowLayout} importantForAccessibility="no-hide-descendants">
          {cells.map((cell) => {
            const ls = levelStyleFor(theme, cell.level);
            return (
              <View
                key={cell.key}
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
                {cell.level > 0 ? (
                  <Text allowFontScaling={false} style={[styles.glyph, { color: ls.glyphColor }]}>
                    {cell.level}
                  </Text>
                ) : null}
              </View>
            );
          })}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const makeStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    root: { marginHorizontal: 24, marginTop: 32, gap: 14 },
    pressed: { opacity: 0.7 },
    heading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    headingTitle: { fontSize: 22, ...fontFaces.heavy, color: c.text },
    hero: { flexDirection: "row", alignItems: "center", gap: 14 },
    sun: {
      width: 52,
      height: 52,
      borderRadius: 26,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: withAlpha(c.primary, 0.12),
    },
    heroText: { flex: 1, gap: 2 },
    streak: { fontSize: 20, ...fontFaces.heavy, color: c.text, fontVariant: ["tabular-nums"] },
    longest: { fontSize: 13, ...fontFaces.semibold, color: c.textMuted },

    captionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: -4 },
    caption: { fontSize: 13, ...fontFaces.semibold, color: c.textMuted },
    captionValue: { fontSize: 13, ...fontFaces.heavy, color: c.text },
    row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", minHeight: 20 },
    cell: { borderRadius: 6, alignItems: "center", justifyContent: "center" },
    glyph: { fontSize: 10, ...fontFaces.heavy, includeFontPadding: false },
  };
});
