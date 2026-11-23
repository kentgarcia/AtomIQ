/**
 * The bar that appears while the phone's home screen is being arranged: icon buttons only (each has its words for a screen reader).
 * With nothing picked it offers to put everything back in progression order; with an icon picked it shows what can be done with it:
 * move earlier or later, make a folder, put it in one; for a folder, rename, open or undo it. Moving is buttons and taps (no
 * dragging), so it works the same with any screen reader or reduced motion.
 */

import { Icon } from "@/components/ui/icon";
import { createStyles, useTheme, withAlpha } from "@/theme";
import { useMemo } from "react";
import { Pressable, View } from "react-native";

export interface LayoutBarProps {
  /** What is picked: an app or a folder, or null. */
  picked: { kind: "app" | "folder" } | null;
  /** Whether it can move earlier or later among the icons shown. */
  canEarlier: boolean;
  canLater: boolean;
  /** Whether a folder exists to put an app in. */
  hasFolders: boolean;
  onEarlier: () => void;
  onLater: () => void;
  onNewFolder: () => void;
  onIntoFolder: () => void;
  onRename: () => void;
  onOpenFolder: () => void;
  onUndoFolder: () => void;
  onReset: () => void;
}

function IconButton({ icon, label, onPress, disabled = false }: { icon: string; label: string; onPress: () => void; disabled?: boolean }) {
  const { theme } = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      hitSlop={4}
      style={({ pressed }) => [s.button, disabled && s.off, pressed && s.pressed]}
    >
      <Icon name={icon} size={24} color={theme.colors.text} variant="Bold" />
    </Pressable>
  );
}

export function LayoutBar(p: LayoutBarProps) {
  const { theme } = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  return (
    <View style={s.bar} accessibilityLiveRegion="polite">
      {p.picked ? (
        <>
          <IconButton icon="ArrowLeft2" label="Move earlier" disabled={!p.canEarlier} onPress={p.onEarlier} />
          <IconButton icon="ArrowRight2" label="Move later" disabled={!p.canLater} onPress={p.onLater} />
          {p.picked.kind === "app" ? (
            <>
              <IconButton icon="FolderAdd" label="Make a new folder with it" onPress={p.onNewFolder} />
              {p.hasFolders ? <IconButton icon="DirectInbox" label="Put it in a folder" onPress={p.onIntoFolder} /> : null}
            </>
          ) : (
            <>
              <IconButton icon="Edit2" label="Rename the folder" onPress={p.onRename} />
              <IconButton icon="FolderOpen" label="Open the folder" onPress={p.onOpenFolder} />
              <IconButton icon="Maximize4" label="Undo the folder" onPress={p.onUndoFolder} />
            </>
          )}
        </>
      ) : (
        <IconButton icon="Refresh2" label="Back to progression order" onPress={p.onReset} />
      )}
    </View>
  );
}

const makeStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    bar: {
      alignSelf: "center",
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      padding: 10,
      borderRadius: 28,
      backgroundColor: withAlpha(c.card, 0.96),
      borderWidth: 2,
      borderColor: c.border,
    },
    button: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: withAlpha(c.text, 0.08) },
    off: { opacity: 0.3 },
    pressed: { opacity: 0.6 },
  };
});
