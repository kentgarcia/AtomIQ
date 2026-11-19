/**
 * An NPC's drawn head in a circle (the post's avatar, the reaction stack, the podium), reusing the
 * cast's art (`components/npc/Npc.tsx`). The top of the head pops out past the circle's edge while the
 * shoulders stay inside it (`pop` form). Still, never animated: a list of heads must stay cheap.
 * Decorative: the name is always real text beside it.
 */

import { memo } from "react";
import { StyleSheet, View } from "react-native";

import { Npc as NpcView } from "@/components/npc/Npc";
import { popLayout } from "@/components/npc/npc-art";
import type { Npc } from "@/content/npcs";
import { createStyles, useTheme } from "@/theme";

const useStyles = createStyles((theme) => ({
  /* The circle clips only its own colour; the figure is drawn over it, free at the top */
  circle: { backgroundColor: theme.colors.surfaceSoft },
  ring: { borderWidth: 2, borderColor: theme.colors.background },
}));

export interface NpcHeadProps {
  /** `null` while the cast loads: an empty circle. */
  npc: Npc | null | undefined;
  size?: number;
  /** A ring in the page colour, so overlapping heads read as separate (the reaction stack). */
  ring?: boolean;
}

export const NpcHead = memo(function NpcHead({ npc, size = 40, ring = false }: NpcHeadProps) {
  const styles = useStyles(useTheme().theme);
  const pop = popLayout(size);
  return (
    <View style={{ width: size, height: size }} accessible={false} importantForAccessibility="no-hide-descendants">
      <View style={[StyleSheet.absoluteFill, styles.circle, ring && styles.ring, { borderRadius: size / 2 }]} />
      {npc ? <NpcView spec={npc.spec} form="pop" size={pop.height} live={false} style={{ position: "absolute", left: pop.left, top: pop.top }} /> : null}
    </View>
  );
});

/** Up to three heads overlapping, left to right. */
export const HeadStack = memo(function HeadStack({ npcs, size = 28 }: { npcs: readonly (Npc | null | undefined)[]; size?: number }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }} accessible={false} importantForAccessibility="no-hide-descendants">
      {npcs.map((npc, i) => (
        <View key={npc?.id ?? i} style={{ marginLeft: i === 0 ? 0 : -size * 0.3 }}>
          <NpcHead npc={npc} size={size} ring />
        </View>
      ))}
    </View>
  );
});
