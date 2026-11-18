/**
 * ElementGrid — the full 18-column periodic table including the lanthanide and
 * actinide rows. Horizontally scrollable; the cell size is controlled by the
 * parent (zoom). Rows are memoized and cells are `React.memo`.
 */

import React, { memo, useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "@/components/ui/text";

import { ElementCell } from "@/components/periodic-table/ElementCell";
import type { CategoryColorMap } from "@/components/periodic-table/use-category-colors";
import {
  ELEMENTS,
  F_BLOCK_MARKERS,
  GRID_COLS,
  GRID_ROWS,
  type ElementCategory,
  type PeriodicElement,
} from "@/content/periodic-table/elements";
import { createStyles, fontFaces, useTheme } from "@/theme";

type Slot =
  | { kind: "element"; element: PeriodicElement }
  | { kind: "marker"; marker: (typeof F_BLOCK_MARKERS)[number] }
  | { kind: "empty" };

/** Slot table [row 1..10][col 1..18], built once at module load. */
const SLOT_ROWS: Slot[][] = (() => {
  const rows: Slot[][] = [];
  for (let r = 0; r < GRID_ROWS; r++) {
    rows.push(Array.from({ length: GRID_COLS }, () => ({ kind: "empty" }) as Slot));
  }
  for (const element of ELEMENTS) {
    rows[element.gridRow - 1][element.gridCol - 1] = { kind: "element", element };
  }
  for (const marker of F_BLOCK_MARKERS) {
    rows[marker.row - 1][marker.col - 1] = { kind: "marker", marker };
  }
  return rows;
})();

const GROUPS = Array.from({ length: GRID_COLS }, (_, i) => i + 1);
const PERIOD_LABEL_WIDTH = 22;
/** Per-cell outer footprint = size + 2 * margin (see ElementCell). */
const CELL_MARGIN = 1.5;

export interface ElementGridProps {
  cellSize: number;
  colors: CategoryColorMap;
  /** Atomic numbers matching the current search/filter. */
  matching: ReadonlySet<number>;
  reduceMotion: boolean;
  onPressElement: (symbol: string) => void;
  onPressMarker: (category: ElementCategory) => void;
  /** Category currently filtered (so a marker can show a selected state). */
  activeCategory: ElementCategory | null;
}

const makeStyles = createStyles((theme) => ({
  groupLabel: {
    textAlign: "center",
    fontSize: 10,
    lineHeight: 14,
    ...fontFaces.semibold,
    color: theme.colors.textSecondary,
  },
  periodLabel: {
    width: PERIOD_LABEL_WIDTH,
    textAlign: "center",
    fontSize: 10,
    ...fontFaces.semibold,
    color: theme.colors.textSecondary,
  },
  markerText: {
    fontSize: 10,
    lineHeight: 13,
    textAlign: "center",
    ...fontFaces.heavy,
    color: theme.colors.text,
  },
}));

function ElementGridBase({
  cellSize,
  colors,
  matching,
  reduceMotion,
  onPressElement,
  onPressMarker,
  activeCategory,
}: ElementGridProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const footprint = cellSize + CELL_MARGIN * 2;

  return (
    <ScrollView
      horizontal
      nestedScrollEnabled
      showsHorizontalScrollIndicator
      accessibilityLabel="Periodic table grid. Scroll sideways to see all 18 groups."
    >
      <View>
        <View style={gridStyles.row}>
          <View style={{ width: PERIOD_LABEL_WIDTH }} />
          {GROUPS.map((group) => (
            <Text
              key={group}
              style={[styles.groupLabel, { width: footprint }]}
              importantForAccessibility="no"
              maxFontSizeMultiplier={1.1}
            >
              {group}
            </Text>
          ))}
        </View>

        {SLOT_ROWS.map((slots, rowIndex) => {
          const row = rowIndex + 1;
          if (row === 8) {
            return <View key={row} style={{ height: Math.round(cellSize * 0.35) }} />;
          }
          return (
            <View key={row} style={gridStyles.row}>
              <Text style={styles.periodLabel} importantForAccessibility="no" maxFontSizeMultiplier={1.1}>
                {row <= 7 ? row : ""}
              </Text>
              {slots.map((slot, colIndex) => {
                if (slot.kind === "element") {
                  const { element } = slot;
                  return (
                    <ElementCell
                      key={element.atomicNumber}
                      element={element}
                      size={cellSize}
                      colors={colors[element.category]}
                      dimmed={!matching.has(element.atomicNumber)}
                      reduceMotion={reduceMotion}
                      onPress={onPressElement}
                    />
                  );
                }
                if (slot.kind === "marker") {
                  const { marker } = slot;
                  const c = colors[marker.category];
                  const selected = activeCategory === marker.category;
                  const name = marker.category === "lanthanide" ? "Lanthanides" : "Actinides";
                  return (
                    <Pressable
                      key={`m${colIndex}`}
                      accessibilityRole="button"
                      accessibilityLabel={`${name}, elements ${marker.from} to ${marker.to}, shown in the row below the table. Filter by ${name.toLowerCase()}.`}
                      accessibilityState={{ selected }}
                      onPress={() => onPressMarker(marker.category)}
                      style={[
                        gridStyles.marker,
                        {
                          width: cellSize,
                          height: cellSize,
                          backgroundColor: c.fill,
                          borderColor: selected ? c.text : c.accent,
                          borderWidth: selected ? 3 : 1.5,
                          borderStyle: "dashed",
                        },
                      ]}
                    >
                      <Text style={styles.markerText} maxFontSizeMultiplier={1.1} importantForAccessibility="no">
                        {marker.label}
                      </Text>
                    </Pressable>
                  );
                }
                return <View key={`e${colIndex}`} style={{ width: footprint, height: footprint }} />;
              })}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

export const ElementGrid = memo(ElementGridBase);

// Structure only; colors come from the theme/category colors above.
const gridStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  marker: {
    margin: CELL_MARGIN,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
});
