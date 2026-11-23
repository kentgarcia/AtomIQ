/**
 * The shop: a striped awning for a roof, the learner's avatar standing on a solid colour under it
 * (idle animation, standing on the panel's top edge), a back button and the diamond balance, and a
 * rounded panel at the bottom with the category tabs and a dashed area for the items: paints and patterns so far, the other tabs show an
 * empty shelf. Tapping an item tries it on the avatar. Under the balance an icon switch shows only what the learner owns; each tile
 * says whether the item is worn, owned, locked behind a level or for sale (a free one is got first too); and at the bottom right of
 * the preview a button buys the item being tried (diamonds, once its level is reached; diamonds fly from the balance to the avatar,
 * which puts the item on as they land) or equips an owned one. An item that can be coloured (a hair style)
 * brings a column of colour swatches down the left edge, under the back button. Opened from the Profile header.
 */

import { useRenderTimer } from "@/components/dev/render-timer";
import { useSfxSet } from "@/components/motion/use-sfx-set";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Pressable, View, useWindowDimensions, type LayoutChangeEvent } from "react-native";
import { useReducedMotion } from "@/components/motion/use-reduced-motion";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "@/components/avatar/Avatar";
import { NPC_VIEWBOX } from "@/components/npc/npc-art";
import { avatarBackground, normalizeAvatar, serializeAvatar } from "@/components/avatar/avatar-core";
import { PatternLayer } from "@/components/avatar/PatternLayer";
import { PopWhen } from "@/components/motion/PopOnce";
import { Button } from "@/components/ui/button";
import { useTriggerClock } from "@/components/motion/use-trigger-clock";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { AWNING_BAND, AWNING_LIP, Awning } from "@/components/shop/Awning";
import { awningHeight } from "@/components/shop/awning-core";
import { CategoryTabs } from "@/components/shop/CategoryTabs";
import { ColorSwatches } from "@/components/shop/ColorSwatches";
import { ItemTile } from "@/components/shop/ItemTile";
import { SUB_TABS_WIDTH, SubTabs } from "@/components/shop/SubTabs";
import { PurchaseFx } from "@/components/shop/PurchaseFx";
import { PURCHASE, PURCHASE_TOTAL, coinCount, landMs } from "@/components/shop/purchase-fx-core";
import { SHOP_TABS, buyBlock, categoryById, colorChoiceOf, colorOptions, isOwned, itemStatus, itemsIn, previewConfig, tabById, withColor, type ShopCategoryId, type ShopItem, type ShopTabId } from "@/components/shop/shop-core";
import { useOwnedItems } from "@/hooks/use-owned-items";
import { ShelfSkeleton } from "@/components/shop/ShelfSkeleton";
import { ShopOpening } from "@/components/shop/ShopOpening";
import { useTutorialBusy } from "@/hooks/use-tutorial";
import { useDiamonds } from "@/hooks/use-wallet";
import { levelFromXp } from "@/services/achievements-core";
import { buyItem } from "@/services/shop";
import { useStorage } from "@/services/StorageContext";
import { createStyles, fontFaces, useResponsiveLayout, useTheme } from "@/theme";
import { controls } from "@/theme/tokens";
import { notifyError, notifySuccess, select } from "@/services/haptics";
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
    ownedToggle: { position: "absolute", right: SIDE },
    ownedToggleOn: { backgroundColor: c.primary, borderColor: c.primary },
    buy: { position: "absolute", right: SIDE, bottom: 14 },
    balance: { fontSize: 18, ...fontFaces.heavy, color: c.info, fontVariant: ["tabular-nums"] },
    panel: { zIndex: 1, borderTopLeftRadius: 32, borderTopRightRadius: 32, backgroundColor: c.card, paddingHorizontal: SIDE, paddingTop: 20, gap: 16, width: "100%", alignSelf: "center" },
    shelf: { flex: 1, flexDirection: "row", borderRadius: 24, borderWidth: controls.border, borderStyle: "dashed", borderColor: c.border, overflow: "hidden" },
    grid: { flex: 1 },
    shelfContent: { flexGrow: 1, padding: 14, gap: GAP },
    gridRow: { gap: GAP },
    empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 24, paddingVertical: 24 },
    emptyIcon: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", backgroundColor: c.surfaceSoft },
    emptyTitle: { fontSize: 17, textAlign: "center", ...fontFaces.heavy, color: c.text },
    emptyText: { fontSize: 14, lineHeight: 20, textAlign: "center", ...fontFaces.medium, color: c.textMuted },
  };
});

