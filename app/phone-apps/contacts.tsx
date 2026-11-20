/**
 * Contacts (docs/features/PHONE_SPEC.md §5.1), under the app's usual header. The page is built like the profiles in the rest of the app: a
 * short list of compact filled cards. The cover is whole at the card's right edge and fades into the card on the left, so the head, the
 * name and the title sit on the plain filled card. The learner's own card has their paint and pattern (as on the Phone's wallpaper) with
 * their avatar; every other card has the cover of that teacher's profile (their outfit colour with a wallpaper of what they teach).
 * A round, icon-only button on the cover opens a chat. Everyone is Shrodi and the teacher of every unit the learner has finished
 * a lesson in, so the list grows as the curriculum does. A card opens a teacher's profile (Shrodi's too).
 */

import { Avatar } from "@/components/avatar/Avatar";
import { avatarBackground, normalizeAvatar } from "@/components/avatar/avatar-core";
import { PatternLayer } from "@/components/avatar/PatternLayer";
import { ChatHead } from "@/components/phone/ChatHead";
import { settle } from "@/components/motion/settle";
import { NpcCover } from "@/components/npc/NpcCover";
import type { Npc } from "@/content/npcs";
import { LinearGradient } from "expo-linear-gradient";
import { ScreenHeader, useHeaderBorder } from "@/components/layout";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { getAllNpcs } from "@/content/npcs";
import { getContactTeacherIds, messageTeacher } from "@/services/chats";
import { useStorage } from "@/services/StorageContext";
import { createStyles, fontFaces, useResponsiveLayout, useTheme, withAlpha } from "@/theme";
import { useFocusEffect, useRouter } from "expo-router";
import { playSfx } from "@/services/sfx";
import React, { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const GUTTER = 20;
const ROW = 72;
const FACE = 48;
const MY_ROW = 84;
const MY_FACE = 62;
const ROUND = 40;
const LIP = 3;

/** The cover fading into the card: the card's colour on the left, clear on the right (a stretch of plain card first, for the head and the name). */
function Fade({ color }: { color: string }) {
  return <LinearGradient pointerEvents="none" colors={[color, color, withAlpha(color, 0)]} locations={[0, 0.3, 0.85]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />;
}

/** A flat filled card (the app's filled look, as in Field Notes), clipped to its rounded corners. */
function FilledCard({ children, onPress, accessibilityLabel }: { children: React.ReactNode; onPress: () => void; accessibilityLabel: string }) {
  const c = useTheme().theme.colors;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel} style={({ pressed }) => ({ borderRadius: 16, overflow: "hidden", backgroundColor: c.field, opacity: pressed ? 0.8 : 1 })}>
      {children}
    </Pressable>
  );
}

/** A round, icon-only button: a face on a lip, so the shadow follows the curve. */
function RoundButton({ label, onPress }: { label: string; onPress: () => void }) {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={6} style={{ width: ROUND, height: ROUND + LIP }}>
      {({ pressed }) => (
        <>
          <View style={{ position: "absolute", left: 0, top: LIP, width: ROUND, height: ROUND, borderRadius: ROUND / 2, backgroundColor: c.borderStrong }} />
          <View style={{ position: "absolute", left: 0, top: pressed ? LIP : 0, width: ROUND, height: ROUND, borderRadius: ROUND / 2, alignItems: "center", justifyContent: "center", backgroundColor: c.card }}>
            <Icon name="Sms" size={20} color={c.text} variant="Bold" />
          </View>
        </>
      )}
    </Pressable>
  );
}

