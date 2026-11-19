import { PODIUM, podiumFrame, podiumStart, rankMove } from "@/components/celebration/celebration-core";
import { RankAvatar } from "@/components/feed/RankAvatar";
import { ordinal, rankRowSpoken, weekCaption, xpLabel } from "@/components/feed/feed-ui-core";
import { useCast } from "@/components/feed/use-cast";
import { useWeeklyRanking } from "@/components/feed/use-ranking";
import { Sparkle } from "@/components/lesson/Sparkle";
import { burstTwinkle, BURST } from "@/components/motion/burst-core";
import { PopOnce } from "@/components/motion/PopOnce";
import { Reveal } from "@/components/motion/Reveal";
import { settle } from "@/components/motion/settle";
import { settleDelay } from "@/components/motion/settle-core";
import { useDelayedClock } from "@/components/motion/use-delayed-clock";
import { ScreenHeader, useHeaderBorder } from "@/components/layout";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import type { WeeklyRankRow } from "@/services/feed";
import { getRanksLastSeen, setRanksLastSeen } from "@/services/storage";
import { createStyles, fontFaces, useResponsiveLayout, useTheme, withAlpha } from "@/theme";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, View } from "react-native";
import { usePullRefresh } from "@/hooks/use-pull-refresh";
import Animated, { useAnimatedStyle, useReducedMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Ranks (docs/NPC_FEED_SPEC.md §4.4): this week's ranking of the learner among the NPC cast. A podium
 * for the top three drawn with their heads, then the rest as rows, the learner's row highlighted in
 * the lesson colour. Flat like the rest of the app: no cards, dashed dividers between rows. The learner's
 * number is their real XP this week; the rivals' come from `services/rank-core.ts`. Pull to refresh.
 */

const PODIUM_HEIGHT: Record<number, number> = { 1: 96, 2: 72, 3: 52 };
const PODIUM_HEAD: Record<number, number> = { 1: 68, 2: 56, 3: 56 };

const useStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    container: { flex: 1, backgroundColor: c.mapBackground },
    content: { paddingTop: 4, gap: 16 },
    podium: { flexDirection: "row", alignItems: "flex-end", justifyContent: "center", gap: 10, paddingHorizontal: 4, paddingTop: 20 },
    place: { flex: 1, alignItems: "center", maxWidth: 120 },
    // Head, name and XP ride up on their block. The learner's tint is on this part (the block covers its own room), so the tint rises with it
    placeTop: { alignSelf: "stretch", alignItems: "center", gap: 4, paddingBottom: 4 },
    placeMe: { borderTopLeftRadius: 14, borderTopRightRadius: 14, backgroundColor: withAlpha(c.lessonHeader, 0.28) },
    youRow: { flexDirection: "row", alignItems: "center", gap: 2 },
    sparkle: { position: "absolute", right: -2, top: -4 },
    placeName: { fontSize: 14, textAlign: "center", ...fontFaces.heavy, color: c.text },
    placeXp: { fontSize: 13, ...fontFaces.semibold, color: c.textMuted },
    block: { alignSelf: "stretch", alignItems: "center", justifyContent: "flex-start", paddingTop: 8, borderTopLeftRadius: 14, borderTopRightRadius: 14 },
    blockNumber: { fontSize: 22, ...fontFaces.black, color: c.onPrimary },
    you: { fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase", ...fontFaces.heavy, color: c.primaryLight },
    rows: { paddingVertical: 0 },
    row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 60, paddingHorizontal: 8, paddingVertical: 8 },
    rowMe: { backgroundColor: withAlpha(c.lessonHeader, 0.28), borderRadius: 14 },
    divided: { borderTopWidth: 1, borderStyle: "dashed", borderColor: c.border },
    rank: { width: 32, fontSize: 16, ...fontFaces.heavy, color: c.textMuted },
    rowName: { flex: 1, fontSize: 16, ...fontFaces.heavy, color: c.text },
    rowXp: { fontSize: 15, ...fontFaces.bold, color: c.textSecondary },
    note: { fontSize: 14, lineHeight: 20, textAlign: "center", ...fontFaces.medium, color: c.textMuted },
  };
});

