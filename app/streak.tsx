import { ActivityCard, ActivityRule } from "@/components/activity/ActivityCard";
import { Icon } from "@/components/ui/icon";
import { ActivityExplainer, ContributionGraph } from "@/components/activity/ContributionGraph";
import { useActivityDays } from "@/components/activity/use-activity-days";
import { getDailyActivity } from "@/services/database";
import { useStorage } from "@/services/StorageContext";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useTheme,
  fontFaces,
  useResponsiveLayout,
  createStyles,
  withAlpha,
} from "@/theme";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Text } from "@/components/ui/text";
import { FadeIn, FadeInDown, useReducedMotion } from "react-native-reanimated";

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

type WeekDay = {
  date: string;
  label: string;
  active: boolean;
  isToday: boolean;
};

type ActivityRow = {
  date: string;
  xp_earned?: number;
  lessons_completed?: number;
  myths_busted?: number;
};

const toIsoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;

const buildWeek = (): WeekDay[] => {
  const days: WeekDay[] = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push({
      date: toIsoDate(d),
      label: DAY_LABELS[d.getDay()],
      active: false,
      isToday: i === 0,
    });
  }
  return days;
};

export default function StreakScreen() {
  const router = useRouter();
  const { contentMaxWidth, gutter } = useResponsiveLayout();
  const { theme } = useTheme();
  const { userProfile } = useStorage();
  const reducedMotion = useReducedMotion();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const c = theme.colors;
  // Cards come in one after another; a calm fade with reduced motion
  const enter = (delay: number) => (reducedMotion ? FadeIn.duration(120) : FadeInDown.delay(delay).springify());

  const [week, setWeek] = useState<WeekDay[]>(() => buildWeek());
  const activity = useActivityDays();

  const currentStreak = userProfile?.current_streak || 0;
  const longestStreak = userProfile?.longest_streak || 0;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const days = buildWeek();
      try {
        const rows = (await getDailyActivity(
          days[0].date,
          days[6].date,
        )) as ActivityRow[];
        const byDate = new Map(rows.map((r) => [String(r.date), r]));
        for (const day of days) {
          const row = byDate.get(day.date);
          day.active =
            !!row &&
            (Number(row.xp_earned) > 0 ||
              Number(row.lessons_completed) > 0 ||
              Number(row.myths_busted) > 0);
        }
      } catch (error) {
        console.error("Error loading weekly activity:", error);
      }
      if (!cancelled) setWeek(days);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    // The Profile's blue: this page opens from the streak card there
    <View style={[styles.container, { backgroundColor: c.mapBackground }]}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingHorizontal: gutter,
              width: "100%",
              maxWidth: contentMaxWidth,
              alignSelf: "center",
            },
          ]}
        >
          {/* Hero card: the streak, with the way out on its band */}
          <ActivityCard
            title="Daily Streak"
            entering={enter(0)}
            headerRight={
              <Pressable
                style={styles.closeBtn}
                onPress={() => router.back()}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Close streak details"
              >
                <Icon name="Close" size={22} color={c.lessonHeader} variant="Bold" />
              </Pressable>
            }
          >
            <View style={styles.hero}>
              <View style={styles.sun}>
                <Icon name="Sun" size={30} color={c.primary} variant="Bold" />
              </View>
              <View style={styles.heroText}>
                <Text style={styles.heroValue}>{currentStreak} day streak</Text>
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
                <Icon name="Cup" size={16} color={c.primaryDark} variant="Bold" />
              </View>
              <Text style={styles.statLabel}>Longest streak</Text>
              <Text style={styles.statValue}>
                {longestStreak} {longestStreak === 1 ? "day" : "days"}
              </Text>
            </View>
          </ActivityCard>

          {/* This week */}
          <ActivityCard title="This Week" icon="CalendarTick" entering={enter(100)}>
            <View style={styles.weekRow}>
              {week.map((day) => (
                <View key={day.date} style={styles.dayColumn}>
                  <View
                    style={[
                      styles.dayDot,
                      day.active && styles.dayDotActive,
                      day.isToday && styles.dayDotToday,
                    ]}
                  >
                    {day.active ? (
                      <Icon name="TickCircle" size={16} color={c.onPrimary} variant="Bold" />
                    ) : null}
                  </View>
                  <Text
                    style={[styles.dayLabel, day.isToday && styles.dayLabelToday]}
                  >
                    {day.label}
                  </Text>
                </View>
              ))}
            </View>
            <Text style={styles.weekHint}>
              Filled days are the ones where you earned XP or finished a lesson.
            </Text>
          </ActivityCard>

          {/* Tips */}
          <ActivityCard title="How to Keep Your Streak" icon="Lamp" entering={enter(200)} bodyStyle={styles.tipsBody}>
            {[
              {
                icon: "Book",
                text: "Open the app once a day — every check-in counts as an active day.",
              },
              {
                icon: "CalendarTick",
                text: "Streaks count active days — a little daily goes a long way.",
              },
              {
                icon: "Sun",
                text: "Miss a day and the streak resets — but your longest streak is saved forever!",
              },
            ].map((tip, index) => (
              <View key={index} style={[styles.tipRow, index > 0 && styles.tipDivided]}>
                <View style={styles.tipIconCircle}>
                  <Icon name={tip.icon} size={16} color={c.primaryDark} variant="Bold" />
                </View>
                <Text style={styles.tipText}>{tip.text}</Text>
              </View>
            ))}
          </ActivityCard>

          {/* Learning activity history (on-device). The streak shown is the
              same profile value as the hero card above. */}
          <ContributionGraph
            days={activity.days}
            todayKey={activity.todayKey}
            currentStreak={currentStreak}
          />
          <ActivityExplainer />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const makeStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    container: { flex: 1 },
    scrollContent: { paddingTop: 12, paddingBottom: 40 },

    /* White circle on the yellow band, holding the close icon */
    closeBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.onPrimary,
    },

    hero: { flexDirection: "row", alignItems: "center", gap: 14 },
    sun: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: withAlpha(c.primary, 0.12),
    },
    heroText: { flex: 1, gap: 2 },
    heroValue: { fontSize: 22, ...fontFaces.heavy, color: c.text, fontVariant: ["tabular-nums"] },
    heroSub: { fontSize: 13, ...fontFaces.semibold, color: c.textMuted, lineHeight: 19 },

    /* Label on the left, value on the right, like the passport rows */
    statRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    statIcon: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: withAlpha(c.primary, 0.12),
    },
    statLabel: { flex: 1, fontSize: 13, ...fontFaces.semibold, color: c.textMuted },
    statValue: { fontSize: 15, ...fontFaces.heavy, color: c.text },

    weekRow: { flexDirection: "row", justifyContent: "space-between", alignSelf: "stretch" },
    dayColumn: { alignItems: "center", gap: 8 },
    dayDot: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: c.surfaceSoft,
      alignItems: "center",
      justifyContent: "center",
    },
    dayDotActive: { backgroundColor: c.primary },
    dayDotToday: { borderWidth: 2, borderColor: c.primaryDark },
    dayLabel: { fontSize: 12, ...fontFaces.semibold, color: c.textMuted },
    dayLabelToday: { color: c.primaryDark, ...fontFaces.bold },
    weekHint: { fontSize: 12, ...fontFaces.semibold, color: c.textMuted, textAlign: "center" },

    /* Tips: one per row, split by the soft line the Settings rows use */
    tipsBody: { gap: 0 },
    tipRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
    tipDivided: { borderTopWidth: 1, borderColor: c.borderSubtle },
    tipIconCircle: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: withAlpha(c.primary, 0.12),
      alignItems: "center",
      justifyContent: "center",
    },
    tipText: { flex: 1, fontSize: 13, ...fontFaces.semibold, color: c.textSecondary, lineHeight: 19 },
  };
});
