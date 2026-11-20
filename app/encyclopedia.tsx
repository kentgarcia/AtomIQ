import { HeaderButton, ScreenHeader, useHeaderBorder } from "@/components/layout";
import { FieldInput } from "@/components/ui/field-input";
import { Icon } from "@/components/ui/icon";
import { getAllEncyclopediaEntries } from "@/content/explorer";
import type { EncyclopediaEntry } from "@/content/explorer";
import { useTheme, fontFaces, useResponsiveLayout, createStyles, withAlpha } from "@/theme";
import { impactLight, impactMedium } from "@/services/haptics";
import { Image as ExpoImage } from "expo-image";
import { useRouter } from "expo-router";
import { ReadAloudButton } from "@/components/ui/read-aloud-button";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    type ScrollViewInstance,
    TouchableOpacity,
    View,
} from "react-native";
import { Text } from "@/components/ui/text";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { FastAlphabet } from "@/components/ui/fast-alphabet";
import { getVaultCat } from "@/components/encyclopedia/categories";
import { PERIODIC_TABLE_HREF } from "@/services/periodic-table";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ALL_COLOR = "#0EA5E9";
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("") as readonly string[];

/** A small, static filter chip: no lip, no animation. */
function FilterChip({ label, icon, color, active, onPress }: { label: string; icon: string; color: string; active: boolean; onPress: () => void }) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <Pressable
      style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && styles.chipPressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
    >
      <Icon name={icon} size={16} color={color} />
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

