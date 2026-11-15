import { useWindowDimensions } from "react-native";

import type { VisualResponsiveHint } from "@/content/types";
import { getColumnCount, useResponsiveLayout } from "@/theme/layout";

export interface VisualLayout {
  isTablet: boolean;
  isLargeText: boolean;
  /** Labels fall back to a stacked list under the figure (tight width or large OS font). */
  stacked: boolean;
  /** Figure beside its legend (tablet, not stacked, hint allows it). */
  sideBySide: boolean;
  /** Column count for card grids. */
  columns: number;
  /** Usable width for a block, in dp. */
  blockWidth: number;
}

/**
 * Responsive decisions for a visual block. `availableWidth` is the width of
 * the container hosting the block (the lesson card), when known.
 */
export function useVisualLayout(
  hint?: VisualResponsiveHint,
  availableWidth?: number,
): VisualLayout {
  const layout = useResponsiveLayout();
  const { width } = useWindowDimensions();
  const blockWidth = Math.max(0, availableWidth ?? layout.contentWidth ?? width);
  const stackBelow = hint?.stackBelow ?? 280;
  const stacked = layout.isLargeText || blockWidth < stackBelow;
  const sideBySide =
    layout.isTablet && !stacked && (hint?.tabletLayout ?? "side-by-side") === "side-by-side";
  const columns = layout.isLargeText
    ? 1
    : getColumnCount(blockWidth, { minItemWidth: 150, maxColumns: layout.isTablet ? 3 : 2 });
  return {
    isTablet: layout.isTablet,
    isLargeText: layout.isLargeText,
    stacked,
    sideBySide,
    columns,
    blockWidth,
  };
}