export default function ShopScreen() {
  useRenderTimer("/shop");
  useSfxSet("shop");
  const router = useRouter();
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const insets = useSafeAreaInsets();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const { contentMaxWidth } = useResponsiveLayout();
  const { userProfile, updateUserProfile } = useStorage();
  const diamonds = useDiamonds();
  const owned = useOwnedItems();
  const level = levelFromXp(userProfile?.total_xp ?? 0);
  // Show only what the learner owns (free items count)
  const [ownedOnly, setOwnedOnly] = useState(false);
  const [busy, setBusy] = useState(false);
  const reduced = useReducedMotion();
  // The buying moment: `fx.n` counts the buys (the clock plays on each), `landed` counts the moments the item went on
  const [fx, setFx] = useState({ n: 0, price: 0 });
  const [landed, setLanded] = useState(0);
  const [pillWidth, setPillWidth] = useState(96);
  const fxClock = useTriggerClock(PURCHASE_TOTAL, fx.n);
  // The sound timers of a buy (one tick per diamond leaving, the landing), cleared if the learner leaves mid-flight
  const sfxTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => {
    const timers = sfxTimers.current;
    return () => timers.forEach(clearTimeout);
  }, []);

  // The shop jingle plays as it opens and is cut when the learner leaves (docs/features/SFX_SPEC.md §6.5)
  useEffect(() => {
    void playSfx("ui.shop-open");
    return () => stopSfx("ui.shop-open");
  }, []);

  const base = useMemo(() => normalizeAvatar(userProfile?.avatar_url), [userProfile?.avatar_url]);
  const [tabId, setTabId] = useState<ShopTabId>(SHOP_TABS[0].id);
  // The category on the shelf: the tab's own, or (for the face) the one picked in the vertical tabs
  const [category, setCategory] = useState<ShopCategoryId>(SHOP_TABS[0].categories[0]);
  const tab = tabById(tabId);
  const subTabs = tab.categories.length > 1;
  // The shelf follows the tabs one render later (`useDeferredValue`): a tap on a tab updates the strip, the click and the haptic at once and
  // the shelf of tiles, the costly part (every tile is a small drawn avatar), is built after, and dropped for the newer one if the learner
  // taps on before it is done. `shelfSubTabs` is the shelf's own, so the grid keeps its width until its tiles change.
  const shelfCategory = useDeferredValue(category);
  const shelfSubTabs = useMemo(() => (SHOP_TABS.find((t) => t.categories.includes(shelfCategory)) ?? tab).categories.length > 1, [shelfCategory, tab]);
  const [trying, setTrying] = useState<ShopItem | null>(null);
  const [shelfWidth, setShelfWidth] = useState(0);
  const [topHeight, setTopHeight] = useState(0);
  // The shop opens behind a closed shutter (components/shop/ShopOpening.tsx): the avatar, the shelves and the pattern are the heavy part of
  // this screen, so they are mounted only once the shutter has been up a moment (`mounted`), while nothing on it moves, and it rolls up
  // when they are laid out (`ready`). `opening` is true until it is gone.
  const [mounted, setMounted] = useState(false);
  const [opening, setOpening] = useState(true);
  const ready = mounted && shelfWidth > 0 && topHeight > 0;
  useTutorialBusy(opening, "shop opening");

  // Tapping an item must not re-render every tile: the handler is stable and reads the current pick from a ref
  const tryingRef = useRef<ShopItem | null>(null);
  useEffect(() => {
    tryingRef.current = trying;
  }, [trying]);
  const onTry = useCallback((item: ShopItem) => {
    const putDown = tryingRef.current?.id === item.id;
    select();
    void playSfx(putDown ? "ui.unequip" : "shop.try");
    setTrying(putDown ? null : item);
  }, []);
  // The colour picked for the item being tried (hair colour for a hair style); it stays while the learner moves between items of the tab
  const [tints, setTints] = useState<Record<string, string>>({});
  const colorChoice = colorChoiceOf(trying);
  const tint = colorChoice ? tints[colorChoice] : undefined;
  const onTint = useCallback((id: string) => {
    const choice = colorChoiceOf(tryingRef.current);
    if (!choice) return;
    select();
    setTints((t) => ({ ...t, [choice]: id }));
  }, []);
  // The swatches of brows and nose show what `natural` would be on this hair and skin
  const { hairColor, skin } = base;
  const swatches = useMemo(() => (colorChoice ? colorOptions(colorChoice, { hairColor, skin }) : []), [colorChoice, hairColor, skin]);
  // The grid shows its tiles in the picked colour too
  const tileBase = useMemo(() => (colorChoice && tint ? withColor(base, colorChoice, tint) : base), [base, colorChoice, tint]);
  const items = useMemo(() => itemsIn(shelfCategory).filter((i) => !ownedOnly || isOwned(i, owned)), [shelfCategory, ownedOnly, owned]);
  const shelfStatus = useCallback((item: ShopItem) => itemStatus(item, { owned, level, config: base }), [owned, level, base]);
  const label = categoryById(shelfCategory).label;
  // A tab was tapped and the shelf has not caught up: grey placeholders in the place of the tiles until it does (`ShelfSkeleton`)
  const pending = shelfCategory !== category;
  const pendingCount = useMemo(() => (pending ? Math.min(9, itemsIn(category).filter((i) => !ownedOnly || isOwned(i, owned)).length) : 0), [pending, category, ownedOnly, owned]);
  // The avatar shown big: the one the learner has, with the item they tapped tried on.
  const look = useMemo(() => {
    if (!trying) return base;
    const tried = previewConfig(base, trying);
    return colorChoice && tint ? withColor(tried, colorChoice, tint) : tried;
  }, [base, trying, colorChoice, tint]);
  const shown = useMemo(() => serializeAvatar(look), [look]);

  // The button at the bottom left of the preview: buy what is being tried when it is not owned, equip it when it is and is not worn
  const tryingOwned = trying ? isOwned(trying, owned) : false;
  const block = trying ? buyBlock(trying, { owned, level, diamonds }) : null;
  const changed = trying !== null && shown !== serializeAvatar(base);
  const wear = useCallback(async (sound: "ui.equip" | "shop.equip-confirm" = "ui.equip") => {
    await updateUserProfile({ avatar_url: serializeAvatar(look) });
    void playSfx(sound);
  }, [look, updateUserProfile]);
  const onBuy = useCallback(async () => {
    if (!trying || busy) return;
    setBusy(true);
    try {
      const result = await buyItem(trying);
      if (result.ok) {
        notifySuccess();
        // The diamonds fly to the avatar, a tick as each leaves the balance and a landing with the last
        // (docs/features/SFX_EXPANSION_SPEC.md §6.2); a free item or reduced motion has the landing only
        const flying = reduced ? 0 : coinCount(trying.price);
        for (let i = 0; i < flying; i += 1) sfxTimers.current.push(setTimeout(() => void playSfx("shop.coin-tick", { index: i }), i * PURCHASE.step));
        sfxTimers.current.push(setTimeout(() => void playSfx("shop.coin-land"), landMs(flying)));
        // It puts the item on as the last one lands
        setFx((f) => ({ n: f.n + 1, price: trying.price }));
        if (!reduced) await new Promise<void>((resolve) => setTimeout(resolve, landMs(coinCount(trying.price))));
        await wear();
        setLanded((n) => n + 1);
      } else {
        notifyError();
        void playSfx("ui.invalid");
      }
    } catch {
      notifyError();
    } finally {
      setBusy(false);
    }
  }, [trying, busy, wear, reduced]);
  const onEquip = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      select();
      await wear("shop.equip-confirm");
    } finally {
      setBusy(false);
    }
  }, [busy, wear]);

  const gridWidth = shelfWidth - (shelfSubTabs ? SUB_TABS_WIDTH : 0);
  const itemWidth = Math.max(0, Math.floor((gridWidth - 28 - GAP * (COLUMNS - 1)) / COLUMNS));
  const roof = awningHeight(insets.top + AWNING_BAND, AWNING_LIP);
  const avatarSize = Math.max(120, Math.min(260, topHeight - roof - 12));
  // The figure is drawn longer than the room above the panel and runs on behind it, so its squash never shows a cut-off shirt
  const previewExtra = (avatarSize * (NPC_VIEWBOX.preview.h - NPC_VIEWBOX.avatar.h)) / NPC_VIEWBOX.avatar.h;
  const panelHeight = Math.min(Math.round(windowHeight * 0.5), 460);
  // The swatch column starts under the back button and may run down to just above the panel
  const swatchTop = roof + 10 + BAR + 14;
  const swatchRoom = Math.max(0, topHeight - swatchTop - 12);
  // Where the diamonds leave from (the middle of the balance) and fly to (the middle of the avatar)
  const fxFrom = { x: windowWidth - SIDE - pillWidth / 2, y: roof + 10 + BAR / 2 };
  const fxTo = { x: windowWidth / 2, y: topHeight - avatarSize * 0.45 };

  return (
    <View style={[styles.root, { backgroundColor: avatarBackground(look) }]}>
      {mounted ? (
        <>
      <PatternLayer pattern={look.pattern} background={look.background} tile={110} />
      <View style={styles.top} onLayout={(e: LayoutChangeEvent) => setTopHeight(e.nativeEvent.layout.height)}>
        {/* Trying something on: the avatar squashes and pops as the new look appears; putting it down does not */}
        <PopWhen trigger={`${trying?.id ?? ""}|${landed}`} active={trying !== null} intensity={0.45} sparkleColor={theme.colors.lessonHeader} style={{ marginBottom: -previewExtra }}>
          <Avatar value={shown} size={avatarSize} bare live zoom="preview" />
        </PopWhen>
        <View style={[styles.bar, { top: roof + 10 }]}>
          <Pressable onPress={() => router.back()} hitSlop={6} accessibilityRole="button" accessibilityLabel="Go back" style={({ pressed }) => [styles.round, pressed && { opacity: 0.6 }]}>
            <Icon name="ArrowLeft2" size={22} color={theme.colors.text} variant="Bold" />
          </Pressable>
          {/* The balance pops as the diamonds leave it */}
          <PopWhen trigger={fx.n} intensity={0.5} sparkles={false}>
            <View style={styles.pill} accessible accessibilityLabel={`${diamonds} diamonds`} onLayout={(e: LayoutChangeEvent) => setPillWidth(e.nativeEvent.layout.width)}>
              <Image source={DIAMOND_ICON} style={styles.diamond} contentFit="contain" />
              <Text style={styles.balance}>{diamonds.toLocaleString()}</Text>
            </View>
          </PopWhen>
        </View>
        {/* Icon only: lit while it shows just what the learner owns */}
        <Pressable
          onPress={() => {
            select();
            void playSfx(ownedOnly ? "ui.toggle-off" : "ui.toggle-on");
            setOwnedOnly((v) => !v);
          }}
          hitSlop={6}
          accessibilityRole="switch"
          accessibilityLabel="Show only the items I own"
          accessibilityState={{ checked: ownedOnly }}
          style={({ pressed }) => [styles.round, styles.ownedToggle, { top: roof + 10 + BAR + 10 }, ownedOnly && styles.ownedToggleOn, pressed && { opacity: 0.6 }]}
        >
          <Icon name="TickCircle" size={24} color={ownedOnly ? theme.colors.onPrimary : theme.colors.text} variant={ownedOnly ? "Bold" : "Linear"} />
        </Pressable>
        {trying && !tryingOwned && !busy ? (
          <View style={styles.buy}>
            {block === "locked" ? (
              <Button label={`Level ${trying.level}`} accessibilityLabel={`Locked until level ${trying.level}`} disabled fullWidth={false} onPress={() => undefined} renderIcon={(color) => <Icon name="Lock" size={18} color={color} variant="Bold" />} />
            ) : block === "poor" ? (
              <Button label={`${trying.price - diamonds} more`} accessibilityLabel={`Not enough diamonds, ${trying.price - diamonds} more needed`} disabled fullWidth={false} onPress={() => undefined} renderIcon={() => <Image source={DIAMOND_ICON} style={styles.diamond} contentFit="contain" />} />
            ) : (
              trying.price === 0 ? (
              <Button label="Free" accessibilityLabel={`Get ${trying.name} for free`} variant="success" fullWidth={false} onPress={onBuy} />
            ) : (
              <Button label={`Buy  ${trying.price}`} accessibilityLabel={`Buy ${trying.name} for ${trying.price} diamonds`} variant="success" fullWidth={false} onPress={onBuy} renderIcon={() => <Image source={DIAMOND_ICON} style={styles.diamond} contentFit="contain" />} />
            )
            )}
          </View>
        ) : trying && tryingOwned && changed && !busy ? (
          <View style={styles.buy}>
            <Button label="Equip" accessibilityLabel={`Equip ${trying.name}`} variant="success" fullWidth={false} onPress={onEquip} />
          </View>
        ) : null}
        <PurchaseFx clock={fxClock} price={fx.price} from={fxFrom} to={fxTo} burstColor={theme.colors.lessonHeader} labelColor={theme.colors.danger} diameter={avatarSize * 0.7} />
        {colorChoice && swatchRoom >= 80 ? (
          <ColorSwatches options={swatches} value={tint ?? look[colorChoice]} onChange={onTint} top={swatchTop} left={SIDE - 4} maxHeight={swatchRoom} />
        ) : null}
      </View>

      <View style={[styles.panel, { height: panelHeight, maxWidth: contentMaxWidth, paddingBottom: insets.bottom + 16 }]}>
        <CategoryTabs
          value={tabId}
          onChange={(id) => {
            setTabId(id);
            setCategory(tabById(id).categories[0]);
            setTrying(null);
          }}
        />
        <View style={styles.shelf} onLayout={(e: LayoutChangeEvent) => setShelfWidth(e.nativeEvent.layout.width)}>
          {/* A tab that holds several categories (the face) has its own vertical tabs down the left of the shelf */}
          {subTabs ? (
            <SubTabs
              categories={tab.categories}
              value={category}
              onChange={(id) => {
                setCategory(id);
                setTrying(null);
              }}
            />
          ) : null}
          {/* Keyed by category, so each starts at the top. A list, not a scroll view: there are dozens of items. */}
          <View style={styles.grid}>
          {pending ? (
            <ShelfSkeleton count={pendingCount} columns={COLUMNS} itemWidth={itemWidth} contentStyle={styles.shelfContent} rowStyle={styles.gridRow} />
          ) : (
          <FlatList
            key={shelfCategory}
            style={styles.grid}
            data={items}
            keyExtractor={(item) => item.id}
            numColumns={COLUMNS}
            columnWrapperStyle={styles.gridRow}
            contentContainerStyle={styles.shelfContent}
            showsVerticalScrollIndicator={false}
            // One row on the first commit and one row per frame after, so a tab switch never builds nine drawn avatars in one frame
            initialNumToRender={COLUMNS}
            maxToRenderPerBatch={COLUMNS}
            updateCellsBatchingPeriod={16}
            windowSize={5}
            extraData={`${trying?.id}|${colorChoice}|${tint}|${owned.size}|${level}|${serializeAvatar(base)}|${ownedOnly}`}
            removeClippedSubviews
            renderItem={({ item }) => (
              <View style={{ width: itemWidth }}>
                <ItemTile item={item} base={tileBase} selected={trying?.id === item.id} status={shelfStatus(item)} onPress={onTry} label={item.name} />
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.empty}>
                <View style={styles.emptyIcon}>
                  <Icon name="Shop" size={30} color={theme.colors.textMuted} variant="Bold" />
                </View>
                <Text style={styles.emptyTitle}>{ownedOnly ? "Nothing owned here yet" : "Coming soon"}</Text>
                <Text style={styles.emptyText}>{ownedOnly ? `Buy some ${label.toLowerCase()} and they will be here. Turn the switch off to see the whole shelf.` : `${label} for your avatar will show up here.`}</Text>
              </View>
            }
          />
          )}
          </View>
        </View>
      </View>
        </>
      ) : null}
      {/* The closed shop over everything but the awning, which stays in front of it */}
      {opening ? <ShopOpening ready={ready} onMountShop={() => setMounted(true)} onDone={() => setOpening(false)} /> : null}
      <Awning width={windowWidth} topInset={insets.top} />
    </View>
  );
}
