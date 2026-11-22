import { BlogCard } from "@/components/feed/BlogCard";
import { NpcHead } from "@/components/feed/NpcHead";
import { PostCard } from "@/components/feed/PostCard";
import { useCast } from "@/components/feed/use-cast";
import { ScreenHeader, useHeaderBorder } from "@/components/layout";
import { Shrodi } from "@/components/mascot/Shrodi";
import { chatPalette } from "@/components/phone/chat-palette";
import { ChatHead, speakerFor } from "@/components/phone/ChatHead";
import { SHRODI_COLORS } from "@/components/mascot/shrodi-art";
import { NpcCover } from "@/components/npc/NpcCover";
import { coverColors } from "@/components/npc/npc-cover-art";
import { settle } from "@/components/motion/settle";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useStories } from "@/hooks/use-chats";
import { useFeed } from "@/hooks/use-feed";
import { usePullRefresh } from "@/hooks/use-pull-refresh";
import { CHAT_MASCOT_ID, type StoryEntry } from "@/services/chat-core";
import { contentRepository } from "@/services/content-db";
import { noteDateLabel } from "@/services/field-notes";
import { impactLight } from "@/services/haptics";
import {
  getContactTeacherIds,
  messageTeacher,
  restartThread,
  startStory,
  teacherHasThread,
} from "@/services/chats";
import { playSfx } from "@/services/sfx";
import {
  createStyles,
  fontFaces,
  useResponsiveLayout,
  useTheme,
} from "@/theme";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Pressable, RefreshControl, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * A teacher's profile, like a profile on a social feed: a cover of small pictures about what they teach, in the teacher's own colour, their
 * avatar over its edge, name and title, a short bio, three numbers (posts, blog pieces, what they teach)
 * and then two tabs: their posts and blog cards, newest first, with the same reactions as in the feed (read only, like the whole
 * feature: the learner can react and nothing else), and their chats: the story threads they have sent the learner (a free chat
 * is private and is not listed), each opening in the phone's Chats.
 *
 * Shrodi, the guide, has a profile too (`/npc/shrodi`): the same page with his orange cover of glasses, atoms and sparks, his round
 * picture, a short bio and a Message button that is always there; he has no posts, so there are no tabs or numbers, only the stories
 * he has sent.
 */

const SHRODI_BIO =
  "Hi, I'm Shrodi, a fox scientist and your guide in AtomIQ. I point you to your next lesson, explain things when you are stuck, and cheer you on all the way.";

type Tab = "posts" | "chats";

/** What a story row says under its title, and the icon it wears, by where the story stands. */
function storyLook(story: StoryEntry, now: number): { icon: string; status: string; hint: string | null } {
  const when = story.lastAt !== null ? noteDateLabel(story.lastAt, now) : null;
  switch (story.state) {
    case "locked":
      return { icon: "Lock", status: story.condition, hint: story.progress };
    case "ready":
      return { icon: "Play", status: "Unlocked · tap to start", hint: null };
    case "new":
      return { icon: "Sms", status: "New · tap to open", hint: null };
    case "playing":
      return { icon: "Messages2", status: "In progress · tap to open", hint: when };
    case "finished":
      return { icon: "Refresh", status: story.plays > 1 ? `Finished · played ${story.plays} times · tap to replay` : "Finished · tap to replay", hint: when };
  }
}

/**
 * One of the teacher's stories: a locked one says what unlocks it (and how far the learner is), an unlocked one starts the
 * chat, opens it, or, once it is finished, plays it again.
 */
