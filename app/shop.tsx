/**
 * The shop: a striped awning for a roof, the learner's avatar standing on a solid colour under it
 * (idle animation, standing on the panel's top edge), a back button and the diamond balance, and a
 * rounded panel at the bottom with the category tabs and a dashed area for the items: paints and patterns so far, the other tabs show an
 * empty shelf. Tapping an item tries it on the avatar; buying is not built yet. Opened from the Profile header.
 */

import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Pressable, View, useWindowDimensions, type LayoutChangeEvent } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "@/components/avatar/Avatar";
import { avatarBackground, normalizeAvatar, serializeAvatar } from "@/components/avatar/avatar-core";
import { PatternLayer } from "@/components/avatar/PatternLayer";
import { PopWhen } from "@/components/motion/PopOnce";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { AWNING_BAND, AWNING_LIP, Awning } from "@/components/shop/Awning";
import { awningHeight } from "@/components/shop/awning-core";
import { CategoryTabs } from "@/components/shop/CategoryTabs";
import { ItemTile } from "@/components/shop/ItemTile";
import { SHOP_CATEGORIES, categoryById, itemsIn, previewConfig, type ShopCategoryId, type ShopItem } from "@/components/shop/shop-core";
import { useDiamonds } from "@/hooks/use-wallet";
import { useStorage } from "@/services/StorageContext";
import { createStyles, fontFaces, useResponsiveLayout, useTheme } from "@/theme";
import { controls } from "@/theme/tokens";
import { select } from "@/services/haptics";
import { playSfx, stopSfx } from "@/services/sfx";

const DIAMOND_ICON = require("@/assets/images/icons/diamond.png");
const SIDE = 20;
const GAP = 12;
const COLUMNS = 3;
const BAR = 44;

const useStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    root: { flex: 1 },
    top: { flex: 1, alignItems: "center", justifyContent: "flex-end", zIndex: 0 },
    bar: { position: "absolute", left: SIDE, right: SIDE, height: BAR, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    round: { width: BAR, height: BAR, borderRadius: BAR / 2, alignItems: "center", justifyContent: "center", backgroundColor: c.card, borderWidth: controls.border, borderColor: c.border },
    pill: { height: BAR, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, borderRadius: BAR / 2, backgroundColor: c.card, borderWidth: controls.border, borderColor: c.border },
    diamond: { width: 24, height: 24 },
    balance: { fontSize: 18, ...fontFaces.heavy, color: c.info, fontVariant: ["tabular-nums"] },
    panel: { borderTopLeftRadius: 32, borderTopRightRadius: 32, backgroundColor: c.card, paddingHorizontal: SIDE, paddingTop: 20, gap: 16, width: "100%", alignSelf: "center" },
    shelf: { flex: 1, borderRadius: 24, borderWidth: controls.border, borderStyle: "dashed", borderColor: c.border, overflow: "hidden" },
    shelfContent: { flexGrow: 1, padding: 14, gap: GAP },
    gridRow: { gap: GAP },
    empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 24, paddingVertical: 24 },
    emptyIcon: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", backgroundColor: c.surfaceSoft },
    emptyTitle: { fontSize: 17, textAlign: "center", ...fontFaces.heavy, color: c.text },
    emptyText: { fontSize: 14, lineHeight: 20, textAlign: "center", ...fontFaces.medium, color: c.textMuted },
  };
});