export default function ContactsScreen() {
  const { theme } = useTheme();
  const c = theme.colors;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { contentMaxWidth } = useResponsiveLayout();
  const { userProfile } = useStorage();
  const { scrolled, onScroll, scrollEventThrottle } = useHeaderBorder();
  const [teachers, setTeachers] = useState<Npc[]>([]);

  // A teacher joins the contacts when the learner finishes a lesson of their unit
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      void Promise.all([getAllNpcs(), getContactTeacherIds()])
        .then(([all, ids]) => alive && setTeachers(all.filter((n) => ids.includes(n.id))))
        .catch(() => undefined);
      return () => {
        alive = false;
      };
    }, []),
  );

  const count = teachers.length + 1;
  // Alphabetical
  const people = useMemo(() => [{ id: "shrodi", name: "Shrodi", npc: null as Npc | null }, ...teachers.map((n) => ({ id: n.id, name: n.name, npc: n as Npc | null }))].sort((a, b) => a.name.localeCompare(b.name)), [teachers]);
  const look = useMemo(() => normalizeAvatar(userProfile?.avatar_url), [userProfile?.avatar_url]);
  const myName = userProfile?.display_name || userProfile?.username || "You";
  const handle = userProfile?.display_name && userProfile?.username ? `@${userProfile.username}` : null;

  const openChat = async (npcId: string) => {
    const id = await messageTeacher(npcId);
    if (id) router.push(`/phone-apps/chat?thread=${encodeURIComponent(id)}`);
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Contacts"
        subtitle={count === 1 ? "1 contact" : `${count} contacts`}
        onBack={() => {
          void playSfx("phone.app-close");
          if (router.canGoBack()) router.back();
          else router.replace("/(tabs)/phone");
        }}
        scrolled={scrolled}
      />
      <ScrollView onScroll={onScroll} scrollEventThrottle={scrollEventThrottle} showsVerticalScrollIndicator={false} contentContainerStyle={{ width: "100%", maxWidth: contentMaxWidth, alignSelf: "center", paddingHorizontal: GUTTER, paddingTop: 12, paddingBottom: insets.bottom + 24, gap: 12 }}>
        {/* My card: the learner's own paint and pattern as the cover, their avatar over its edge */}
        <Animated.View entering={settle(0)}>
          <FilledCard onPress={() => router.push("/(tabs)/profile")} accessibilityLabel={`${myName}, my card. Opens your profile.`}>
            <View style={[styles.myRow, { backgroundColor: avatarBackground(look) }]}>
              <PatternLayer pattern={look.pattern} tile={96} />
              <Fade color={c.field} />
              <View style={styles.myFace}>
                <Avatar value={userProfile?.avatar_url} size={MY_FACE - 8} radius={(MY_FACE - 8) / 2} />
              </View>
              <View style={styles.text}>
                <Text style={styles.name} numberOfLines={1}>
                  {myName}
                </Text>
                <Text style={styles.title} numberOfLines={1}>
                  {handle ? `${handle} · My card` : "My card"}
                </Text>
              </View>
            </View>
          </FilledCard>
        </Animated.View>

        <Text style={styles.section} accessibilityRole="header">
          Your guide and teachers
        </Text>

        <View style={styles.list}>
          {people.map((p, i) => {
            const isShrodi = p.npc === null;
            return (
              <Animated.View key={p.id} entering={settle(60 * (i + 1))}>
                <FilledCard
                  onPress={() => router.push(`/npc/${p.id}` as never)}
                  accessibilityLabel={`${p.name}, ${isShrodi ? "Your guide" : p.npc?.title}. Opens their profile.`}
                >
                  <View style={styles.row}>
                    <View style={StyleSheet.absoluteFill}>
                      <NpcCover npcId={p.npc?.id} outfit={p.npc?.spec.outfit ?? { color: c.guide, shade: c.guideLip }} height={ROW} radius={0} />
                    </View>
                    <Fade color={c.field} />
                    <ChatHead speaker={{ id: p.id, name: p.name, npc: p.npc, mascot: isShrodi }} size={FACE} />
                    <View style={styles.text}>
                      <Text style={styles.name} numberOfLines={1}>
                        {p.name}
                      </Text>
                      <Text style={styles.title} numberOfLines={1}>
                        {p.npc?.title ?? "Your guide"}
                      </Text>
                    </View>
                    <RoundButton label={`${isShrodi ? "Chat with" : "Message"} ${p.name}`} onPress={() => void openChat(p.id)} />
                  </View>
                </FilledCard>
              </Animated.View>
            );
          })}

          {teachers.length === 0 ? (
            <Animated.View entering={settle(120)} style={styles.locked} accessible accessibilityLabel="More teachers join as you finish lessons.">
              <Icon name="Lock" size={26} color={c.textFaint} variant="Bold" />
              <Text style={styles.lockedText}>Finish a lesson and its teacher joins you here.</Text>
            </Animated.View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const makeStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    container: { flex: 1, backgroundColor: c.mapBackground },
    myRow: { height: MY_ROW, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 12, overflow: "hidden" },
    myFace: { width: MY_FACE, height: MY_FACE, borderRadius: MY_FACE / 2, backgroundColor: c.surfaceSoft, overflow: "hidden", alignItems: "center", justifyContent: "center" },
    text: { flex: 1, justifyContent: "center", paddingRight: 8 },
    section: { fontSize: 12, letterSpacing: 0.8, textTransform: "uppercase", ...fontFaces.heavy, color: c.textMuted },
    list: { gap: 10 },
    row: { height: ROW, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, overflow: "hidden" },
    name: { fontSize: 16, lineHeight: 21, ...fontFaces.heavy, color: c.text },
    title: { fontSize: 12, lineHeight: 16, ...fontFaces.semibold, color: c.textMuted },
    locked: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 20, borderWidth: 2, borderStyle: "dashed", borderColor: c.borderStrong },
    lockedText: { flex: 1, fontSize: 14, lineHeight: 20, ...fontFaces.semibold, color: c.textMuted },
  };
});
