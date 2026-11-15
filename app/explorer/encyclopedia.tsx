import { Icon } from "@/components/ui/icon";
import { getAllEncyclopediaEntries } from "@/content/explorer";
import type { EncyclopediaEntry } from "@/content/explorer";
import { getEncyclopediaImage } from "@/content/explorer/images";
import { useTheme, type Theme, fontFaces, useResponsiveLayout, withAlpha } from "@/theme";
import { Image as ExpoImage } from "expo-image";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type VaultCat = {
  label: string;
  bg: string;
  border: string;
  icon: string;
};

const CATS: Record<string, VaultCat> = {
  science: { label: "Science", bg: "#8B5CF6", border: "#7C3AED", icon: "🔬" },
  technology: { label: "Technology", bg: "#3B82F6", border: "#2563EB", icon: "⚙️" },
  safety: { label: "Safety", bg: "#10B981", border: "#059669", icon: "🛡️" },
  environment: { label: "Environment", bg: "#059669", border: "#047857", icon: "🌿" },
  people: { label: "People", bg: "#F59E0B", border: "#D97706", icon: "🧑‍🔬" },
  default: { label: "Archive", bg: "#6B7280", border: "#4B5563", icon: "📖" },
};
const getCat = (c: string) => CATS[c?.toLowerCase()] ?? CATS.default;

const AMBER_DEEP = "#EA580C";

