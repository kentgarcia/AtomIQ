/**
 * The shop's category tabs: one icon per category in a soft rounded strip, the chosen one lifted
 * onto a tinted tile. The label is for screen readers (the icons carry no text, like the reference).
 */

import { Pressable, View } from "react-native";

import { Icon } from "@/components/ui/icon";
import { impactLight } from "@/services/haptics";
import { playSfx } from "@/services/sfx";
import { createStyles, useTheme } from "@/theme";
import { controls } from "@/theme/tokens";

import { SHOP_TABS, type ShopTabId } from "./shop-core";

const useStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    strip: { flexDirection: "row", gap: 6, padding: 6, borderRadius: 20, backgroundColor: c.surfaceSoft },
    tab: { flex: 1, minHeight: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: controls.border, borderColor: "transparent" },
    tabOn: { backgroundColor: c.primarySurface, borderColor: c.primaryBorder },
    pressed: { opacity: 0.7 },
  };
});

export function CategoryTabs({ value, onChange }: { value: ShopTabId; onChange: (id: ShopTabId) => void }) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  return (
    <View style={styles.strip} accessibilityRole="tablist">
      {SHOP_TABS.map((cat) => {
        const on = cat.id === value;
        return (
          <Pressable
            key={cat.id}
            onPress={() => {
              if (on) return;
              impactLight();
              // Right for a tab after the current one, left for one before it
              void playSfx(SHOP_TABS.findIndex((t) => t.id === cat.id) > SHOP_TABS.findIndex((t) => t.id === value) ? "ui.tab-right" : "ui.tab-left");
              onChange(cat.id);
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
    </View>
  );
}
