/**
 * The dialog a locked thing opens (a locked tab, the Shop button before the Shop is on the phone): a grey lock, the word
 * "Locked" and what it takes to open it, in the house `ModalDialog`. The phone's own locked icons use the same look.
 */

import React from "react";
import { View } from "react-native";

import { Icon } from "@/components/ui/icon";
import { ModalButton } from "@/components/ui/modal-card";
import { ModalDialog } from "@/components/ui/modal-dialog";
import { Text } from "@/components/ui/text";
import { createStyles, fontFaces, useTheme, withAlpha } from "@/theme";

const useStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    row: { flexDirection: "row", alignItems: "center", gap: 14 },
    badge: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center", backgroundColor: withAlpha(c.textMuted, 0.18) },
    copy: { flex: 1, gap: 2 },
    heading: { fontSize: 13, lineHeight: 18, ...fontFaces.heavy, color: c.text },
    body: { fontSize: 16, lineHeight: 22, ...fontFaces.bold, color: c.text },
    progress: { marginTop: 12, fontSize: 14, lineHeight: 20, ...fontFaces.bold, color: c.textMuted },
  };
});

export function LockedDialog({
  visible,
  title,
  text,
  progress,
  onClose,
}: {
  visible: boolean;
  /** What is locked ("Quests", "Shop"). */
  title: string;
  /** What opens it. */
  text: string;
  /** Where the learner stands on it, when there is a count. */
  progress?: string | null;
  onClose: () => void;
}) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  return (
    <ModalDialog visible={visible} onClose={onClose} title={title} dismissOnScrim footer={<ModalButton label="Got it" onPress={onClose} />}>
      <View style={styles.row}>
        <View style={styles.badge}>
          <Icon name="Lock" size={26} color={theme.colors.textMuted} variant="Bold" />
        </View>
        <View style={styles.copy}>
          <Text style={styles.heading}>Locked</Text>
          <Text style={styles.body}>{text}</Text>
        </View>
      </View>
      {progress ? <Text style={styles.progress}>{progress}</Text> : null}
    </ModalDialog>
  );
}
