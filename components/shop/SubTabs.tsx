/**
 * The vertical tabs inside the shelf, for a shop tab that holds several categories (the face: eyebrows, eyes, nose,
 * mouth, ears): a soft rounded column down the left of the shelf, one icon each, the chosen one lifted onto a tinted
 * tile like the row of tabs above. The label is for screen readers. If the shelf is shorter than the column, it scrolls.
 */

import { Pressable, ScrollView, View } from "react-native";

import { Icon } from "@/components/ui/icon";
import { impactLight } from "@/services/haptics";
import { playSfx } from "@/services/sfx";
import { createStyles, useTheme } from "@/theme";
import { controls } from "@/theme/tokens";

import { categoryById, type ShopCategoryId } from "./shop-core";

/** The width of the column, for laying the grid out beside it. */
export const SUB_TABS_WIDTH = 64;

const useStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    strip: { width: SUB_TABS_WIDTH, backgroundColor: c.surfaceSoft },
    content: { gap: 6, padding: 6 },
    tab: { minHeight: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: controls.border, borderColor: "transparent" },
    tabOn: { backgroundColor: c.primarySurface, borderColor: c.primaryBorder },
    pressed: { opacity: 0.7 },
  };
});

export function SubTabs({ categories, value, onChange }: { categories: readonly ShopCategoryId[]; value: ShopCategoryId; onChange: (id: ShopCategoryId) => void }) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  return (
    <View style={styles.strip} accessibilityRole="tablist">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} bounces={false}>
        {categories.map((id) => {
          const cat = categoryById(id);
          const on = id === value;
          return (
            <Pressable
              key={id}
              onPress={() => {
                if (on) return;
                impactLight();
                // Right for a shelf after the current one, left for one before it
                void playSfx(categories.indexOf(id) > categories.indexOf(value) ? "ui.tab-right" : "ui.tab-left");
                onChange(id);
              }}
              accessibilityRole="tab"
              accessibilityLabel={cat.label}
              accessibilityState={{ selected: on }}
              style={({ pressed }) => [styles.tab, on && styles.tabOn, pressed && !on && styles.pressed]}
            >
              <Icon name={cat.icon} size={24} color={on ? theme.colors.primary : theme.colors.textMuted} variant="Bold" />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
