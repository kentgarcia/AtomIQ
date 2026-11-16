/**
 * Encyclopedia tab pieces for the Discovery Hub: the Periodic Table banner
 * and a compact entry row. The full A–Z vault with filters stays on the
 * /encyclopedia screen.
 */

import { useRouter } from "expo-router";
import React, { memo, useMemo } from "react";
import { Pressable, Text, View } from "react-native";

import { Icon } from "@/components/ui/icon";
import type { EncyclopediaEntry } from "@/content/explorer";
import { impactLight } from "@/services/haptics";
import { ELEMENTS, PERIODIC_TABLE_HREF } from "@/services/periodic-table";
import { createStyles, fontFaces, radius, useTheme, withAlpha } from "@/theme";

export function PeriodicTableBanner() {
  const router = useRouter();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open the Periodic Table, all ${ELEMENTS.length} elements`}
      onPress={() => {
        impactLight();
        router.push(PERIODIC_TABLE_HREF);
      }}
      style={({ pressed }) => [styles.banner, pressed && styles.pressed]}
    >
      <View style={styles.bannerIcon}>
        <Icon name="Element4" size={24} color={theme.colors.info} variant="Bold" />
      </View>
      <View style={styles.flex}>
        <Text style={styles.bannerTitle}>Periodic Table</Text>
        <Text style={styles.meta}>Tap any of the {ELEMENTS.length} elements to explore</Text>
      </View>
      <Icon name="ArrowRight2" size={18} color={theme.colors.textMuted} variant="Bold" />
    </Pressable>
  );
}

function EncyclopediaRowBase({ entry }: { entry: EncyclopediaEntry }) {
  const router = useRouter();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${entry.term}. ${entry.definition}`}
      onPress={() => {
        impactLight();
        router.push(`/explorer/encyclopedia-entry?id=${entry.id}`);
      }}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.flex}>
        <Text style={styles.category}>{entry.category.toUpperCase()}</Text>
        <Text style={styles.term}>{entry.term}</Text>
        <Text style={styles.definition} numberOfLines={2}>
          {entry.definition}
        </Text>
      </View>
      <Icon name="ArrowRight2" size={16} color={theme.colors.primaryLight} variant="Bold" />
    </Pressable>
  );
}

export const EncyclopediaRow = memo(EncyclopediaRowBase);

const makeStyles = createStyles((theme) => {
  const c = theme.colors;
  const card = {
    borderRadius: radius["2xl"],
    backgroundColor: c.card,
    borderWidth: 2,
    borderColor: c.border,
    borderBottomWidth: 4,
  } as const;
  return {
    flex: { flex: 1 },
    pressed: { borderBottomWidth: 2, marginTop: 2, marginBottom: -2 },
    banner: {
      ...card,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 12,
      marginBottom: 14,
    },
    bannerIcon: {
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: withAlpha(c.info, 0.16),
    },
    bannerTitle: { fontSize: 16, color: c.text, ...fontFaces.heavy },
    meta: { fontSize: 12, color: c.textMuted, ...fontFaces.semibold },
    row: {
      ...card,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 14,
      marginBottom: 12,
    },
    category: { fontSize: 11, letterSpacing: 0.6, color: c.primaryLight, ...fontFaces.heavy },
    term: { fontSize: 17, color: c.text, marginTop: 2, ...fontFaces.heavy },
    definition: {
      fontSize: 13,
      lineHeight: 19,
      color: c.textSecondary,
      marginTop: 4,
      ...fontFaces.regular,
    },
  };
});