export default function ShopScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const insets = useSafeAreaInsets();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const { contentMaxWidth } = useResponsiveLayout();
  const { userProfile } = useStorage();
  const diamonds = useDiamonds();

  // The shop jingle plays as it opens and is cut when the learner leaves (docs/SFX_SPEC.md §6.5)
  useEffect(() => {
    void playSfx("ui.shop-open");
    return () => stopSfx("ui.shop-open");
  }, []);

  const base = useMemo(() => normalizeAvatar(userProfile?.avatar_url), [userProfile?.avatar_url]);
  const [category, setCategory] = useState<ShopCategoryId>(SHOP_CATEGORIES[0].id);
  const [trying, setTrying] = useState<ShopItem | null>(null);
  const [shelfWidth, setShelfWidth] = useState(0);
  const [topHeight, setTopHeight] = useState(0);

  // Tapping an item must not re-render every tile: the handler is stable and reads the current pick from a ref
  const tryingRef = useRef<ShopItem | null>(null);
  useEffect(() => {
    tryingRef.current = trying;
  }, [trying]);
  const onTry = useCallback((item: ShopItem) => {
    const putDown = tryingRef.current?.id === item.id;
    select();
    void playSfx(putDown ? "ui.unequip" : "ui.equip");
    setTrying(putDown ? null : item);
  }, []);
  const items = useMemo(() => itemsIn(category), [category]);
  const label = categoryById(category).label;
  // The avatar shown big: the one the learner has, with the item they tapped tried on.
  const look = useMemo(() => (trying ? previewConfig(base, trying) : base), [base, trying]);
  const shown = useMemo(() => serializeAvatar(look), [look]);

  const itemWidth = Math.max(0, Math.floor((shelfWidth - 28 - GAP * (COLUMNS - 1)) / COLUMNS));
  const roof = awningHeight(insets.top + AWNING_BAND, AWNING_LIP);
  const avatarSize = Math.max(120, Math.min(260, topHeight - roof - 12));
  const panelHeight = Math.min(Math.round(windowHeight * 0.5), 460);

  return (
    <View style={[styles.root, { backgroundColor: avatarBackground(look) }]}>
      <PatternLayer pattern={look.pattern} tile={120} />
      <View style={styles.top} onLayout={(e: LayoutChangeEvent) => setTopHeight(e.nativeEvent.layout.height)}>
        {/* Trying something on: the avatar squashes and pops as the new look appears; putting it down does not */}
        <PopWhen trigger={trying?.id ?? null} active={trying !== null} intensity={0.45} sparkleColor={theme.colors.lessonHeader}>
          <Avatar value={shown} size={avatarSize} bare live />
        </PopWhen>
        <View style={[styles.bar, { top: roof + 10 }]}>
          <Pressable onPress={() => router.back()} hitSlop={6} accessibilityRole="button" accessibilityLabel="Go back" style={({ pressed }) => [styles.round, pressed && { opacity: 0.6 }]}>
            <Icon name="ArrowLeft2" size={22} color={theme.colors.text} variant="Bold" />
          </Pressable>
          <View style={styles.pill} accessible accessibilityLabel={`${diamonds} diamonds`}>
            <Image source={DIAMOND_ICON} style={styles.diamond} contentFit="contain" />
            <Text style={styles.balance}>{diamonds.toLocaleString()}</Text>
          </View>
        </View>
      </View>

      <View style={[styles.panel, { height: panelHeight, maxWidth: contentMaxWidth, paddingBottom: insets.bottom + 16 }]}>
        <CategoryTabs
          value={category}
          onChange={(id) => {
            setCategory(id);
            setTrying(null);
          }}
        />
        <View style={styles.shelf} onLayout={(e: LayoutChangeEvent) => setShelfWidth(e.nativeEvent.layout.width)}>
          {/* Keyed by tab, so each starts at the top. A list, not a scroll view: there are dozens of items. */}
          <FlatList
            key={category}
            data={items}
            keyExtractor={(item) => item.id}
            numColumns={COLUMNS}
            columnWrapperStyle={styles.gridRow}
            contentContainerStyle={styles.shelfContent}
            showsVerticalScrollIndicator={false}
            initialNumToRender={9}
            maxToRenderPerBatch={6}
            windowSize={5}
            extraData={trying?.id}
            removeClippedSubviews
            renderItem={({ item }) => (
              <View style={{ width: itemWidth }}>
                <ItemTile item={item} base={base} selected={trying?.id === item.id} onPress={onTry} label={item.name} />
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.empty}>
                <View style={styles.emptyIcon}>
                  <Icon name="Shop" size={30} color={theme.colors.textMuted} variant="Bold" />
                </View>
                <Text style={styles.emptyTitle}>Coming soon</Text>
                <Text style={styles.emptyText}>{label} for your avatar will show up here. You will be able to spend your diamonds on them.</Text>
              </View>
            }
          />
        </View>
      </View>
      <Awning width={windowWidth} topInset={insets.top} />
    </View>
  );
}
