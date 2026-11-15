import { useMemo } from "react";

import type { ElementCategory } from "@/content/periodic-table/elements";
import { CATEGORY_HUES, resolveCategoryColors, type CategoryChipColors } from "@/components/periodic-table/category-colors";
import { useTheme } from "@/theme";

export type CategoryColorMap = Record<ElementCategory, CategoryChipColors>;

/**
 * Category chip colors for the active theme: the theme surface tinted with the
 * category hue, with text taken from the theme text roles.
 */
export function useCategoryColors(): CategoryColorMap {
  const { theme, colorScheme } = useTheme();
  const { surface, text, textSecondary } = theme.colors;

  return useMemo(() => {
    const map = {} as CategoryColorMap;
    for (const key of Object.keys(CATEGORY_HUES) as ElementCategory[]) {
      map[key] = resolveCategoryColors(key, colorScheme, surface, text, textSecondary);
    }
    return map;
  }, [colorScheme, surface, text, textSecondary]);
}
