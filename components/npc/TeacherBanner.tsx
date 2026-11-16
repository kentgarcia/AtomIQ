/**
 * The unit's teacher on the path: a 3D card with the teacher's bust, "Taught by <name>" and the
 * teacher's title. Tapping opens the Meet sheet. A locked unit shows the teacher muted (cool pastels,
 * never grey), as a tease.
 */

import { Text, View } from "react-native";

import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import type { Npc } from "@/content/npcs";
import { createStyles, fontFaces, fontSizes, spacing, useTheme } from "@/theme";

import { Npc as NpcView } from "./Npc";

const useStyles = createStyles((theme) => ({
  text: { flex: 1, gap: 2 },
  eyebrow: { ...fontFaces.bold, fontSize: fontSizes.sm, letterSpacing: 0.5, textTransform: "uppercase", color: theme.colors.textMuted },
  name: { ...fontFaces.heavy, fontSize: fontSizes["3xl"], color: theme.colors.text },
  title: { ...fontFaces.medium, fontSize: fontSizes.lg, color: theme.colors.textSecondary },
}));

export function TeacherBanner({ npc, locked = false, onPress }: { npc: Npc; locked?: boolean; onPress: () => void }) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  return (
    <Card
      onPress={onPress}
      accessibilityLabel={locked ? `Meet ${npc.name}, ${npc.title}. Unlocks with this unit.` : `Taught by ${npc.name}, ${npc.title}. Opens their profile.`}
      padding={spacing.sm}
      gap={spacing.md}
      faceStyle={{ flexDirection: "row", alignItems: "center" }}
    >
      <NpcView spec={npc.spec} form="head" size={72} muted={locked} live={!locked} />
      <View style={styles.text}>
        <Text style={styles.eyebrow}>{locked ? "Unlocks with this unit" : "Taught by"}</Text>
        <Text style={styles.name}>{npc.name}</Text>
        <Text style={styles.title}>{npc.title}</Text>
      </View>
      <Icon name="ArrowRight2" size={20} color={theme.colors.textMuted} />
    </Card>
  );
}
