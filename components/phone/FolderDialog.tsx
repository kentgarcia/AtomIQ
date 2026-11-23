/**
 * An open folder: its apps in a grid in the house dialog. Pressing an installed app opens it; a grey one says what it needs. While the
 * home screen is being arranged each app has a take-out icon under it, which puts it back on the home screen.
 */

import { AppIcon } from "@/components/phone/AppIcon";
import { Icon } from "@/components/ui/icon";
import { ModalDialog } from "@/components/ui/modal-dialog";
import { ModalButton } from "@/components/ui/modal-card";
import { Text } from "@/components/ui/text";
import type { Badge, PhoneApp } from "@/services/phone-core";
import { createStyles, fontFaces, useTheme, withAlpha } from "@/theme";
import { useMemo } from "react";
import { Pressable, View } from "react-native";

export interface FolderDialogProps {
  visible: boolean;
  name: string;
  members: { app: PhoneApp; locked: boolean }[];
  badgeOf: (app: PhoneApp) => Badge;
  labelOf: (app: PhoneApp) => string;
  /** Arranging: show "Take out" under each app. */
  editing: boolean;
  onOpenApp: (app: PhoneApp, locked: boolean) => void;
  onTakeOut: (app: PhoneApp) => void;
  onClose: () => void;
}

const TILE = 56;

export function FolderDialog({ visible, name, members, badgeOf, labelOf, editing, onOpenApp, onTakeOut, onClose }: FolderDialogProps) {
  const { theme } = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  return (
    <ModalDialog visible={visible} onClose={onClose} title={name} closeLabel="Close folder" dismissOnScrim footer={<ModalButton label="Done" onPress={onClose} />}>
      <View style={s.grid}>
        {members.map(({ app, locked }) => (
          <View key={app.id} style={s.cell}>
            <AppIcon
              app={app}
              size={TILE}
              badge={locked ? null : badgeOf(app)}
              label={locked ? `${app.name}, locked` : labelOf(app)}
              locked={locked}
              onPress={() => onOpenApp(app, locked)}
            />
            {editing && !locked ? (
              <Pressable onPress={() => onTakeOut(app)} accessibilityRole="button" accessibilityLabel={`Take ${app.name} out of the folder`} hitSlop={6} style={({ pressed }) => [s.out, pressed && { opacity: 0.6 }]}>
                <Icon name="ExportSquare" size={20} color={theme.colors.text} variant="Bold" />
              </Pressable>
            ) : null}
          </View>
        ))}
      </View>
      {members.every((m) => m.locked) ? <Text style={s.note}>Nothing here is installed yet. Press a grey app to see what it needs.</Text> : null}
    </ModalDialog>
  );
}

const makeStyles = createStyles((theme) => ({
  grid: { flexDirection: "row", flexWrap: "wrap", rowGap: 14 },
  cell: { width: "33.33%", alignItems: "center", gap: 6 },
  out: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: withAlpha(theme.colors.text, 0.08) },
  note: { fontSize: 14, lineHeight: 20, marginTop: 8, ...fontFaces.medium, color: theme.colors.textMuted },
}));
