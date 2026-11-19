/**
 * Achievement info, opened from the list or the Profile. Flat like the rest of the app: the badge
 * stamped onto a soft disc (a burst only when this level was reached since the learner last looked),
 * the title and what it is, then sections split by dashed lines: progress to the next level, every
 * level, and how to rank up.
 */

import { AchievementBadge } from "@/components/achievements/AchievementBadge";
import { ACHIEVEMENT_FX } from "@/components/celebration/celebration-core";
import { ScreenHeader, useHeaderBorder } from "@/components/layout";
import { Stamp } from "@/components/lesson/Stamp";
import { Burst } from "@/components/motion/Burst";
import { BURST } from "@/components/motion/burst-core";
import { settle } from "@/components/motion/settle";
import { settleDelay } from "@/components/motion/settle-core";
import { useDelayedClock } from "@/components/motion/use-delayed-clock";
import { ProgressBar } from "@/components/quests/ProgressBar";
import { Text } from "@/components/ui/text";
import { useAchievementValues } from "@/hooks/use-achievement-values";
import { achievementById, achievementValue, progressFor } from "@/services/achievements-core";
import { playSfx } from "@/services/sfx";
import { getAchievementLevels } from "@/services/storage";
import { createStyles, fontFaces, useResponsiveLayout, useTheme, withAlpha } from "@/theme";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const BADGE = 150;
const DISC = 208;
const BURST_CLOCK_TOTAL = ACHIEVEMENT_FX.burst + BURST.total;