/**
 * One place of the podium: the block rises from its base (third place first, then second, then first),
 * the head and name ride up on it and the head lands with a small squash; first place gets one sparkle as
 * it lands. Only transforms move, so nothing around it shifts (`podiumFrame`, `celebration-core.ts`).
 */
function PodiumPlace({
  r,
  head,
  height,
  color,
  npc,
  accessibilityLabel,
  move,
  styles,
  accent,
  success,
  danger,
}: {
  r: WeeklyRankRow;
  head: number;
  height: number;
  color: string;
  npc: React.ComponentProps<typeof RankAvatar>["npc"];
  accessibilityLabel: string;
  move: "up" | "down" | null;
  styles: ReturnType<typeof useStyles>;
  accent: string;
  success: string;
  danger: string;
}) {
  const reduced = useReducedMotion();
  const clock = useDelayedClock(PODIUM.rise + BURST.twinkleEnd, podiumStart(r.rank));

  const top = useAnimatedStyle(() => {
    const f = podiumFrame(clock.get());
    return { opacity: Math.min(1, f.rise * 3), transform: [{ translateY: (1 - f.rise) * height }] };
  });
  const block = useAnimatedStyle(() => {
    const f = podiumFrame(clock.get());
    return { transform: [{ translateY: ((1 - f.rise) * height) / 2 }, { scaleY: Math.max(0.001, f.rise) }] };
  });
  const headStyle = useAnimatedStyle(() => {
    const sy = podiumFrame(clock.get()).headScaleY;
    return { transform: [{ translateY: ((1 - sy) * head) / 2 }, { scaleY: sy }] };
  });
  const sparkle = useAnimatedStyle(() => {
    const f = burstTwinkle(0, clock.get() - PODIUM.rise);
    return { opacity: f.opacity, transform: [{ rotate: `${f.rotate}deg` }, { scale: f.scale }] };
  });

  const avatar = <RankAvatar npc={npc} isLearner={r.isLearner} size={head} />;
  return (
    <View style={styles.place} accessible accessibilityLabel={accessibilityLabel}>
      <Animated.View style={[styles.placeTop, r.isLearner && styles.placeMe, top]}>
        <View>
          <Animated.View style={headStyle}>
            {r.isLearner && move ? (
              <PopOnce at={PODIUM.learnerPop} sparkleColor={accent}>
                {avatar}
              </PopOnce>
            ) : (
              avatar
            )}
          </Animated.View>
          {r.rank === 1 && !reduced ? (
            <Animated.View pointerEvents="none" style={[styles.sparkle, { opacity: 0 }, sparkle]}>
              <Sparkle size={20} color={accent} />
            </Animated.View>
          ) : null}
        </View>
        <Text style={styles.placeName} numberOfLines={1}>
          {r.name}
        </Text>
        {r.isLearner ? (
          <View style={styles.youRow}>
            <Text style={styles.you}>You</Text>
            {move ? (
              <Reveal at={PODIUM.learnerPop}>
                <Icon name={move === "up" ? "ArrowUp2" : "ArrowDown2"} size={14} color={move === "up" ? success : danger} variant="Bold" />
              </Reveal>
            ) : null}
          </View>
        ) : null}
        <Text style={styles.placeXp}>{xpLabel(r.xp)}</Text>
      </Animated.View>
      <Animated.View style={[styles.block, { height, backgroundColor: color }, block]}>
        <Text style={styles.blockNumber}>{r.rank}</Text>
      </Animated.View>
    </View>
  );
}

