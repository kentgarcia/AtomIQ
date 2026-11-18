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
import { PERIODIC_TABLE_HREF } from "@/services/periodic-table";
import { PeriodicTableBanner } from "@/components/community/EncyclopediaParts";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/* -------------------------------------------------------------------------------- */
/* Vault config — single source for category accents (adopted from current design)  */
/* -------------------------------------------------------------------------------- */

type VaultCat = {
  label: string;
  bg: string;
  border: string;
  icon: string;
  gradient: readonly [string, string];
};

const CATEGORY_VAULT: Record<string, VaultCat> = {
  science: {
    label: "Science",
    bg: "#8B5CF6",
    border: "#7C3AED",
    icon: "🔬",
    gradient: ["#8B5CF6", "#6D28D9"] as const,
  },
  technology: {
    label: "Technology",
    bg: "#3B82F6",
    border: "#2563EB",
    icon: "⚙️",
    gradient: ["#3B82F6", "#1D4ED8"] as const,
  },
  safety: {
    label: "Safety",
    bg: "#10B981",
    border: "#059669",
    icon: "🛡️",
    gradient: ["#10B981", "#047857"] as const,
  },
  environment: {
    label: "Environment",
    bg: "#059669",
    border: "#047857",
    icon: "🌿",
    gradient: ["#059669", "#065F46"] as const,
  },
  people: {
    label: "People",
    bg: "#F59E0B",
    border: "#D97706",
    icon: "🧑‍🔬",
    gradient: ["#F59E0B", "#D97706"] as const,
  },
  history: {
    label: "History",
    bg: "#CA8A04",
    border: "#A16207",
    icon: "📜",
    gradient: ["#CA8A04", "#854D0E"] as const,
  },
  default: {
    label: "Archive",
    bg: "#6B7280",
    border: "#4B5563",
    icon: "📖",
    gradient: ["#6B7280", "#4B5563"] as const,
  },
};

const getVaultCat = (cat: string): VaultCat =>
  CATEGORY_VAULT[cat?.toLowerCase()] ?? CATEGORY_VAULT.default;

