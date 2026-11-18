/**
 * The Meet sheet: the teacher at hero size with a greeting, who they are, and what they teach.
 * A plain modal over the screen; reduced motion shows a still teacher.
 */

import { Modal, Pressable, ScrollView, View } from "react-native";
import { Text } from "@/components/ui/text";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import type { Npc } from "@/content/npcs";
import { createStyles, fontFaces, fontSizes, spacing, useTheme, withAlpha } from "@/theme";

import { Npc as NpcView } from "./Npc";
import { BubbleTail, SpeechBubble } from "./SpeechBubble";
import { useNpcLine } from "./use-npc";

const useStyles = createStyles((theme) => ({
  scrim: { flex: 1, justifyContent: "flex-end", backgroundColor: withAlpha(theme.colors.shadow, 0.5) },
  sheet: { maxHeight: "92%", backgroundColor: theme.colors.background, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: spacing.md, paddingTop: spacing.md },
  body: { gap: spacing.md, paddingBottom: spacing.md },
  hero: { alignItems: "center", gap: spacing.xs },
  name: { ...fontFaces.black, fontSize: fontSizes["7xl"], color: theme.colors.text, textAlign: "center" },
  title: { ...fontFaces.bold, fontSize: fontSizes.xl, color: theme.colors.primaryLight, textAlign: "center" },
  bio: { ...fontFaces.book, fontSize: fontSizes["2xl"], lineHeight: 26, color: theme.colors.textSecondary },
  label: { ...fontFaces.bold, fontSize: fontSizes.md, letterSpacing: 0.6, textTransform: "uppercase", color: theme.colors.textMuted },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  rowText: { ...fontFaces.semibold, flex: 1, fontSize: fontSizes.xl, color: theme.colors.text },
}));

export function MeetSheet({ npc, visible, lessons = [], locked = false, onClose }: { npc: Npc | null; visible: boolean; lessons?: string[]; locked?: boolean; onClose: () => void }) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const meet = useNpcLine(npc?.id, "meet");
  if (!npc) return null;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel={`Close ${npc.name}'s profile`}>
        <Pressable style={styles.sheet} onPress={() => undefined} accessible={false}>
          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            <View style={styles.hero}>
              {meet && !locked ? (
                <SpeechBubble name={npc.name} text={meet.text} ownerId={`npc-meet:${npc.id}`}>
                  <NpcView spec={npc.spec} pose={(meet.pose as never) ?? "greet"} size={170} />
                </SpeechBubble>
              ) : (
                <>
                  <BubbleTail />
                  <NpcView spec={npc.spec} pose="greet" size={170} muted={locked} />
                </>
              )}
              <Text accessibilityRole="header" style={styles.name}>{npc.name}</Text>
              <Text style={styles.title}>{npc.title}</Text>
            </View>
            <Text style={styles.bio}>{npc.bio}</Text>
            {lessons.length ? (
              <Card gap={spacing.sm}>
                <Text style={styles.label}>Teaches</Text>
                {lessons.map((t) => (
                  <View key={t} style={styles.row}>
                    <Icon name="TickCircle" size={20} color={theme.colors.primary} />
                    <Text style={styles.rowText}>{t}</Text>
                  </View>
                ))}
              </Card>
            ) : null}
          </ScrollView>
          <View style={{ paddingBottom: spacing.md }}>
            <Button label="Close" onPress={onClose} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
