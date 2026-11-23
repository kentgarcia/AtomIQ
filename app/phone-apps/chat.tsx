/**
 * One thread (docs/features/PHONE_SPEC.md §5.2): a teacher's lines on the left, the replies the learner tapped on the right. A long message
 * is several short bubbles that arrive one after another, each after a beat of typing dots, as if they were chatting. The replies
 * sit under the last message, centered: tapping one sends it (it flies in as a blue bubble, a sticker pops, a reaction lands on
 * the teacher's last bubble) and the teacher answers with the next authored node. There is no text box: a chip, a sticker or a
 * reaction (AtomIQ's own pictures, `chat-art.ts`). When a thread ends, a divider says so, with "No more replies" and a Replay
 * button. A reply can also open something (the next lesson, a Myth Buster round, an AtomDex entry, a phone app). The history is
 * kept on the device. Drawn like a messenger under a header that is the teacher's own cover fading into the page, with bubbles and reply buttons in its colours: the teacher's name over their first bubble
 * and their round picture beside the last, filled bubbles, the learner's replies as blue bubbles, and the subject line of a story
 * across the top.
 */

import { coverColors } from "@/components/npc/npc-cover-art";
import { chatPalette } from "@/components/phone/chat-palette";
import { ChatButton, ChatFrame, ChatTitle } from "@/components/phone/ChatFrame";
import { speakerFor } from "@/components/phone/ChatHead";
import { ChatPaletteProvider, LinkButton, MeBubble, NpcBubble, ReactButton, ReplayButton, ReplyPill, RewardLine, StickerBubble, StickerButton, SystemLine, TypingBubble } from "@/components/phone/ChatBubble";
import { settle } from "@/components/motion/settle";
import { useCast } from "@/components/feed/use-cast";
import { Shrodi } from "@/components/mascot/Shrodi";
import { SHRODI_COLORS } from "@/components/mascot/shrodi-art";
import { Text } from "@/components/ui/text";
import { CHAT_MASCOT_ID, isLinkReply, linkInfo, pillsOf, reactionsOf, replyTypeOf, systemOf, type ChatMessage } from "@/services/chat-core";
import { claimStoryReward, openThread, restartThread, routeForAction, sendReply, subscribeChats, type ThreadView } from "@/services/chats";
import { playSfx } from "@/services/sfx";
import { emitTutorial } from "@/services/tutorial";
import { TOUR_STORY_EVENT } from "@/services/tutorial-core";
import { createStyles, fontFaces, useResponsiveLayout, useTheme } from "@/theme";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, ScrollView, View, type ScrollViewInstance } from "react-native";
import Animated, { FadeOut } from "react-native-reanimated";
import { useReducedMotion } from "@/components/motion/use-reduced-motion";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** How long the typing dots show before a bubble: a beat, longer for a longer bubble (never a wait). */
const typingMs = (text: string) => (systemOf(text) ? SYSTEM_BEAT_MS : Math.min(450 + text.length * 14, 1600));
/** A system line has no typing dots: the thread just pauses a beat, then the note appears. */
const SYSTEM_BEAT_MS = 800;