/* Visual constants matching Home & Community (brand amber, mode-aware via theme) */
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("") as readonly string[];

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
  useEffect(() => {
    let alive = true;
    getAllEncyclopediaEntries().then((entries) => {
      if (alive) setAllEntries(entries);
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
          : `${totalEntries} terms · ${categoriesWithCounts.length} archives`;

  return (
    <View style={[styles.container, { backgroundColor: bgTop }]}>
      <ScreenHeader
        title="Encyclopedia"
        subtitle={headerSubtitle}
        left={
          <HeaderButton
            icon={hasActiveFilter ? "CloseCircle" : "ArrowLeft2"}
            label={hasActiveFilter ? "Clear filters" : "Go back"}
            onPress={() => (hasActiveFilter ? clearFilters() : router.back())}
          />
        }
        right={<HeaderButton icon="Element4" label="Open the periodic table" onPress={() => router.push(PERIODIC_TABLE_HREF)} />}
        scrolled={scrolled}
      />

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
          {/* Search, active filters and archive pills: they scroll away with the list */}
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
                {selectedCategories.map((cat) => (
                  <View key={cat} style={[styles.activeChip, styles.activeChipSelected]}>
                    <Text style={[styles.activeChipText, styles.activeChipTextSelected]}>{getVaultCat(cat).label}</Text>
                    <TouchableOpacity
                      onPress={() => setSelectedCategories((prev) => prev.filter((c) => c !== cat))}
                      hitSlop={6}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${getVaultCat(cat).label} filter`}
                    >
                      <Icon name="CloseCircle" size={14} color={theme.colors.onPrimary} />
                    </TouchableOpacity>
                  </View>
                ))}
                {selectedLetter && (
                  <View style={styles.activeChipLetter}>
                    <Text style={styles.activeChipLetterText}>{selectedLetter}</Text>
                    <TouchableOpacity
                      onPress={() => setSelectedLetter(null)}
                      hitSlop={6}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove letter ${selectedLetter} filter`}
                    >
                      <Icon name="CloseCircle" size={14} color={theme.colors.primaryLight} />
                    </TouchableOpacity>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.clearLink}
                  onPress={clearFilters}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Clear all filters"
                >
                  <Text style={styles.clearLinkText}>Clear</Text>
                </TouchableOpacity>
              </View>
            )}
          {/* Category pills — multi-select */}
          <View style={styles.pillsRow}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pillsContent}
            >
              <TouchableOpacity
                style={[styles.pill, selectedCategories.length === 0 && styles.pillActive]}
                onPress={clearFilters}
                activeOpacity={0.9}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityState={{ selected: selectedCategories.length === 0 }}
              >
                <Text style={[styles.pillText, selectedCategories.length === 0 && styles.pillTextActive]}>All</Text>
              </TouchableOpacity>
              {categoriesWithCounts.map(({ category, cfg }) => {
                const active = selectedCategories.includes(category);
                return (
                  <TouchableOpacity
                    key={category}
                    style={[styles.pill, active && styles.pillActive]}
                    onPress={() => handleCategorySelect(category)}
                    activeOpacity={0.9}
                    hitSlop={6}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                  >
                    <Text style={[styles.pillText, active && styles.pillTextActive]}>{cfg.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
          </Animated.View>

          {/* The periodic table banner moved here from Discover (docs/NPC_FEED_SPEC.md §4.5) */}
          {isBrowsing ? <PeriodicTableBanner /> : null}

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
          {filteredEntries.length === 0 ? (
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
                    <View style={styles.letterBadge}>
                      <Text style={styles.letterText}>{letter}</Text>
                    </View>
                    <Text style={styles.letterCount}>{entries.length}</Text>
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
                            style={styles.entryCard}
                            onPress={() => router.push(`/explorer/encyclopedia-entry?id=${entry.id}`)}
                          >
                            <View style={styles.entryTopRow}>
                              <Text style={styles.entryTerm}>
                                {entry.term}
                              </Text>
                              <View style={styles.entryActions}>
                                <ReadAloudButton
                                  ownerId={`encyclopedia:${entry.id}`}
                                  subject={`definition of ${entry.term}`}
                                  size={36}
                                  accent={theme.colors.link}
                                  onStart={impactLight}
                                  text={() => `${entry.term}. ${entry.definition}`}
                                />
                                <View style={styles.goCircle}>
                                  <Icon name="ArrowRight2" size={16} color={theme.colors.primaryLight} variant="Bold" />
                                </View>
                              </View>
                            </View>
                            <Text style={styles.entryDef}>
                              {entry.definition}
                            </Text>
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
    gap: 8,
    flexWrap: "wrap",
  },
  activeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    backgroundColor: theme.colors.card,
  },
  activeChipSelected: {
    backgroundColor: theme.colors.link,
    borderColor: theme.myth.primaryDark,
    borderWidth: 2,
  },
  activeChipEmoji: { fontSize: 12 },
  activeChipText: { fontSize: 12, ...fontFaces.heavy, color: theme.colors.textSecondary },
  activeChipTextSelected: { color: theme.colors.onPrimary },
  activeChipLetter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: theme.colors.card,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  activeChipLetterText: { fontSize: 12, ...fontFaces.heavy, color: theme.colors.primaryLight },
  clearLink: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  clearLinkText: { fontSize: 12, ...fontFaces.heavy, color: theme.colors.primaryLight, textDecorationLine: "underline" },
  pillsRow: { },
  pillsContent: { paddingHorizontal: 4, gap: 8, paddingVertical: 2 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: theme.colors.card,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: theme.colors.borderSubtle,
    elevation: 2,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  pillActive: {
    backgroundColor: theme.colors.link,
    borderColor: theme.myth.primaryDark,
    elevation: 5,
    shadowColor: theme.colors.link,
    shadowOpacity: 0.28,
  },
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
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 36, gap: 14, flexGrow: 1 },
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
  letterRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  letterBadge: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: theme.colors.primarySurface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderBottomWidth: 3,
  },
  letterText: { fontSize: 14, ...fontFaces.heavy, color: theme.colors.primaryLight },
  letterLine: { flex: 1, height: 2, backgroundColor: theme.colors.borderSubtle, borderRadius: 1 },
  letterCount: { fontSize: 11, ...fontFaces.heavy, color: theme.colors.textFaint, minWidth: 22, textAlign: "right" },
  cardsCol: { gap: 10 },
  entryCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 20,
    padding: 14,
    gap: 12,
    borderWidth: 2,
    borderColor: theme.colors.borderSubtle,
    borderBottomWidth: 4,
    elevation: 2,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  entryTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
  },
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
  entryTerm: { flex: 1, fontSize: 15, ...fontFaces.heavy, color: theme.colors.text, minWidth: 0 },
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
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.colors.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderBottomWidth: 4,
  },
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