export default function RanksScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const { contentMaxWidth, gutter } = useResponsiveLayout();
  const { scrolled, onScroll, scrollEventThrottle } = useHeaderBorder();
  const cast = useCast();
  const { ranking, reload } = useWeeklyRanking();

  // Did the learner's place change since the last time they looked? Read once per visit; the place is saved for the next one
  const [move, setMove] = useState<"up" | "down" | null>(null);
  const learnerRank = ranking?.learnerRank ?? null;
  const checked = useRef(false);
  useEffect(() => {
    if (learnerRank === null || checked.current) return;
    checked.current = true;
    getRanksLastSeen()
      .then((before) => {
        setMove(rankMove(before, learnerRank));
        return setRanksLastSeen(learnerRank);
      })
      .catch(() => {});
  }, [learnerRank]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const { refreshing, onRefresh, spinner } = usePullRefresh(reload);

  const frame = { width: "100%", maxWidth: contentMaxWidth, alignSelf: "center", paddingHorizontal: gutter } as const;
  const rows = ranking?.rows ?? [];
  const podium = [rows[1], rows[0], rows[2]].filter((r): r is WeeklyRankRow => !!r); // 2nd, 1st, 3rd
  const rest = rows.slice(3);

  const blockColor = (rank: number) => (rank === 1 ? theme.colors.primary : rank === 2 ? theme.colors.info : theme.colors.coral);

  return (
    <View style={styles.container}>
      <ScreenHeader title="Weekly ranking" subtitle={ranking ? weekCaption(ranking.weekKey) : undefined} onBack={() => router.back()} scrolled={scrolled} />

      <ScrollView
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} {...spinner} />}
        contentContainerStyle={[styles.content, frame, { paddingBottom: insets.bottom + 32 }]}
      >
        {!ranking ? (
          <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 32 }} accessibilityLabel="Loading the ranking" />
        ) : (
          <>
            <View style={styles.podium}>
                {podium.map((r) => (
                  <PodiumPlace
                    key={r.id}
                    r={r}
                    head={PODIUM_HEAD[r.rank] ?? 56}
                    height={PODIUM_HEIGHT[r.rank] ?? 52}
                    color={blockColor(r.rank)}
                    npc={r.npcId ? (cast.get(r.npcId) ?? null) : null}
                    accessibilityLabel={rankRowSpoken(r)}
                    move={move}
                    styles={styles}
                    accent={theme.colors.lessonHeader}
                    success={theme.colors.success}
                    danger={theme.colors.error}
                  />
                ))}
            </View>

            {rest.length > 0 ? (
              <View style={styles.rows}>
                {rest.map((r, i) => (
                  <Animated.View
                    key={r.id}
                    // The first eight settle in under the rising podium, one after another; the rest are simply there
                    entering={i < 8 ? settle(PODIUM.rowsStart + settleDelay(i)) : undefined}
                    style={[styles.row, r.isLearner && styles.rowMe, i > 0 && styles.divided]}
                    accessible
                    accessibilityLabel={rankRowSpoken(r)}
                  >
                    <Text style={styles.rank}>{ordinal(r.rank)}</Text>
                    {r.isLearner && move ? (
                      <PopOnce at={PODIUM.learnerPop} sparkleColor={theme.colors.lessonHeader}>
                        <RankAvatar npc={null} isLearner size={40} />
                      </PopOnce>
                    ) : (
                      <RankAvatar npc={r.npcId ? (cast.get(r.npcId) ?? null) : null} isLearner={r.isLearner} size={40} />
                    )}
                    <Text style={styles.rowName} numberOfLines={1}>
                      {r.name}
                      {r.isLearner ? " (you)" : ""}
                    </Text>
                    {r.isLearner && move ? (
                      <Reveal at={PODIUM.learnerPop}>
                        <Icon name={move === "up" ? "ArrowUp2" : "ArrowDown2"} size={16} color={move === "up" ? theme.colors.success : theme.colors.error} variant="Bold" />
                      </Reveal>
                    ) : null}
                    <Text style={styles.rowXp}>{xpLabel(r.xp)}</Text>
                  </Animated.View>
                ))}
              </View>
            ) : null}

            <Text style={styles.note}>
              {ranking.learner.xp > 0
                ? `You are ${ordinal(ranking.learnerRank)} with ${xpLabel(ranking.learner.xp)} this week.`
                : "Earn XP with a lesson to climb the table."}
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}
