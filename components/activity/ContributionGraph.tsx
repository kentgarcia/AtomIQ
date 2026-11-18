import React, { useCallback, useMemo, useRef, useState } from "react";
import {
    Pressable,
    ScrollView,
    View,
    type LayoutChangeEvent,
    type ScrollViewInstance,
} from "react-native";
import { Text } from "@/components/ui/text";
import { FadeIn, useReducedMotion } from "react-native-reanimated";

import { Icon } from "@/components/ui/icon";
import { ActivityCard } from "./ActivityCard";
import {
  ACTIVITY_KINDS,
  LEVEL_DESCRIPTIONS,
  activityCountLabel,
  addDays,
  buildWeekGrid,
  cellAccessibilityLabel,
  daysBetween,
  describeCounts,
  formatDayLong,
  summarizeActivity,
  summaryText,
  type ActivityLevel,
  type DayRecord,
} from "@/services/activity-core";
import { createStyles, fontFaces, useResponsiveLayout, useTheme } from "@/theme";
import { layout } from "@/theme/layout";

import { levelStyleFor } from "./levels";

const GAP = 3;
const RAIL_WIDTH = 30;
const TARGET_VISIBLE_WEEKS = 17;
const MIN_CELL = 14;
const MAX_CELL = 26;
const MAX_WEEKS = 53;
const LEVELS: ActivityLevel[] = [0, 1, 2, 3, 4];

export interface ContributionGraphProps {
  days: Record<string, DayRecord>;
  todayKey: string;
  /** The EXISTING streak, read from the profile (single source of truth). */
  currentStreak: number;
}

