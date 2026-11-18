/**
 * ElementCell — one square of the periodic-table grid. Memoized: it only
 * re-renders when its own props change, so 118 cells stay cheap.
 */

import React, { memo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "@/components/ui/text";

import type { CategoryChipColors } from "@/components/periodic-table/category-colors";
import type { PeriodicElement } from "@/content/periodic-table/elements";
import { elementAccessibilityLabel } from "@/services/periodic-table";
import { fontFaces } from "@/theme";

export interface ElementCellProps {
  element: PeriodicElement;
  size: number;
  colors: CategoryChipColors;
  /** Does not match the current search/filter: shown faded. */
  dimmed: boolean;
  /** Skip the press scale when the user prefers reduced motion. */
  reduceMotion: boolean;
  onPress: (symbol: string) => void;
}

/** Cells smaller than this hide the element name (it is still announced). */
const NAME_MIN_SIZE = 56;

function ElementCellBase({ element, size, colors, dimmed, reduceMotion, onPress }: ElementCellProps) {
  const showName = size >= NAME_MIN_SIZE;
  const label = dimmed
    ? `${elementAccessibilityLabel(element)}, does not match the current search or filter`
    : elementAccessibilityLabel(element);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Opens the element details"
      onPress={() => onPress(element.symbol)}
      android_ripple={{ color: colors.accent, foreground: true }}
      style={({ pressed }) => [
        styles.cell,
        {
          width: size,
          height: size,
          backgroundColor: colors.fill,
          borderColor: pressed ? colors.text : colors.accent,
          // Pressed is shown by a thicker border and, when motion is allowed,
          // a small scale; never by colour alone.
          borderWidth: pressed ? 3 : 1.5,
          opacity: dimmed ? 0.28 : 1,
          transform: pressed && !reduceMotion ? [{ scale: 0.94 }] : undefined,
        },
      ]}
    >
      <Text
        style={[styles.number, { color: colors.textSecondary }]}
        maxFontSizeMultiplier={1.1}
        importantForAccessibility="no"
      >
        {element.atomicNumber}
      </Text>
      <Text
        style={[styles.symbol, { color: colors.text, fontSize: Math.round(size * 0.36) }]}
        maxFontSizeMultiplier={1.1}
        importantForAccessibility="no"
      >
        {element.symbol}
      </Text>
      {showName ? (
        <Text
          style={[styles.name, { color: colors.text }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
          maxFontSizeMultiplier={1.1}
          importantForAccessibility="no"
        >
          {element.name}
        </Text>
      ) : (
        <View style={styles.nameSpacer} />
      )}
    </Pressable>
  );
}

export const ElementCell = memo(ElementCellBase);

// Structure only; colors are applied from the active theme above.
const styles = StyleSheet.create({
  cell: {
    margin: 1.5,
    borderRadius: 8,
    paddingHorizontal: 2,
    paddingTop: 2,
    paddingBottom: 3,
    alignItems: "center",
    justifyContent: "space-between",
    overflow: "hidden",
  },
  number: {
    alignSelf: "flex-start",
    marginLeft: 3,
    fontSize: 9,
    lineHeight: 11,
    ...fontFaces.semibold,
  },
  symbol: {
    ...fontFaces.heavy,
    includeFontPadding: false,
  },
  name: {
    maxWidth: "100%",
    fontSize: 9,
    lineHeight: 11,
    ...fontFaces.semibold,
  },
  nameSpacer: {
    height: 4,
  },
});
