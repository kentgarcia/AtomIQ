/**
 * New chat (docs/PHONE_SPEC.md §5.2), laid out like choosing a contact on a phone: a short "Recent" section of the teachers the
 * learner wrote to last, then everyone in A to Z sections with sticky letter headings, a round picture, the name, what they do and, when
 * the learner already has chats with them, how many; a letter rail down the right edge jumps between sections once there are enough
 * of them. Tapping a contact starts a fresh free chat with them at once (a teacher greets with their menu, so there is nothing to
 * type); Shrodi starts a chat like a teacher. Everyone is Shrodi and the teachers in Contacts who have a free chat.
 * Text inputs stay in Field Notes, so there is no search box.
 */

import { useCast } from "@/components/feed/use-cast";
import { ChatHead, speakerFor } from "@/components/phone/ChatHead";
import { ChatButton, ChatFrame, ChatTitle } from "@/components/phone/ChatFrame";
import { Text } from "@/components/ui/text";
import { getAllNpcs, type Npc } from "@/content/npcs";
import { useChatList } from "@/hooks/use-chats";
import { getContactTeacherIds, startFreeChat, teacherHasThread } from "@/services/chats";
import { createStyles, fontFaces, useResponsiveLayout, useTheme } from "@/theme";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { Pressable, SectionList, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const FACE = 44;
/** The letter rail shows once there are at least this many letters to jump between. */
const RAIL_MIN = 5;
const RECENT_MAX = 3;

interface Person {
  id: string;
  name: string;
  subtitle: string;
  npc: Npc | null;
}

interface Group {
  key: string;
  title: string;
  data: Person[];
}

const letterOf = (name: string) => {
  const first = name.trim().charAt(0).toUpperCase();
  return /^[A-Z]$/.test(first) ? first : "#";
};

export default function NewChatScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { contentMaxWidth } = useResponsiveLayout();
  const cast = useCast();
  const { rows } = useChatList();
  const [teachers, setTeachers] = useState<Npc[]>([]);
  const [starting, setStarting] = useState<string | null>(null);
  const list = useRef<SectionList<Person, Group>>(null);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      void (async () => {
        const [all, ids] = await Promise.all([getAllNpcs(), getContactTeacherIds()]);
        const mine = all.filter((n) => ids.includes(n.id));
        const has = await Promise.all(mine.map((n) => teacherHasThread(n.id)));
        if (alive) setTeachers(mine.filter((_, i) => has[i]));
      })().catch(() => undefined);
      return () => {
        alive = false;
      };
    }, []),
  );

  const people = useMemo<Person[]>(
    () => [{ id: "shrodi", name: "Shrodi", subtitle: "Your guide", npc: null }, ...teachers.map((n) => ({ id: n.id, name: n.name, subtitle: n.title, npc: n }))].sort((a, b) => a.name.localeCompare(b.name)),
    [teachers],
  );
  /** How many chats the learner already has with each teacher. */
  const chatCount = useMemo(() => {
    const out = new Map<string, number>();
    for (const r of rows) out.set(r.npcId, (out.get(r.npcId) ?? 0) + 1);
    return out;
  }, [rows]);

  const groups = useMemo<Group[]>(() => {
    const out: Group[] = [];
    // The teachers written to last (the list is latest first), Shrodi's chat is not one of the threads
    const recentIds: string[] = [];
    for (const r of rows) if (!recentIds.includes(r.npcId) && recentIds.length < RECENT_MAX) recentIds.push(r.npcId);
    const recent = recentIds.map((id) => people.find((p) => p.id === id)).filter((p): p is Person => p !== undefined);
    if (recent.length > 0) out.push({ key: "recent", title: "Recent", data: recent });
    for (const p of people) {
      const letter = letterOf(p.name);
      const last = out[out.length - 1];
      if (last && last.key === letter) last.data.push(p);
      else out.push({ key: letter, title: letter, data: [p] });
    }
    return out;
  }, [people, rows]);

  const letters = groups.filter((g) => g.key !== "recent");
  const showRail = letters.length >= RAIL_MIN;

  const choose = async (person: Person) => {
    if (starting) return;
    setStarting(person.id);
    const id = await startFreeChat(person.id);
    setStarting(null);
    if (id) router.replace(`/phone-apps/chat?thread=${encodeURIComponent(id)}`);
  };

  const jump = (key: string) => {
    const sectionIndex = groups.findIndex((g) => g.key === key);
    if (sectionIndex >= 0) list.current?.scrollToLocation({ sectionIndex, itemIndex: 0, viewOffset: 28, animated: true });
  };

  const back = () => (router.canGoBack() ? router.back() : router.replace("/phone-apps/chats"));

  return (
    <ChatFrame left={<ChatButton icon="ArrowLeft2" label="Back to Chats" onPress={back} />} center={<ChatTitle subtitle="Choose a contact">New chat</ChatTitle>}>
      <View style={{ flex: 1, width: "100%", maxWidth: contentMaxWidth, alignSelf: "center" }}>
        <SectionList<Person, Group>
          ref={list}
          sections={groups}
          keyExtractor={(item) => item.id}
          stickySectionHeadersEnabled
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24, paddingRight: showRail ? 18 : 0 }}
          onScrollToIndexFailed={() => undefined}
          renderSectionHeader={({ section }) => (
            <View style={styles.header}>
              <Text style={styles.headerText} accessibilityRole="header">
                {section.title}
              </Text>
            </View>
          )}
          renderItem={({ item, index }) => {
            const chats = chatCount.get(item.id) ?? 0;
            return (
              <Pressable
                onPress={() => void choose(item)}
                accessibilityRole="button"
                accessibilityLabel={`${item.name}, ${item.subtitle}.${chats > 0 ? ` ${chats === 1 ? "1 chat" : `${chats} chats`}.` : ""} Starts a new chat.`}
                style={({ pressed }) => [styles.row, (pressed || starting === item.id) && styles.pressed]}
              >
                <View style={styles.face} accessible={false} importantForAccessibility="no-hide-descendants">
                  <ChatHead speaker={speakerFor(item.id, cast)} size={FACE} />
                </View>
                {/* The hairline starts at the name, like a phone's contact list */}
                <View style={[styles.text, index > 0 && styles.hairline]}>
                  <View style={styles.textCopy}>
                    <Text style={styles.name} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.sub} numberOfLines={1}>
                      {item.subtitle}
                    </Text>
                  </View>
                  {chats > 0 ? <Text style={styles.count}>{chats === 1 ? "1 chat" : `${chats} chats`}</Text> : null}
                </View>
              </Pressable>
            );
          }}
          ListFooterComponent={
            teachers.length === 0 ? <Text style={styles.note}>Finish a lesson and its teacher will be here to chat with.</Text> : undefined
          }
        />

        {showRail ? (
          <View style={[styles.rail, { top: 40, bottom: insets.bottom + 24 }]} accessible={false} importantForAccessibility="no-hide-descendants">
            {letters.map((g) => (
              <Pressable key={g.key} onPress={() => jump(g.key)} hitSlop={{ left: 12, right: 8, top: 2, bottom: 2 }}>
                <Text style={styles.railLetter}>{g.title}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
    </ChatFrame>
  );
}

const makeStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    header: { height: 28, justifyContent: "center", paddingHorizontal: 20, backgroundColor: c.surfaceSoft },
    headerText: { fontSize: 13, lineHeight: 18, ...fontFaces.heavy, color: c.textMuted },
    row: { flexDirection: "row", alignItems: "center", gap: 14, paddingLeft: 20, minHeight: 64, backgroundColor: c.mapBackground },
    pressed: { backgroundColor: c.surfaceSoft },
    face: { width: FACE, height: FACE, alignItems: "center", justifyContent: "center" },
    text: { flex: 1, flexDirection: "row", alignItems: "center", alignSelf: "stretch", gap: 8, paddingRight: 20, paddingVertical: 10 },
    hairline: { borderTopWidth: 1, borderColor: c.border },
    textCopy: { flex: 1, gap: 1 },
    name: { fontSize: 17, lineHeight: 22, ...fontFaces.heavy, color: c.text },
    sub: { fontSize: 13, lineHeight: 18, ...fontFaces.semibold, color: c.textMuted },
    count: { fontSize: 12, ...fontFaces.semibold, color: c.textMuted },
    note: { padding: 20, fontSize: 14, lineHeight: 20, ...fontFaces.medium, color: c.textMuted },
    rail: { position: "absolute", right: 4, width: 16, alignItems: "center", justifyContent: "space-around" },
    railLetter: { fontSize: 11, lineHeight: 14, ...fontFaces.heavy, color: c.guide },
  };
});
