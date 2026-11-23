/**
 * A short list to pick one thing from, in the house dialog: a folder's name, or which folder an icon goes into. Rows are plain
 * pressables (no text input anywhere on the phone but Field Notes).
 */

import { Icon } from "@/components/ui/icon";
import { ModalDialog } from "@/components/ui/modal-dialog";
import { Text } from "@/components/ui/text";
import { createStyles, fontFaces, useTheme } from "@/theme";
import { useMemo } from "react";
import { Pressable, View } from "react-native";

export interface ChoiceOption {
  key: string;
  label: string;
  /** A line under the label. */
  hint?: string;
}

export function ChoiceDialog({
  visible,
  title,
  options,
  onPick,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: ChoiceOption[];
  onPick: (key: string) => void;
  onClose: () => void;
}) {
  const { theme } = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  return (
    <ModalDialog visible={visible} onClose={onClose} title={title} closeLabel="Close" dismissOnScrim>
      <View>
        {options.map((o, i) => (
          <Pressable
            key={o.key}
            onPress={() => onPick(o.key)}
            accessibilityRole="button"
            accessibilityLabel={o.label}
            style={({ pressed }) => [s.row, i > 0 && s.divided, pressed && s.pressed]}
          >
            <View style={s.copy}>
              <Text style={s.label}>{o.label}</Text>
              {o.hint ? <Text style={s.hint}>{o.hint}</Text> : null}
            </View>
            <Icon name="ArrowRight2" size={18} color={theme.colors.textMuted} variant="Bold" />
          </Pressable>
        ))}
      </View>
    </ModalDialog>
  );
}

const makeStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 52, paddingVertical: 8 },
    divided: { borderTopWidth: 1, borderStyle: "dashed", borderColor: c.border },
    pressed: { opacity: 0.6 },
    copy: { flex: 1, gap: 2 },
    label: { fontSize: 16, ...fontFaces.heavy, color: c.text },
    hint: { fontSize: 13, ...fontFaces.medium, color: c.textMuted },
  };
});
