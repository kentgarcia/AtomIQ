import { BlogCard } from "@/components/feed/BlogCard";
import { RanksBanner, ShortcutsRow } from "@/components/feed/EntryCards";
import { PostCard } from "@/components/feed/PostCard";
import { useTutorialTarget } from "@/components/tutorial/use-tutorial-target";
import { useDrippedFeed } from "@/components/feed/use-drip";
import { useCast } from "@/components/feed/use-cast";
import { useWeeklyRanking } from "@/components/feed/use-ranking";
import { ScreenHeader, useHeaderBorder, useTabBarInset } from "@/components/layout";
import { Shrodi } from "@/components/mascot/Shrodi";
import { Text } from "@/components/ui/text";
import { useFeed } from "@/hooks/use-feed";
import { checkRankChange, type FeedItem } from "@/services/feed";
import { createStyles, fontFaces, useResponsiveLayout, useTheme } from "@/theme";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { FlatList, RefreshControl, View } from "react-native";
import { usePullRefresh } from "@/hooks/use-pull-refresh";
import { useReducedMotion } from "react-native-reanimated";

/**
 * Discover: the NPC feed (docs/features/NPC_FEED_SPEC.md §3). The cast posts about what the learner really
 * did, blog pieces appear as blog cards, newest first. The learner can only react.
 *
 * Under the "Feed" title, a row of four round shortcuts and the weekly ranking banner sit at the top
 * of the list and scroll away with it. Posts are flat on the page (no cards). Opening the page marks every post seen, which clears the dot on the tab.
 * Everything is simulated and offline; an empty feed (no posts yet, or a bundle without the feed
 * tables) shows Shrodi and one line.
 */

const MINUTE = 60_000;
const SIDE = 24;

const useStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    container: { flex: 1, backgroundColor: c.mapBackground },
    list: { paddingHorizontal: SIDE, paddingTop: 12 },
    empty: { alignItems: "center", gap: 8, paddingTop: 28, paddingHorizontal: 12 },
    emptyText: { fontSize: 17, lineHeight: 24, textAlign: "center", ...fontFaces.heavy, color: c.text },
    emptySub: { fontSize: 14, lineHeight: 20, textAlign: "center", ...fontFaces.medium, color: c.textMuted },
  };
});

export default function CommunityScreen() {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const { contentMaxWidth } = useResponsiveLayout();
  const tabBarInset = useTabBarInset();
  const { items, loading, enabled, refresh, markSeen } = useFeed();
  const cast = useCast();
  const { ranking, reload: reloadRanking } = useWeeklyRanking();
  const [now, setNow] = useState(() => Date.now());

  const { scrolled, onScroll, scrollEventThrottle } = useHeaderBorder();

  /* Posts that arrive while this page is in front land one by one; the first load is not animated. */
  const [isFocused, setIsFocused] = useState(false);
  const reduced = useReducedMotion();
  const { shown, fresh } = useDrippedFeed(items, loading, isFocused, reduced);

  /* Opening Discover is what clears the dot on the tab: every post in the list counts as seen at once
     (not only the ones scrolled into view), and so does one that lands while the page is in front. */
  useEffect(() => {
    if (!isFocused || loading) return;
    const ids = items.filter((i) => !i.seen).map((i) => i.id);
    if (ids.length) markSeen(ids);
  }, [isFocused, loading, items, markSeen]);

  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      setNow(Date.now());
      void refresh();
      void reloadRanking();
      void checkRankChange(); // a passed rival may become a post; the list re-reads by itself
      const tick = setInterval(() => setNow(Date.now()), MINUTE);
      return () => {
        setIsFocused(false);
        clearInterval(tick);
      };
    }, [refresh, reloadRanking]),
  );

  const { refreshing, onRefresh, spinner } = usePullRefresh(
    useCallback(() => {
      setNow(Date.now());
      return Promise.all([refresh(), reloadRanking()]);
    }, [refresh, reloadRanking]),
  );

  // Shrodi's tour lights the first card's reaction pill (docs/features/TUTORIAL_SPEC.md)
  const reactionLit = useTutorialTarget("feed.reaction", { radius: "round" });
  const firstId = shown[0]?.id;
  const renderItem = useCallback(
    ({ item }: { item: FeedItem }) =>
      item.blog ? (
        <BlogCard item={item} npc={cast.get(item.npcId) ?? null} cast={cast} now={now} fresh={fresh.has(item.id)} reactionRef={item.id === firstId ? reactionLit.ref : undefined} />
      ) : (
        <PostCard item={item} npc={cast.get(item.npcId) ?? null} cast={cast} now={now} fresh={fresh.has(item.id)} reactionRef={item.id === firstId ? reactionLit.ref : undefined} />
      ),
    [cast, now, fresh, firstId, reactionLit.ref],
  );

  return (
    <View style={styles.container}>
      <ScreenHeader title="Feed" scrolled={scrolled} />
      <FlatList
        data={shown}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={7}
        removeClippedSubviews={false}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} {...spinner} />}
        contentContainerStyle={[
          styles.list,
          { width: "100%", maxWidth: contentMaxWidth, alignSelf: "center", paddingBottom: tabBarInset + 24 },
        ]}
        ListHeaderComponent={
          <View>
            <ShortcutsRow />
            <RanksBanner ranking={ranking} />
          </View>
        }
        ListEmptyComponent={
          loading || items.length > 0 ? undefined : (
            <View style={styles.empty}>
              <Shrodi mood="idle" size={120} accessibilityLabel="Shrodi" />
              <Text style={styles.emptyText}>Finish a lesson and your teachers will start posting.</Text>
              {!enabled ? <Text style={styles.emptySub}>Feed posts are off. You can turn them on in Settings.</Text> : null}
            </View>
          )
        }
      />
    </View>
  );
}
