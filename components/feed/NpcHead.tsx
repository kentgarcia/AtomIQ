/**
 * An NPC's drawn head in a circle (the post's avatar, the reaction stack, the podium), reusing the
 * cast's art (`components/npc/Npc.tsx`). Still, never animated: a list of heads must stay cheap.
 * Decorative: the name is always real text beside it.
 */

import { memo } from "react";
import { View } from "react-native";

import { Npc as NpcView } from "@/components/npc/Npc";
import type { Npc } from "@/content/npcs";
import { createStyles, useTheme } from "@/theme";

const useStyles = createStyles((theme) => ({
  circle: { overflow: "hidden", alignItems: "center", backgroundColor: theme.colors.surfaceSoft },
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
  const art = size * 1.3;
  return (
    <View
      style={[styles.circle, ring && styles.ring, { width: size, height: size, borderRadius: size / 2 }]}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      {npc ? <NpcView spec={npc.spec} form="head" size={art} live={false} style={{ marginTop: -size * 0.07 }} /> : null}
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