function StoryRow({
  story,
  now,
  onPress,
}: {
  story: StoryEntry;
  now: number;
  onPress: (story: StoryEntry) => void;
}) {
  const { theme } = useTheme();
  const c = theme.colors;
  const locked = story.state === "locked";
  const fresh = story.state === "new" || story.state === "ready";
  const look = storyLook(story, now);
  return (
    <Pressable
      onPress={() => onPress(story)}
      accessibilityRole="button"
      accessibilityState={{ disabled: locked }}
      accessibilityLabel={`${story.title}. ${look.status}.${look.hint ? ` ${look.hint}.` : ""}`}
      accessibilityHint={locked ? "Locked" : story.state === "finished" ? "Plays the story again" : "Opens the story"}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 14,
        borderRadius: 16,
        backgroundColor: c.field,
        opacity: locked ? 0.75 : pressed ? 0.7 : 1,
      })}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: fresh ? c.guide : c.surfaceSoft,
        }}
      >
        <Icon name={look.icon} size={20} color={fresh ? c.onPrimary : c.textMuted} variant="Bold" />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text
          numberOfLines={1}
          style={{
            fontSize: 16,
            lineHeight: 21,
            ...fontFaces.heavy,
            color: locked ? c.textSecondary : c.text,
          }}
        >
          {story.title}
        </Text>
        <Text
          style={{
            fontSize: 13,
            lineHeight: 18,
            ...fontFaces.semibold,
            color: fresh ? c.guide : c.textMuted,
          }}
        >
          {look.status}
        </Text>
        {look.hint ? (
          <Text
            style={{
              fontSize: 12,
              lineHeight: 16,
              ...fontFaces.medium,
              color: c.textFaint,
            }}
          >
            {look.hint}
          </Text>
        ) : null}
      </View>
      {locked ? null : <Icon name="ArrowRight2" size={18} color={c.textFaint} variant="Bold" />}
    </Pressable>
  );
}

/** Shrodi's round picture is the app icon; it has the same ring in the page colour as a teacher's head. */
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
    bio: {
      fontSize: 16,
      lineHeight: 24,
      paddingTop: 10,
      ...fontFaces.medium,
      color: c.text,
    },
    message: { alignSelf: "flex-start", paddingTop: 14 },
    stats: { flexDirection: "row", gap: 28, paddingTop: 16 },
    stat: { gap: 1 },
    statValue: { fontSize: 20, ...fontFaces.heavy, color: c.text },
    statLabel: { fontSize: 13, ...fontFaces.semibold, color: c.textMuted },
    teaches: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      alignSelf: "flex-start",
      marginTop: 16,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: c.surfaceSoft,
    },
    teachesText: {
      flexShrink: 1,
      fontSize: 14,
      ...fontFaces.bold,
      color: c.text,
    },
    stories: {
      marginTop: 22,
      marginBottom: 10,
      fontSize: 12,
      letterSpacing: 0.8,
      textTransform: "uppercase",
      ...fontFaces.heavy,
      color: c.textMuted,
    },
    tabs: {
      flexDirection: "row",
      gap: 4,
      padding: 4,
      marginTop: 22,
      marginBottom: 6,
      borderRadius: 14,
      backgroundColor: c.surfaceSoft,
    },
    tab: {
      flex: 1,
      minHeight: 40,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 10,
      borderWidth: 2,
      borderColor: "transparent",
    },
    tabOn: { borderColor: c.border, backgroundColor: c.card },
    tabText: { fontSize: 14, ...fontFaces.heavy, color: c.textMuted },
    tabTextOn: { color: c.text },
    empty: {
      alignItems: "center",
      gap: 10,
      paddingTop: 36,
      paddingHorizontal: 12,
    },
    emptyText: {
      fontSize: 15,
      lineHeight: 22,
      textAlign: "center",
      ...fontFaces.medium,
      color: c.textMuted,
    },
    calm: {
      alignItems: "center",
      gap: 10,
      paddingTop: 48,
      paddingHorizontal: 12,
    },
    calmTitle: {
      fontSize: 22,
      textAlign: "center",
      ...fontFaces.heavy,
      color: c.text,
    },
  };
});

type FeedItem = ReturnType<typeof useFeed>["items"][number];
type Item = FeedItem | StoryEntry;

