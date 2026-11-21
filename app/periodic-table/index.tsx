/**
 * Periodic Table — reference and guided learning (spec §5.2).
 *
 * Flat like the rest of the app: a search field, light chips, no cards, dashed dividers between list
 * rows. Grid view for sighted users on roomy screens; a text-first list is the default for screen
 * readers, compact widths and large font scales. Search and category chips work in both. All data is
 * bundled, so it works offline.
 */

import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AccessibilityInfo, FlatList, Pressable, ScrollView, View } from "react-native";
import Animated from "react-native-reanimated";
import { useReducedMotion } from "@/components/motion/use-reduced-motion";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenHeader, useHeaderBorder } from "@/components/layout";
import { settle } from "@/components/motion/settle";
import { ElementGrid } from "@/components/periodic-table/ElementGrid";
import { ElementListRow } from "@/components/periodic-table/ElementListRow";
import { useCategoryColors } from "@/components/periodic-table/use-category-colors";
import { FieldInput } from "@/components/ui/field-input";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import {
  CATEGORY_BLURBS,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  type ElementCategory,
  type PeriodicElement,
} from "@/content/periodic-table/elements";
import { impactLight } from "@/services/haptics";
import { elementRoute, filterElements, TOTAL_ELEMENTS } from "@/services/periodic-table";
import { createStyles, fontFaces, layout, useResponsiveLayout, useTheme, withAlpha } from "@/theme";

type ViewMode = "grid" | "list";

/** Grid cell sizes (dp) for the zoom controls. */
const ZOOM_STEPS = [48, 60, 72, 84] as const;
const DEFAULT_ZOOM = 1;

const useStyles = createStyles((theme) => ({
  root: { flex: 1, backgroundColor: theme.colors.mapBackground },
  controls: { gap: 10, paddingTop: 6, paddingBottom: 8 },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 52,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: theme.colors.field,
  },
  searchInput: {
    flex: 1,
    minHeight: 52,
    fontSize: 15,
    ...fontFaces.semibold,
    color: theme.colors.fieldText,
    paddingVertical: 0,
  },
  clearBtn: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    alignItems: "center",
    justifyContent: "center",
    marginRight: -12,
  },
  toolRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  chipActive: { backgroundColor: theme.colors.primarySurface, borderColor: theme.colors.primaryBorder },
  chipPressed: { opacity: 0.7 },
  chipText: { fontSize: 13, ...fontFaces.bold, color: theme.colors.textSecondary },
  chipTextActive: { color: theme.colors.text },
  zoomGroup: { flexDirection: "row", alignItems: "center", gap: 6, marginLeft: "auto" },
  zoomBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  zoomBtnDisabled: { opacity: 0.4 },
  chipsContent: { gap: 6, paddingRight: 16 },
  catDot: { width: 10, height: 10, borderRadius: 5 },
  summary: { fontSize: 13, lineHeight: 18, ...fontFaces.semibold, color: theme.colors.textMuted },
  blurb: { fontSize: 13, lineHeight: 19, ...fontFaces.medium, color: theme.colors.textMuted },
  hint: { marginTop: 12, fontSize: 13, lineHeight: 19, ...fontFaces.medium, color: theme.colors.textMuted },
  divider: { height: 0, borderTopWidth: 1, borderStyle: "dashed", borderColor: theme.colors.border },
  empty: { alignItems: "center", gap: 12, paddingVertical: 28, paddingHorizontal: 16 },
  emptyTitle: { fontSize: 16, lineHeight: 22, ...fontFaces.heavy, color: theme.colors.text, textAlign: "center" },
  emptyText: { fontSize: 14, lineHeight: 20, ...fontFaces.medium, color: theme.colors.textMuted, textAlign: "center" },
}));

function useScreenReaderEnabled(): boolean {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isScreenReaderEnabled()
      .then((value) => {
        if (alive) setEnabled(value);
      })
      .catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener("screenReaderChanged", setEnabled);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return enabled;
}

/** Declared once: an inline component would be a new type every render and remount each divider. */
function Divider() {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  return <View style={styles.divider} />;
}