export default function ChatThreadScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { contentMaxWidth } = useResponsiveLayout();
  const reduced = useReducedMotion();
  const params = useLocalSearchParams<{ thread?: string }>();
  const threadId = Array.isArray(params.thread) ? params.thread[0] : params.thread;
  const cast = useCast();

  const [view, setView] = useState<ThreadView | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading");
  // The teacher's bubbles that are saved but not shown yet, oldest first: they arrive one at a time, each after typing dots
  const [queue, setQueue] = useState<string[]>([]);
  // Messages from this index on animate in; what was already there when the thread opened does not
  const [freshFrom, setFreshFrom] = useState<number | null>(null);
  // A tapped reply is on its way: the replies are put away at once
  const [sending, setSending] = useState(false);
  const busy = useRef(false);
  const scroller = useRef<ScrollViewInstance>(null);

  const speaker = useMemo(() => speakerFor(view?.thread.npcId, cast), [view?.thread.npcId, cast]);
  // The conversation's colours are the teacher's cover (Shrodi has the app's blue)
  const cover = useMemo(() => (speaker ? { npcId: speaker.npc?.id ?? CHAT_MASCOT_ID, outfit: speaker.npc ? coverColors(speaker.npc.spec) : { color: SHRODI_COLORS.fur, shade: SHRODI_COLORS.furShade } } : undefined), [speaker]);
  const palette = useMemo(() => (cover ? chatPalette(cover.outfit) : null), [cover]);

  const load = useCallback(async () => {
    if (!threadId) return;
    const v = await openThread(threadId);
    if (!v) return setState("missing");
    setView(v);
    // The first load shows the history at once; bubbles that arrived unread play one by one, and only what arrives later animates in
    setFreshFrom((from) => from ?? (reduced ? v.messages.length : v.messages.length - v.fresh.length));
    if (!reduced && v.fresh.length > 0) setQueue((q) => [...q, ...v.fresh.filter((id) => !q.includes(id))]);
    setState("ready");
  }, [threadId, reduced]);

  useEffect(() => {
    void load();
    return subscribeChats(() => void load());
  }, [load]);

  // A story pays its diamonds the first time it is opened, once: the claim is kept on the thread, so a replay never pays again
  const [reward, setReward] = useState<number | null>(null);
  const unclaimed = view?.thread.origin === "event" && view.thread.rewardClaimed === false;
  // Paying notifies the chats, which reloads the thread as claimed: this guard (not an effect cleanup) keeps one claim per screen
  const claimTried = useRef<string | null>(null);
  useEffect(() => {
    if (!unclaimed || !threadId || claimTried.current === threadId) return;
    claimTried.current = threadId;
    void claimStoryReward(threadId).then((paid) => {
      if (paid <= 0) return;
      setReward(paid);
      void playSfx("reward.coin");
    });
  }, [unclaimed, threadId]);

  // Shrodi's first story is the tour's last stop, however the learner got here (the list, Contacts, a link)
  const tourStory = view?.thread.npcId === CHAT_MASCOT_ID && view.thread.event === TOUR_STORY_EVENT;
  useEffect(() => {
    if (tourStory) emitTutorial("story-thread-opened");
  }, [tourStory]);

  // Reveal the next waiting bubble after its typing beat
  useEffect(() => {
    if (queue.length === 0 || !view) return;
    const next = view.messages.find((m) => m.id === queue[0]);
    const timer = setTimeout(
      () => {
        setQueue((q) => q.slice(1));
        // a system line has no sound of its own: it is a quiet note, not a message arriving
        if (!next || !systemOf(next.text)) void playSfx("chat.incoming");
        if (next) AccessibilityInfo.announceForAccessibility?.(systemOf(next.text) ?? next.text);
      },
      typingMs(next?.text ?? ""),
    );
    return () => clearTimeout(timer);
  }, [queue, view]);

  const typing = queue.length > 0;
  // The typing dots show before each waiting bubble (not before a system line, which only pauses): one soft sound as each beat begins
  const waitingFor = queue[0];
  const waitingText = waitingFor !== undefined ? view?.messages.find((m) => m.id === waitingFor)?.text : undefined;
  const dots = typing && !(waitingText !== undefined && systemOf(waitingText));
  useEffect(() => {
    if (waitingFor !== undefined && !(waitingText !== undefined && systemOf(waitingText))) void playSfx("chat.typing");
  }, [waitingFor, waitingText]);
  const shown: ChatMessage[] = useMemo(() => (view ? view.messages.filter((m) => !queue.includes(m.id)) : []), [view, queue]);
  const reactions = useMemo(() => reactionsOf(shown), [shown]);
  const current = view?.current ?? null;
  const ended = !typing && (view?.thread.ended === true || (current !== null && pillsOf(current).length === 0));
  const replies = typing || ended || sending ? [] : pillsOf(current).map((reply, index) => ({ reply, index }));
  // A link only opens a page: it is not a reply, so it has its own kind of button above the real replies
  const links = replies.filter((r) => isLinkReply(r.reply));
  const real = replies.filter((r) => !isLinkReply(r.reply));
  const chips = real.filter((r) => replyTypeOf(r.reply) === "text");
  const stickers = real.filter((r) => replyTypeOf(r.reply) === "emoji");
  const reacts = real.filter((r) => replyTypeOf(r.reply) === "react");
  const story = view?.thread.origin === "event";
  // The story ends: its "No more replies." divider shows (not when an already finished thread is opened)
  const wasEnded = useRef<boolean | null>(null);
  useEffect(() => {
    if (state !== "ready") return;
    if (wasEnded.current === null) {
      wasEnded.current = ended;
      return;
    }
    if (ended && !wasEnded.current) void playSfx("chat.end");
    wasEnded.current = ended;
  }, [ended, state]);

  /** A link: go to its page. Nothing is sent, and the replies stay. */
  const onLink = async (index: number) => {
    const action = current?.replies[index]?.action;
    if (!action || !view || typing) return;
    void playSfx("ui.select");
    router.push((await routeForAction(action, view.thread.npcId)) as never);
  };

  const onReply = async (index: number) => {
    if (!threadId || busy.current || typing) return;
    busy.current = true;
    setSending(true);
    try {
      // A sticker or a reaction lands with its own sound; a text chip is a sent message
      const type = replyTypeOf(pillsOf(current)[index]);
      void playSfx(type === "text" ? "chat.send" : "chat.sticker");
      const result = await sendReply(threadId, index);
      if (!result) return;
      setView(result.view);
      if (!reduced && result.view.fresh.length > 0) setQueue((q) => [...q, ...result.view.fresh]);
      if (result.action && view) router.push((await routeForAction(result.action, view.thread.npcId)) as never);
    } finally {
      busy.current = false;
      setSending(false);
    }
  };

  const onReplay = async () => {
    if (!threadId || busy.current) return;
    busy.current = true;
    try {
      void playSfx("ui.select");
      const v = await restartThread(threadId);
      if (!v) return;
      setQueue([]);
      setView(v);
      setFreshFrom(0);
      if (!reduced) setQueue(v.fresh);
    } finally {
      busy.current = false;
    }
  };

  const back = () => (router.canGoBack() ? router.back() : router.replace("/phone-apps/chats"));
  const left = <ChatButton icon="ArrowLeft2" label="Back to Chats" onPress={back} />;
  // The subtitle: how many letters the teacher has written in this thread
  const sent = shown.filter((m) => m.sender !== "me" && !systemOf(m.text)).length;

  if (!threadId || state === "missing") {
    return (
      <ChatFrame left={left} center={<ChatTitle>Chat</ChatTitle>}>
        <View style={styles.calm}>
          <Shrodi mood="idle" size={96} />
          <Text style={styles.calmText}>This chat is not here.</Text>
        </View>
      </ChatFrame>
    );
  }

  // A run is the messages in a row from one speaker (a reaction is not a message of its own)
  const bubbles = shown.filter((m) => m.kind !== "react");

  return (
    <ChatFrame
      left={left}
      cover={cover}
      center={<ChatTitle subtitle={sent === 1 ? "1 letter" : `${sent} letters`}>{speaker?.name ?? "Chat"}</ChatTitle>}
    >
      <ChatPaletteProvider value={palette}>
      <ScrollView
        ref={scroller}
        onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: freshFrom !== null })}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ width: "100%", maxWidth: contentMaxWidth, alignSelf: "center", paddingHorizontal: 16, paddingTop: 20, paddingBottom: insets.bottom + 28 }}
      >
        {story && view ? (
          <View style={styles.subject} accessible accessibilityRole="header" accessibilityLabel={`Subject: ${view.thread.title}`}>
            <Text style={styles.subjectLabel}>Subject</Text>
            <Text style={styles.subjectText}>{view.thread.title}</Text>
          </View>
        ) : null}
        {reward ? <RewardLine diamonds={reward} /> : null}
        {bubbles.map((m, i) => {
          const fresh = freshFrom !== null && (view?.messages.indexOf(m) ?? 0) >= freshFrom;
          const line = m.sender === "me" ? null : systemOf(m.text);
          if (line) return <SystemLine key={m.id} text={line} fresh={fresh} />;
          const isMe = m.sender === "me";
          // a system line cuts a run in two: the speaker's name and picture show again on either side of it
          const prev = i > 0 && !systemOf(bubbles[i - 1].text) ? bubbles[i - 1] : null;
          const next = i < bubbles.length - 1 ? (systemOf(bubbles[i + 1].text) ? "break" : bubbles[i + 1]) : null;
          const first = !prev || (prev.sender === "me") !== isMe;
          // the typing bubble that may follow is the teacher's
          const nextIsMe = next === "break" ? null : next ? next.sender === "me" : dots ? false : null;
          const last = nextIsMe === null || nextIsMe !== isMe;
          if (isMe) return m.kind === "emoji" ? <StickerBubble key={m.id} id={m.text} fresh={fresh} last={last} /> : <MeBubble key={m.id} text={m.text} fresh={fresh} first={first} last={last} />;
          return <NpcBubble key={m.id} speaker={speaker} text={m.text} fresh={fresh} first={first} last={last} reaction={reactions.get(m.id)} />;
        })}
        {dots ? <TypingBubble speaker={speaker} /> : null}

        {/* The replies sit under the last message, centered; tapping one puts them away and sends it */}
        {replies.length > 0 ? (
          <Animated.View key={current?.id} entering={settle(0)} exiting={FadeOut.duration(120)} style={styles.options}>
            {links.length > 0 ? (
              <View style={styles.links}>
                {links.map((r) => {
                  const info = linkInfo(r.reply.action!);
                  return <LinkButton key={`l${r.index}`} label={r.reply.label} icon={info.icon} caption={info.caption} onPress={() => void onLink(r.index)} />;
                })}
              </View>
            ) : null}
            {reacts.length > 0 ? (
              <View style={styles.optionRow}>
                {reacts.map((r) => (
                  <ReactButton key={`r${r.index}`} id={r.reply.label} onPress={() => void onReply(r.index)} />
                ))}
              </View>
            ) : null}
            {stickers.length > 0 ? (
              <View style={styles.optionRow}>
                {stickers.map((r) => (
                  <StickerButton key={`s${r.index}`} id={r.reply.label} onPress={() => void onReply(r.index)} />
                ))}
              </View>
            ) : null}
            {chips.length > 0 ? (
              <View style={styles.optionRow}>
                {chips.map((r) => (
                  <ReplyPill key={`c${r.index}`} label={r.reply.label} onPress={() => void onReply(r.index)} />
                ))}
              </View>
            ) : null}
          </Animated.View>
        ) : null}

        {/* The end: a divider, a line saying nothing more can be sent, and the way to play it again */}
        {ended ? (
          <Animated.View entering={settle(120)} style={styles.end}>
            <View style={styles.endRule}>
              <View style={styles.rule} />
              <Text style={styles.endTitle}>{story ? "End of story" : "Chat ended"}</Text>
              <View style={styles.rule} />
            </View>
            <Text style={styles.endNote}>No more replies.</Text>
            {view?.canReplay === false ? null : (
              <View style={styles.endButton}>
                <ReplayButton label={story ? "Replay story" : "Start again"} onPress={() => void onReplay()} />
              </View>
            )}
          </Animated.View>
        ) : null}
      </ScrollView>
      </ChatPaletteProvider>
    </ChatFrame>
  );
}

const makeStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    subject: { alignSelf: "center", alignItems: "center", gap: 2, marginBottom: 18, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 14, backgroundColor: c.field },
    subjectLabel: { fontSize: 11, lineHeight: 14, ...fontFaces.heavy, color: c.textMuted },
    subjectText: { fontSize: 15, lineHeight: 20, textAlign: "center", ...fontFaces.heavy, color: c.text },
    options: { alignItems: "center", gap: 12, paddingTop: 6 },
    links: { alignSelf: "stretch", gap: 10 },
    optionRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: 10 },
    end: { alignItems: "center", gap: 8, paddingTop: 10 },
    endRule: { flexDirection: "row", alignItems: "center", alignSelf: "stretch", gap: 12 },
    rule: { flex: 1, height: 2, borderRadius: 1, backgroundColor: c.border },
    endTitle: { fontSize: 13, lineHeight: 18, ...fontFaces.heavy, color: c.textMuted },
    endNote: { fontSize: 15, lineHeight: 21, ...fontFaces.semibold, color: c.textMuted },
    endButton: { paddingTop: 8 },
    calm: { alignItems: "center", gap: 10, paddingTop: 48, paddingHorizontal: 12 },
    calmText: { fontSize: 18, textAlign: "center", ...fontFaces.heavy, color: c.text },
  };
});