export function ContributionGraph({ days, todayKey, currentStreak }: ContributionGraphProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const reducedMotion = useReducedMotion();
  const { contentWidth } = useResponsiveLayout();
  const [measured, setMeasured] = useState<number | null>(null);
  const [pickedKey, setSelectedKey] = useState(todayKey);
  // Keep the selection valid if the day rolls back (e.g. device clock change).
  const selectedKey = pickedKey > todayKey ? todayKey : pickedKey;
  const scrollRef = useRef<ScrollViewInstance>(null);

  const available = Math.max(160, (measured ?? contentWidth - 48) - RAIL_WIDTH);
  const cell = Math.max(
    MIN_CELL,
    Math.min(MAX_CELL, Math.floor((available + GAP) / TARGET_VISIBLE_WEEKS - GAP)),
  );
  const visibleWeeks = Math.max(1, Math.floor((available + GAP) / (cell + GAP)));

  const earliest = useMemo(() => {
    let min: string | null = null;
    for (const [key, rec] of Object.entries(days)) {
      if (rec.total > 0 && key <= todayKey && (min === null || key < min)) min = key;
    }
    return min;
  }, [days, todayKey]);

  const weeks = useMemo(() => {
    if (!earliest) return visibleWeeks;
    const needed = Math.ceil(daysBetween(earliest, todayKey) / 7) + 2;
    return Math.min(MAX_WEEKS, Math.max(visibleWeeks, needed));
  }, [earliest, todayKey, visibleWeeks]);

  const grid = useMemo(() => buildWeekGrid({ todayKey, weeks, weekStart: 0 }), [todayKey, weeks]);
  const firstShown = grid.columns[0].find((k) => k !== null) as string;

  const summary = useMemo(() => summarizeActivity(days, todayKey), [days, todayKey]);
  const text = summaryText(currentStreak, summary);

  const selectedRecord = days[selectedKey];
  const selectedLevel = (selectedRecord?.level ?? 0) as ActivityLevel;
  const parts = describeCounts(selectedRecord);

  const step = useCallback(
    (delta: number) => {
      setSelectedKey((prev) => {
        const next = addDays(prev, delta);
        if (next > todayKey || next < firstShown) return prev;
        return next;
      });
    },
    [todayKey, firstShown],
  );

  const columnWidth = cell + GAP;
  const gridWidth = grid.columns.length * columnWidth - GAP;

  return (
    <View>
      <ActivityCard
        title="Learning activity"
        icon="Calendar"
        onBodyLayout={(e: LayoutChangeEvent) => setMeasured(e.nativeEvent.layout.width - 32)}
        bodyStyle={styles.graphBody}
      >
        <Text style={styles.summary} accessibilityRole="summary">
          {text}
        </Text>

        <View style={styles.graphRow}>
          {/* Weekday rail (Sunday-first; alternate rows labelled) */}
          <View style={[styles.rail, { width: RAIL_WIDTH, paddingTop: 18 }]} accessible={false}
            importantForAccessibility="no-hide-descendants">
            {grid.rowLabels.map((label, r) => (
              <View key={label} style={{ height: cell, marginBottom: r < 6 ? GAP : 0, justifyContent: "center" }}>
                {r % 2 === 1 ? <Text style={styles.railText}>{label}</Text> : null}
              </View>
            ))}
          </View>

          <ScrollView
            ref={scrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
            accessibilityLabel="Activity grid, scroll sideways for earlier weeks"
          >
            <View style={{ width: gridWidth }}>
              {/* Month labels */}
              <View style={{ height: 18 }} importantForAccessibility="no-hide-descendants">
                {grid.monthLabels.map((m) => (
                  <Text
                    key={`${m.column}-${m.label}`}
                    style={[styles.monthText, { left: m.column * columnWidth }]}
                    numberOfLines={1}
                  >
                    {m.label}
                  </Text>
                ))}
              </View>
              <View style={{ flexDirection: "row", gap: GAP }}>
                {grid.columns.map((col, c) => (
                  <View key={c} style={{ gap: GAP }}>
                    {col.map((key, r) => {
                      if (key === null) {
                        return <View key={`pad-${c}-${r}`} style={{ width: cell, height: cell }} />;
                      }
                      const rec = days[key];
                      const level = (rec?.level ?? 0) as ActivityLevel;
                      const ls = levelStyleFor(theme, level);
                      const selected = key === selectedKey;
                      return (
                        <Pressable
                          key={key}
                          onPress={() => setSelectedKey(key)}
                          onFocus={() => setSelectedKey(key)}
                          accessibilityRole="button"
                          accessibilityLabel={cellAccessibilityLabel(key, rec)}
                          accessibilityState={{ selected }}
                          style={[
                            {
                              width: cell,
                              height: cell,
                              borderRadius: 4,
                              alignItems: "center",
                              justifyContent: "center",
                              backgroundColor: ls.backgroundColor,
                              borderColor: ls.borderColor,
                              borderWidth: ls.borderWidth,
                              borderStyle: ls.borderStyle,
                            },
                            selected && styles.cellSelected,
                          ]}
                        >
                          {level > 0 ? (
                            <Text
                              allowFontScaling={false}
                              style={[styles.cellGlyph, { color: ls.glyphColor, fontSize: Math.max(9, cell * 0.55) }]}
                            >
                              {level}
                            </Text>
                          ) : null}
                        </Pressable>
                      );
                    })}
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>
        </View>

        {/* Legend: swatches + numerals + names; never colour alone */}
        <View
          style={styles.legend}
          accessible
          accessibilityLabel={`Legend, from level 0, ${LEVEL_DESCRIPTIONS[0]}, to level 4, ${LEVEL_DESCRIPTIONS[4]}`}
        >
          <Text style={styles.legendEnd}>Less</Text>
          {LEVELS.map((lvl) => {
            const ls = levelStyleFor(theme, lvl);
            return (
              <View key={lvl} style={styles.legendItem}>
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 4,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: ls.backgroundColor,
                    borderColor: ls.borderColor,
                    borderWidth: ls.borderWidth,
                    borderStyle: ls.borderStyle,
                  }}
                >
                  <Text allowFontScaling={false} style={[styles.cellGlyph, { color: ls.glyphColor, fontSize: 11 }]}>
                    {lvl}
                  </Text>
                </View>
              </View>
            );
          })}
          <Text style={styles.legendEnd}>More</Text>
        </View>
        <Text style={styles.legendHint}>
          0 none · 1 light · 2 some · 3 busy · 4 very busy. The top level is a ceiling — doing more in a day
          never goes beyond it.
        </Text>
      </ActivityCard>

      {/* Exact day details */}
      <ActivityCard
        key={selectedKey}
        title="Day details"
        icon="CalendarTick"
        entering={reducedMotion ? undefined : FadeIn.duration(150)}
        accessibilityLiveRegion="polite"
        bodyStyle={styles.detailBody}
      >
        <View style={styles.detailHeader}>
          <Pressable
            onPress={() => step(-1)}
            disabled={selectedKey <= firstShown}
            accessibilityRole="button"
            accessibilityLabel="Previous day"
            accessibilityState={{ disabled: selectedKey <= firstShown }}
            style={[styles.stepBtn, selectedKey <= firstShown && styles.stepBtnDisabled]}
          >
            <Icon name="ArrowLeft2" size={20} color={theme.colors.text} />
          </Pressable>
          <View style={styles.detailTitleWrap}>
            <Text style={styles.detailTitle}>{formatDayLong(selectedKey, true)}</Text>
            <Text style={styles.detailSub}>
              {selectedKey === todayKey ? "Today · " : ""}
              {activityCountLabel(selectedRecord?.total ?? 0)} · level {selectedLevel} ({LEVEL_DESCRIPTIONS[selectedLevel]})
            </Text>
          </View>
          <Pressable
            onPress={() => step(1)}
            disabled={selectedKey >= todayKey}
            accessibilityRole="button"
            accessibilityLabel="Next day"
            accessibilityState={{ disabled: selectedKey >= todayKey }}
            style={[styles.stepBtn, selectedKey >= todayKey && styles.stepBtnDisabled]}
          >
            <Icon name="ArrowRight2" size={20} color={theme.colors.text} />
          </Pressable>
        </View>
        {parts.length > 0 ? (
          <View style={styles.detailList}>
            {parts.map((p) => (
              <View key={p} style={styles.detailRow}>
                <Icon name="TickCircle" size={14} color={theme.colors.primaryDark} variant="Bold" />
                <Text style={styles.detailText}>{p}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.detailEmpty}>
            Nothing recorded on this day. That is completely fine.
          </Text>
        )}
        {selectedRecord?.imported ? (
          <Text style={styles.detailNote}>
            Includes lessons, quizzes or games recovered from your existing progress history on this device.
          </Text>
        ) : null}
      </ActivityCard>
    </View>
  );
}

const KIND_EXPLANATIONS: Record<(typeof ACTIVITY_KINDS)[number], string> = {
  lesson_step: "Moving through a lesson step",
  lesson_complete: "Finishing a lesson",
  quiz_attempt: "Answering a quiz",
  quiz_complete: "Finishing a quiz",
  lab_session: "Completing a Lab experiment",
  game_session: "Finishing a game round (MythBuster, Atom Maze)",
  periodic_table_explore: "Exploring an element in the periodic table",
  blog_read: "Reading a mini blog piece",
};

/** "What counts as activity" card, with the privacy and no-pressure promise. */
export function ActivityExplainer() {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <ActivityCard title="What counts as activity" icon="InfoCircle" bodyStyle={styles.explainBodyWrap}>
      <View style={styles.kindList}>
        {ACTIVITY_KINDS.map((kind, i) => (
          <View key={kind} style={[styles.kindRow, i > 0 && styles.kindDivided]}>
            <Icon name="TickCircle" size={14} color={theme.colors.primaryDark} variant="Bold" />
            <Text style={styles.detailText}>{KIND_EXPLANATIONS[kind]}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.explainBody}>
        Doing the same thing again in a day is only counted a few times, so a day&apos;s colour reflects real
        variety. Level 4 (7 points or more) is the top of the scale. Each action is worth 1 point; finishing a
        lesson or quiz, a lab, or a game is worth 2. Opening the app is not learning activity — your streak above
        counts app opens, while this grid shows what you did.
      </Text>
      <View style={styles.privacyBox}>
        <Icon name="Lock" size={16} color={theme.colors.textSecondary} variant="Bold" />
        <Text style={styles.privacyText}>
          Stays on this device. Nothing is public, there is no leaderboard, and no one else can see it.
          Skipping a day is okay — you can use AtomIQ without a streak.
        </Text>
      </View>
    </ActivityCard>
  );
}

const makeStyles = createStyles((theme) => ({
  summary: {
    fontSize: 13,
    ...fontFaces.semibold,
    color: theme.colors.textSecondary,
    lineHeight: 19,
    textAlign: "left",
  },
  /* The card bodies: the graph and details keep a tighter gap than the default */
  graphBody: { gap: 12 },
  detailBody: { gap: 4 },
  graphRow: { flexDirection: "row", alignItems: "flex-start" },
  rail: { alignItems: "flex-start" },
  railText: { fontSize: 10, ...fontFaces.semibold, color: theme.colors.textMuted },
  monthText: {
    position: "absolute",
    top: 0,
    fontSize: 11,
    ...fontFaces.semibold,
    color: theme.colors.textMuted,
  },
  cellGlyph: { ...fontFaces.heavy, textAlign: "center", includeFontPadding: false },
  cellSelected: {
    borderColor: theme.colors.text,
    borderWidth: 2,
    borderStyle: "solid",
  },
  legend: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6,
  },
  legendItem: { alignItems: "center" },
  legendEnd: { fontSize: 11, ...fontFaces.semibold, color: theme.colors.textMuted },
  legendHint: {
    fontSize: 11,
    ...fontFaces.regular,
    color: theme.colors.textMuted,
    lineHeight: 16,
    marginTop: -4,
    textAlign: "right",
  },
  detailHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  detailTitleWrap: { flex: 1 },
  detailTitle: { fontSize: 15, ...fontFaces.heavy, color: theme.colors.text },
  detailSub: {
    fontSize: 12,
    ...fontFaces.regular,
    color: theme.colors.textSecondary,
    marginTop: 2,
    lineHeight: 17,
  },
  stepBtn: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    borderRadius: layout.minTouchTarget / 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surfaceSoft,
  },
  stepBtnDisabled: { opacity: 0.4 },
  detailList: { marginTop: 8, gap: 8 },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  detailText: { flex: 1, fontSize: 13, ...fontFaces.regular, color: theme.colors.text, lineHeight: 19 },
  detailEmpty: {
    marginTop: 8,
    fontSize: 13,
    ...fontFaces.regular,
    color: theme.colors.textSecondary,
    lineHeight: 19,
  },
  detailNote: {
    marginTop: 8,
    fontSize: 11,
    ...fontFaces.regular,
    color: theme.colors.textMuted,
    lineHeight: 16,
  },
  explainBodyWrap: { gap: 0 },
  /* The activity kinds: one per line, split by soft dividers like the Settings rows */
  kindList: { gap: 0 },
  kindRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 9,
  },
  kindDivided: { borderTopWidth: 1, borderColor: theme.colors.borderSubtle },
  explainBody: {
    fontSize: 12,
    ...fontFaces.regular,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginTop: 14,
  },
  privacyBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginTop: 14,
    padding: 12,
    borderRadius: 14,
    backgroundColor: theme.colors.surfaceSoft,
  },
  privacyText: {
    flex: 1,
    fontSize: 12,
    ...fontFaces.semibold,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
}));
