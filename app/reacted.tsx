import { BlogCard } from "@/components/feed/BlogCard";
import { PostCard } from "@/components/feed/PostCard";
import { useCast } from "@/components/feed/use-cast";
import { ScreenHeader, useHeaderBorder } from "@/components/layout";
import { Shrodi } from "@/components/mascot/Shrodi";
import { Text } from "@/components/ui/text";
import { getFeed, subscribeFeed, type FeedItem } from "@/services/feed";
import { createStyles, fontFaces, useResponsiveLayout, useTheme } from "@/theme";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Reacted: the posts and blog pieces the learner has reacted to, newest first, drawn exactly as they
 * are on the feed. Taking a reaction back does not drop the post at once (the list is read again the
 * next time the page is shown), so an accidental tap can be put right.
 */

const useStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    container: { flex: 1, backgroundColor: c.mapBackground },
    list: { paddingTop: 12 },
    calm: { alignItems: "center", gap: 10, paddingTop: 48, paddingHorizontal: 12 },
    calmTitle: { fontSize: 22, textAlign: "center", ...fontFaces.heavy, color: c.text },
    calmText: { fontSize: 15, lineHeight: 22, textAlign: "center", ...fontFaces.medium, color: c.textMuted },
  };
});

export default function ReactedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const { contentMaxWidth, gutter } = useResponsiveLayout();
  const { scrolled, onScroll, scrollEventThrottle } = useHeaderBorder();
  const cast = useCast();
  const [items, setItems] = useState<FeedItem[] | null>(null);
  const [now, setNow] = useState(() => Date.now());

  /* The ids shown stay put while the page is in front, so un-reacting does not make a post vanish under the finger. */
  const load = useCallback(() => {
    getFeed()
      .then((all) => {
        setNow(Date.now());
        setItems((prev) => {
          const keep = new Set((prev ?? []).map((i) => i.id));
          return all.filter((i) => i.reactions.mine !== null || keep.has(i.id));
        });
      })
      .catch((error) => {
        console.warn("[reacted] load", error);
        setItems((prev) => prev ?? []);
      });
  }, []);

  useFocusEffect(
    useCallback(() => {
      setItems(null);
      load();
    }, [load]),
  );
  useEffect(() => subscribeFeed(load), [load]);

  const renderItem = useCallback(
    ({ item }: { item: FeedItem }) =>
      item.blog ? (
        <BlogCard item={item} npc={cast.get(item.npcId) ?? null} cast={cast} now={now} />
      ) : (
        <PostCard item={item} npc={cast.get(item.npcId) ?? null} cast={cast} now={now} />
      ),
    [cast, now],
  );

  return (
    <View style={styles.container}>
      <ScreenHeader title="Reacted" onBack={() => router.back()} scrolled={scrolled} />
      {items === null ? (
        <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 32 }} accessibilityLabel="Loading posts" />
      ) : (
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          onScroll={onScroll}
          scrollEventThrottle={scrollEventThrottle}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.list,
            { width: "100%", maxWidth: contentMaxWidth, alignSelf: "center", paddingHorizontal: gutter, paddingBottom: insets.bottom + 32 },
          ]}
          ListEmptyComponent={
            <View style={styles.calm}>
              <Shrodi mood="idle" size={96} />
              <Text style={styles.calmTitle} accessibilityRole="header">
                Nothing yet
              </Text>
              <Text style={styles.calmText}>Posts you react to on the Feed are collected here.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}