export default function AchievementDetailScreen() {
  useEffect(() => {
    void playSfx("social.achievement-scroll");
  }, []);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { contentMaxWidth, gutter } = useResponsiveLayout();
  const { scrolled, onScroll, scrollEventThrottle } = useHeaderBorder();
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const c = theme.colors;
  const accent = theme.palettes.achievements.primary;
  const { achievementId } = useLocalSearchParams<{ achievementId: string }>();
  const values = useAchievementValues();

  // Has this level been reached since the learner last looked? (read only: Profile owns the baseline)
  const [seenLevels, setSeenLevels] = useState<Record<string, number> | null | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    getAchievementLevels()
      .then((levels) => alive && setSeenLevels(levels))
      .catch(() => alive && setSeenLevels(null));
    return () => {
      alive = false;
    };
  }, []);

  const achievement = useMemo(() => {
    const track = achievementById(parseInt(achievementId || "0", 10));
    if (!track || !values) return null;
    return { track, progress: progressFor(track, achievementValue(track, values)) };
  }, [achievementId, values]);

  const justEarned = !!achievement && !!seenLevels && achievement.progress.level > (seenLevels[String(achievement.track.id)] ?? 0);
  const burstClock = useDelayedClock(BURST_CLOCK_TOTAL, 0, justEarned);

  if (!achievement) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Achievement" onBack={() => router.back()} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Achievement not found</Text>
        </View>
      </View>
    );
  }

  const { track, progress } = achievement;
  const goal = progress.next === null ? "You reached the top level!" : track.requirement(progress.next);
  const levelText = progress.earned ? `Level ${progress.level} of ${progress.maxLevel}` : "Not started yet";
  const toGo = progress.next === null ? 0 : Math.max(0, progress.next - progress.value);
  const stats: { label: string; value: string; color?: string }[] = [
    { label: "Current", value: progress.value.toLocaleString(), color: accent },
    { label: "Next level", value: progress.next === null ? "Max" : progress.next.toLocaleString() },
    { label: "To go", value: toGo.toLocaleString(), color: progress.maxed ? c.success : accent },
  ];

  return (
    <View style={styles.container}>
      <ScreenHeader title={track.title} subtitle={levelText} onBack={() => router.back()} scrolled={scrolled} />
      <ScrollView
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { width: "100%", maxWidth: contentMaxWidth, alignSelf: "center", paddingHorizontal: gutter, paddingBottom: insets.bottom + 32 }]}
      >
        {/* The badge, stamped in once on a soft disc, with what the achievement is */}
        <Animated.View entering={settle(settleDelay(0))} style={styles.hero}>
          <View style={[styles.disc, { backgroundColor: progress.earned ? withAlpha(accent, 0.14) : c.surfaceSoft }]}>
            <View style={styles.badgeWrap}>
              <Stamp at={ACHIEVEMENT_FX.badge}>
                <AchievementBadge track={track} level={progress.badgeLevel} size={BADGE} earned={progress.earned} />
              </Stamp>
              <Burst clock={burstClock} at={ACHIEVEMENT_FX.burst} diameter={BADGE} color={accent} reach={30} />
            </View>
          </View>
          {progress.earned ? (
            <View style={styles.levelPill}>
              <Text style={styles.levelPillText}>Level {progress.level}</Text>
            </View>
          ) : null}
          <Text style={[styles.title, !progress.earned && styles.titleLocked]}>{track.title}</Text>
          <Text style={styles.description}>{track.description}</Text>
        </Animated.View>

        {/* Progress to the next level */}
        <Animated.View entering={settle(settleDelay(1))} style={[styles.section, styles.divided]}>
          <View style={styles.progressHeader}>
            <Text style={styles.sectionTitle}>{progress.maxed ? "Top level" : "Next level"}</Text>
            <Text style={[styles.percent, { color: progress.maxed ? c.success : accent }]}>{Math.round(progress.ratio * 100)}%</Text>
          </View>
          <Text style={styles.goal}>{goal}</Text>
          <ProgressBar
            ratio={progress.ratio}
            label={progress.next === null ? "Done" : `${progress.value.toLocaleString()} / ${progress.next.toLocaleString()}`}
            done={progress.maxed}
            tint={accent}
          />
          <View style={styles.stats}>
            {stats.map((s, i) => (
              <View key={s.label} style={[styles.stat, i > 0 && styles.statDivided]}>
                <Text style={styles.statLabel}>{s.label}</Text>
                <Text style={[styles.statValue, s.color ? { color: s.color } : null]}>{s.value}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Every level */}
        <Animated.View entering={settle(settleDelay(2))} style={[styles.section, styles.divided]}>
          <Text style={styles.sectionTitle}>All levels</Text>
          <View style={styles.levelsGrid}>
            {track.tiers.map((threshold, index) => {
              const level = index + 1;
              const earned = progress.level >= level;
              return (
                <View
                  key={level}
                  style={styles.levelCell}
                  accessible
                  accessibilityLabel={`Level ${level}, ${track.requirement(threshold)}, ${earned ? "earned" : "locked"}`}
                >
                  <AchievementBadge track={track} level={level} size={64} earned={earned} />
                  <Text style={[styles.levelCellTitle, !earned && styles.levelCellLocked]}>Lv {level}</Text>
                  <Text style={styles.levelCellGoal}>{threshold.toLocaleString()}</Text>
                </View>
              );
            })}
          </View>
        </Animated.View>

        {/* Tips */}
        <Animated.View entering={settle(settleDelay(3))} style={[styles.section, styles.divided]}>
          <Text style={styles.sectionTitle}>How to rank up</Text>
          <View>
            {track.tips.map((tip, index) => (
              <View key={tip} style={[styles.tipItem, index > 0 && styles.tipDivided]}>
                <View style={styles.tipBullet}>
                  <Text style={[styles.tipBulletText, { color: accent }]}>{index + 1}</Text>
                </View>
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const useStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    container: { flex: 1, backgroundColor: c.mapBackground },
    errorContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
    errorText: { fontSize: 16, ...fontFaces.medium, color: c.textMuted },
    content: { paddingTop: 8, gap: 20 },

    hero: { alignItems: "center", gap: 10 },
    disc: { width: DISC, height: DISC, borderRadius: DISC / 2, alignItems: "center", justifyContent: "center" },
    badgeWrap: { width: BADGE, height: BADGE, alignItems: "center", justifyContent: "center" },
    levelPill: { paddingHorizontal: 12, paddingVertical: 3, borderRadius: 12, backgroundColor: c.primarySurface },
    levelPillText: { fontSize: 13, ...fontFaces.heavy, color: c.primaryDark },
    title: { fontSize: 28, lineHeight: 34, textAlign: "center", ...fontFaces.black, color: c.text },
    titleLocked: { color: c.textMuted },
    description: { fontSize: 15, lineHeight: 23, textAlign: "center", ...fontFaces.medium, color: c.textMuted },

    section: { gap: 12 },
    divided: { paddingTop: 20, borderTopWidth: 1, borderStyle: "dashed", borderColor: c.border },
    sectionTitle: { fontSize: 18, ...fontFaces.heavy, color: c.text },
    progressHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    percent: { fontSize: 20, ...fontFaces.black, fontVariant: ["tabular-nums"] },
    goal: { fontSize: 15, ...fontFaces.semibold, color: c.textSecondary },
    stats: { flexDirection: "row", alignItems: "stretch", marginTop: 4 },
    stat: { flex: 1, alignItems: "center", gap: 2 },
    statDivided: { borderLeftWidth: 1, borderStyle: "dashed", borderColor: c.border },
    statLabel: { fontSize: 12, ...fontFaces.semibold, color: c.textMuted },
    statValue: { fontSize: 20, ...fontFaces.black, color: c.text, fontVariant: ["tabular-nums"] },

    levelsGrid: { flexDirection: "row", flexWrap: "wrap", rowGap: 16 },
    levelCell: { width: "25%", alignItems: "center", gap: 2 },
    levelCellTitle: { fontSize: 12, ...fontFaces.heavy, color: c.text },
    levelCellLocked: { color: c.textFaint },
    levelCellGoal: { fontSize: 11, ...fontFaces.semibold, color: c.textMuted },

    tipItem: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 12 },
    tipDivided: { borderTopWidth: 1, borderStyle: "dashed", borderColor: c.border },
    tipBullet: { width: 28, height: 28, borderRadius: 10, backgroundColor: withAlpha(theme.palettes.achievements.primary, 0.14), alignItems: "center", justifyContent: "center" },
    tipBulletText: { fontSize: 14, ...fontFaces.heavy },
    tipText: { flex: 1, fontSize: 15, lineHeight: 22, ...fontFaces.medium, color: c.text },
  };
});
