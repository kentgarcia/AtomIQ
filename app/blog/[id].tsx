import { LipCard } from "@/components/community/BandCard";
import { BlogBlocks } from "@/components/feed/BlogBlocks";
import { BlogCover } from "@/components/feed/BlogCover";
import { HeadLink } from "@/components/feed/HeadLink";
import { ReactionRow } from "@/components/feed/ReactionRow";
import { commentChipTarget, commentSpokenLabel, readTimeLabel } from "@/components/feed/feed-ui-core";
import { openFeedTarget } from "@/components/feed/navigate";
import { useCast } from "@/components/feed/use-cast";
import { ScreenHeader, useHeaderBorder } from "@/components/layout/screen-header";
import { Shrodi } from "@/components/mascot/Shrodi";
import { settle } from "@/components/motion/settle";
import { settleDelay } from "@/components/motion/settle-core";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { ReadAloudButton } from "@/components/ui/read-aloud-button";
import { Text } from "@/components/ui/text";
import { getBlogView, markBlogRead, subscribeFeed, type BlogView } from "@/services/feed";
import { readAloudText } from "@/services/blog-core";
import { impactLight, impactMedium } from "@/services/haptics";
import { openExternalUrl } from "@/services/open-url";
import { createStyles, fontFaces, useResponsiveLayout, useTheme, withAlpha } from "@/theme";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { playSfx } from "@/services/sfx";

/**
 * The blog reader (docs/NPC_FEED_SPEC.md §4.3): one piece in one calm column. The cover, the title,
 * "by Ada" and the reading time, the body blocks, Read Aloud, the sources, the reaction row, and under
 * it the NPC comments once the piece has been opened. The thread is read only: there is no text input
 * anywhere in this feature (`npm run check:feed`). A piece that is not unlocked (a deep link) shows a
 * calm "Not unlocked yet" screen.
 */

const useStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    container: { flex: 1, backgroundColor: c.mapBackground },
    content: { paddingTop: 12, gap: 22 },
    /* The cover is flat on the page, like the Feed: a tinted plate, no card */
    cover: { borderRadius: 24, overflow: "hidden" },
    titleBlock: { gap: 14 },
    title: { fontSize: 30, lineHeight: 36, ...fontFaces.black, color: c.text },
    byline: { flexDirection: "row", alignItems: "center", gap: 12 },
    bylineCopy: { flex: 1, gap: 2 },
    bylineName: { fontSize: 16, lineHeight: 20, ...fontFaces.heavy, color: c.text },
    bylineRole: { fontSize: 14, ...fontFaces.medium, color: c.textMuted },
    timePill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: withAlpha(c.primary, 0.14) },
    timeText: { fontSize: 13, ...fontFaces.heavy, color: c.text },
    /* The same thin dashed line as between feed posts */
    divider: { borderTopWidth: 1, borderStyle: "dashed", borderColor: c.border },
    sectionLabel: { fontSize: 12, letterSpacing: 0.8, textTransform: "uppercase", ...fontFaces.heavy, color: c.textMuted },
    sources: { gap: 2 },
    source: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 48 },
    sourceText: { flex: 1, fontSize: 14, lineHeight: 20, ...fontFaces.medium, color: c.textSecondary },
    comments: { gap: 16 },
    comment: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
    commentBubble: { flex: 1, gap: 4, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 20, borderTopLeftRadius: 6, backgroundColor: c.surfaceSoft },
    commentName: { fontSize: 14, ...fontFaces.heavy, color: c.text },
    commentText: { fontSize: 16, lineHeight: 23, ...fontFaces.medium, color: c.text },
    commentChip: { alignSelf: "flex-start", marginTop: 6 },
    reactions: { paddingHorizontal: 2 },
    calm: { alignItems: "center", gap: 10, paddingVertical: 24, paddingHorizontal: 8 },
    calmTitle: { fontSize: 22, textAlign: "center", ...fontFaces.heavy, color: c.text },
    calmText: { fontSize: 15, lineHeight: 22, textAlign: "center", ...fontFaces.medium, color: c.textMuted },
  };
});

