/**
 * Periodic Table — reference and guided learning (spec §5.2).
 *
 * Grid view for sighted users on roomy screens; a text-first list view is the
 * default for screen readers, compact widths and large font scales. Search and
 * category chips work in both. All data is bundled, so it works offline.
 */

import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AccessibilityInfo,
  FlatList,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useReducedMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ElementGrid } from "@/components/periodic-table/ElementGrid";
import { ElementListRow } from "@/components/periodic-table/ElementListRow";
import { useCategoryColors } from "@/components/periodic-table/use-category-colors";
import { PageHeader } from "@/components/ui/page-header";
import { Icon } from "@/components/ui/icon";
import {
  CATEGORY_BLURBS,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  type ElementCategory,
  type PeriodicElement,
} from "@/content/periodic-table/elements";
import { elementRoute, filterElements, TOTAL_ELEMENTS } from "@/services/periodic-table";
import { createStyles, fontFaces, layout, useResponsiveLayout, useTheme, withAlpha } from "@/theme";

type ViewMode = "grid" | "list";

/** Grid cell sizes (dp) for the zoom controls. */
const ZOOM_STEPS = [48, 60, 72, 84] as const;
const DEFAULT_ZOOM = 1;

const makeStyles = createStyles((theme) => ({
  root: { flex: 1, backgroundColor: theme.colors.background },
  controls: { gap: 10, paddingBottom: 8 },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: layout.minTouchTarget,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: theme.colors.input,
    borderWidth: 1.5,
    borderColor: theme.colors.borderStrong,
  },
  searchInput: {
    flex: 1,
    minHeight: layout.minTouchTarget,
    fontSize: 15,
    ...fontFaces.semibold,
    color: theme.colors.text,
    paddingVertical: 0,
  },
  clearBtn: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    alignItems: "center",
    justifyContent: "center",
    marginRight: -10,
  },
  toolRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  segment: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: layout.minTouchTarget,
    paddingHorizontal: 14,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: theme.colors.borderStrong,
    backgroundColor: theme.colors.surface,
  },
  segmentSelected: {
    borderWidth: 3,
    borderColor: theme.colors.primary,
    backgroundColor: withAlpha(theme.colors.primary, 0.12),
  },
  segmentText: {
    fontSize: 14,
    ...fontFaces.semibold,
    color: theme.colors.text,
  },
  segmentTextSelected: { ...fontFaces.heavy },
  zoomGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginLeft: "auto",
  },
  zoomBtn: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    borderRadius: layout.minTouchTarget / 2,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: theme.colors.borderStrong,
    backgroundColor: theme.colors.surface,
  },
  zoomBtnDisabled: { opacity: 0.4 },
  chipsContent: { gap: 8, paddingRight: 16 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: layout.minTouchTarget,
    paddingHorizontal: 14,
    borderRadius: 24,
    borderWidth: 1.5,
  },
  chipSelected: { borderWidth: 3 },
  chipDot: { width: 12, height: 12, borderRadius: 6 },
  chipText: {
    fontSize: 14,
    lineHeight: 19,
    ...fontFaces.semibold,
    color: theme.colors.text,
  },
  chipTextSelected: { ...fontFaces.heavy },
  summary: {
    fontSize: 13,
    lineHeight: 18,
    ...fontFaces.semibold,
    color: theme.colors.textSecondary,
  },
  blurb: {
    fontSize: 13,
    lineHeight: 19,
    ...fontFaces.book,
    color: theme.colors.textSecondary,
  },
  hint: {
    marginTop: 12,
    fontSize: 13,
    lineHeight: 19,
    ...fontFaces.book,
    color: theme.colors.textSecondary,
  },
  empty: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 28,
    paddingHorizontal: 16,
  },
  emptyTitle: {
    fontSize: 16,
    lineHeight: 22,
    ...fontFaces.heavy,
    color: theme.colors.text,
    textAlign: "center",
  },
  emptyBtn: {
    minHeight: layout.minTouchTarget,
    paddingHorizontal: 20,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primary,
  },
  emptyBtnText: {
    fontSize: 14,
    ...fontFaces.heavy,
    color: theme.colors.onPrimary,
  },
}));

