import { BandCard, BandCircle, LipCard } from "@/components/community/BandCard";
import { FieldInput } from "@/components/ui/field-input";
import { Icon } from "@/components/ui/icon";
import { getAllEncyclopediaEntries } from "@/content/explorer";
import type { EncyclopediaEntry } from "@/content/explorer";
import { getEncyclopediaImage } from "@/content/explorer/images";
import { createStyles, fontFaces, useResponsiveLayout, useTheme, withAlpha } from "@/theme";
import { Image as ExpoImage } from "expo-image";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Image, ScrollView, TouchableOpacity, View } from "react-native";
import { Text } from "@/components/ui/text";
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

export default function EncyclopediaScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { contentMaxWidth, gutter } = useResponsiveLayout();
  const { theme, isDark } = useTheme();
  const bgTop = theme.colors.background;

  const styles = makeStyles(theme);
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
        <BandCard
          title="Explorer Vault"
          left={<BandCircle icon="ArrowLeft2" onPress={() => router.back()} label="Go back" />}
          bodyStyle={styles.headerBody}
        >
          <Text style={styles.headerSub}>
            {hasFilter ? `${filteredEntries.length} results` : `${allEntries.length} terms · Encarta-style archive`}
          </Text>

          <View style={styles.searchCard}>
            <Icon name="SearchNormal" size={18} color={theme.colors.primary} variant="Bold" />
            <FieldInput
              style={styles.searchInput}
              placeholder="Search terms, definitions, facts…"
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
        </BandCard>
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
          <BandCard title="No entries found" right={<BandCircle icon="SearchNormal" />} bodyStyle={styles.emptyBody}>
            <ExpoImage source={require("@/assets/images/mascot/blink.png")} style={styles.emptyMascot} contentFit="contain" />
            <Text style={styles.emptySub}>Try a different search term or archive</Text>
          </BandCard>
        ) : (
          filteredEntries.map((entry, index) => {
            const cfg = getCat(entry.category);
            const thumb = entry.image ? getEncyclopediaImage(entry.id) : null;
            return (
              <Animated.View key={entry.id} entering={FadeInDown.delay(index * 24).duration(260)}>
                <LipCard
                  faceStyle={styles.card}
                  onPress={() => router.push(`/explorer/encyclopedia-entry?id=${entry.id}`)}
                  accessibilityLabel={`${entry.term}. ${cfg.label}. ${entry.definition}`}
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
                        <Icon name="Flash" size={11} color={theme.colors.warning} variant="Bold" />
                        <Text style={styles.factsText}>{entry.quickFacts.length} quick facts</Text>
                        {entry.debunkingSnippet && <Text style={styles.mythDot}>· Myth busted</Text>}
                      </View>
                    )}
                  </View>
                  <View style={styles.go}>
                    <Icon name="ArrowRight2" size={16} color={theme.colors.onPrimary} variant="Bold" />
                  </View>
                </LipCard>
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

const makeStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    container: { flex: 1 },
    headerWrap: { paddingHorizontal: 16, paddingBottom: 8, gap: 10 },
    headerBody: { gap: 12 },
    headerSub: { fontSize: 13, ...fontFaces.semibold, color: c.textMuted },
    searchCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.field,
      borderRadius: 16,
      minHeight: 56,
      paddingHorizontal: 14,
      paddingVertical: 11,
      gap: 10,
    },
    searchInput: { flex: 1, fontSize: 14, ...fontFaces.semibold, color: c.fieldText, paddingVertical: 0 },
    pillsContent: { gap: 8, paddingVertical: 2 },
    pill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: c.surfaceSoft,
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 20,
      borderWidth: 2,
      borderColor: c.surfaceSoft,
    },
    pillActive: { backgroundColor: c.primary, borderColor: c.primaryDark },
    pillText: { fontSize: 13, ...fontFaces.bold, color: c.textSecondary },
    pillTextActive: { color: c.onPrimary },
    scrollContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40, gap: 12 },
    card: { flexDirection: "row", alignItems: "center", backgroundColor: c.card, padding: 12, gap: 12 },
    thumb: { width: 56, height: 56, borderRadius: 14, backgroundColor: c.surfaceSoft },
    thumbFallback: { width: 56, height: 56, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 2, gap: 1 },
    thumbIcon: { fontSize: 14 },
    thumbLetter: { fontSize: 13, ...fontFaces.heavy },
    cardMain: { flex: 1, gap: 4 },
    cardTopRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
    term: { fontSize: 15, ...fontFaces.heavy, color: c.text, flex: 1, minWidth: 100 },
    catPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    catPillText: { fontSize: 10, ...fontFaces.heavy, textTransform: "uppercase" },
    def: { fontSize: 13, ...fontFaces.medium, color: c.textMuted, lineHeight: 18 },
    factsRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
    factsText: { fontSize: 11, ...fontFaces.heavy, color: c.warningDark },
    mythDot: { fontSize: 11, ...fontFaces.bold, color: c.error },
    go: { width: 28, height: 28, borderRadius: 14, backgroundColor: c.primary, alignItems: "center", justifyContent: "center" },
    emptyBody: { alignItems: "center", gap: 8, paddingVertical: 24 },
    emptyMascot: { width: 90, height: 90 },
    emptySub: { fontSize: 13, ...fontFaces.medium, color: c.textMuted },
    footer: { alignItems: "center", paddingVertical: 12 },
    footerText: { fontSize: 11, ...fontFaces.heavy, color: c.textFaint, textTransform: "uppercase", letterSpacing: 0.6 },
  };
});
