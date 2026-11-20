/**
 * One item of the shop grid: a picture of the item and its price in diamonds under it. Tapping it
 * tries the item on the big avatar above.
 *
 * Paints and patterns are shown as a plain swatch (the paint colour with the pattern faint over it),
 * not as a drawn avatar: a grid holds dozens of tiles and the figure is by far the costliest part. The
 * swatch is what the item would make of the learner's current look, so a paint shows with their pattern
 * and a pattern shows over their paint. Other categories (skin now; hair, eyes and outfits later) change the figure
 * itself, so their tiles show a small avatar. What a tile says under the picture depends on the item's status: the
 * price in diamonds when it is for sale, "Level N" with a lock (and the picture dimmed) while the learner's level is too
 * low, "Owned" with a tick once it is theirs, and "Equipped" with a green tick badge and border when the avatar wears it.
 */

import { Image } from "expo-image";
import { memo, useMemo } from "react";
import { Pressable, View } from "react-native";

import { Avatar } from "@/components/avatar/Avatar";
import { avatarBackground, serializeAvatar, type AvatarConfig } from "@/components/avatar/avatar-core";
import { PatternLayer } from "@/components/avatar/PatternLayer";
import { PopWhen } from "@/components/motion/PopOnce";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { createStyles, fontFaces, useTheme, withAlpha } from "@/theme";
import { controls } from "@/theme/tokens";

import { previewConfig, tileZoom, type ItemStatus, type ShopItem } from "./shop-core";

const DIAMOND_ICON = require("@/assets/images/icons/diamond.png");

const useStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    tile: { alignItems: "center", gap: 6, paddingTop: 10, paddingBottom: 8, borderRadius: 18, backgroundColor: c.surfaceSoft, borderWidth: controls.border, borderColor: "transparent" },
    tileOn: { backgroundColor: c.primarySurface, borderColor: c.primaryBorder },
    tileWorn: { borderColor: c.success },
    slot: { alignSelf: "stretch", alignItems: "center" },
    dim: { opacity: 0.45 },
    // The corner badge: a green tick when worn, a lock while the level is too low
    badge: { position: "absolute", top: 6, right: 6, width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
    badgeWorn: { backgroundColor: c.success },
    badgeLocked: { backgroundColor: c.text },
    swatch: { alignSelf: "stretch", height: 64, marginHorizontal: 10, borderRadius: 14, overflow: "hidden" },
    // A pattern's tile: the pattern alone, zoomed in, in grey (its colour comes from the paint it is put over)
    patternSwatch: { backgroundColor: withAlpha(c.textMuted, 0.5) },
    freeText: { fontSize: 14, ...fontFaces.heavy, color: c.success },
    // The press sinks the tile like every other 3D control (no fading)
    pressed: { transform: [{ translateY: controls.pressTravel }] },
    price: { flexDirection: "row", alignItems: "center", gap: 4 },
    diamond: { width: 16, height: 16 },
    wornText: { fontSize: 14, ...fontFaces.heavy, color: c.success },
    ownedText: { fontSize: 14, ...fontFaces.heavy, color: c.textMuted },
    lockedText: { fontSize: 14, ...fontFaces.heavy, color: c.textMuted },
    priceText: { fontSize: 14, ...fontFaces.heavy, color: c.text, fontVariant: ["tabular-nums"] },
  };
});

/** What a screen reader says after the name. */
const STATUS_WORDS: Record<ItemStatus, (item: ShopItem) => string> = {
  equipped: () => "equipped",
  owned: () => "owned",
  locked: (item) => `locked until level ${item.level}`,
  "for-sale": (item) => (item.price === 0 ? "free" : `${item.price} diamonds`),
};

export const ItemTile = memo(function ItemTile({
  item,
  base,
  selected,
  status,
  onPress,
  label,
}: {
  item: ShopItem;
  /** The avatar the learner has now; the item is tried on a copy of it. */
  base: AvatarConfig;
  selected: boolean;
  /** Worn, owned, locked behind a level, or for sale. */
  status: ItemStatus;
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
      accessibilityLabel={`${label}, ${STATUS_WORDS[status](item)}`}
      accessibilityState={{ selected }}
      style={({ pressed }) => [styles.tile, selected && styles.tileOn, status === "equipped" && styles.tileWorn, pressed && styles.pressed]}
    >
      <View style={[styles.slot, status === "locked" && styles.dim]}>
        {item.category === "pattern" ? (
          <View style={[styles.swatch, styles.patternSwatch]}>
            <PatternLayer pattern={item.value} tile={104} />
          </View>
        ) : flat ? (
          <View style={[styles.swatch, { backgroundColor: avatarBackground(look) }]}>
            <PatternLayer pattern={look.pattern} tile={48} />
          </View>
        ) : (
          <Avatar value={serializeAvatar(look)} size={64} radius={16} zoom={tileZoom(item.category)} />
        )}
      </View>
      {status === "equipped" || status === "locked" ? (
        <View style={[styles.badge, status === "equipped" ? styles.badgeWorn : styles.badgeLocked]}>
          <Icon name={status === "equipped" ? "TickCircle" : "Lock"} size={14} color={theme.colors.card} variant="Bold" />
        </View>
      ) : null}
      <View style={styles.price}>
        {status === "equipped" ? (
          <Text style={styles.wornText}>Equipped</Text>
        ) : status === "owned" ? (
          <>
            <Icon name="TickCircle" size={15} color={theme.colors.textMuted} variant="Bold" />
            <Text style={styles.ownedText}>Owned</Text>
          </>
        ) : status === "locked" ? (
          <>
            <Icon name="Lock" size={14} color={theme.colors.textMuted} variant="Bold" />
            <Text style={styles.lockedText}>Level {item.level}</Text>
          </>
        ) : item.price === 0 ? (
          <Text style={styles.freeText}>Free</Text>
        ) : (
          <>
            <Image source={DIAMOND_ICON} style={styles.diamond} contentFit="contain" />
            <Text style={styles.priceText}>{item.price}</Text>
          </>
        )}
      </View>
    </Pressable>
    </PopWhen>
  );
});