function RowSeparator() {
  return <View style={rowSeparatorStyle} />;
}
const rowSeparatorStyle = { height: 8 } as const;

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

export default function PeriodicTableScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
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
        <Text style={styles.emptyTitle}>No elements match your search.</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear search and filters"
          onPress={clearFilters}
          style={styles.emptyBtn}
        >
          <Text style={styles.emptyBtnText}>Clear filters</Text>
        </Pressable>
      </View>
    ) : undefined;

  const controls = (
    <View style={[mode === "grid" ? contentFrameStyle : null, styles.controls]}>
      <View style={styles.searchRow}>
        <Icon name="SearchNormal" size={18} color={theme.colors.textSecondary} variant="Bold" />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search name, symbol or number"
          placeholderTextColor={theme.colors.textSecondary}
          accessibilityLabel="Search elements by name, symbol or atomic number"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          maxFontSizeMultiplier={1.6}
        />
        {query.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            onPress={() => setQuery("")}
            style={styles.clearBtn}
          >
            <Icon name="CloseCircle" size={20} color={theme.colors.textSecondary} variant="Bold" />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.toolRow}>
        {(["grid", "list"] as const).map((value) => {
          const selected = mode === value;
          const label = value === "grid" ? "Grid" : "List";
          return (
            <Pressable
              key={value}
              accessibilityRole="button"
              accessibilityLabel={value === "grid" ? "Grid view" : "List view"}
              accessibilityHint={
                value === "list" ? "A simple list that is easier with a screen reader or large text" : undefined
              }
              accessibilityState={{ selected }}
              onPress={() => setUserMode(value)}
              style={[styles.segment, selected && styles.segmentSelected]}
            >
              <Icon
                name={value === "grid" ? "Grid1" : "TextalignLeft"}
                size={18}
                color={selected ? theme.colors.primary : theme.colors.textSecondary}
                variant="Bold"
              />
              <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>{label}</Text>
              {selected ? <Icon name="TickCircle" size={16} color={theme.colors.primary} variant="Bold" /> : null}
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
              <Icon name="Minus" size={20} color={theme.colors.text} variant="Linear" />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Zoom in"
              accessibilityState={{ disabled: zoom === ZOOM_STEPS.length - 1 }}
              disabled={zoom === ZOOM_STEPS.length - 1}
              onPress={() => setZoom((z) => Math.min(ZOOM_STEPS.length - 1, z + 1))}
              style={[styles.zoomBtn, zoom === ZOOM_STEPS.length - 1 && styles.zoomBtnDisabled]}
            >
              <Icon name="Add" size={20} color={theme.colors.text} variant="Linear" />
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
              style={[
                styles.chip,
                { backgroundColor: c.fill, borderColor: selected ? c.text : c.accent },
                selected && styles.chipSelected,
              ]}
            >
              <View style={[styles.chipDot, { backgroundColor: c.accent }]} />
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{CATEGORY_LABELS[key]}</Text>
              {selected ? <Icon name="TickCircle" size={16} color={c.text} variant="Bold" /> : null}
            </Pressable>
          );
        })}
      </ScrollView>

      <Text style={styles.summary} accessibilityLiveRegion="polite">
        {summary}
      </Text>
      {category ? <Text style={styles.blurb}>{CATEGORY_BLURBS[category]}</Text> : null}
    </View>
  );

  return (
    <View style={styles.root}>
      <PageHeader
        title="Periodic Table"
        subtitle="Tap an element to learn more"
        onBack={onBack}
      />
      {mode === "list" ? (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.symbol}
          renderItem={renderRow}
          ListHeaderComponent={controls}
          ListEmptyComponent={empty}
          ItemSeparatorComponent={RowSeparator}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={14}
          maxToRenderPerBatch={14}
          windowSize={7}
          contentContainerStyle={[
            contentFrameStyle,
            { paddingBottom: insets.bottom + 24 },
          ]}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <ScrollView
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
          <View style={[contentFrameStyle]}>
            <Text style={styles.hint}>
              Scroll sideways to see all 18 groups. Use the zoom buttons to resize the cells.
              {hasFilter ? " Faded elements do not match your search or filter." : ""} Prefer text?
              Switch to List view.
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}