export default function EncyclopediaScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { contentMaxWidth, gutter } = useResponsiveLayout();
  const { theme, isDark } = useTheme();
  const bgTop = theme.colors.background;

  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

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

  const categories = useMemo(() => {
    const m: Record<string, number> = {};
    allEntries.forEach((e) => (m[e.category] = (m[e.category] || 0) + 1));
    return Object.entries(m)
      .map(([category, count]) => ({ category, count, cfg: getCat(category) }))
      .sort((a, b) => b.count - a.count);
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
          entry.quickFacts.some((fact) => fact.toLowerCase().includes(q))
      );
    }
    if (selectedCategory) entries = entries.filter((e) => e.category === selectedCategory);
    return [...entries].sort((a, b) => a.term.localeCompare(b.term));
  }, [searchQuery, allEntries, selectedCategory]);

  const hasFilter = !!selectedCategory || !!searchQuery.trim();

  return (
    <View style={[styles.container, { backgroundColor: bgTop }]}>

      {/* Explorer vault header — same amber language, explorer-tinted subtitle */}
      <View
        style={[
          styles.headerWrap,
          {
            paddingTop: insets.top + 12,
            paddingHorizontal: gutter,
            width: "100%",
            maxWidth: contentMaxWidth,
            alignSelf: "center",
          },
        ]}
      >
        <View style={styles.headerBar}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => router.back()}
              activeOpacity={0.9}
              hitSlop={5}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Icon name="ArrowLeft2" size={20} color={theme.colors.text} variant="Bold" />
            </TouchableOpacity>
            <View style={styles.headerCopy}>
              <Text style={styles.headerTitle}>Explorer Vault</Text>
              <Text style={styles.headerSub}>
                {hasFilter ? `${filteredEntries.length} results` : `${allEntries.length} terms · Encarta-style archive`}
              </Text>
            </View>
          </View>

          <View style={styles.searchCard}>
            <Icon name="SearchNormal" size={18} color={theme.colors.textMuted} variant="Bold" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search terms, definitions, facts…"
              placeholderTextColor={theme.colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
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
        </View>

        <View style={styles.pillsRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsContent}>
            <TouchableOpacity
              style={[styles.pill, !selectedCategory && styles.pillActive]}
              onPress={() => setSelectedCategory(null)}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityState={{ selected: !selectedCategory }}
            >
              <Text style={[styles.pillText, !selectedCategory && styles.pillTextActive]}>All</Text>
            </TouchableOpacity>
            {categories.map(({ category, cfg }) => {
              const active = selectedCategory === category;
              return (
                <TouchableOpacity
                  key={category}
                  style={[styles.pill, active && styles.pillActive]}
                  onPress={() => setSelectedCategory(active ? null : category)}
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
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            width: "100%",
            maxWidth: contentMaxWidth,
            alignSelf: "center",
            paddingHorizontal: gutter,
            paddingBottom: insets.bottom + 40,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {filteredEntries.length === 0 ? (
          <View style={styles.empty}>
            <ExpoImage source={require("@/assets/images/mascot/blink.png")} style={styles.emptyMascot} contentFit="contain" />
            <Text style={styles.emptyTitle}>No entries found</Text>
            <Text style={styles.emptySub}>Try a different search term or archive</Text>
          </View>
        ) : (
          filteredEntries.map((entry, index) => {
            const cfg = getCat(entry.category);
            const thumb = entry.image ? getEncyclopediaImage(entry.id) : null;
            return (
              <Animated.View key={entry.id} entering={FadeInDown.delay(index * 24).duration(260)}>
                <TouchableOpacity
                  activeOpacity={0.86}
                  style={styles.card}
                  onPress={() => router.push(`/explorer/encyclopedia-entry?id=${entry.id}`)}
                >
                  {thumb ? (
                    <Image source={thumb} style={styles.thumb} resizeMode="cover" />
                  ) : (
                    <View style={[styles.thumbFallback, { backgroundColor: withAlpha(cfg.bg, isDark ? 0.22 : 0.12), borderColor: cfg.border }]}>
                      <Text style={styles.thumbIcon}>{cfg.icon}</Text>
                      <Text style={[styles.thumbLetter, { color: cfg.border }]}>{entry.term.trim().charAt(0).toUpperCase()}</Text>
                    </View>
                  )}
                  <View style={styles.cardMain}>
                    <View style={styles.cardTopRow}>
                      <Text style={styles.term}>
                        {entry.term}
                      </Text>
                      <View style={[styles.catPill, { backgroundColor: withAlpha(cfg.bg, isDark ? 0.22 : 0.12) }]}>
                        <Text style={[styles.catPillText, { color: cfg.border }]}>{cfg.label}</Text>
                      </View>
                    </View>
                    <Text style={styles.def}>
                      {entry.definition}
                    </Text>
                    {entry.quickFacts.length > 0 && (
                      <View style={styles.factsRow}>
                        <Icon name="Flash" size={11} color="#F59E0B" variant="Bold" />
                        <Text style={styles.factsText}>{entry.quickFacts.length} quick facts</Text>
                        {entry.debunkingSnippet && <Text style={styles.mythDot}>· Myth busted</Text>}
                      </View>
                    )}
                  </View>
                  <View style={styles.go}>
                    <Icon name="ArrowRight2" size={16} color={theme.colors.textFaint} variant="Bold" />
                  </View>
                </TouchableOpacity>
              </Animated.View>
            );
          })
        )}
        <View style={styles.footer}>
          <Text style={styles.footerText}>{filteredEntries.length > 0 ? `${filteredEntries.length} terms` : "Vault archive"}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const makeStyles = (theme: Theme) => {
  const c = theme.colors;
  return StyleSheet.create({
    container: { flex: 1 },
    headerWrap: { paddingHorizontal: 16, paddingBottom: 8, gap: 10 },
    headerBar: {
      backgroundColor: c.card,
      borderRadius: 26,
      padding: 12,
      gap: 12,
      borderWidth: 2,
      borderColor: c.border,
      borderBottomWidth: 4,
      elevation: 4,
      shadowColor: c.shadow,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
    },
    headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    backBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: c.card,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: c.border,
      borderBottomWidth: 4,
    },
    headerCopy: { flex: 1 },
    headerTitle: { fontSize: 18, ...fontFaces.heavy, color: theme.colors.text, letterSpacing: -0.3 },
    headerSub: { fontSize: 12, ...fontFaces.semibold, color: c.textMuted, marginTop: 1 },
    mascot: { width: 42, height: 42 },
    searchCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.card,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 11,
      gap: 10,
      borderWidth: 2,
      borderColor: c.border,
      borderBottomWidth: 4,
    },
    searchInput: { flex: 1, fontSize: 14, ...fontFaces.semibold, color: c.text, paddingVertical: 0 },
    pillsRow: {},
    pillsContent: { gap: 8, paddingHorizontal: 4, paddingVertical: 2 },
    pill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: c.card,
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 20,
      borderWidth: 2,
      borderColor: c.borderSubtle,
    },
    pillActive: { backgroundColor: AMBER_DEEP, borderColor: "#C2410C" },
    pillEmoji: { fontSize: 12 },
    pillText: { fontSize: 13, ...fontFaces.bold, color: c.textSecondary },
    pillTextActive: { color: c.onPrimary },
    scrollContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40, gap: 10 },
    card: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.card,
      borderRadius: 20,
      padding: 12,
      gap: 12,
      borderWidth: 2,
      borderColor: c.borderSubtle,
      borderBottomWidth: 4,
      elevation: 2,
      shadowColor: c.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 6,
    },
    thumb: { width: 56, height: 56, borderRadius: 14, backgroundColor: c.surfaceSoft },
    thumbFallback: {
      width: 56,
      height: 56,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      gap: 1,
    },
    thumbIcon: { fontSize: 14 },
    thumbLetter: { fontSize: 13, ...fontFaces.heavy },
    cardMain: { flex: 1, gap: 4 },
    cardTopRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
    term: { fontSize: 15, ...fontFaces.heavy, color: c.text, flex: 1, minWidth: 100 },
    catPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    catPillText: { fontSize: 10, ...fontFaces.heavy, textTransform: "uppercase" },
    def: { fontSize: 13, ...fontFaces.medium, color: c.textMuted, lineHeight: 18 },
    factsRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
    factsText: { fontSize: 11, ...fontFaces.heavy, color: "#92400E" },
    mythDot: { fontSize: 11, ...fontFaces.bold, color: "#DC2626" },
    go: { width: 28, height: 28, borderRadius: 14, backgroundColor: c.surfaceSoft, alignItems: "center", justifyContent: "center" },
    empty: { alignItems: "center", justifyContent: "center", paddingVertical: 48, gap: 8, backgroundColor: c.card, borderRadius: 22, borderWidth: 2, borderColor: c.borderSubtle },
    emptyMascot: { width: 90, height: 90 },
    emptyTitle: { fontSize: 16, ...fontFaces.heavy, color: c.text },
    emptySub: { fontSize: 13, ...fontFaces.medium, color: c.textFaint },
    footer: { alignItems: "center", paddingVertical: 12 },
    footerText: { fontSize: 11, ...fontFaces.heavy, color: c.textFaint, textTransform: "uppercase", letterSpacing: 0.6 },
  });
};
