import { BlogCard } from "@/components/feed/BlogCard";
import { NpcHead } from "@/components/feed/NpcHead";
import { PostCard } from "@/components/feed/PostCard";
import { useCast } from "@/components/feed/use-cast";
import { ScreenHeader, useHeaderBorder } from "@/components/layout";
import { Shrodi } from "@/components/mascot/Shrodi";
import { NpcCover } from "@/components/npc/NpcCover";
import { settle } from "@/components/motion/settle";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useFeed } from "@/hooks/use-feed";
import { usePullRefresh } from "@/hooks/use-pull-refresh";
import { contentRepository } from "@/services/content-db";
import { createStyles, fontFaces, useResponsiveLayout, useTheme } from "@/theme";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, RefreshControl, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * A teacher's profile, like a profile on a social feed: a cover of small pictures about what they teach, in the teacher's own colour, their
 * avatar over its edge, name and title, a short bio, three numbers (posts, blog pieces, what they teach)
 * and then their posts and blog cards, newest first, with the same reactions as in the feed. Read only,
 * like the whole feature: the learner can react and nothing else.
 */

const AVATAR = 92;
const BANNER = 116;

const useStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    container: { flex: 1, backgroundColor: c.mapBackground },
    avatarRow: { marginTop: -AVATAR / 2, paddingHorizontal: 16 },
    who: { gap: 4, paddingTop: 12 },
    name: { fontSize: 28, lineHeight: 34, ...fontFaces.black, color: c.text },
    title: { fontSize: 16, ...fontFaces.semibold, color: c.textMuted },
    bio: { fontSize: 16, lineHeight: 24, paddingTop: 10, ...fontFaces.medium, color: c.text },
    stats: { flexDirection: "row", gap: 28, paddingTop: 16 },
    stat: { gap: 1 },
    statValue: { fontSize: 20, ...fontFaces.heavy, color: c.text },
    statLabel: { fontSize: 13, ...fontFaces.semibold, color: c.textMuted },
    teaches: { flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-start", marginTop: 16, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: c.surfaceSoft },
    teachesText: { flexShrink: 1, fontSize: 14, ...fontFaces.bold, color: c.text },
    sectionWrap: { paddingTop: 22, gap: 2 },
    sectionLabel: { fontSize: 12, letterSpacing: 0.8, textTransform: "uppercase", ...fontFaces.heavy, color: c.textMuted },
    divider: { marginTop: 14, borderTopWidth: 1, borderStyle: "dashed", borderColor: c.border },
    empty: { alignItems: "center", gap: 10, paddingTop: 36, paddingHorizontal: 12 },
    emptyText: { fontSize: 15, lineHeight: 22, textAlign: "center", ...fontFaces.medium, color: c.textMuted },
    calm: { alignItems: "center", gap: 10, paddingTop: 48, paddingHorizontal: 12 },
    calmTitle: { fontSize: 22, textAlign: "center", ...fontFaces.heavy, color: c.text },
  };
});

export default function NpcProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const npcId = Array.isArray(id) ? id[0] : id;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const { contentMaxWidth, gutter } = useResponsiveLayout();
  const { scrolled, onScroll, scrollEventThrottle } = useHeaderBorder();
  const cast = useCast();
  const { items, loading, refresh } = useFeed();
  const npc = (npcId ? cast.get(npcId) : null) ?? null;
  const [now, setNow] = useState(() => Date.now());

  /* What this teacher teaches: the unit whose teacher they are. */
  const [unitTitle, setUnitTitle] = useState<string | null>(null);
  useEffect(() => {
    if (!npcId) return;
    let alive = true;
    contentRepository
      .getUnits()
      .then((units) => alive && setUnitTitle(units.find((u) => u.teacherNpcId === npcId)?.title ?? null))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [npcId]);

  useFocusEffect(
    useCallback(() => {
      setNow(Date.now());
      void refresh();
    }, [refresh]),
  );
  const { refreshing, onRefresh, spinner } = usePullRefresh(refresh);

  const theirs = useMemo(() => items.filter((i) => i.npcId === npcId), [items, npcId]);
  const blogCount = theirs.filter((i) => i.blog).length;
  const postCount = theirs.length - blogCount;

  const frame = { width: "100%", maxWidth: contentMaxWidth, alignSelf: "center", paddingHorizontal: gutter } as const;
  const castReady = cast.size > 0;

  if (castReady && !npc) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Profile" onBack={() => router.back()} />
        <View style={styles.calm}>
          <Shrodi mood="idle" size={96} />
          <Text style={styles.calmTitle} accessibilityRole="header">
            We could not find this teacher
          </Text>
        </View>
      </View>
    );
  }

  const header = (
    <Animated.View entering={settle(0)}>
      <NpcCover npcId={npc?.id} outfit={npc?.spec.outfit ?? { color: theme.colors.primary, shade: theme.colors.primary }} height={BANNER} />
      <View style={styles.avatarRow}>
        <NpcHead npc={npc} size={AVATAR} ring />
      </View>
      <View style={styles.who}>
        <Text style={styles.name} accessibilityRole="header">
          {npc?.name ?? " "}
        </Text>
        {npc?.title ? <Text style={styles.title}>{npc.title}</Text> : null}
      </View>
      {npc?.bio ? <Text style={styles.bio}>{npc.bio}</Text> : null}
      <View style={styles.stats}>
        <View style={styles.stat} accessible accessibilityLabel={`${postCount} posts`}>
          <Text style={styles.statValue}>{postCount}</Text>
          <Text style={styles.statLabel}>Posts</Text>
        </View>
        <View style={styles.stat} accessible accessibilityLabel={`${blogCount} blog pieces`}>
          <Text style={styles.statValue}>{blogCount}</Text>
          <Text style={styles.statLabel}>Blog pieces</Text>
        </View>
      </View>
      {unitTitle ? (
        <View style={styles.teaches} accessible accessibilityLabel={`Teaches ${unitTitle}`}>
          <Icon name="Book" size={16} color={theme.colors.textSecondary} variant="Bold" />
          <Text style={styles.teachesText} numberOfLines={2}>
            Teaches {unitTitle}
          </Text>
        </View>
      ) : null}
      <View style={styles.sectionWrap}>
        <Text style={styles.sectionLabel} accessibilityRole="header">
          Posts
        </Text>
        <View style={styles.divider} accessible={false} importantForAccessibility="no-hide-descendants" />
      </View>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader title={npc?.name ?? "Profile"} onBack={() => router.back()} scrolled={scrolled} />
      <FlatList
        data={theirs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) =>
          item.blog ? (
            <BlogCard item={item} npc={npc} cast={cast} now={now} linkHead={false} />
          ) : (
            <PostCard item={item} npc={npc} cast={cast} now={now} linkHead={false} />
          )
        }
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} {...spinner} />}
        contentContainerStyle={[frame, { paddingTop: 4, paddingBottom: insets.bottom + 32 }]}
        ListHeaderComponent={header}
        ListEmptyComponent={
          loading ? undefined : (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>{npc ? `${npc.name} has not posted yet. Keep learning and they will.` : ""}</Text>
            </View>
          )
        }
      />
    </View>
  );
}
