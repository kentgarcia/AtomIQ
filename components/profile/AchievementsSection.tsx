/**
 * AchievementsSection — the Profile tab's achievements, flat on the page (no card): the first
 * four as round badges in one row, under a heading whose arrow opens the full list
 * (`app/achievements.tsx`). A ring around the badge fills toward the next level; the title and level sit
 * under it. Each achievement ranks up through levels, one badge picture per level. Tapping one
 * opens its detail screen. Progress comes from the profile's numbers (plus the quests-claimed
 * counter), the same ones the passport's badge picker reads.
 */

import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/text";
import Svg, { Circle } from "react-native-svg";

import { AchievementBadge } from "@/components/achievements/AchievementBadge";
import { Icon } from "@/components/ui/icon";
import { useAchievementValues } from "@/hooks/use-achievement-values";
import { ACHIEVEMENTS, achievementValue, progressFor, type AchievementProgress, type AchievementTrack } from "@/services/achievements-core";
import { createStyles, fontFaces, useTheme } from "@/theme";

const RING_WIDTH = 7;
const MAX_DIAMETER = 124;

function RoundTile({
  track,
  progress,
  onPress,
}: {
  track: AchievementTrack;
  progress: AchievementProgress;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const c = theme.colors;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [width, setWidth] = useState(0);

  const diameter = Math.min(MAX_DIAMETER, Math.floor(width));
  const radius = (diameter - RING_WIDTH) / 2;
  const circumference = 2 * Math.PI * radius;
  const badgeSize = Math.max(0, diameter - RING_WIDTH * 2 - 14);
  const goal = progress.next === null ? "Top level reached" : track.requirement(progress.next);
  const levelText = progress.earned ? `Level ${progress.level} of ${progress.maxLevel}` : "Not started";

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${track.title}, ${levelText}. ${goal}. Opens details.`}
      style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      {diameter > 0 ? (
        <View style={{ width: diameter, height: diameter }}>
          <View
            style={[
              styles.face,
              { width: diameter - RING_WIDTH * 2, height: diameter - RING_WIDTH * 2, borderRadius: diameter },
              { margin: RING_WIDTH },
            ]}
          >
            <AchievementBadge track={track} level={progress.badgeLevel} size={badgeSize} earned={progress.earned} />
          </View>
          <Svg width={diameter} height={diameter} style={styles.ring} pointerEvents="none">
            <Circle cx={diameter / 2} cy={diameter / 2} r={radius} stroke={c.border} strokeWidth={RING_WIDTH} fill="none" />
            {progress.ratio > 0 ? (
              <Circle
                cx={diameter / 2}
                cy={diameter / 2}
                r={radius}
                stroke={progress.maxed ? c.success : c.buttonFace}
                strokeWidth={RING_WIDTH}
                strokeLinecap="round"
                fill="none"
                strokeDasharray={`${circumference * progress.ratio} ${circumference}`}
                // Start at the top
                rotation={-90}
                originX={diameter / 2}
                originY={diameter / 2}
              />
            ) : null}
          </Svg>
        </View>
      ) : null}
      <View style={styles.caption}>
        <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
          {track.title}
        </Text>
        <View style={[styles.levelPill, progress.earned && styles.levelPillOn]}>
          <Text style={[styles.levelText, progress.earned && styles.levelTextOn]}>
            {progress.earned ? `Level ${progress.level}` : "Level 0"}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

/** Every achievement with its progress, from the profile's numbers. */
export function useAwards() {
  const values = useAchievementValues();
  return useMemo(() => {
    const awards = ACHIEVEMENTS.map((track) => ({ track, progress: progressFor(track, achievementValue(track, values)) }));
    return {
      awards,
      totalLevels: awards.reduce((sum, a) => sum + a.progress.level, 0),
      possibleLevels: awards.reduce((sum, a) => sum + a.progress.maxLevel, 0),
    };
  }, [values]);
}

const GAP = 12;

export function AchievementsSection({ limit = 4 }: { limit?: number }) {
  const router = useRouter();
  const { awards, totalLevels, possibleLevels } = useAwards();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View style={styles.root}>
      <Pressable
        onPress={() => router.push("/achievements")}
        accessibilityRole="button"
        accessibilityLabel={`Achievements, ${totalLevels} of ${possibleLevels} levels. Opens the full list.`}
        style={({ pressed }) => [styles.sectionHeader, pressed && styles.tilePressed]}
      >
        <Text style={styles.sectionTitle} accessibilityRole="header">
          Achievements
        </Text>
        <Icon name="ArrowRight2" size={22} color={theme.colors.textMuted} variant="Bold" />
      </Pressable>

      <View style={styles.preview}>
        {awards.slice(0, limit).map(({ track, progress }) => (
          <View key={track.id} style={styles.previewItem}>
            <RoundTile track={track} progress={progress} onPress={() => router.push(`/achievement-detail?achievementId=${track.id}`)} />
          </View>
        ))}
      </View>
    </View>
  );
}

const makeStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    root: { gap: 14 },
    sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    sectionTitle: { fontSize: 22, color: c.text, ...fontFaces.heavy },
    preview: { flexDirection: "row", gap: GAP },
    previewItem: { flex: 1, minWidth: 0 },
    tile: { alignItems: "center", gap: 6 },
    tilePressed: { transform: [{ scale: 0.97 }] },
    face: { alignItems: "center", justifyContent: "center", backgroundColor: c.card },
    ring: { position: "absolute", top: 0, left: 0 },
    // Title and level pill sit together, close
    caption: { alignItems: "center", gap: 3, alignSelf: "stretch" },
    title: { fontSize: 13, lineHeight: 17, textAlign: "center", color: c.text, ...fontFaces.heavy },
    levelPill: { paddingHorizontal: 10, paddingVertical: 2, borderRadius: 10, backgroundColor: c.surfaceSoft },
    levelPillOn: { backgroundColor: c.primarySurface },
    levelText: { fontSize: 12, color: c.textMuted, ...fontFaces.heavy },
    levelTextOn: { color: c.primaryDark },
  };
});
