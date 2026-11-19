/**
 * AchievementRow — one achievement in the list, flat on the page: the badge of the level earned (dimmed
 * while nothing is), the title with its level, what the next level asks for and a progress bar toward
 * it. The whole row opens the achievement's detail. Rows are split by dashed lines by the list.
 */

import React from "react";
import { Pressable, View } from "react-native";

import { AchievementBadge } from "@/components/achievements/AchievementBadge";
import { ProgressBar } from "@/components/quests/ProgressBar";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import type { AchievementProgress, AchievementTrack } from "@/services/achievements-core";
import { createStyles, fontFaces, useTheme } from "@/theme";

export function AchievementRow({
  track,
  progress,
  onPress,
}: {
  track: AchievementTrack;
  progress: AchievementProgress;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const goal = progress.next === null ? "Top level reached" : track.requirement(progress.next);
  const levelText = progress.earned ? `Level ${progress.level} of ${progress.maxLevel}` : "Not started";
  const barLabel = progress.next === null ? "Done" : `${progress.value.toLocaleString()} / ${progress.next.toLocaleString()}`;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${track.title}, ${levelText}. ${goal}. Opens details.`}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <AchievementBadge track={track} level={progress.badgeLevel} size={68} earned={progress.earned} />
      <View style={styles.copy}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {track.title}
          </Text>
          <View style={[styles.pill, progress.earned && styles.pillOn]}>
            <Text style={[styles.pillText, progress.earned && styles.pillTextOn]}>{progress.earned ? `Lv ${progress.level}` : "Lv 0"}</Text>
          </View>
        </View>
        <Text style={styles.goal} numberOfLines={2}>
          {goal}
        </Text>
        <ProgressBar ratio={progress.ratio} label={barLabel} done={progress.maxed} />
      </View>
      <Icon name="ArrowRight2" size={18} color={theme.colors.textFaint} variant="Bold" />
    </Pressable>
  );
}

const useStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    row: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14, paddingHorizontal: 2 },
    pressed: { opacity: 0.6 },
    copy: { flex: 1, minWidth: 0, gap: 6 },
    titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    title: { flexShrink: 1, fontSize: 17, ...fontFaces.heavy, color: c.text },
    pill: { paddingHorizontal: 8, paddingVertical: 1, borderRadius: 9, backgroundColor: c.surfaceSoft },
    pillOn: { backgroundColor: c.primarySurface },
    pillText: { fontSize: 11, ...fontFaces.heavy, color: c.textMuted },
    pillTextOn: { color: c.primaryDark },
    goal: { fontSize: 13, lineHeight: 18, ...fontFaces.medium, color: c.textMuted },
  };
});
