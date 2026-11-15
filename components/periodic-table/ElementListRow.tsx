/**
 * ElementListRow — the non-grid alternative: one full-width, text-first row per
 * element. Default for screen readers, compact widths and large font scales.
 */

import React, { memo, useMemo } from "react";
import { Pressable, Text, View } from "react-native";

import type { CategoryChipColors } from "@/components/periodic-table/category-colors";
import { CATEGORY_LABELS, type PeriodicElement } from "@/content/periodic-table/elements";
import { elementAccessibilityLabel, formatAtomicMass } from "@/services/periodic-table";
import { Icon } from "@/components/ui/icon";
import { createStyles, fontFaces, layout, useTheme } from "@/theme";

export interface ElementListRowProps {
  element: PeriodicElement;
  colors: CategoryChipColors;
  onPress: (symbol: string) => void;
}

const makeStyles = createStyles((theme) => ({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: layout.minTouchTarget + 16,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  badge: {
    width: 52,
    height: 52,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeNumber: {
    fontSize: 10,
    lineHeight: 12,
    ...fontFaces.semibold,
  },
  badgeSymbol: {
    fontSize: 20,
    lineHeight: 24,
    ...fontFaces.heavy,
    includeFontPadding: false,
  },
  copy: { flex: 1, gap: 2 },
  name: {
    fontSize: 16,
    lineHeight: 22,
    ...fontFaces.heavy,
    color: theme.colors.text,
  },
  meta: {
    fontSize: 13,
    lineHeight: 18,
    ...fontFaces.semibold,
    color: theme.colors.textSecondary,
  },
}));

function ElementListRowBase({ element, colors, onPress }: ElementListRowProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={elementAccessibilityLabel(element)}
      accessibilityHint="Opens the element details"
      onPress={() => onPress(element.symbol)}
      android_ripple={{ color: colors.accent }}
      style={({ pressed }) => [
        styles.row,
        // Pressed: thicker, high-contrast border plus a dip in opacity.
        pressed && { borderColor: theme.colors.text, borderWidth: 3, opacity: 0.9 },
      ]}
    >
      <View style={[styles.badge, { backgroundColor: colors.fill, borderColor: colors.accent }]}>
        <Text style={[styles.badgeNumber, { color: colors.textSecondary }]} importantForAccessibility="no">
          {element.atomicNumber}
        </Text>
        <Text style={[styles.badgeSymbol, { color: colors.text }]} importantForAccessibility="no">
          {element.symbol}
        </Text>
      </View>
      <View style={styles.copy}>
        <Text style={styles.name} importantForAccessibility="no">{element.name}</Text>
        <Text style={styles.meta} importantForAccessibility="no">
          {CATEGORY_LABELS[element.category]} · {formatAtomicMass(element)} u
        </Text>
      </View>
      <Icon name="ArrowRight2" size={18} color={theme.colors.textSecondary} variant="Bold" />
    </Pressable>
  );
}

export const ElementListRow = memo(ElementListRowBase);
