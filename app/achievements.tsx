import { useRouter } from "expo-router";
import { ScrollView, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AchievementRow } from "@/components/achievements/AchievementRow";
import { ScreenHeader, useHeaderBorder } from "@/components/layout";
import { settle } from "@/components/motion/settle";
import { settleDelay } from "@/components/motion/settle-core";
import { useAwards } from "@/components/profile/AchievementsSection";
import { ProgressBar } from "@/components/quests/ProgressBar";
import { Text } from "@/components/ui/text";
import { createStyles, fontFaces, useResponsiveLayout, useTheme } from "@/theme";

const useStyles = createStyles((theme) => ({
  container: { flex: 1, backgroundColor: theme.colors.mapBackground },
  content: { paddingTop: 8 },
  summary: { gap: 8, paddingBottom: 14, paddingHorizontal: 2 },
  summaryTitle: { fontSize: 18, ...fontFaces.heavy, color: theme.colors.text },
  summaryText: { fontSize: 14, ...fontFaces.medium, color: theme.colors.textMuted },
  divided: { borderTopWidth: 1, borderStyle: "dashed", borderColor: theme.colors.border },
}));

/** The full list of achievements, opened from the arrow on the Profile page: flat rows split by dashed lines. */
export default function AchievementsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const insets = useSafeAreaInsets();
  const { contentMaxWidth, gutter } = useResponsiveLayout();
  const { scrolled, onScroll, scrollEventThrottle } = useHeaderBorder();
  const { awards, totalLevels, possibleLevels } = useAwards();
  const finished = awards.filter((a) => a.progress.maxed).length;

  return (
    <View style={styles.container}>
      <ScreenHeader title="Achievements" subtitle={`${totalLevels}/${possibleLevels} levels`} onBack={() => router.back()} scrolled={scrolled} />
      <ScrollView
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { width: "100%", maxWidth: contentMaxWidth, alignSelf: "center", paddingHorizontal: gutter, paddingBottom: insets.bottom + 32 }]}
      >
        <Animated.View entering={settle()} style={styles.summary}>
          <Text style={styles.summaryTitle}>Your progress</Text>
          <ProgressBar
            ratio={possibleLevels > 0 ? totalLevels / possibleLevels : 0}
            label={`${totalLevels} / ${possibleLevels} levels`}
            done={possibleLevels > 0 && totalLevels >= possibleLevels}
          />
          <Text style={styles.summaryText}>
            {finished === 0 ? "Rank up each achievement to the top level." : `${finished} of ${awards.length} at the top level.`}
          </Text>
        </Animated.View>

        {awards.map(({ track, progress }, i) => (
          <Animated.View key={track.id} entering={i < 8 ? settle(settleDelay(i + 1)) : undefined} style={styles.divided}>
            <AchievementRow track={track} progress={progress} onPress={() => router.push(`/achievement-detail?achievementId=${track.id}`)} />
          </Animated.View>
        ))}
      </ScrollView>
    </View>
  );
}
