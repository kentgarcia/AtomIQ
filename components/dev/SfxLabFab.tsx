/**
 * The button that opens the SFX lab (components/dev/SfxLab.tsx): a small speaker beside the Dev admin
 * button on Home. DEVELOPMENT ONLY: Home loads this file only inside `__DEV__`, so a release build
 * does not contain it (or the audition sounds).
 *
 * TO REMOVE: see the note at the top of SfxLab.tsx.
 */

import { useRouter } from "expo-router";
import React from "react";
import { TouchableOpacity } from "react-native";

import { Icon } from "@/components/ui/icon";
import { createStyles, useTheme } from "@/theme";

const useStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    fab: {
      position: "absolute",
      left: 74,
      width: 40,
      height: 40,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.card,
      borderWidth: 2,
      borderColor: c.border,
      borderBottomWidth: 4,
      zIndex: 95,
    },
  };
});

export interface SfxLabFabProps {
  /** Distance from the bottom edge: the same as the Dev admin button's. */
  bottom: number;
}

export function SfxLabFab({ bottom }: SfxLabFabProps) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const router = useRouter();
  return (
    <TouchableOpacity
      style={[styles.fab, { bottom }]}
      activeOpacity={0.85}
      hitSlop={4}
      onPress={() => router.push("/dev-sfx" as never)}
      accessibilityRole="button"
      accessibilityLabel="Open the sound effects lab"
    >
      <Icon name="VolumeHigh" size={20} color={theme.colors.text} variant="Bold" />
    </TouchableOpacity>
  );
}
