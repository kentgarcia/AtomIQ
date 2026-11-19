/**
 * TextButton — a quiet action that is only text: "Skip", "Skip this one", "Try again". Grey, bold,
 * uppercase like the main buttons' labels, with a 44 px touch height. It sits above the main
 * button of a lesson screen, so the main action stays last and nearest the thumb.
 */

import { Pressable } from "react-native";
import { Text } from "@/components/ui/text";

import { playSfx } from "@/services/sfx";
import { createStyles, fontFaces, fontSizes, useTheme } from "@/theme";

const useStyles = createStyles((theme) => ({
  root: { minHeight: 44, alignItems: "center", justifyContent: "center", alignSelf: "stretch" },
  text: { ...fontFaces.bold, fontSize: fontSizes.xl, letterSpacing: 0.6, textTransform: "uppercase", color: theme.colors.textMuted },
}));

export function TextButton({ label, onPress, accessibilityLabel }: { label: string; onPress: () => void; accessibilityLabel?: string }) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      hitSlop={8}
      onPress={() => {
        void playSfx("ui.press");
        onPress();
      }}
      style={({ pressed }) => [styles.root, pressed && { opacity: 0.6 }]}
    >
      <Text style={styles.text}>{label}</Text>
    </Pressable>
  );
}
