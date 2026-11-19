/**
 * The pause dialog: a `ModalDialog` (the app's one modal) over the frozen map, with what the run has
 * so far and three actions: Resume (the main button), Restart and Leave.
 */

import { View } from "react-native";

import { ModalButton, ModalSecondaryButton } from "@/components/ui/modal-card";
import { ModalDialog } from "@/components/ui/modal-dialog";
import { Text } from "@/components/ui/text";
import { createStyles, fontFaces, fontSizes, useTheme } from "@/theme";

const useStyles = createStyles((theme) => ({
  stats: { gap: 8 },
  row: { flexDirection: "row", justifyContent: "space-between" },
  label: { ...fontFaces.semibold, fontSize: fontSizes.lg, color: theme.colors.textSecondary },
  value: { ...fontFaces.heavy, fontSize: fontSizes.lg, color: theme.colors.text },
}));

export interface PauseDialogProps {
  visible: boolean;
  hearts: number;
  maxHearts: number;
  coins: number;
  beaten: number;
  enemies: number;
  onResume: () => void;
  onRestart: () => void;
  onLeave: () => void;
}

export function PauseDialog({ visible, hearts, maxHearts, coins, beaten, enemies, onResume, onRestart, onLeave }: PauseDialogProps) {
  const styles = useStyles(useTheme().theme);
  const rows: [string, string][] = [
    ["Hearts", `${hearts} of ${maxHearts}`],
    ["Coins", String(coins)],
    ["Enemies beaten", `${beaten} of ${enemies}`],
  ];
  return (
    <ModalDialog
      visible={visible}
      onClose={onResume}
      title="Paused"
      closeLabel="Resume"
      footer={
        <>
          <ModalButton label="Resume" onPress={onResume} />
          <ModalSecondaryButton label="Restart" variant="secondary" onPress={onRestart} />
          <ModalSecondaryButton label="Leave" variant="destructive" onPress={onLeave} />
        </>
      }
    >
      <View style={styles.stats}>
        {rows.map(([label, value]) => (
          <View key={label} style={styles.row}>
            <Text style={styles.label}>{label}</Text>
            <Text style={styles.value}>{value}</Text>
          </View>
        ))}
      </View>
    </ModalDialog>
  );
}