export default function EncyclopediaScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { contentMaxWidth, gutter } = useResponsiveLayout();
  const { theme } = useTheme();
  const bgTop = theme.colors.background;
  const { scrolled, onScroll: onHeaderScroll } = useHeaderBorder();

  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);

  const [allEntries, setAllEntries] = useState<EncyclopediaEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let alive = true;
    getAllEncyclopediaEntries()
      .then((entries) => {
        if (alive) setAllEntries(entries);
      })
      .finally(() => {
        if (alive) setLoaded(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const categoriesWithCounts = useMemo(() => {
    const map: Record<string, number> = {};
    allEntries.forEach((e) => {
      map[e.category] = (map[e.category] || 0) + 1;
    });
    return Object.entries(map)
      .map(([category, count]) => ({ category, count, cfg: getVaultCat(category) }))
      .sort((a, b) => b.count - a.count);
  }, [allEntries]);

  const letters = useMemo(() => {
    const set = new Set<string>();
    allEntries.forEach((e) => {
      const ch = e.term.trim().charAt(0).toUpperCase();
      if (ch >= "A" && ch <= "Z") set.add(ch);
    });
    return Array.from(set).sort();
  }, [allEntries]);

  const filteredEntries = useMemo(() => {
    let entries = allEntries;
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      entries = entries.filter(
        (entry) =>
          entry.term.toLowerCase().includes(q) ||
          entry.definition.toLowerCase().includes(q) ||
          entry.category.toLowerCase().includes(q) ||
          entry.quickFacts.some((f) => f.toLowerCase().includes(q))
      );
    }
    if (selectedCategories.length > 0) {
      entries = entries.filter((e) => selectedCategories.includes(e.category));
    }
    if (selectedLetter) {
      entries = entries.filter(
        (e) => e.term.trim().charAt(0).toUpperCase() === selectedLetter
      );
    }
    return [...entries].sort((a, b) => a.term.localeCompare(b.term));
  }, [allEntries, searchQuery, selectedCategories, selectedLetter]);

  const groupedByLetter = useMemo(() => {
    const groups: Record<string, EncyclopediaEntry[]> = {};
    filteredEntries.forEach((e) => {
      const L = e.term.trim().charAt(0).toUpperCase();
      if (!groups[L]) groups[L] = [];
      groups[L].push(e);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredEntries]);

  const scrollRef = useRef<ScrollViewInstance>(null);
  const sectionY = useRef<Record<string, number>>({});
  /** Where the letter groups start inside the scroll content (section offsets are relative to them). */
  const groupsY = useRef(0);
  const availableLetters = useMemo(() => new Set(letters), [letters]);
  const scrollToLetter = useCallback(
    (letter: string) => {
      // Fast-scroller exact hit → nearest populated section (next/prev letter).
      let target: string | null = null;
      if (sectionY.current[letter] !== undefined) target = letter;
      else {
        const idx = ALPHABET.indexOf(letter);
        if (idx !== -1) {
          for (let d = 1; d < ALPHABET.length; d++) {
            const fwd = ALPHABET[idx + d];
            const back = ALPHABET[idx - d];
            if (fwd && sectionY.current[fwd] !== undefined) {
              target = fwd;
              break;
            }
            if (back && sectionY.current[back] !== undefined) {
              target = back;
              break;
            }
          }
        }
      }
      if (!target) return;
      const y = sectionY.current[target];
      if (y !== undefined && scrollRef.current) {
        scrollRef.current.scrollTo({ y: Math.max(0, groupsY.current + y - 8), animated: true });
      }
    },
    []
  );

  const handleCategorySelect = (cat: string) => {
    impactMedium();
    setSelectedCategories((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]));
    setSelectedLetter(null);
  };

  const handleLetterPick = (letter: string) => {
    impactLight();
    setSelectedLetter((prev) => (prev === letter ? null : letter));
  };

  const clearFilters = () => {
    impactLight();
    setSelectedCategories([]);
    setSelectedLetter(null);
    setSearchQuery("");
  };

  const hasActiveFilter = selectedCategories.length > 0 || !!selectedLetter || !!searchQuery.trim();
  const isBrowsing = !hasActiveFilter;
  const totalEntries = allEntries.length;

  const showGrid = isBrowsing && filteredEntries.length > 0;

  const [railPreview, setRailPreview] = useState<string | null>(null);
  const scrollerOpacity = useSharedValue(0);
  const scrollerStyle = useAnimatedStyle(() => ({ opacity: scrollerOpacity.value }));
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canShowScroller = filteredEntries.length > 6 && !searchQuery;

  const showScroller = useCallback(() => {
    if (!canShowScroller) return;
    scrollerOpacity.value = withTiming(1, { duration: 180 });
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      if (!railPreview) scrollerOpacity.value = withTiming(0, { duration: 260 });
    }, 1600);
  }, [canShowScroller, railPreview, scrollerOpacity]);

  const hideScrollerNow = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    scrollerOpacity.value = withTiming(0, { duration: 200 });
  }, [scrollerOpacity]);

  useEffect(() => {
    if (!canShowScroller) {
      hideScrollerNow();
      return;
    }
    // brief peek on data load / filter change
    showScroller();
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [canShowScroller, filteredEntries.length, showScroller, hideScrollerNow]);

  useEffect(() => {
    if (railPreview) {
      scrollerOpacity.value = withTiming(1, { duration: 120 });
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    } else if (canShowScroller) {
      // keep visible briefly after drag ends
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(() => {
        scrollerOpacity.value = withTiming(0, { duration: 260 });
      }, 900);
    }
  }, [railPreview, canShowScroller, scrollerOpacity]);

  const headerSubtitle =
    selectedCategories.length > 0
      ? selectedCategories.length === 1
        ? `${filteredEntries.length} in ${getVaultCat(selectedCategories[0]!).label}`
        : `${filteredEntries.length} in ${selectedCategories.length} archives`
      : selectedLetter
        ? `${filteredEntries.length} · Letter ${selectedLetter}`
        : searchQuery
          ? `${filteredEntries.length} results`
          : !loaded
            ? "Loading…"
            : `${totalEntries} terms · ${categoriesWithCounts.length} archives`;

  return (
    <View style={[styles.container, { backgroundColor: bgTop }]}>
      <ScreenHeader
        title="AtomDex"
        subtitle={headerSubtitle}
        left={
          <HeaderButton
            icon={hasActiveFilter ? "CloseCircle" : "ArrowLeft2"}
            label={hasActiveFilter ? "Clear filters" : "Go back"}
            onPress={() => (hasActiveFilter ? clearFilters() : router.back())}
          />
        }
        right={<HeaderButton icon="Element4" label="Open the periodic table" onPress={() => router.push(PERIODIC_TABLE_HREF)} />}
      />

      <View style={{ backgroundColor: bgTop, borderBottomWidth: 2, borderBottomColor: scrolled ? theme.palettes.tabBar.border : "transparent" }}>
      <View style={{ width: "100%", maxWidth: contentMaxWidth, alignSelf: "center", paddingHorizontal: gutter, paddingTop: 8, paddingBottom: 10 }}>
      {/* Search, active filters and archive pills: pinned above the list */}
      <Animated.View
        layout={LinearTransition.duration(240).easing(Easing.bezier(0.23, 1, 0.32, 1))}
        style={styles.controls}
      >
        <View style={styles.searchCard}>
          <Icon name="SearchNormal" size={18} color={theme.colors.textFaint} variant="Bold" />
          <FieldInput
            style={styles.searchInput}
            placeholder="Search terms, facts, people…"
            value={searchQuery}
            onChangeText={(t) => {
              setSearchQuery(t);
              if (t) setSelectedLetter(null);
            }}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <Icon name="CloseCircle" size={18} color={theme.colors.textFaint} />
            </TouchableOpacity>
          )}
        </View>

        {(selectedCategories.length > 0 || selectedLetter) && (
          <View style={styles.activeFilterRow}>
            {selectedCategories.map((cat) => {
              const cfg = getVaultCat(cat);
              return (
                <Pressable
                  key={cat}
                  style={({ pressed }) => [styles.chip, styles.chipActive, pressed && styles.chipPressed]}
                  onPress={() => setSelectedCategories((prev) => prev.filter((c) => c !== cat))}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${cfg.label} filter`}
                >
                  <Icon name={cfg.icon} size={16} color={cfg.color} />
                  <Text style={[styles.chipText, styles.chipTextActive]}>{cfg.label}</Text>
                  <Icon name="CloseCircle" size={14} color={theme.colors.textFaint} />
                </Pressable>
              );
            })}
            {selectedLetter && (
              <Pressable
                style={({ pressed }) => [styles.chip, styles.chipActive, pressed && styles.chipPressed]}
                onPress={() => setSelectedLetter(null)}
                accessibilityRole="button"
                accessibilityLabel={`Remove letter ${selectedLetter} filter`}
              >
                <Text style={[styles.chipText, styles.chipTextActive]}>Letter {selectedLetter}</Text>
                <Icon name="CloseCircle" size={14} color={theme.colors.textFaint} />
              </Pressable>
            )}
            <Pressable
              style={({ pressed }) => [styles.chip, styles.chipClear, pressed && styles.chipPressed]}
              onPress={clearFilters}
              accessibilityRole="button"
              accessibilityLabel="Clear all filters"
            >
              <Icon name="Trash" size={15} color={theme.colors.error} />
              <Text style={[styles.chipText, { color: theme.colors.error }]}>Clear</Text>
            </Pressable>
          </View>
        )}
      {/* Category pills — multi-select */}
      <View style={styles.pillsRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillsContent}
        >
          <FilterChip
            label="All"
            icon="Book"
            color={ALL_COLOR}
            active={selectedCategories.length === 0}
            onPress={clearFilters}
          />
          {categoriesWithCounts.map(({ category, cfg }) => (
            <FilterChip
              key={category}
              label={cfg.label}
              icon={cfg.icon}
              color={cfg.color}
              active={selectedCategories.includes(category)}
              onPress={() => handleCategorySelect(category)}
            />
          ))}
        </ScrollView>
      </View>
      </Animated.View>
      </View>
      </View>

      {/* Main content */}
      <View
        style={[
          styles.body,
          { width: "100%", maxWidth: contentMaxWidth, alignSelf: "center" },
        ]}
      >
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingHorizontal: gutter,
              paddingBottom: insets.bottom + 36,
            },
          ]}
          scrollEventThrottle={16}
          onScroll={(e) => {
            onHeaderScroll(e);
            showScroller();
          }}
          onScrollBeginDrag={showScroller}
          onMomentumScrollBegin={showScroller}
          onScrollEndDrag={() => {
            if (!railPreview) {
              if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
              hideTimerRef.current = setTimeout(() => {
                scrollerOpacity.value = withTiming(0, { duration: 260 });
              }, 1400);
            }
          }}
        >
          {/* Filtered header meta */}
          {hasActiveFilter && (
            <Animated.View entering={FadeIn.duration(200)} style={styles.resultsBar}>
              <View style={styles.resultsLeft}>
                <Icon name="Book" size={14} color={theme.colors.primaryLight} variant="Bold" />
                <Text style={styles.resultsText}>
                  {filteredEntries.length} {filteredEntries.length === 1 ? "result" : "results"}
                  {selectedCategories.length > 0
                    ? ` · ${selectedCategories.map((c) => getVaultCat(c).label).join(", ")}`
                    : ""}
                  {selectedLetter ? ` · ${selectedLetter}` : ""}
                </Text>
              </View>
              {filteredEntries.length > 0 && (
                <TouchableOpacity onPress={clearFilters} style={styles.resultsClear}>
                  <Text style={styles.resultsClearText}>Show all</Text>
                </TouchableOpacity>
              )}
            </Animated.View>
          )}

          {/* Letter-grouped list */}
          {!loaded ? (
            <View style={styles.loadingState} accessibilityRole="progressbar" accessibilityLabel="Loading terms">
              <ActivityIndicator color={theme.colors.primary} />
              <Text style={styles.emptySub}>Loading terms…</Text>
            </View>
          ) : filteredEntries.length === 0 ? (
            <Animated.View entering={FadeInDown.duration(300)} style={styles.emptyState}>
              <ExpoImage
                source={require("@/assets/images/mascot/blink.png")}
                style={styles.emptyMascot}
                contentFit="contain"
              />
              <Text style={styles.emptyTitle}>
                No entries found
              </Text>
              <Text style={styles.emptySub}>
                {searchQuery ? `No results for "${searchQuery}"` : "Try another archive or letter"}
              </Text>
              {(selectedCategories.length > 0 || selectedLetter || searchQuery) && (
                <TouchableOpacity style={styles.emptyBtn} onPress={clearFilters} activeOpacity={0.88}>
                  <Text style={styles.emptyBtnText}>Clear filters</Text>
                </TouchableOpacity>
              )}
            </Animated.View>
          ) : (
            <View
              style={styles.groupsWrap}
              onLayout={(e) => {
                groupsY.current = e.nativeEvent.layout.y;
              }}
            >
              {groupedByLetter.map(([letter, entries]) => (
                <View
                  key={letter}
                  onLayout={(e) => {
                    sectionY.current[letter] = e.nativeEvent.layout.y;
                  }}
                >
                  <View style={styles.letterRow}>
                    <Text style={styles.letterText}>{letter}</Text>
                    <Text style={styles.letterCount}>
                      {entries.length} {entries.length === 1 ? "term" : "terms"}
                    </Text>
                  </View>

                  <View style={styles.cardsCol}>
                    {entries.map((entry, idx) => {
                      return (
                        <Animated.View
                          key={entry.id}
                          entering={FadeInDown.delay(idx * 28).duration(280)}
                          layout={LinearTransition.duration(220)}
                        >
                          <TouchableOpacity
                            activeOpacity={0.86}
                            style={[styles.entryRow, idx > 0 && styles.entryDivided]}
                            onPress={() => router.push(`/explorer/encyclopedia-entry?id=${entry.id}`)}
                          >
                            <Text style={styles.entryTerm}>
                              {entry.term}
                            </Text>
                            <View style={styles.entryActions}>
                                <ReadAloudButton
                                  ownerId={`encyclopedia:${entry.id}`}
                                  subject={`definition of ${entry.term}`}
                                  appearance="flat"
                                  size={28}
                                  accent={theme.colors.link}
                                  onStart={impactLight}
                                  text={() => `${entry.term}. ${entry.definition}`}
                                />
                              <View style={styles.goCircle}>
                                <Icon name="ArrowRight2" size={16} color={theme.colors.onPrimary} variant="Bold" />
                              </View>
                            </View>
                          </TouchableOpacity>
                        </Animated.View>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={{ height: 28 }} />
          {filteredEntries.length > 0 && (
            <View style={styles.footer}>
              <Icon name="Book" size={18} color={theme.colors.textFaint} variant="Bold" />
              <Text style={styles.footerText}>End of vault · {filteredEntries.length} shown</Text>
            </View>
          )}
        </ScrollView>

        {/* Alphabetical fast scroller — auto-hide */}
        {canShowScroller && (
          <Animated.View style={[styles.rail, scrollerStyle]} pointerEvents="box-none">
            <FastAlphabet
              data={[...ALPHABET]}
              availableSet={availableLetters}
              onCharSelect={(ch) => {
                showScroller();
                scrollToLetter(ch);
              }}
              onPreviewChange={(c) => {
                setRailPreview(c);
                if (c) showScroller();
              }}
            />
          </Animated.View>
        )}

      </View>
    </View>
  );
}

const makeStyles = createStyles((theme) => ({
  container: { flex: 1 },
  controls: { gap: 12 },
  searchCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.field,
    borderRadius: 16,
    minHeight: 56,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    ...fontFaces.semibold,
    color: theme.colors.fieldText,
    paddingVertical: 0,
  },
  kbdHint: {
    backgroundColor: theme.colors.surfaceSoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  kbdText: { fontSize: 11, ...fontFaces.heavy, color: theme.colors.primaryLight },
  activeFilterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  pillsRow: { },
  pillsContent: { paddingHorizontal: 2, gap: 6 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  chipActive: { backgroundColor: theme.colors.primarySurface, borderColor: theme.colors.primaryBorder },
  chipClear: { borderColor: theme.colors.errorSurface, backgroundColor: theme.colors.errorSurface },
  chipPressed: { opacity: 0.7 },
  chipText: { fontSize: 13, ...fontFaces.bold, color: theme.colors.textSecondary },
  chipTextActive: { color: theme.colors.text },
  pillEmoji: { fontSize: 13 },
  pillText: { fontSize: 13, ...fontFaces.bold, color: theme.colors.textSecondary },
  pillTextActive: { color: theme.colors.onPrimary },
  pillCount: {
    backgroundColor: theme.colors.surfaceSoft,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 22,
    alignItems: "center",
  },
  pillCountActive: { backgroundColor: withAlpha(theme.colors.onPrimary, 0.22) },
  pillCountText: { fontSize: 11, ...fontFaces.heavy, color: theme.colors.primaryLight },
  pillCountTextActive: { color: theme.colors.onPrimary },
  body: { flex: 1, flexDirection: "row" },
  scrollContent: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 36, gap: 14, flexGrow: 1 },
  gridSection: { gap: 14 },
  sectionHead: { gap: 2, paddingHorizontal: 2 },
  sectionTitle: { fontSize: 16, ...fontFaces.heavy, color: theme.colors.text },
  sectionSubtitle: { fontSize: 12, ...fontFaces.semibold, color: theme.colors.textFaint },
  vaultGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  vaultCard: {
    width: "48.2%",
    backgroundColor: theme.colors.card,
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: theme.colors.borderSubtle,
    borderBottomWidth: 4,
    elevation: 3,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
  },
  vaultCardTop: {
    height: 92,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  vaultIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: withAlpha(theme.colors.onPrimary, 0.22),
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: withAlpha(theme.colors.onPrimary, 0.35),
  },
  vaultIcon: { fontSize: 24 },
  vaultCountPill: {
    backgroundColor: theme.colors.card,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
    minWidth: 32,
    alignItems: "center",
  },
  vaultCountText: { fontSize: 13, ...fontFaces.heavy, color: theme.colors.text },
  vaultCardBody: { paddingHorizontal: 12, paddingVertical: 12, gap: 6 },
  vaultCardTitle: { fontSize: 15, ...fontFaces.heavy, color: theme.colors.text },
  vaultCardSub: { fontSize: 12, ...fontFaces.semibold, color: theme.colors.textFaint },
  vaultCardFoot: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  vaultDot: { width: 8, height: 8, borderRadius: 4 },
  vaultCardAction: { fontSize: 12, ...fontFaces.heavy, color: theme.colors.textMuted },
  quickStats: {
    flexDirection: "row",
    backgroundColor: theme.colors.card,
    borderRadius: 20,
    padding: 14,
    borderWidth: 2,
    borderColor: theme.colors.borderSubtle,
    borderBottomWidth: 4,
    alignItems: "center",
    elevation: 2,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  statCard: { flex: 1, alignItems: "center", gap: 2 },
  statValue: { fontSize: 20, ...fontFaces.heavy, color: theme.colors.primaryLight },
  statLabel: { fontSize: 11, ...fontFaces.heavy, color: theme.colors.textFaint, textTransform: "uppercase", letterSpacing: 0.6 },
  statDivider: { width: 1, height: 32, backgroundColor: theme.colors.borderSubtle, marginHorizontal: 8 },
  azRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 2 },
  azLabel: { fontSize: 11, ...fontFaces.heavy, color: theme.colors.textFaint, textTransform: "uppercase", letterSpacing: 0.8 },
  azContent: { gap: 6, paddingRight: 8 },
  azChip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: theme.colors.card,
    borderWidth: 2,
    borderColor: theme.colors.borderSubtle,
    minWidth: 32,
    alignItems: "center",
  },
  azChipActive: { backgroundColor: theme.colors.link, borderColor: theme.myth.primaryDark },
  azChipText: { fontSize: 12, ...fontFaces.heavy, color: theme.colors.textSecondary },
  azChipTextActive: { color: theme.colors.onPrimary },
  resultsBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: theme.colors.card,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: theme.colors.borderSubtle,
  },
  resultsLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  resultsText: { fontSize: 13, ...fontFaces.heavy, color: theme.colors.textSecondary },
  resultsClear: { paddingHorizontal: 8, paddingVertical: 4 },
  resultsClearText: { fontSize: 12, ...fontFaces.heavy, color: theme.colors.link },
  groupsWrap: { gap: 18 },
  letterRow: { flexDirection: "row", alignItems: "baseline", gap: 8, paddingHorizontal: 4, marginBottom: 2 },
  letterText: { fontSize: 24, ...fontFaces.heavy, color: theme.colors.primary },
  letterCount: { fontSize: 13, ...fontFaces.semibold, color: theme.colors.textMuted },
  cardsCol: { paddingHorizontal: 4 },
  entryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 56,
    paddingVertical: 8,
  },
  entryDivided: { borderTopWidth: 1, borderStyle: "dashed", borderColor: theme.colors.border },
  entryTop: { flexDirection: "row", gap: 12 },
  letterAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    marginTop: 1,
  },
  letterAvatarText: { fontSize: 17, ...fontFaces.heavy },
  entryMain: { flex: 1, gap: 6 },
  entryTerm: { flex: 1, fontSize: 16, ...fontFaces.heavy, color: theme.colors.text, minWidth: 0 },
  catPillGray: {
    backgroundColor: theme.colors.surfaceSoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  catTextGray: { fontSize: 11, ...fontFaces.heavy, color: theme.colors.textMuted, textTransform: "uppercase", letterSpacing: 0.3 },
  entryDef: { fontSize: 13, ...fontFaces.medium, color: theme.colors.textMuted, lineHeight: 19 },
  entryFoot: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 10, borderTopWidth: 1, borderTopColor: theme.colors.borderSubtle },
  footLeft: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  footDot: { width: 6, height: 6, borderRadius: 3 },
  footLabel: { fontSize: 11, ...fontFaces.heavy, color: theme.colors.textFaint, textTransform: "uppercase", letterSpacing: 0.4 },
  entryActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  speakBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.colors.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  speakBtnActive: { backgroundColor: theme.colors.link, borderColor: theme.myth.primaryDark },
  goCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingState: { alignItems: "center", justifyContent: "center", paddingVertical: 48, gap: 12 },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 36,
    paddingHorizontal: 20,
    backgroundColor: theme.colors.card,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: theme.colors.borderSubtle,
    borderBottomWidth: 4,
    gap: 8,
  },
  emptyMascot: { width: 100, height: 100, opacity: 0.9 },
  emptyTitle: { fontSize: 16, ...fontFaces.heavy, color: theme.colors.text },
  emptySub: { fontSize: 13, ...fontFaces.medium, color: theme.colors.textFaint, textAlign: "center" },
  emptyBtn: {
    marginTop: 8,
    backgroundColor: theme.colors.link,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: theme.myth.primaryDark,
    borderBottomWidth: 4,
  },
  emptyBtnText: { fontSize: 13, ...fontFaces.heavy, color: theme.colors.onPrimary },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 8 },
  footerText: { fontSize: 12, ...fontFaces.heavy, color: theme.colors.textFaint },
  rail: {
    position: "absolute",
    right: 2,
    top: 8,
    bottom: 12,
    width: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  railCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 4,
    gap: 1,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    elevation: 3,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  railCardFast: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    paddingVertical: 5,
    paddingHorizontal: 3,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    elevation: 3,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    alignItems: "center",
    width: 30,
  },
  railTrack: {
    position: "absolute",
    left: 14.5,
    top: 8,
    bottom: 8,
    width: 1.5,
    borderRadius: 1,
    backgroundColor: theme.colors.border,
    opacity: 0.9,
  },
  railTrackActive: {
    backgroundColor: theme.colors.border,
    width: 2,
  },
  railCell: {
    width: 24,
    height: 15.5,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
    flexDirection: "row",
    gap: 2,
  },
  railCellActive: {
    backgroundColor: theme.colors.link,
    shadowColor: theme.colors.link,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.28,
    shadowRadius: 4,
    elevation: 2,
  },
  railCellDim: { opacity: 0.32 },
  railTap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  railDot: {
    position: "absolute",
    right: -4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.link,
    borderWidth: 1,
    borderColor: theme.colors.card,
  },
  railCardScrubbing: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    shadowOpacity: 0.16,
    shadowRadius: 10,
    transform: [{ scale: 1.04 }],
  },
  railItem: { width: 20, height: 16, alignItems: "center", justifyContent: "center", borderRadius: 6 },
  railItemActive: { backgroundColor: theme.colors.link },
  railItemDim: { opacity: 0.35 },
  railText: { fontSize: 9.5, ...fontFaces.heavy, color: theme.colors.textSecondary, textAlign: "center" },
  railTextActive: { color: theme.colors.onPrimary },
  railTextDim: { color: theme.colors.textFaint },
  railPreview: {
    position: "absolute",
    alignSelf: "center",
    top: "42%",
    width: 86,
    height: 86,
    borderRadius: 22,
    backgroundColor: theme.colors.inverseSurface,
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.24,
    shadowRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  railPreviewText: { fontSize: 44, ...fontFaces.heavy, color: theme.colors.inverseText, lineHeight: 48 },
}));
