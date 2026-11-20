/**
 * The Meet dialog (opened from the teacher banner on a unit card): the house `ModalDialog` with the
 * teacher on their own cover (the small flat pictures of what they teach, on their outfit colour, the same
 * wallpaper as their profile), their name and title, a greeting, who they are and what they teach.
 * A locked unit shows a muted teacher and no greeting. The footer opens the full profile.
 */

import { useRouter } from "expo-router";
import { View } from "react-native";

import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { ModalButton, ModalSecondaryButton } from "@/components/ui/modal-card";
import { ModalDialog } from "@/components/ui/modal-dialog";
import { Text } from "@/components/ui/text";
import type { Npc } from "@/content/npcs";
import { createStyles, fontFaces, fontSizes, spacing, useTheme } from "@/theme";

import { Npc as NpcView } from "./Npc";
import { NpcCover } from "./NpcCover";
import { SpeechBubble } from "./SpeechBubble";
import { useNpcLine } from "./use-npc";

const COVER_HEIGHT = 140;
const BUST = 124;
const BUST_WIDTH = Math.round((BUST * 200) / 252);

const useStyles = createStyles((theme) => ({
  body: { gap: spacing.lg },
  cover: { height: COVER_HEIGHT, alignSelf: "stretch" },
  bust: { position: "absolute", bottom: 0, alignSelf: "center", width: BUST_WIDTH, height: BUST, overflow: "hidden" },
  who: { alignItems: "center", gap: 2 },
  name: { ...fontFaces.black, fontSize: fontSizes["7xl"], lineHeight: 36, color: theme.colors.text, textAlign: "center" },
  title: { ...fontFaces.bold, fontSize: fontSizes.xl, color: theme.colors.primaryLight, textAlign: "center" },
  bio: { ...fontFaces.book, fontSize: fontSizes.xl, lineHeight: 25, color: theme.colors.textSecondary, textAlign: "center" },
  label: { ...fontFaces.bold, fontSize: fontSizes.md, letterSpacing: 0.6, textTransform: "uppercase", color: theme.colors.textMuted },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  rowText: { ...fontFaces.semibold, flex: 1, fontSize: fontSizes.xl, color: theme.colors.text },
}));

export function MeetSheet({ npc, visible, lessons = [], locked = false, onClose }: { npc: Npc | null; visible: boolean; lessons?: string[]; locked?: boolean; onClose: () => void }) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const router = useRouter();
  const meet = useNpcLine(npc?.id, "meet");
  if (!npc) return null;
  const stage = (
    <View style={styles.cover}>
      <NpcCover npcId={npc.id} outfit={npc.spec.outfit} height={COVER_HEIGHT} radius={20} />
      <View style={styles.bust} pointerEvents="none">
        <NpcView spec={npc.spec} pose={locked ? "idle" : "greet"} form="bust" size={BUST} muted={locked} />
      </View>
    </View>
  );
  return (
    <ModalDialog
      visible={visible}
      onClose={onClose}
      title={locked ? "Your next teacher" : "Meet your teacher"}
      closeLabel={`Close ${npc.name}'s profile`}
      footer={
        <>
          {locked ? null : (
            <ModalButton
              label="See profile"
              onPress={() => {
                onClose();
                router.push(`/npc/${encodeURIComponent(npc.id)}` as never);
              }}
            />
          )}
          <ModalSecondaryButton label="Close" onPress={onClose} />
        </>
      }
    >
      <View style={styles.body}>
        {meet && !locked ? (
          <SpeechBubble name={npc.name} text={meet.text} ownerId={`npc-meet:${npc.id}`}>
            {stage}
          </SpeechBubble>
        ) : (
          stage
        )}
        <View style={styles.who}>
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
      </View>
    </ModalDialog>
  );
}
