import { Icon } from "@/components/ui/icon";
import { getDailyActivity } from "@/services/database";
import { useStorage } from "@/services/StorageContext";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme, fontFamilies, useResponsiveLayout } from "@/theme";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

/* Autumn design tokens shared with the profile + home screens */
const BTN_COLOR = "#FF8C00";
const BTN_LIP = "#E67E22";
const CREAM = "#FFF3E0";
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
  const { width, contentMaxWidth, gutter } = useResponsiveLayout();
  const frameLeft = Math.max(gutter, (width - contentMaxWidth) / 2 + gutter);
  const { theme } = useTheme();
  const { userProfile } = useStorage();
  const bgColors: [string, string] =
    theme.mode === "dark"
      ? [theme.palettes.tab.bg, theme.palettes.tab.bg]
      : [CREAM, "#FFFFFF"];

  const [week, setWeek] = useState<WeekDay[]>(() => buildWeek());

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

  const isDark = theme.mode === "dark";
  const P = isDark
    ? {
        card: "#213356",
        border: "#2D3A56",
        softBorder: "#26365A",
        soft: "#1A2D4A",
        creamTint: "#4A381B",
        text: "#F6F9FC",
        textSecondary: "#C0CBDD",
        muted: "#8898AA",
        faint: "#667799",
      }
    : {
        card: "#FFFFFF",
        border: "#E5E7EB",
        softBorder: "#F4F5F7",
        soft: "#F9FAFB",
        creamTint: CREAM,
        text: "#333333",
        textSecondary: "#555555",
        muted: "#888888",
        faint: "#AAAAAA",
      };
  const styles = useMemo(() => createStyles(P), [P]);

  return (
    <View style={[styles.container, { backgroundColor: bgColors[0] }]}>
      <LinearGradient
        colors={bgColors}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <SafeAreaView style={{ flex: 1 }}>
        <TouchableOpacity
          style={[styles.closeBtn, { top: 10, left: frameLeft }]}
          onPress={() => router.back()}
          hitSlop={4}
          accessibilityRole="button"
          accessibilityLabel="Close streak details"
        >
          <Icon name="Close" size={22} color={isDark ? "#8898AA" : "#888888"} />
        </TouchableOpacity>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: 10,
              paddingHorizontal: gutter,
              paddingBottom: 40,
              width: "100%",
              maxWidth: contentMaxWidth,
              alignSelf: "center",
            },
          ]}
        >
          {/* Hero card */}
          <Animated.View
            entering={FadeInDown.springify()}
            style={styles.card}
          >
            <View style={styles.tape} />
            {/* Reference-style button with the sun on it */}
            <View style={styles.sunButton}>
              <View style={[styles.sunInner, { backgroundColor: BTN_LIP }]}>
                <View style={[styles.sunFace, { backgroundColor: BTN_COLOR }]}>
                  <Icon name="Sun" size={34} color="#FFFFFF" variant="Bold" />
                </View>
              </View>
            </View>
            <Text style={styles.heroValue}>{currentStreak} day streak</Text>
            <Text style={styles.heroSub}>
              {currentStreak > 0
                ? "You're on fire! Open AtomIQ every day to keep it growing."
                : "Open AtomIQ today to start a new streak!"}
            </Text>
            <View style={styles.longestPill}>
              <Icon name="Cup" size={16} color="#E67E22" variant="Bold" />
              <Text style={styles.longestText}>
                Longest streak: {longestStreak} {longestStreak === 1 ? "day" : "days"}
              </Text>
            </View>
          </Animated.View>

          {/* This week */}
          <Animated.View
            entering={FadeInDown.delay(100).springify()}
            style={styles.card}
          >
            <Text style={styles.cardTitle}>This Week</Text>
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
                      <Icon name="TickCircle" size={16} color="#FFFFFF" variant="Bold" />
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
          </Animated.View>

          {/* Tips */}
          <Animated.View
            entering={FadeInDown.delay(200).springify()}
            style={styles.card}
          >
            <Text style={styles.cardTitle}>How to Keep Your Streak</Text>
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
              <View key={index} style={styles.tipRow}>
                <View style={styles.tipIconCircle}>
                  <Icon name={tip.icon} size={16} color="#E67E22" variant="Bold" />
                </View>
                <Text style={styles.tipText}>{tip.text}</Text>
              </View>
            ))}
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const createStyles = (P: {
    card: string;
    border: string;
    softBorder: string;
    soft: string;
    creamTint: string;
    text: string;
    textSecondary: string;
    muted: string;
    faint: string;
}) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    closeBtn: {
      position: "absolute",
      left: 20,
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: P.card,
      alignItems: "center",
      justifyContent: "center",
      zIndex: 10,
      elevation: 3,
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingBottom: 40,
      paddingTop: 56,
    },
    /* Shared rounded card, like the profile cards */
    card: {
      backgroundColor: P.card,
      borderRadius: 24,
      padding: 24,
      paddingTop: 28,
      alignItems: "center",
      marginBottom: 20,
      elevation: 5,
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.08,
      shadowRadius: 10,
    },
    tape: {
      position: "absolute",
      top: -11,
      alignSelf: "center",
      width: 84,
      height: 22,
      borderRadius: 3,
      backgroundColor: "rgba(255,140,0,0.30)",
      borderColor: "rgba(255,140,0,0.35)",
      borderWidth: 1,
      transform: [{ rotate: "-4deg" }],
    },
    /* Reference button structure: white border + orange face over a lip */
    sunButton: {
      width: 92,
      height: 92,
      borderRadius: 28,
      borderWidth: 5,
      borderColor: P.border,
      backgroundColor: P.card,
      marginBottom: 6,
      elevation: 6,
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
    },
    sunInner: {
      flex: 1,
      alignSelf: "stretch",
      borderRadius: 23,
      alignItems: "center",
      justifyContent: "center",
    },
    sunFace: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 12,
      borderRadius: 23,
      alignItems: "center",
      justifyContent: "center",
    },
    heroValue: {
      fontSize: 24,
      fontFamily: fontFamilies.heavy,
      color: P.text,
      marginTop: 10,
    },
    heroSub: {
      fontSize: 13,
      fontFamily: fontFamilies.regular,
      color: P.muted,
      textAlign: "center",
      lineHeight: 19,
      marginTop: 6,
      marginBottom: 14,
    },
    longestPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: P.creamTint,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    longestText: {
      fontSize: 13,
      fontFamily: fontFamilies.heavy,
      color: "#E67E22",
    },
    cardTitle: {
      fontSize: 16,
      fontFamily: fontFamilies.heavy,
      color: P.text,
      alignSelf: "flex-start",
      marginBottom: 16,
    },
    weekRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignSelf: "stretch",
    },
    dayColumn: {
      alignItems: "center",
      gap: 8,
    },
    dayDot: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: P.soft,
      alignItems: "center",
      justifyContent: "center",
    },
    dayDotActive: {
      backgroundColor: BTN_COLOR,
    },
    dayDotToday: {
      borderWidth: 2,
      borderColor: "#E67E22",
    },
    dayLabel: {
      fontSize: 12,
      fontFamily: fontFamilies.semibold,
      color: P.muted,
    },
    dayLabelToday: {
      color: "#E67E22",
      fontFamily: fontFamilies.bold,
    },
    weekHint: {
      fontSize: 11,
      fontFamily: fontFamilies.regular,
      color: P.faint,
      textAlign: "center",
      marginTop: 16,
    },
    tipRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      alignSelf: "stretch",
      marginBottom: 14,
    },
    tipIconCircle: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: P.creamTint,
      alignItems: "center",
      justifyContent: "center",
    },
    tipText: {
      flex: 1,
      fontSize: 13,
      fontFamily: fontFamilies.regular,
      color: P.textSecondary,
      lineHeight: 19,
    },
  });
