/**
 * "Unlocked in the shop": the little pictures of what a level opened, for the level-up dialog. Each tile arrives in turn (a
 * rise and a pop, `step` ms apart, from `at` ms after it mounts), drawn like the shop's own tiles: the avatar wearing the
 * item (a close-up for small things, `tileZoom`), a paint as its colour, a pattern as zoomed grey. When more were opened than
 * there is room for, the last tile says how many more ("+4"). Decorative to the eye, but each tile has its item's name for
 * screen readers and the heading says how many.
 */

import { View } from "react-native";
import { useReducedMotion } from "@/components/motion/use-reduced-motion";

import { Avatar } from "@/components/avatar/Avatar";
import { avatarBackground, serializeAvatar, type AvatarConfig } from "@/components/avatar/avatar-core";
import { PatternLayer } from "@/components/avatar/PatternLayer";
import { LEVEL_UNLOCKS } from "@/components/celebration/celebration-core";
import { PopOnce } from "@/components/motion/PopOnce";
import { Reveal } from "@/components/motion/Reveal";
import { Icon } from "@/components/ui/icon";
import { SfxOnMount } from "@/components/ui/sfx-on-mount";
import { Text } from "@/components/ui/text";
import { createStyles, fontFaces, useTheme, withAlpha } from "@/theme";

import { featuredUnlocks, previewConfig, tileZoom, type ShopItem } from "./shop-core";

const TILE = 60;

const useStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    box: { alignSelf: "stretch", alignItems: "center", gap: 10, paddingTop: 4 },
    heading: { flexDirection: "row", alignItems: "center", gap: 6 },
    title: { fontSize: 15, ...fontFaces.bold, color: c.textSecondary, textAlign: "center" },
    grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 10 },
    tile: { width: TILE, height: TILE, borderRadius: 16, overflow: "hidden", backgroundColor: c.surfaceSoft },
    pattern: { backgroundColor: withAlpha(c.textMuted, 0.5) },
    more: { alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: c.border },
    moreText: { fontSize: 18, ...fontFaces.heavy, color: c.textSecondary },
  };
});

function Picture({ item, base }: { item: ShopItem; base: AvatarConfig }) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const look = previewConfig(base, item);
  if (item.category === "paint") {
    return (
      <View style={[styles.tile, { backgroundColor: avatarBackground(look) }]}>
        <PatternLayer pattern={base.pattern} tile={30} />
      </View>
    );
  }
  if (item.category === "pattern") {
    return (
      <View style={[styles.tile, styles.pattern]}>
        <PatternLayer pattern={item.value} tile={70} />
      </View>
    );
  }
  return <Avatar value={serializeAvatar(look)} size={TILE} radius={16} zoom={tileZoom(item.category)} />;
}

export function UnlockedItems({ items, base, at }: { items: readonly ShopItem[]; base: AvatarConfig; at: number }) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const reduced = useReducedMotion();
  if (items.length === 0) return null;
  // When there are more than fit, one place goes to "+N" so the learner knows there is more to see
  const room = items.length > LEVEL_UNLOCKS.max ? LEVEL_UNLOCKS.max - 1 : LEVEL_UNLOCKS.max;
  const shown = featuredUnlocks(items, room);
  const rest = items.length - shown.length;
  const tiles: { key: string; label: string; node: React.ReactNode }[] = shown.map((item) => ({ key: item.id, label: item.name, node: <Picture item={item} base={base} /> }));
  if (rest > 0) {
    tiles.push({ key: "more", label: `${rest} more`, node: (
      <View style={[styles.tile, styles.more]}>
        <Text style={styles.moreText}>{`+${rest}`}</Text>
      </View>
    ) });
  }
  return (
    <View style={styles.box}>
      <Reveal at={at} style={styles.heading}>
        <Icon name="Unlock" size={18} color={theme.colors.textSecondary} variant="Bold" />
        <Text style={styles.title} accessibilityRole="header">{items.length === 1 ? "1 new item in the shop" : `${items.length} new items in the shop`}</Text>
      </Reveal>
      <View style={styles.grid} accessibilityLabel={`Unlocked: ${shown.map((i) => i.name).join(", ")}${rest > 0 ? `, and ${rest} more` : ""}`} accessible>
        {tiles.map((t, i) => {
          const tileAt = at + 120 + i * LEVEL_UNLOCKS.unlockedStep;
          return (
            <Reveal key={t.key} at={tileAt}>
              {/* A rising tick as each item tile arrives (the "+N" tile is not an item); reduced motion shows them all at once */}
              {!reduced && i < shown.length ? <SfxOnMount cue="levelup.item" index={i} delay={tileAt} /> : null}
              <PopOnce at={tileAt} sparkles={false} intensity={0.7}>
                {t.node}
              </PopOnce>
            </Reveal>
          );
        })}
      </View>
    </View>
  );
}
