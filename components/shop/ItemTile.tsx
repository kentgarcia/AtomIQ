/**
 * One item of the shop grid: a picture of the item and its price in diamonds under it. Tapping it
 * tries the item on the big avatar above.
 *
 * Paints and patterns are shown as a plain swatch (the paint colour with the pattern faint over it),
 * not as a drawn avatar: a grid holds dozens of tiles and the figure is by far the costliest part. The
 * swatch is what the item would make of the learner's current look, so a paint shows with their pattern
 * and a pattern shows over their paint. Other categories (hair, eyes, outfits, skin) change the figure
 * itself, so their tiles will show a small avatar.
 */

import { Image } from "expo-image";
import { memo, useMemo } from "react";
import { Pressable, View } from "react-native";

import { Avatar } from "@/components/avatar/Avatar";
import { avatarBackground, serializeAvatar, type AvatarConfig } from "@/components/avatar/avatar-core";
import { PatternLayer } from "@/components/avatar/PatternLayer";
import { PopWhen } from "@/components/motion/PopOnce";
import { Text } from "@/components/ui/text";
import { createStyles, fontFaces, useTheme } from "@/theme";
import { controls } from "@/theme/tokens";

import { previewConfig, type ShopItem } from "./shop-core";

const DIAMOND_ICON = require("@/assets/images/icons/diamond.png");

const useStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    tile: { alignItems: "center", gap: 6, paddingTop: 10, paddingBottom: 8, borderRadius: 18, backgroundColor: c.surfaceSoft, borderWidth: controls.border, borderColor: "transparent" },
    tileOn: { backgroundColor: c.primarySurface, borderColor: c.primaryBorder },
    swatch: { alignSelf: "stretch", height: 64, marginHorizontal: 10, borderRadius: 14, overflow: "hidden" },
    // The press sinks the tile like every other 3D control (no fading)
    pressed: { transform: [{ translateY: controls.pressTravel }] },
    price: { flexDirection: "row", alignItems: "center", gap: 4 },
    diamond: { width: 16, height: 16 },
    priceText: { fontSize: 14, ...fontFaces.heavy, color: c.text, fontVariant: ["tabular-nums"] },
  };
});

export const ItemTile = memo(function ItemTile({
  item,
  base,
  selected,
  onPress,
  label,
}: {
  item: ShopItem;
  /** The avatar the learner has now; the item is tried on a copy of it. */
  base: AvatarConfig;
  selected: boolean;
  /** Gets the item back, so one stable function can serve every tile (an inline one would re-render them all). */
  onPress: (item: ShopItem) => void;
  /** What a screen reader says (the item's name). */
  label: string;
}) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const look = useMemo(() => previewConfig(base, item), [base, item]);
  const flat = item.category === "paint" || item.category === "pattern";
  return (
    // A tile that becomes the one being tried on pops (it flips its colour at once); putting it down does not
    <PopWhen trigger={selected} active={selected} intensity={0.7} sparkleColor={theme.colors.primary}>
    <Pressable
      onPress={() => onPress(item)}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${item.price} diamonds`}
      accessibilityState={{ selected }}
      style={({ pressed }) => [styles.tile, selected && styles.tileOn, pressed && styles.pressed]}
    >
      {flat ? (
        <View style={[styles.swatch, { backgroundColor: avatarBackground(look) }]}>
          <PatternLayer pattern={look.pattern} tile={48} />
        </View>
      ) : (
        <Avatar value={serializeAvatar(look)} size={64} radius={16} />
      )}
      <View style={styles.price}>
        <Image source={DIAMOND_ICON} style={styles.diamond} contentFit="contain" />
        <Text style={styles.priceText}>{item.price}</Text>
      </View>
    </Pressable>
    </PopWhen>
  );
});
