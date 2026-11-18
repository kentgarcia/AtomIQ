import { BandCard, BandCircle, LipCard } from "@/components/community/BandCard";
import { RankAvatar } from "@/components/feed/RankAvatar";
import { ordinal, rankRowSpoken, weekCaption, xpLabel } from "@/components/feed/feed-ui-core";
import { useCast } from "@/components/feed/use-cast";
import { useWeeklyRanking } from "@/components/feed/use-ranking";
import { Text } from "@/components/ui/text";
import type { WeeklyRankRow } from "@/services/feed";
import { createStyles, fontFaces, useResponsiveLayout, useTheme, withAlpha } from "@/theme";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Ranks (docs/NPC_FEED_SPEC.md §4.4): this week's ranking of the learner among the NPC cast. A podium
 * for the top three drawn with their heads, then the rest as rows, the learner's row highlighted in
 * the lesson colour. The learner's number is their real XP this week; the rivals' are simulated on
 * the device (`services/rank-core.ts`). Pull to refresh.
 */

const PODIUM_HEIGHT: Record<number, number> = { 1: 96, 2: 72, 3: 52 };
const PODIUM_HEAD: Record<number, number> = { 1: 68, 2: 56, 3: 56 };

const useStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    container: { flex: 1, backgroundColor: c.mapBackground },
    headerWrap: { paddingBottom: 8 },
    caption: { fontSize: 14, ...fontFaces.semibold, color: c.textMuted },
    content: { paddingTop: 8, gap: 16 },
    podium: { flexDirection: "row", alignItems: "flex-end", justifyContent: "center", gap: 10, paddingHorizontal: 12, paddingTop: 20 },
    place: { flex: 1, alignItems: "center", gap: 4, maxWidth: 120 },
    placeMe: { borderTopLeftRadius: 14, borderTopRightRadius: 14, backgroundColor: withAlpha(c.lessonHeader, 0.28) },
    placeName: { fontSize: 14, textAlign: "center", ...fontFaces.heavy, color: c.text },
    placeXp: { fontSize: 13, ...fontFaces.semibold, color: c.textMuted },
    block: { alignSelf: "stretch", alignItems: "center", justifyContent: "flex-start", paddingTop: 8, borderTopLeftRadius: 14, borderTopRightRadius: 14 },
    blockNumber: { fontSize: 22, ...fontFaces.black, color: c.onPrimary },
    you: { fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase", ...fontFaces.heavy, color: c.primaryLight },
    rows: { paddingVertical: 4 },
    row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 60, paddingHorizontal: 14, paddingVertical: 8 },
    rowMe: { backgroundColor: withAlpha(c.lessonHeader, 0.28) },
    divided: { borderTopWidth: 1, borderStyle: "dashed", borderColor: c.border },
    rank: { width: 32, fontSize: 16, ...fontFaces.heavy, color: c.textMuted },
    rowName: { flex: 1, fontSize: 16, ...fontFaces.heavy, color: c.text },
    rowXp: { fontSize: 15, ...fontFaces.bold, color: c.textSecondary },
    note: { fontSize: 14, lineHeight: 20, textAlign: "center", ...fontFaces.medium, color: c.textMuted },
  };
});

export default function RanksScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const { contentMaxWidth, gutter } = useResponsiveLayout();
  const cast = useCast();
  const { ranking, reload } = useWeeklyRanking();
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await reload();
    } finally {
      setRefreshing(false);
    }
  }, [reload]);

  const frame = { width: "100%", maxWidth: contentMaxWidth, alignSelf: "center", paddingHorizontal: gutter } as const;
  const rows = ranking?.rows ?? [];
  const podium = [rows[1], rows[0], rows[2]].filter((r): r is WeeklyRankRow => !!r); // 2nd, 1st, 3rd
  const rest = rows.slice(3);

  const blockColor = (rank: number) => (rank === 1 ? theme.colors.primary : rank === 2 ? theme.colors.info : theme.colors.coral);

  return (
    <View style={styles.container}>
      <View style={[styles.headerWrap, frame, { paddingTop: insets.top + 12 }]}>
        <BandCard title="Weekly ranking" left={<BandCircle icon="ArrowLeft2" onPress={() => router.back()} label="Go back" />}>
          <Text style={styles.caption}>{ranking ? weekCaption(ranking.weekKey) : " "}</Text>
        </BandCard>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} colors={[theme.colors.primary]} />}
        contentContainerStyle={[styles.content, frame, { paddingBottom: insets.bottom + 32 }]}
      >
        {!ranking ? (
          <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 32 }} accessibilityLabel="Loading the ranking" />
        ) : (
          <>
            <LipCard>
              <View style={styles.podium}>
                {podium.map((r) => (
                  <View key={r.id} style={[styles.place, r.isLearner && styles.placeMe]} accessible accessibilityLabel={rankRowSpoken(r)}>
                    <RankAvatar npc={r.npcId ? (cast.get(r.npcId) ?? null) : null} isLearner={r.isLearner} size={PODIUM_HEAD[r.rank] ?? 56} />
                    <Text style={styles.placeName} numberOfLines={1}>
                      {r.name}
                    </Text>
                    {r.isLearner ? <Text style={styles.you}>You</Text> : null}
                    <Text style={styles.placeXp}>{xpLabel(r.xp)}</Text>
                    <View style={[styles.block, { height: PODIUM_HEIGHT[r.rank] ?? 52, backgroundColor: blockColor(r.rank) }]}>
                      <Text style={styles.blockNumber}>{r.rank}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </LipCard>

            {rest.length > 0 ? (
              <LipCard faceStyle={styles.rows}>
                {rest.map((r, i) => (
                  <View
                    key={r.id}
                    style={[styles.row, r.isLearner && styles.rowMe, i > 0 && styles.divided]}
                    accessible
                    accessibilityLabel={rankRowSpoken(r)}
                  >
                    <Text style={styles.rank}>{ordinal(r.rank)}</Text>
                    <RankAvatar npc={r.npcId ? (cast.get(r.npcId) ?? null) : null} isLearner={r.isLearner} size={40} />
                    <Text style={styles.rowName} numberOfLines={1}>
                      {r.name}
                      {r.isLearner ? " (you)" : ""}
                    </Text>
                    <Text style={styles.rowXp}>{xpLabel(r.xp)}</Text>
                  </View>
                ))}
              </LipCard>
            ) : null}

            <Text style={styles.note}>
              {ranking.learner.xp > 0
                ? `You are ${ordinal(ranking.learnerRank)} with ${xpLabel(ranking.learner.xp)} this week. The others are your teachers, simulated on your phone.`
                : "Earn XP with a lesson to climb the table. The others are your teachers, simulated on your phone."}
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}