export default function PeriodicTableScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { scrolled, onScroll, scrollEventThrottle } = useHeaderBorder();
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const colors = useCategoryColors();
  const reduceMotion = useReducedMotion();
  const screenReader = useScreenReaderEnabled();
  const { isCompact, isLargeText, contentFrameStyle, gutter } = useResponsiveLayout();

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ElementCategory | null>(null);
  const [userMode, setUserMode] = useState<ViewMode | null>(null);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);

  // The list is the default whenever a grid would be hard to use.
  const autoList = screenReader || isCompact || isLargeText;
  const mode: ViewMode = userMode ?? (autoList ? "list" : "grid");

  const filtered = useMemo(() => filterElements({ query, category }), [query, category]);
  const matching = useMemo(() => new Set(filtered.map((e) => e.atomicNumber)), [filtered]);
  const hasFilter = query.trim().length > 0 || category !== null;

  const onBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/encyclopedia");
  }, [router]);

  const openElementScreen = useCallback(
    (symbol: string) => {
      router.push(elementRoute(symbol));
    },
    [router],
  );

  const clearFilters = useCallback(() => {
    setQuery("");
    setCategory(null);
  }, []);

  const toggleCategory = useCallback((next: ElementCategory) => {
    setCategory((current) => (current === next ? null : next));
  }, []);

  const renderRow = useCallback(
    ({ item }: { item: PeriodicElement }) => (
      <ElementListRow element={item} colors={colors[item.category]} onPress={openElementScreen} />
    ),
    [colors, openElementScreen],
  );

  const summary = hasFilter
    ? `${filtered.length} of ${TOTAL_ELEMENTS} elements${category ? ` · ${CATEGORY_LABELS[category]}` : ""}`
    : `${TOTAL_ELEMENTS} elements · works offline`;

  const empty =
    filtered.length === 0 ? (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>No elements match.</Text>
        <Text style={styles.emptyText}>Try a name, a symbol like “Fe”, or an atomic number.</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear search and filters"
          onPress={clearFilters}
          style={({ pressed }) => [styles.chip, styles.chipActive, pressed && styles.chipPressed]}
        >
          <Text style={[styles.chipText, styles.chipTextActive]}>Clear filters</Text>
        </Pressable>
      </View>
    ) : undefined;

  const controls = (
    <Animated.View entering={settle()} style={[mode === "grid" ? contentFrameStyle : null, styles.controls]}>
      <View style={styles.searchRow}>
        <Icon name="SearchNormal" size={18} color={theme.colors.textFaint} variant="Bold" />
        <FieldInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search name, symbol or number"
          accessibilityLabel="Search elements by name, symbol or atomic number"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          maxFontSizeMultiplier={1.6}
        />
        {query.length > 0 ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setQuery("")} style={styles.clearBtn}>
            <Icon name="CloseCircle" size={20} color={theme.colors.textFaint} variant="Bold" />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.toolRow}>
        {(["grid", "list"] as const).map((value) => {
          const selected = mode === value;
          return (
            <Pressable
              key={value}
              accessibilityRole="button"
              accessibilityLabel={value === "grid" ? "Grid view" : "List view"}
              accessibilityHint={value === "list" ? "A simple list that is easier with a screen reader or large text" : undefined}
              accessibilityState={{ selected }}
              onPress={() => {
                impactLight();
                setUserMode(value);
              }}
              style={({ pressed }) => [styles.chip, selected && styles.chipActive, pressed && styles.chipPressed]}
            >
              <Icon
                name={value === "grid" ? "Grid1" : "TextalignLeft"}
                size={16}
                color={selected ? theme.colors.text : theme.colors.textMuted}
                variant="Bold"
              />
              <Text style={[styles.chipText, selected && styles.chipTextActive]}>{value === "grid" ? "Grid" : "List"}</Text>
            </Pressable>
          );
        })}

        {mode === "grid" ? (
          <View style={styles.zoomGroup}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Zoom out"
              accessibilityState={{ disabled: zoom === 0 }}
              disabled={zoom === 0}
              onPress={() => setZoom((z) => Math.max(0, z - 1))}
              style={[styles.zoomBtn, zoom === 0 && styles.zoomBtnDisabled]}
            >
              <Icon name="Minus" size={18} color={theme.colors.text} variant="Linear" />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Zoom in"
              accessibilityState={{ disabled: zoom === ZOOM_STEPS.length - 1 }}
              disabled={zoom === ZOOM_STEPS.length - 1}
              onPress={() => setZoom((z) => Math.min(ZOOM_STEPS.length - 1, z + 1))}
              style={[styles.zoomBtn, zoom === ZOOM_STEPS.length - 1 && styles.zoomBtnDisabled]}
            >
              <Icon name="Add" size={18} color={theme.colors.text} variant="Linear" />
            </Pressable>
          </View>
        ) : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsContent}
        keyboardShouldPersistTaps="handled"
        accessibilityLabel="Filter by element category"
      >
        {CATEGORY_ORDER.map((key) => {
          const c = colors[key];
          const selected = category === key;
          return (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityLabel={`${CATEGORY_LABELS[key]} filter`}
              accessibilityHint={CATEGORY_BLURBS[key]}
              accessibilityState={{ selected }}
              onPress={() => toggleCategory(key)}
              style={({ pressed }) => [
                styles.chip,
                selected && { backgroundColor: withAlpha(c.accent, 0.16), borderColor: c.accent },
                pressed && styles.chipPressed,
              ]}
            >
              <View style={[styles.catDot, { backgroundColor: c.accent }]} />
              <Text style={[styles.chipText, selected && styles.chipTextActive]}>{CATEGORY_LABELS[key]}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Text style={styles.summary} accessibilityLiveRegion="polite">
        {summary}
      </Text>
      {category ? <Text style={styles.blurb}>{CATEGORY_BLURBS[category]}</Text> : null}
    </Animated.View>
  );

  return (
    <View style={styles.root}>
      <ScreenHeader title="Periodic Table" subtitle="Tap an element to learn more" onBack={onBack} scrolled={scrolled} />
      {mode === "list" ? (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.symbol}
          renderItem={renderRow}
          ListHeaderComponent={controls}
          ListEmptyComponent={empty}
          ItemSeparatorComponent={Divider}
          onScroll={onScroll}
          scrollEventThrottle={scrollEventThrottle}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={14}
          maxToRenderPerBatch={14}
          windowSize={7}
          contentContainerStyle={[contentFrameStyle, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <ScrollView
          onScroll={onScroll}
          scrollEventThrottle={scrollEventThrottle}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          showsVerticalScrollIndicator={false}
        >
          {controls}
          <View style={{ paddingLeft: gutter }}>
            <ElementGrid
              cellSize={ZOOM_STEPS[zoom]}
              colors={colors}
              matching={matching}
              reduceMotion={reduceMotion}
              onPressElement={openElementScreen}
              onPressMarker={toggleCategory}
              activeCategory={category}
            />
          </View>
          {empty}
          <View style={contentFrameStyle}>
            <Text style={styles.hint}>
              Scroll sideways to see all 18 groups. Use the zoom buttons to resize the cells.
              {hasFilter ? " Faded elements do not match your search or filter." : ""} Prefer text? Switch to List view.
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}
