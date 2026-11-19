import { BlogCover } from "@/components/feed/BlogCover";
import { NpcHead } from "@/components/feed/NpcHead";
import { blogHref, readTimeLabel } from "@/components/feed/feed-ui-core";
import { pushHref } from "@/components/feed/navigate";
import { useCast } from "@/components/feed/use-cast";
import { ScreenHeader, useHeaderBorder } from "@/components/layout";
import { Shrodi } from "@/components/mascot/Shrodi";
import { settle } from "@/components/motion/settle";
import { settleDelay } from "@/components/motion/settle-core";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { getUnlockedBlogs, subscribeFeed, type UnlockedBlog } from "@/services/feed";
import { impactLight } from "@/services/haptics";
import { createStyles, fontFaces, useResponsiveLayout, useTheme, withAlpha } from "@/theme";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Blogs: every blog piece the learner has unlocked, in reading order, so one that scrolled out of
 * the feed is never lost. Flat like the feed: a small cover, the title, the hook, the author and the
 * reading time, with a dashed line between rows. A piece not opened yet wears a "New" tag.
 */

const COVER = 84;

const useStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    container: { flex: 1, backgroundColor: c.mapBackground },
    content: { paddingTop: 4 },
    row: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14, minHeight: 48 },
    rowPressed: { opacity: 0.8 },
    cover: { width: COVER, height: COVER, borderRadius: 16, overflow: "hidden" },
    body: { flex: 1, gap: 3 },
    title: { fontSize: 17, lineHeight: 22, ...fontFaces.heavy, color: c.text },
    hook: { fontSize: 14, lineHeight: 19, ...fontFaces.medium, color: c.textMuted },
    meta: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
    metaText: { flexShrink: 1, fontSize: 13, ...fontFaces.semibold, color: c.textMuted },
    newTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: withAlpha(c.primary, 0.18) },
    newText: { fontSize: 11, letterSpacing: 0.4, textTransform: "uppercase", ...fontFaces.heavy, color: c.text },
    divider: { borderTopWidth: 1, borderStyle: "dashed", borderColor: c.border },
    calm: { alignItems: "center", gap: 10, paddingTop: 48, paddingHorizontal: 12 },
    calmTitle: { fontSize: 22, textAlign: "center", ...fontFaces.heavy, color: c.text },
    calmText: { fontSize: 15, lineHeight: 22, textAlign: "center", ...fontFaces.medium, color: c.textMuted },
  };
});

export default function BlogsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const { contentMaxWidth, gutter } = useResponsiveLayout();
  const { scrolled, onScroll, scrollEventThrottle } = useHeaderBorder();
  const cast = useCast();
  const [blogs, setBlogs] = useState<UnlockedBlog[] | null>(null);

  const load = useCallback(() => {
    getUnlockedBlogs()
      .then(setBlogs)
      .catch((error) => {
        console.warn("[blogs] load", error);
        setBlogs((prev) => prev ?? []);
      });
  }, []);

  /* Again when the learner comes back from reading a piece, and when something unlocks. */
  useFocusEffect(load);
  useEffect(() => subscribeFeed(load), [load]);

  const frame = { width: "100%", maxWidth: contentMaxWidth, alignSelf: "center", paddingHorizontal: gutter } as const;

  return (
    <View style={styles.container}>
      <ScreenHeader title="Blogs" onBack={() => router.back()} scrolled={scrolled} />
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
        contentContainerStyle={[styles.content, frame, { paddingBottom: insets.bottom + 32 }]}
      >
        {blogs === null ? (
          <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 32 }} accessibilityLabel="Loading blogs" />
        ) : blogs.length === 0 ? (
          <View style={styles.calm}>
            <Shrodi mood="idle" size={96} />
            <Text style={styles.calmTitle} accessibilityRole="header">
              No blogs yet
            </Text>
            <Text style={styles.calmText}>Keep learning and your teachers will share their pieces with you here.</Text>
          </View>
        ) : (
          blogs.map((blog, i) => {
            const author = cast.get(blog.npcId) ?? null;
            return (
              <Animated.View key={blog.id} entering={settle(settleDelay(i))}>
                {i > 0 ? <View style={styles.divider} accessible={false} importantForAccessibility="no-hide-descendants" /> : null}
                <Pressable
                  style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                  accessibilityRole="button"
                  accessibilityLabel={`${blog.title}. By ${author?.name ?? "a teacher"}, ${readTimeLabel(blog.readMin)}${blog.read ? "" : ", new"}`}
                  onPress={() => {
                    impactLight();
                    pushHref(router, blogHref(blog.id));
                  }}
                >
                  <View style={styles.cover} accessible={false} importantForAccessibility="no-hide-descendants">
                    <BlogCover cover={blog.cover} width={COVER} height={COVER} art={56} />
                  </View>
                  <View style={styles.body} accessible={false} importantForAccessibility="no-hide-descendants">
                    <Text style={styles.title} numberOfLines={2}>
                      {blog.title}
                    </Text>
                    <Text style={styles.hook} numberOfLines={2}>
                      {blog.hook}
                    </Text>
                    <View style={styles.meta}>
                      <NpcHead npc={author} size={20} />
                      <Text style={styles.metaText} numberOfLines={1}>
                        {author?.name ?? "A teacher"} · {readTimeLabel(blog.readMin)}
                      </Text>
                      {blog.read ? null : (
                        <View style={styles.newTag}>
                          <Text style={styles.newText}>New</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <Icon name="ArrowRight2" size={18} color={theme.colors.textMuted} variant="Bold" />
                </Pressable>
              </Animated.View>
            );
          })
        )}
      </Animated.ScrollView>
    </View>
  );
}
