/**
 * Streak page, opened from the Profile's "Daily streak" widget. Flat like the rest of the app: the
 * standard header, then sections split by dashed lines (no cards): the streak and the longest one,
 * this week, tips, the learning-activity graph, day details and what counts. The week and the graph
 * read the same on-device activity days as the Profile widget, so the three always agree.
 */

import { ActivityCard, ActivityRule } from "@/components/activity/ActivityCard";
import { ActivityExplainer, ContributionGraph } from "@/components/activity/ContributionGraph";
import { useActivityDays } from "@/components/activity/use-activity-days";
import { ScreenHeader, useHeaderBorder } from "@/components/layout";
import { settle } from "@/components/motion/settle";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { addDays } from "@/services/activity-core";
import { useStorage } from "@/services/StorageContext";
import { createStyles, fontFaces, useResponsiveLayout, useTheme, withAlpha } from "@/theme";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import { ScrollView, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

/** Weekday letter of a `YYYY-MM-DD` key. */
const weekdayLabel = (key: string): string => {
  const [y, m, d] = key.split("-").map(Number);
  return DAY_LABELS[new Date(y!, m! - 1, d).getDay()] ?? "";
};

const dayLabel = (n: number) => `${n} ${n === 1 ? "day" : "days"}`;

const TIPS = [
  { icon: "Book", text: "Open the app once a day — every check-in counts as an active day." },
  { icon: "CalendarTick", text: "Streaks count active days — a little daily goes a long way." },
  { icon: "Sun", text: "Miss a day and the streak resets — but your longest streak is saved forever!" },
];

export default function StreakScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { contentMaxWidth, gutter } = useResponsiveLayout();
  const { scrolled, onScroll, scrollEventThrottle } = useHeaderBorder();
  const { theme } = useTheme();
  const { userProfile } = useStorage();
  const styles = useStyles(theme);
  const c = theme.colors;

  const activity = useActivityDays();
  const currentStreak = userProfile?.current_streak || 0;
  const longestStreak = userProfile?.longest_streak || 0;

  // The last seven days, today last: a day is filled when anything was recorded on it
  const week = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const key = addDays(activity.todayKey, i - 6);
        return { key, label: weekdayLabel(key), active: (activity.days[key]?.total ?? 0) > 0, isToday: i === 6 };
      }),
    [activity.days, activity.todayKey],
  );
  const activeDays = week.filter((d) => d.active).length;

  return (
    <View style={styles.container}>
      <ScreenHeader title="Daily streak" onBack={() => router.back()} backLabel="Close streak details" scrolled={scrolled} />
      <ScrollView
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingHorizontal: gutter, maxWidth: contentMaxWidth, paddingBottom: insets.bottom + 40 }]}
      >
        {/* The streak, and the longest one */}
        <Animated.View entering={settle()} style={styles.heroBlock}>
          <View style={styles.hero}>
            <View style={styles.sun}>
              <Icon name="Sun" size={34} color={c.primary} variant="Bold" />
            </View>
            <View style={styles.heroText}>
              <Text style={styles.heroValue}>{dayLabel(currentStreak)} streak</Text>
              <Text style={styles.heroSub}>
                {currentStreak > 0
                  ? "You're on fire! Open AtomIQ every day to keep it growing."
                  : "Open AtomIQ today to start a new streak!"}
              </Text>
            </View>
          </View>
          <ActivityRule />
          <View style={styles.statRow}>
            <View style={styles.statIcon}>
              <Icon name="Cup" size={16} color={c.primary} variant="Bold" />
            </View>
            <Text style={styles.statLabel}>Longest streak</Text>
            <Text style={styles.statValue}>{dayLabel(longestStreak)}</Text>
          </View>
        </Animated.View>

        {/* This week */}
        <ActivityCard title="This week" icon="CalendarTick" entering={settle(60)}>
          <View style={styles.weekRow} accessible accessibilityLabel={`${activeDays} of the last 7 days active`}>
            {week.map((day) => (
              <View key={day.key} style={styles.dayColumn}>
                <View style={[styles.dayDot, day.active && styles.dayDotActive, day.isToday && styles.dayDotToday]}>
                  {day.active ? <Icon name="TickCircle" size={18} color={c.onPrimary} variant="Bold" /> : null}
                </View>
                <Text style={[styles.dayLabel, day.isToday && styles.dayLabelToday]}>{day.label}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.weekHint}>Filled days are the ones where you did something in AtomIQ.</Text>
        </ActivityCard>

        {/* Tips */}
        <ActivityCard title="How to keep your streak" icon="Lamp" entering={settle(120)} bodyStyle={styles.tipsBody}>
          {TIPS.map((tip, index) => (
            <View key={tip.text} style={[styles.tipRow, index > 0 && styles.tipDivided]}>
              <View style={styles.tipIconCircle}>
                <Icon name={tip.icon} size={16} color={c.primary} variant="Bold" />
              </View>
              <Text style={styles.tipText}>{tip.text}</Text>
            </View>
          ))}
        </ActivityCard>

        {/* Learning activity history (on-device); the streak shown is the same profile value as above */}
        <ContributionGraph days={activity.days} todayKey={activity.todayKey} currentStreak={currentStreak} />
        <ActivityExplainer />
      </ScrollView>
    </View>
  );
}

const useStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    container: { flex: 1, backgroundColor: c.mapBackground },
    content: { width: "100%", alignSelf: "center", paddingTop: 8, gap: 20 },

    heroBlock: { gap: 14 },
    hero: { flexDirection: "row", alignItems: "center", gap: 14 },
    sun: {
      width: 64,
      height: 64,
      borderRadius: 32,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: withAlpha(c.primary, 0.14),
    },
    heroText: { flex: 1, gap: 2 },
    heroValue: { fontSize: 24, ...fontFaces.black, color: c.text, fontVariant: ["tabular-nums"] },
    heroSub: { fontSize: 14, ...fontFaces.medium, color: c.textMuted, lineHeight: 20 },

    /* Label on the left, value on the right */
    statRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    statIcon: {
      width: 28,
      height: 28,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: withAlpha(c.primary, 0.14),
    },
    statLabel: { flex: 1, fontSize: 14, ...fontFaces.semibold, color: c.textMuted },
    statValue: { fontSize: 16, ...fontFaces.heavy, color: c.text },

    weekRow: { flexDirection: "row", justifyContent: "space-between", alignSelf: "stretch" },
    dayColumn: { alignItems: "center", gap: 8 },
    dayDot: {
      width: 38,
      height: 38,
      borderRadius: 19,
      borderWidth: 1.5,
      borderStyle: "dashed",
      borderColor: c.borderStrong,
      alignItems: "center",
      justifyContent: "center",
    },
    dayDotActive: { backgroundColor: c.primary, borderStyle: "solid", borderColor: c.primaryDark },
    dayDotToday: { borderWidth: 2.5, borderColor: c.primaryDark },
    dayLabel: { fontSize: 12, ...fontFaces.semibold, color: c.textMuted },
    dayLabelToday: { color: c.text, ...fontFaces.heavy },
    weekHint: { fontSize: 13, ...fontFaces.medium, color: c.textMuted, textAlign: "center" },

    /* Tips: one per row, split by dashed lines */
    tipsBody: { gap: 0 },
    tipRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
    tipDivided: { borderTopWidth: 1, borderStyle: "dashed", borderColor: c.border },
    tipIconCircle: {
      width: 34,
      height: 34,
      borderRadius: 11,
      backgroundColor: withAlpha(c.primary, 0.14),
      alignItems: "center",
      justifyContent: "center",
    },
    tipText: { flex: 1, fontSize: 14, ...fontFaces.medium, color: c.textSecondary, lineHeight: 20 },
  };
});
