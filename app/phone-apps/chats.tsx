/**
 * Chats (docs/PHONE_SPEC.md §5.2): the conversations on the phone, under a plain red header. Every thread, Shrodi's too, is one of two things: a story a trigger unlocked (it has a subject line and can be replayed), or a
 * free chat the learner started with the pen button. A teacher can have many of them, the latest message first. Every thread is
 * a filled card, like the cards on Contacts: the sender's round picture, the name, the subject, the last line and the day, and a
 * blue dot (with the line in bold) while it is unread. Swipe a thread to the left to show its blue Archive action (swiping only shows
 * it, a tap on it archives): the thread leaves the list and waits under the archive button in the header, where the same swipe says
 * Unarchive. Replying in an archived thread, or replaying it, brings it back.
 * Replies are always taps, never typing.
 */

import { useCast } from "@/components/feed/use-cast";
import { settle } from "@/components/motion/settle";
import { ChatButton, ChatFrame, ChatTitle } from "@/components/phone/ChatFrame";
import { ChatHead, speakerFor } from "@/components/phone/ChatHead";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useChatList } from "@/hooks/use-chats";
import { setThreadArchived } from "@/services/chats";
import { noteDateLabel } from "@/services/field-notes";
import { createStyles, fontFaces, useResponsiveLayout, useTheme } from "@/theme";
import { useFocusEffect, useRouter } from "expo-router";
import { playSfx } from "@/services/sfx";
import React, { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { Pressable, ScrollView, View } from "react-native";
import ReanimatedSwipeable, { type SwipeableMethods } from "react-native-gesture-handler/ReanimatedSwipeable";
import Animated, { LinearTransition } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const FACE = 52;
const PEN = 60;
const ACTION_W = 92;
/** The card whose action is showing; swiping another closes it. */
const openCard: { current: SwipeableMethods | null } = { current: null };

/** A card that slides left to show its one action: Archive (or Unarchive). Swiping only shows it; the learner taps it. Only one card stays open. */
function SwipeCard({ children, name, archived, onToggle, actionStyle, textStyle }: { children: ReactNode; name: string; archived: boolean; onToggle: () => void; actionStyle: object; textStyle: object }) {
  const c = useTheme().theme.colors;
  const ref = useRef<SwipeableMethods>(null);
  return (
    <ReanimatedSwipeable
      ref={ref}
      friction={2}
      rightThreshold={ACTION_W * 0.4}
      overshootRight={false}
      onSwipeableOpenStartDrag={() => {
        if (openCard.current && openCard.current !== ref.current) openCard.current.close();
        openCard.current = ref.current;
      }}
      renderRightActions={() => (
        <Pressable
          onPress={() => {
            ref.current?.close();
            onToggle();
          }}
          accessibilityRole="button"
          accessibilityLabel={archived ? `Move ${name} back to Chats` : `Archive the chat with ${name}`}
          style={actionStyle}
        >
          <Icon name={archived ? "ArchiveMinus" : "Archive"} size={24} color={c.onPrimary} variant="Bold" />
          <Text style={textStyle}>{archived ? "Unarchive" : "Archive"}</Text>
        </Pressable>
      )}
    >
      {children}
    </ReanimatedSwipeable>
  );
}

export default function ChatsScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const c = theme.colors;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { contentMaxWidth } = useResponsiveLayout();
  const cast = useCast();
  const { rows, loaded, refresh } = useChatList();
  const [now, setNow] = useState(() => Date.now());
  useFocusEffect(
    useCallback(() => {
      setNow(Date.now());
      refresh();
    }, [refresh]),
  );

  const [showArchived, setShowArchived] = useState(false);
  const active = rows.filter((r) => !r.archived);
  const archivedRows = rows.filter((r) => r.archived);
  const shownRows = showArchived ? archivedRows : active;
  // An archived thread is out of sight, so its unread messages do not count here
  const unreadTotal = active.reduce((n, r) => n + r.unread, 0);

  const archive = (threadId: string, archived: boolean) => {
    openCard.current = null;
    if (archived) void playSfx("chat.archive");
    void setThreadArchived(threadId, archived);
    // The last archived thread brought back: go back to the main list
    if (!archived && archivedRows.length === 1) setShowArchived(false);
  };

  /** One thread: the sender's round picture, the name and last line, and on the right the day (and a blue dot while unread). */
  const letter = (key: string, stamp: ReactNode, name: string, subject: string | null, line: string, when: string | null, unread: boolean, label: string, onPress: () => void, delay: number, swipe?: { archived: boolean; onToggle: () => void }) => {
    const card = (
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={styles.letter}>
        <View style={styles.face} accessible={false} importantForAccessibility="no-hide-descendants">
          {stamp}
        </View>
        <View style={styles.text}>
          <Text style={[styles.name, unread && styles.nameUnread]} numberOfLines={1}>
            {name}
          </Text>
          {subject ? (
            <Text style={styles.subject} numberOfLines={1}>
              {subject}
            </Text>
          ) : null}
          <Text style={[styles.last, unread && styles.lastUnread]} numberOfLines={2}>
            {line}
          </Text>
        </View>
        <View style={styles.side}>
          {when !== null ? <Text style={styles.postmark}>{when}</Text> : null}
          {unread ? <View style={styles.dot} accessible={false} /> : null}
        </View>
      </Pressable>
    );
    return (
      <Animated.View key={key} entering={settle(delay)} layout={LinearTransition.duration(200)}>
        {swipe ? (
          <SwipeCard name={name} archived={swipe.archived} onToggle={swipe.onToggle} actionStyle={styles.action} textStyle={styles.actionText}>
            {card}
          </SwipeCard>
        ) : (
          card
        )}
      </Animated.View>
    );
  };

  return (
    <ChatFrame
      left={<ChatButton icon="ArrowLeft2" label="Back to the phone" onPress={() => { void playSfx("phone.app-close"); if (router.canGoBack()) router.back(); else router.replace("/(tabs)/phone"); }} />}
      center={<ChatTitle subtitle={showArchived ? `${archivedRows.length} archived` : unreadTotal > 0 ? `${unreadTotal} unread` : undefined}>{showArchived ? "Archived" : "Chats"}</ChatTitle>}
      right={
        <ChatButton
          icon={showArchived ? "Messages2" : "Archive"}
          label={showArchived ? "Back to Chats" : `Archived chats, ${archivedRows.length}`}
          onPress={() => {
            openCard.current?.close();
            openCard.current = null;
            setShowArchived((v) => !v);
          }}
        />
      }
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ width: "100%", maxWidth: contentMaxWidth, alignSelf: "center", paddingHorizontal: 16, paddingTop: 16, paddingBottom: insets.bottom + PEN + 40, gap: 12 }}
      >
        {shownRows.map((row, i) => {
          const speaker = speakerFor(row.npcId, cast);
          const name = speaker?.name ?? "Teacher";
          const line = row.last === null ? "Say hello" : row.lastFromMe ? `You: ${row.last}` : row.last;
          const unread = row.unread > 0;
          // A story shows its subject; a free chat is just the name
          const subject = row.origin === "event" ? row.title : null;
          return letter(
            row.threadId,
            <ChatHead speaker={speaker} size={FACE} />,
            name,
            subject,
            line,
            row.lastAt !== null ? noteDateLabel(row.lastAt, now) : null,
            unread,
            `${name}. ${subject ? `${subject}. ` : ""}${line}.${unread ? ` ${row.unread} unread.` : ""} Opens the chat.`,
            () => router.push(`/phone-apps/chat?thread=${encodeURIComponent(row.threadId)}`),
            60 * (i + 1),
            { archived: row.archived, onToggle: () => archive(row.threadId, !row.archived) },
          );
        })}
        {loaded && !showArchived && active.length === 0 ? <Text style={styles.note}>Finish a lesson and its teacher will message you here. You can also start a chat with the pen button.</Text> : null}
        {showArchived && archivedRows.length === 0 ? <Text style={styles.note}>Nothing is archived. Swipe a chat to the left and tap Archive to put it here.</Text> : null}
      </ScrollView>

      {/* New chat: a round pen on a round lip (a second circle 5 dp lower), so the shadow follows the curve */}
      <Pressable
        onPress={() => router.push("/phone-apps/new-chat")}
        accessibilityRole="button"
        accessibilityLabel="Start a new chat"
        style={{ position: "absolute", right: 20, bottom: insets.bottom + 16, width: PEN, height: PEN + 5 }}
      >
        {({ pressed }) => (
          <>
            <View style={{ position: "absolute", left: 0, top: 5, width: PEN, height: PEN, borderRadius: PEN / 2, backgroundColor: c.primaryDark }} />
            <View style={{ position: "absolute", left: 0, top: pressed ? 5 : 0, width: PEN, height: PEN, borderRadius: PEN / 2, alignItems: "center", justifyContent: "center", backgroundColor: c.primary }}>
              <Icon name="Edit2" size={26} color={c.onPrimary} variant="Bold" />
            </View>
          </>
        )}
      </Pressable>
    </ChatFrame>
  );
}

const makeStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    letter: { flexDirection: "row", alignItems: "center", gap: 14, padding: 14, borderRadius: 16, backgroundColor: c.field },
    face: { width: FACE, height: FACE, borderRadius: FACE / 2, alignItems: "center", justifyContent: "center" },
    dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: c.guide },
    text: { flex: 1, gap: 2 },
    name: { fontSize: 17, ...fontFaces.heavy, color: c.text },
    subject: { fontSize: 14, lineHeight: 19, ...fontFaces.heavy, color: c.guideLip },
    nameUnread: { color: c.text },
    last: { fontSize: 14, lineHeight: 20, ...fontFaces.medium, color: c.textMuted },
    lastUnread: { ...fontFaces.heavy, color: c.text },
    side: { alignItems: "flex-end", justifyContent: "space-between", gap: 8, alignSelf: "stretch", paddingVertical: 2 },
    postmark: { fontSize: 12, lineHeight: 16, ...fontFaces.heavy, color: c.textMuted },
    // the action behind a swiped card: the card's own height, rounded like it
    action: { width: ACTION_W, marginLeft: 8, borderRadius: 16, alignItems: "center", justifyContent: "center", gap: 4, backgroundColor: c.guide },
    actionText: { fontSize: 13, lineHeight: 17, ...fontFaces.heavy, color: c.onPrimary },
    note: { marginTop: 8, fontSize: 14, lineHeight: 20, ...fontFaces.medium, color: c.textMuted },
  };
});
