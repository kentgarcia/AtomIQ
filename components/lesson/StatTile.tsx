/**
 * A stat tile for the finish screen: a coloured shell with a small label across the top and a
 * rounded face inside holding an icon and a big value (XP, time, accuracy). The label text colour
 * is picked for contrast against the shell, never assumed white.
 */

import type { ReactNode } from "react";
import { Text, View } from "react-native";

import { createStyles, fontFaces, fontSizes, pickReadableText, radius, spacing, useTheme } from "@/theme";

const useStyles = createStyles((theme) => ({
  shell: { flex: 1, borderRadius: radius.xl, paddingHorizontal: 3, paddingBottom: 3 },
  label: { ...fontFaces.heavy, fontSize: fontSizes.md, letterSpacing: 0.8, textTransform: "uppercase", textAlign: "center", paddingVertical: spacing.xs },
  value: { ...fontFaces.black, fontSize: fontSizes["6xl"], color: theme.colors.text },
  face: { minHeight: 64, borderRadius: radius.lg, backgroundColor: theme.colors.surface, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xs, paddingHorizontal: spacing.xs },
}));

export function StatTile({ tone, label, value, icon, accessibilityLabel }: { tone: string; label: string; value: string; icon: ReactNode; accessibilityLabel: string }) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const c = theme.colors;
  return (
    <View style={[styles.shell, { backgroundColor: tone }]} accessible accessibilityLabel={accessibilityLabel}>
      <Text style={[styles.label, { color: pickReadableText(tone, [c.onPrimary, c.text]) }]} numberOfLines={1} adjustsFontSizeToFit>
        {label}
      </Text>
      <View style={styles.face}>
        {icon}
        <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Text>
      </View>
    </View>
  );
}