const StorySeparator = () => <View style={{ height: 10 }} />;

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
  const isShrodi = npcId === CHAT_MASCOT_ID;
  const npc = (npcId ? cast.get(npcId) : null) ?? null;
  const speaker = useMemo(() => speakerFor(npcId, cast), [npcId, cast]);
  const personName = isShrodi ? "Shrodi" : npc?.name;
  const [now, setNow] = useState(() => Date.now());
  const [pickedTab, setTab] = useState<Tab>("posts");
  // Shrodi has no posts: his page is only his stories
  const tab: Tab = isShrodi ? "chats" : pickedTab;
  /* Every story this teacher has, unlocked or not (a free chat is private and not listed here) */
  const { stories, loaded: storiesLoaded, refresh: refreshStories } = useStories(npcId);
  const opening = useRef(false);
  const openStory = useCallback(
    async (story: StoryEntry) => {
      // A locked story only says what unlocks it
      if (story.state === "locked") {
        void playSfx("ui.invalid");
        return;
      }
      if (opening.current) return;
      opening.current = true;
      try {
        let threadId = story.threadId;
        if (story.state === "ready") threadId = await startStory(story.nodeId, story.event);
        else if (story.state === "finished" && threadId) await restartThread(threadId);
        if (threadId) router.push(`/phone-apps/chat?thread=${encodeURIComponent(threadId)}`);
      } finally {
        opening.current = false;
      }
    },
    [router],
  );

  /* What this teacher teaches: the unit whose teacher they are. */
  const [unitTitle, setUnitTitle] = useState<string | null>(null);
  useEffect(() => {
    if (!npcId || isShrodi) return;
    let alive = true;
    contentRepository
      .getUnits()
      .then(
        (units) =>
          alive &&
          setUnitTitle(
            units.find((u) => u.teacherNpcId === npcId)?.title ?? null,
          ),
      )
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [npcId, isShrodi]);

  /* A teacher the learner has met and who has a chat can be messaged from here. */
  const [canMessage, setCanMessage] = useState(false);
  useEffect(() => {
    if (!npcId) return;
    let alive = true;
    void Promise.all([teacherHasThread(npcId), getContactTeacherIds()])
      // Shrodi is always in Contacts
      .then(
        ([has, met]) =>
          alive && setCanMessage(has && (isShrodi || met.includes(npcId))),
      )
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [npcId, isShrodi]);

  useFocusEffect(
    useCallback(() => {
      setNow(Date.now());
      void refresh();
      refreshStories();
    }, [refresh, refreshStories]),
  );
  const { refreshing, onRefresh, spinner } = usePullRefresh(refresh);

  const theirs = useMemo(
    () => (isShrodi ? [] : items.filter((i) => i.npcId === npcId)),
    [items, npcId, isShrodi],
  );
  const blogCount = theirs.filter((i) => i.blog).length;
  const postCount = theirs.length - blogCount;

  const frame = {
    width: "100%",
    maxWidth: contentMaxWidth,
    alignSelf: "center",
    paddingHorizontal: gutter,
  } as const;
  const castReady = cast.size > 0;

  if (castReady && !npc && !isShrodi) {
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

  // The Message button wears the teacher's colours (their cover's readable face, its lip and the text on it); Shrodi has the app's blue fur
  const messageColors = (() => {
    const outfit = isShrodi ? { color: SHRODI_COLORS.fur, shade: SHRODI_COLORS.furShade } : npc ? coverColors(npc.spec) : null;
    if (!outfit) return undefined;
    const p = chatPalette(outfit);
    return { face: p.face, lip: p.lip, label: p.faceOn };
  })();

  const header = (
    <Animated.View entering={settle(0)}>
      <NpcCover
        npcId={isShrodi ? CHAT_MASCOT_ID : npc?.id}
        outfit={
          isShrodi
            ? { color: SHRODI_COLORS.fur, shade: SHRODI_COLORS.furShade }
            : (npc ? coverColors(npc.spec) : {
                color: theme.colors.primary,
                shade: theme.colors.primary,
              })
        }
        height={BANNER}
      />
      <View style={styles.avatarRow}>
        {isShrodi ? (
          <View
            style={{
              width: AVATAR,
              height: AVATAR,
              borderRadius: AVATAR / 2,
              borderWidth: 3,
              borderColor: theme.colors.mapBackground,
              overflow: "hidden",
            }}
          >
            <ChatHead speaker={speaker} size={AVATAR - 6} />
          </View>
        ) : (
          <NpcHead npc={npc} size={AVATAR} ring />
        )}
      </View>
      <View style={styles.who}>
        <Text style={styles.name} accessibilityRole="header">
          {personName ?? " "}
        </Text>
        {isShrodi ? (
          <Text style={styles.title}>Your guide</Text>
        ) : npc?.title ? (
          <Text style={styles.title}>{npc.title}</Text>
        ) : null}
      </View>
      {isShrodi ? (
        <Text style={styles.bio}>{SHRODI_BIO}</Text>
      ) : npc?.bio ? (
        <Text style={styles.bio}>{npc.bio}</Text>
      ) : null}
      {canMessage && (npc || isShrodi) ? (
        <View style={styles.message}>
          <Button
            label="Message"
            size="compact"
            fullWidth={false}
            colors={messageColors}
            onPress={() =>
              void messageTeacher(npcId ?? "").then(
                (id) =>
                  id &&
                  router.push(
                    `/phone-apps/chat?thread=${encodeURIComponent(id)}`,
                  ),
              )
            }
            renderIcon={(color) => (
              <Icon name="Message" size={16} color={color} variant="Bold" />
            )}
            accessibilityLabel={`Message ${personName}`}
          />
        </View>
      ) : null}
      {isShrodi ? (
        <>
          <View
            style={styles.teaches}
            accessible
            accessibilityLabel="Guides you through every unit"
          >
            <Icon
              name="Map"
              size={16}
              color={theme.colors.textSecondary}
              variant="Bold"
            />
            <Text style={styles.teachesText} numberOfLines={2}>
              Guides you through every unit
            </Text>
          </View>
          <Text style={styles.stories} accessibilityRole="header">
            Stories
          </Text>
        </>
      ) : null}
      {isShrodi ? null : (
        <View style={styles.stats}>
          <View
            style={styles.stat}
            accessible
            accessibilityLabel={`${postCount} posts`}
          >
            <Text style={styles.statValue}>{postCount}</Text>
            <Text style={styles.statLabel}>Posts</Text>
          </View>
          <View
            style={styles.stat}
            accessible
            accessibilityLabel={`${blogCount} blog pieces`}
          >
            <Text style={styles.statValue}>{blogCount}</Text>
            <Text style={styles.statLabel}>Blog pieces</Text>
          </View>
        </View>
      )}
      {unitTitle ? (
        <View
          style={styles.teaches}
          accessible
          accessibilityLabel={`Teaches ${unitTitle}`}
        >
          <Icon
            name="Book"
            size={16}
            color={theme.colors.textSecondary}
            variant="Bold"
          />
          <Text style={styles.teachesText} numberOfLines={2}>
            Teaches {unitTitle}
          </Text>
        </View>
      ) : null}
      {/* The tab switch, as in the Reference Library and Field Notes */}
      {isShrodi ? null : (
        <View accessibilityRole="tablist" style={styles.tabs}>
          {(
            [
              { id: "posts", label: "Posts", count: theirs.length },
              { id: "chats", label: "Chats", count: stories.length },
            ] as const
          ).map((t) => {
            const on = t.id === tab;
            return (
              <Pressable
                key={t.id}
                onPress={() => {
                  if (on) return;
                  impactLight();
                  setTab(t.id);
                }}
                accessibilityRole="tab"
                accessibilityLabel={`${t.label}, ${t.count}`}
                accessibilityState={{ selected: on }}
                style={[styles.tab, on && styles.tabOn]}
              >
                <Text
                  numberOfLines={1}
                  style={[styles.tabText, on && styles.tabTextOn]}
                >
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={personName ?? "Profile"}
        onBack={() => router.back()}
        scrolled={scrolled}
      />
      <FlatList<Item>
        data={tab === "posts" ? theirs : stories}
        keyExtractor={(item) => ("nodeId" in item ? item.nodeId : item.id)}
        renderItem={({ item }) => {
          if ("nodeId" in item)
            return <StoryRow story={item} now={now} onPress={(story) => void openStory(story)} />;
          return item.blog ? (
            <BlogCard
              item={item}
              npc={npc}
              cast={cast}
              now={now}
              linkHead={false}
            />
          ) : (
            <PostCard
              item={item}
              npc={npc}
              cast={cast}
              now={now}
              linkHead={false}
            />
          );
        }}
        ItemSeparatorComponent={tab === "chats" ? StorySeparator : undefined}
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            {...spinner}
          />
        }
        contentContainerStyle={[
          frame,
          { paddingTop: 4, paddingBottom: insets.bottom + 32 },
        ]}
        ListHeaderComponent={header}
        ListEmptyComponent={
          tab === "chats" ? (
            storiesLoaded ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>
                  {personName
                    ? `${personName} has no stories to tell yet. ${isShrodi ? "He" : "They"} will have some soon.`
                    : ""}
                </Text>
              </View>
            ) : undefined
          ) : loading ? undefined : (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                {npc
                  ? `${npc.name} has not posted yet. Keep learning and they will.`
                  : ""}
              </Text>
            </View>
          )
        }
      />
    </View>
  );
}
