/**
 * The button that opens the performance probe: a small gauge beside the SFX lab button on Home. Rendered only when
 * `PERF_PROBE_ON` (see perf-flag.ts). TO REMOVE: delete `components/dev/perf-*`, `Perf*.tsx`, `sfx-stress.ts`, `app/dev-perf.tsx`
 * and the lines marked `dev-perf` in `app/(tabs)/index.tsx` and `app/_layout.tsx`.
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
      left: 124,
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

export function PerfFab({ bottom }: { bottom: number }) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const router = useRouter();
  return (
    <TouchableOpacity
      style={[styles.fab, { bottom }]}
      activeOpacity={0.85}
      hitSlop={4}
      onPress={() => router.push("/dev-perf" as never)}
      accessibilityRole="button"
      accessibilityLabel="Open the performance probe"
    >
      <Icon name="Flash" size={20} color={theme.colors.text} variant="Bold" />
    </TouchableOpacity>
  );
}