export default function BlogReaderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const blogId = Array.isArray(id) ? id[0] : id;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const { contentMaxWidth, gutter } = useResponsiveLayout();
  const cast = useCast();
  const { scrolled, onScroll, scrollEventThrottle } = useHeaderBorder();

  const [view, setView] = useState<BlogView | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [opened, setOpened] = useState(false);
  const marked = useRef<string | null>(null);

  /* Load the piece, and again when reactions change. */
  useEffect(() => {
    if (!blogId) return;
    let alive = true;
    const load = () =>
      getBlogView(blogId)
        .then((v) => {
          if (alive) setView(v);
        })
        .catch((error) => console.warn("[blog] load", error))
        .finally(() => alive && setLoaded(true));
    void load();
    const stop = subscribeFeed(() => void load());
    return () => {
      alive = false;
      stop();
    };
  }, [blogId]);

  /* Opening an unlocked piece records the read (once); comments show after that. */
  const unlocked = view?.unlocked === true;
  useEffect(() => {
    if (!blogId || !unlocked || marked.current === blogId) return;
    marked.current = blogId;
    void markBlogRead(blogId).then(() => setOpened(true));
  }, [blogId, unlocked]);

  const frame = { width: "100%", maxWidth: contentMaxWidth, alignSelf: "center", paddingHorizontal: gutter } as const;

  /* A piece that is not unlocked says "not yet" once, as the screen shows */
  const lockedScreen = loaded && !!view && !view.unlocked;
  useEffect(() => {
    if (lockedScreen) void playSfx("ui.lock");
  }, [lockedScreen]);

  /* Not found, or not unlocked yet */
  if (!loaded || !view || !view.unlocked) {
    const missing = loaded && !view;
    return (
      <View style={styles.container}>
        <ScreenHeader title="Blog" onBack={() => router.back()} />
        <View style={[frame, { paddingTop: 8 }]}>
          {!loaded ? (
            <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 32 }} accessibilityLabel="Loading" />
          ) : (
            <LipCard faceStyle={styles.calm}>
              <Shrodi mood="idle" size={96} />
              <Text style={styles.calmTitle} accessibilityRole="header">
                {missing ? "We could not find this piece" : "Not unlocked yet"}
              </Text>
              <Text style={styles.calmText}>
                {missing ? "It may have moved. You can find the pieces you have unlocked in Discover." : "Keep learning and your teachers will share it with you."}
              </Text>
              <Button label="Back to Discover" variant="secondary" size="compact" fullWidth={false} onPress={() => router.back()} />
            </LipCard>
          )}
        </View>
      </View>
    );
  }

  const { blog, comments, references, reactions, lockedLessonIds } = view;
  const author = cast.get(blog.npcId) ?? null;
  const showComments = (opened || view.readAt !== null) && comments.length > 0;

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Blog"
        onBack={() => router.back()}
        scrolled={scrolled}
        right={
          <ReadAloudButton
            ownerId={`blog:${blog.id}`}
            subject="blog piece"
            size={40}
            appearance="flat"
            accent={theme.colors.primaryDark}
            onStart={impactMedium}
            text={() => readAloudText(blog.title, blog.blocks)}
          />
        }
      />

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
        contentContainerStyle={[styles.content, frame, { paddingBottom: insets.bottom + 32 }]}
      >
        <Animated.View entering={settle(settleDelay(0))} style={styles.cover}>
          <BlogCover cover={blog.cover} height={200} art={140} />
        </Animated.View>

        <Animated.View entering={settle(settleDelay(1))} style={styles.titleBlock}>
          <Text style={styles.title} accessibilityRole="header">
            {blog.title}
          </Text>
          <View style={styles.byline}>
            <HeadLink npc={author} size={40} />
            <View style={styles.bylineCopy} accessible accessibilityLabel={`By ${author?.name ?? "a teacher"}, ${readTimeLabel(blog.readMin)}`}>
              <Text style={styles.bylineName} numberOfLines={1}>
                {author?.name ?? "A teacher"}
              </Text>
              {author?.title ? (
                <Text style={styles.bylineRole} numberOfLines={1}>
                  {author.title}
                </Text>
              ) : null}
            </View>
            <View style={styles.timePill}>
              <Icon name="Clock" size={14} color={theme.colors.text} variant="Linear" />
              <Text style={styles.timeText}>{readTimeLabel(blog.readMin)}</Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={settle(settleDelay(2))}>
          <BlogBlocks blocks={blog.blocks} author={author} />
        </Animated.View>

        <View style={styles.divider} accessible={false} importantForAccessibility="no-hide-descendants" />

        {references.length > 0 ? (
          <View style={styles.sources}>
            <Text style={styles.sectionLabel} accessibilityRole="header">
              Sources
            </Text>
            {references.map((ref) => (
              <Pressable
                key={ref.id}
                style={styles.source}
                disabled={!ref.url}
                accessibilityRole={ref.url ? "link" : "text"}
                accessibilityLabel={`${ref.title}, ${ref.publisher}`}
                onPress={async () => {
                  impactLight();
                  const ok = await openExternalUrl(ref.url);
                  if (!ok) Alert.alert("Error", "Could not open link");
                }}
              >
                <Icon name="Link" size={16} color={theme.colors.primary} variant="Bold" />
                <Text style={styles.sourceText} numberOfLines={3}>
                  {ref.publisher}: {ref.title}
                </Text>
                {ref.url ? <Icon name="ArrowRight2" size={14} color={theme.colors.textMuted} /> : null}
              </Pressable>
            ))}
          </View>
        ) : null}

        <View style={styles.reactions}>
          <ReactionRow target={{ type: "blog", id: blog.id }} summary={reactions} cast={cast} />
        </View>

        {showComments ? (
          <View style={styles.comments}>
            <View style={styles.divider} accessible={false} importantForAccessibility="no-hide-descendants" />
            <Text style={styles.sectionLabel} accessibilityRole="header">
              Comments · {comments.length}
            </Text>
            {comments.map((comment) => {
              const npc = cast.get(comment.npcId) ?? null;
              const chip = commentChipTarget(comment.chip, lockedLessonIds);
              return (
                <View key={comment.id} style={styles.comment}>
                  <HeadLink npc={npc} size={40} />
                  <View style={styles.commentBubble}>
                    <View accessible accessibilityLabel={commentSpokenLabel(npc?.name ?? "A teacher", comment.text)} style={{ gap: 4 }}>
                      <Text style={styles.commentName}>{npc?.name ?? "A teacher"}</Text>
                      <Text style={styles.commentText}>{comment.text}</Text>
                    </View>
                    {chip ? (
                      <Button
                        label={chip.label}
                        variant="secondary"
                        size="compact"
                        fullWidth={false}
                        style={styles.commentChip}
                        disabled={chip.locked}
                        renderIcon={chip.locked ? (color) => <Icon name="Lock" size={16} color={color} variant="Bold" /> : undefined}
                        accessibilityLabel={chip.locked ? "Lesson locked. Finish the lessons before it to open it." : undefined}
                        onPress={() => {
                          impactLight();
                          openFeedTarget(router, chip.target);
                        }}
                      />
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}
      </Animated.ScrollView>
    </View>
  );
}
