/**
 * ElementChip — a small, reusable link to an element's detail screen.
 *
 *   <ElementChip symbol="C" />            -> "C  Carbon"
 *   <ElementChip symbol="U" compact />    -> "U"
 *
 * Drop it into lessons, quizzes, Lab content or the encyclopedia. Unknown
 * symbols render nothing, so it is safe to pass content-driven values.
 */

import { useRouter } from "expo-router";
import React, { memo, useCallback, useMemo } from "react";
import { Pressable, Text, type StyleProp, type ViewStyle } from "react-native";

import { useCategoryColors } from "@/components/periodic-table/use-category-colors";
import { findElement, openElement } from "@/services/periodic-table";
import { createStyles, fontFaces, layout, useTheme } from "@/theme";

export interface ElementChipProps {
  /** Symbol ("C"), name ("Carbon") or atomic number. */
  symbol: string | number;
  /** Show only the symbol. */
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}

const CHIP_HEIGHT = 36;

const makeStyles = createStyles((theme) => ({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 8,
    minHeight: CHIP_HEIGHT,
    paddingHorizontal: 12,
    borderRadius: CHIP_HEIGHT / 2,
    borderWidth: 1.5,
  },
  symbol: {
    fontSize: 15,
    lineHeight: 20,
    ...fontFaces.heavy,
    color: theme.colors.text,
  },
  name: {
    fontSize: 13,
    lineHeight: 18,
    ...fontFaces.semibold,
    color: theme.colors.text,
  },
}));

function ElementChipBase({ symbol, compact = false, style }: ElementChipProps) {
  const router = useRouter();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const colors = useCategoryColors();
  const element = useMemo(() => findElement(symbol), [symbol]);
  const hitSlop = (layout.minTouchTarget - CHIP_HEIGHT) / 2;

  const onPress = useCallback(() => {
    if (element) openElement(router, element.symbol);
  }, [element, router]);

  if (!element) return null;
  const c = colors[element.category];

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${element.name}, element ${element.atomicNumber}. Opens the periodic table entry.`}
      hitSlop={hitSlop}
      onPress={onPress}
      android_ripple={{ color: c.accent }}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: c.fill, borderColor: pressed ? c.text : c.accent },
        pressed && { borderWidth: 3 },
        style,
      ]}
    >
      <Text style={styles.symbol} importantForAccessibility="no">{element.symbol}</Text>
      {compact ? null : (
        <Text style={styles.name} importantForAccessibility="no">{element.name}</Text>
      )}
    </Pressable>
  );
}

export const ElementChip = memo(ElementChipBase);
export default ElementChip;
