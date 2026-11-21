/**
 * A blog card in the feed (docs/features/NPC_FEED_SPEC.md §3): the same flat pattern as a post, kept compact. The
 * header row ("Ada wrote a blog piece", the time), then one soft row (a small cover picture, the title,
 * the hook and the reading time; the whole row opens the reader), then the reaction pill with the
 * "Liked by" line beside it and a divider. The cover is the figure, so there is no character beside it.
 * The header reads the whole card as one item; the row and the reaction controls are their own buttons.
 */

import { useRouter } from "expo-router";
import { memo } from "react";
import { Pressable, View } from "react-native";
import Animated from "react-native-reanimated";
import { useReducedMotion } from "@/components/motion/use-reduced-motion";

import { BlogCover } from "@/components/feed/BlogCover";
import { HeadLink } from "@/components/feed/HeadLink";
import { ReactionRow } from "@/components/feed/ReactionRow";
import { actionPhrase, blogHref, blogSpokenLabel, metaLine, reactionSpoken, readTimeLabel, relativeTime, relativeTimeSpoken } from "@/components/feed/feed-ui-core";
import { pushHref } from "@/components/feed/navigate";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import type { Npc } from "@/content/npcs";
import type { FeedItem } from "@/services/feed";
import { impactLight } from "@/services/haptics";
import { createStyles, fontFaces, useTheme } from "@/theme";
import { settle } from "@/components/motion/settle";

const COVER = 92;

const useStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    post: { paddingTop: 14, gap: 8 },
    head: { flexDirection: "row", alignItems: "center", gap: 12 },
    who: { flex: 1, gap: 2 },
    line1: { fontSize: 16, lineHeight: 20, ...fontFaces.regular, color: c.text },
    name: { ...fontFaces.heavy },
    line2: { fontSize: 14, ...fontFaces.medium, color: c.textMuted },
    /* One row: a small cover, then the title, the hook and the reading time. The whole panel opens the piece. */
    panel: { flexDirection: "row", alignItems: "center", gap: 14, padding: 10, paddingRight: 14, borderRadius: 20, backgroundColor: c.surfaceSoft },
    panelPressed: { opacity: 0.85 },
    cover: { width: COVER, height: COVER, borderRadius: 14, overflow: "hidden" },
    body: { flex: 1, gap: 3 },
    title: { fontSize: 17, lineHeight: 22, ...fontFaces.heavy, color: c.text },
    hook: { fontSize: 14, lineHeight: 19, ...fontFaces.medium, color: c.textMuted },
    time: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 },
    timeText: { fontSize: 13, ...fontFaces.semibold, color: c.textMuted },
    /* The same thin dashed line as between settings rows */
    divider: { marginTop: 2, borderTopWidth: 1, borderStyle: "dashed", borderColor: c.border },
  };
});

export interface BlogCardProps {
  item: FeedItem;
  /** The author, or `null` while the cast loads. */
  npc: Npc | null;
  cast: ReadonlyMap<string, Npc>;
  now: number;
  fresh?: boolean;
  /** The author's avatar opens their profile (default). Off on that teacher's own page. */
  linkHead?: boolean;
  /** Shrodi's tour lights this card's reaction pill (the first card on the Feed). */
}

export const BlogCard = memo(function BlogCard({ item, npc, cast, now, fresh = false, linkHead = true }: BlogCardProps) {
  const router = useRouter();
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const reduced = useReducedMotion();
  const blog = item.blog;
  if (!blog) return null;
  const name = npc?.name ?? "A teacher";
  const action = actionPhrase({ blog: true });
  const open = () => {
    impactLight();
    pushHref(router, blogHref(blog.id));
  };

  return (
    <Animated.View entering={fresh && !reduced ? settle(0) : undefined}>
      <View style={styles.post}>
        <View style={styles.head}>
          <HeadLink npc={npc} size={44} plain={!linkHead} />
          <View
            style={styles.who}
            accessible
            accessibilityLabel={blogSpokenLabel({
            name,
            when: relativeTimeSpoken(item.createdAt, now),
            title: blog.title,
            hook: blog.hook,
            readMin: blog.readMin,
            reactions: reactionSpoken(item.reactions),
          })}
          >
            <Text style={styles.line1} numberOfLines={2}>
              <Text style={styles.name}>{name}</Text> {action}
            </Text>
            <Text style={styles.line2} numberOfLines={1}>
              {metaLine(relativeTime(item.createdAt, now), npc?.title ?? "")}
            </Text>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [styles.panel, pressed ? styles.panelPressed : null]}
          onPress={open}
          accessibilityRole="button"
          accessibilityLabel={`Read ${blog.title}`}
        >
          <View style={styles.cover}>
            <BlogCover cover={blog.cover} width={COVER} height={COVER} art={64} />
          </View>
          <View style={styles.body} accessible={false} importantForAccessibility="no-hide-descendants">
            <Text style={styles.title} numberOfLines={2}>
              {blog.title}
            </Text>
            <Text style={styles.hook} numberOfLines={2}>
              {blog.hook}
            </Text>
            <View style={styles.time}>
              <Icon name="Clock" size={14} color={theme.colors.textMuted} variant="Linear" />
              <Text style={styles.timeText}>{readTimeLabel(blog.readMin)}</Text>
            </View>
          </View>
        </Pressable>

        <ReactionRow target={item.target} summary={item.reactions} cast={cast} commentCount={blog.commentCount} onViewComments={open} />
        <View style={styles.divider} accessible={false} importantForAccessibility="no-hide-descendants" />
      </View>
    </Animated.View>
  );
});
