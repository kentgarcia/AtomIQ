/**
 * The eyebrow pill that names what kind of card this is (EXPLAIN, PICK ONE, MYTH OR FACT, ...)
 * and, in the run's top bar, what kind of run it is (PRACTICE, CHECKPOINT, ...).
 * Colours are theme roles: `primary` uses the orange surface, the others a tint of the role
 * with the normal text colour so contrast never depends on the role colour.
 */

import { Text, View } from "react-native";

import { Icon } from "@/components/ui/icon";
import { createStyles, fontFaces, fontSizes, radius, spacing, useTheme, withAlpha } from "@/theme";

export type BadgeTone = "primary" | "gold" | "info";

const useStyles = createStyles(() => ({
  pill: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: spacing.xs, paddingVertical: spacing.xs, paddingHorizontal: spacing.md, borderRadius: radius.full },
  pillCompact: { paddingVertical: spacing.xxs, paddingHorizontal: spacing.sm },
  text: { ...fontFaces.bold, fontSize: fontSizes.md, letterSpacing: 0.6, textTransform: "uppercase" },
  textCompact: { fontSize: fontSizes.sm },
}));

export function CardBadge({ icon, label, tone = "primary", compact }: { icon: string; label: string; tone?: BadgeTone; compact?: boolean }) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const c = theme.colors;
  const hue = tone === "gold" ? c.gold : tone === "info" ? c.info : c.primaryLight;
  const background = tone === "primary" ? c.primarySurface : withAlpha(hue, 0.18);
  const text = tone === "primary" ? c.primaryLight : c.text;
  // Gold is too pale to read as an icon on a light tint, so the gold chip keeps a text-coloured icon.
  const iconColor = tone === "gold" ? c.text : hue;
  return (
    <View style={[styles.pill, compact && styles.pillCompact, { backgroundColor: background }]}>
      <Icon name={icon} size={compact ? 14 : 16} color={iconColor} />
      <Text style={[styles.text, compact && styles.textCompact, { color: text }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}
