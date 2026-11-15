import { Icon } from "@/components/ui/icon";
import { ElementChip } from "@/components/periodic-table/ElementChip";
import { findElementsForTerms } from "@/services/periodic-table";
import { getEncyclopediaEntryById } from "@/content/explorer";
import type { EncyclopediaEntry } from "@/content/explorer";
import { getEncyclopediaImage } from "@/content/explorer/images";
import { useTheme, type Theme, fontFaces, useResponsiveLayout } from "@/theme";
import { openExternalUrl } from "@/services/open-url";
import { impactLight, impactMedium } from "@/services/haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ReadAloudButton } from "@/components/ui/read-aloud-button";
import { readAloud } from "@/services/media";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ENTRY_IMAGE_MAX_HEIGHT = 320;

const AMBER = "#FFCA5F";
const AMBER_DEEP = "#FF8C00";

export default function EncyclopediaEntryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { contentMaxWidth, gutter, contentWidth } = useResponsiveLayout();
  const { theme } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const ENTRY_IMAGE_MAX_WIDTH = Math.max(0, contentWidth - 16);

  const bgTop = theme.colors.pageGradientTop;
  const bgBottom = theme.colors.pageGradientBottom;
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [entry, setEntry] = useState<EncyclopediaEntry | null>(null);
  const [entryLoaded, setEntryLoaded] = useState(false);
  useEffect(() => {
    let alive = true;
    setEntryLoaded(false);
    setEntry(null);
    if (!id) {
      setEntryLoaded(true);
      return;
    }
    getEncyclopediaEntryById(id).then((found) => {
      if (!alive) return;
      setEntry(found ?? null);
      setEntryLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, [id]);

  const entryImageSource = useMemo(() => {
    if (!entry) return undefined;
    return getEncyclopediaImage(entry.id);
  }, [entry]);

  const entryImageSize = useMemo(() => {
    if (!entryImageSource) return { width: ENTRY_IMAGE_MAX_WIDTH, height: 220 };
    const resolvedAsset = Image.resolveAssetSource(entryImageSource);
    const assetWidth = resolvedAsset?.width || ENTRY_IMAGE_MAX_WIDTH;
    const assetHeight = resolvedAsset?.height || 220;
    if (assetWidth <= 0 || assetHeight <= 0) return { width: ENTRY_IMAGE_MAX_WIDTH, height: 220 };
    const aspectRatio = assetWidth / assetHeight;
    let displayWidth = ENTRY_IMAGE_MAX_WIDTH;
    let displayHeight = displayWidth / aspectRatio;
    if (displayHeight > ENTRY_IMAGE_MAX_HEIGHT) {
      displayHeight = ENTRY_IMAGE_MAX_HEIGHT;
      displayWidth = displayHeight * aspectRatio;
    }
    return { width: Math.round(displayWidth), height: Math.round(displayHeight) };
  }, [entryImageSource, ENTRY_IMAGE_MAX_WIDTH]);

  const openSourceLink = useCallback(async (url: string) => {
    impactLight();
    const opened = await openExternalUrl(url);
    if (!opened) Alert.alert("Unable to open link", "Please try again in a moment.");
  }, []);

  // Periodic-table links: cheap first-word lookups on the term and related ids.
  const elementLinks = useMemo(
    () => (entry ? findElementsForTerms([entry.term, ...(entry.relatedTerms ?? [])]) : []),
    [entry],
  );

  const getFullEntrySpeech = useCallback(() => {
    if (!entry) return "";
    let fullText = `${entry.term}. ${entry.definition}`;
    if (entry.quickFacts && entry.quickFacts.length > 0) fullText += ` Quick facts: ${entry.quickFacts.join(". ")}`;
    if (entry.debunkingSnippet) fullText += ` Myth debunking: ${entry.debunkingSnippet}`;
    return fullText;
  }, [entry]);

  if (!entry) {
    return (
      <View style={[styles.notFoundWrap, { backgroundColor: bgTop, paddingTop: insets.top + 24 }]}>
        <View style={styles.notFoundCard}>
          <Text style={styles.notFoundEmoji}>🔍</Text>
          <Text style={styles.notFoundText}>{entryLoaded ? "Entry not found" : "Loading…"}</Text>
          <TouchableOpacity style={styles.notFoundButton} onPress={() => router.back()} activeOpacity={0.9}>
            <Text style={styles.notFoundButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: bgTop }]}>
      <LinearGradient colors={[bgTop, bgBottom]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} pointerEvents="none" />

      {/* Amber vault header */}
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
              <Icon name="ArrowLeft2" size={20} color="#7C4A00" variant="Bold" />
            </TouchableOpacity>
            <View style={styles.headerCopy}>
              <Text style={styles.headerTitle}>
                {entry.term}
              </Text>
            </View>
            <ReadAloudButton
              ownerId={`encyclopedia-entry:${entry.id}:all`}
              subject="entry"
              size={38}
              accent={AMBER_DEEP}
              onStart={impactMedium}
              text={getFullEntrySpeech}
            />
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            width: "100%",
            maxWidth: contentMaxWidth,
            alignSelf: "center",
            paddingHorizontal: gutter,
            paddingBottom: insets.bottom + 24,
          },
        ]}
      >
        {/* Image */}
        {entry.image && entryImageSource && (
          <Animated.View entering={FadeInDown.delay(120).springify()} style={styles.imageCard}>
            <Image source={entryImageSource} style={[styles.entryImage, entryImageSize]} resizeMode="contain" />
          </Animated.View>
        )}

        {/* Definition */}
        <Animated.View entering={FadeInDown.delay(160).springify()} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Definition</Text>
            <ReadAloudButton
              ownerId={`encyclopedia-entry:${entry.id}:definition`}
              subject="definition"
              size={34}
              accent={AMBER_DEEP}
              onStart={impactLight}
              text={entry.definition}
            />
          </View>
          <View style={styles.divider} />
          <Text style={styles.definition}>{entry.definition}</Text>
        </Animated.View>

        {/* Quick Facts */}
        {entry.quickFacts && entry.quickFacts.length > 0 && (
          <Animated.View entering={FadeInDown.delay(220).springify()} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Quick Facts</Text>
              <ReadAloudButton
                ownerId={`encyclopedia-entry:${entry.id}:facts`}
                subject="quick facts"
                size={34}
                accent={AMBER_DEEP}
                onStart={impactLight}
                text={() => `Quick facts about ${entry.term}: ${entry.quickFacts.join(". ")}`}
              />
            </View>
            <View style={styles.divider} />
            {entry.quickFacts.map((fact, index) => (
              <View key={index} style={styles.factRow}>
                <View style={styles.factNum}>
                  <Text style={styles.factNumText}>{index + 1}</Text>
                </View>
                <Text style={styles.factText}>{fact}</Text>
              </View>
            ))}
          </Animated.View>
        )}

        {/* Myth Busted */}
        {entry.debunkingSnippet && (
          <Animated.View entering={FadeInDown.delay(280).springify()} style={styles.mythCard}>
            <LinearGradient colors={["#EF4444", "#DC2626"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.mythGradient}>
              <View style={styles.mythHeader}>
                <Text style={styles.mythTitle}>Myth Busted!</Text>
                <ReadAloudButton
                  ownerId={`encyclopedia-entry:${entry.id}:myth`}
                  subject="myth debunking"
                  size={34}
                  accent={theme.colors.error}
                  onStart={impactLight}
                  text={() => `Myth busting: ${entry.debunkingSnippet}`}
                />
              </View>
              <Text style={styles.mythText}>{entry.debunkingSnippet}</Text>
            </LinearGradient>
          </Animated.View>
        )}

        {/* Periodic table elements mentioned by this entry */}
        {elementLinks.length > 0 && (
          <Animated.View entering={FadeInDown.delay(320).springify()} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>In the Periodic Table</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.pillsWrap}>
              {elementLinks.map((el) => (
                <ElementChip key={el.symbol} symbol={el.symbol} />
              ))}
            </View>
          </Animated.View>
        )}

        {/* Related Terms */}
        {entry.relatedTerms && entry.relatedTerms.length > 0 && (
          <Animated.View entering={FadeInDown.delay(340).springify()} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Related Terms</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.pillsWrap}>
              {entry.relatedTerms.map((term, index) => (
                <Animated.View key={index} entering={ZoomIn.delay(360 + index * 40)}>
                  <TouchableOpacity
                    style={styles.pill}
                    onPress={() => {
                      readAloud.stop("route-change");
                      router.replace(`/explorer/encyclopedia-entry?id=${term}`);
                    }}
                    activeOpacity={0.88}
                    hitSlop={7}
                    accessibilityRole="link"
                  >
                    <Text style={styles.pillText}>{term.replace(/-/g, " ")}</Text>
                    <Icon name="ArrowRight2" size={12} color="#7C4A00" variant="Bold" />
                  </TouchableOpacity>
                </Animated.View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* References */}
        {entry.sources && entry.sources.length > 0 && (
          <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>References</Text>
            </View>
            <View style={styles.divider} />
            {entry.sources.map((source, index) => (
              <TouchableOpacity
                key={index}
                style={styles.sourceRow}
                activeOpacity={0.8}
                onPress={() => void openSourceLink(source.url)}
              >
                <View style={styles.sourceOrg}>
                  <Text style={styles.sourceOrgText}>{source.organization}</Text>
                </View>
                <Text style={styles.sourceTitle}>{source.title}</Text>
                <View style={styles.sourceUrlRow}>
                  <Text style={styles.sourceUrl} numberOfLines={1}>
                    {source.url}
                  </Text>
                  <Icon name="ArrowRight2" size={14} color="#7C4A00" variant="Bold" />
                </View>
              </TouchableOpacity>
            ))}
          </Animated.View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: Theme) => {
  const c = theme.colors;
  return StyleSheet.create({
    container: { flex: 1 },
    notFoundWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
    notFoundCard: {
      backgroundColor: c.card,
      borderRadius: 22,
      padding: 24,
      alignItems: "center",
      borderWidth: 2,
      borderColor: c.borderSubtle,
      borderBottomWidth: 4,
      width: "100%",
      maxWidth: 320,
    },
    notFoundEmoji: { fontSize: 48, marginBottom: 12 },
    notFoundText: { fontSize: 16, ...fontFaces.heavy, color: c.text, marginBottom: 16 },
    notFoundButton: { backgroundColor: AMBER_DEEP, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 14, borderWidth: 2, borderColor: "#E67E22", borderBottomWidth: 4 },
    notFoundButtonText: { color: c.onPrimary, ...fontFaces.heavy, fontSize: 13 },
    headerWrap: { paddingHorizontal: 16, paddingBottom: 10, zIndex: 10 },
    headerBar: {
      backgroundColor: AMBER,
      borderRadius: 26,
      padding: 12,
      gap: 10,
      borderWidth: 2,
      borderColor: c.creamBorder,
      borderBottomWidth: 4,
      elevation: 6,
      shadowColor: c.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 10,
    },
    headerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    backBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: c.card,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: "#FDE68A",
      borderBottomWidth: 4,
    },
    headerCopy: { flex: 1, gap: 6 },
    headerTitle: { fontSize: 18, ...fontFaces.heavy, color: "#7C4A00", letterSpacing: -0.3 },
    headerSubRow: { flexDirection: "row", gap: 8, alignItems: "center", flexWrap: "wrap" },
    catPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
    catEmoji: { fontSize: 11 },
    catText: { fontSize: 11, ...fontFaces.heavy, textTransform: "uppercase" },
    diffPill: { backgroundColor: c.card, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, borderWidth: 1, borderColor: "#FDE68A" },
    diffText: { fontSize: 11, ...fontFaces.heavy, color: "#7C4A00", textTransform: "uppercase" },
    speakAllBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: c.card,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: "#FDE68A",
      borderBottomWidth: 4,
    },
    speakAllActive: { backgroundColor: AMBER_DEEP, borderColor: "#E67E22" },
    scrollContent: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 24, gap: 12 },
    heroCard: {
      backgroundColor: c.card,
      borderRadius: 20,
      padding: 14,
      borderWidth: 2,
      borderColor: c.borderSubtle,
      borderBottomWidth: 4,
      flexDirection: "row",
      gap: 12,
      alignItems: "center",
    },
    heroRow: { flexDirection: "row", gap: 12, alignItems: "center", flex: 1 },
    letterAvatar: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 2 },
    letterText: { fontSize: 20, ...fontFaces.heavy },
    heroText: { flex: 1, gap: 4 },
    heroTerm: { fontSize: 18, ...fontFaces.heavy, color: c.text },
    heroDef: { fontSize: 13, ...fontFaces.medium, color: c.textMuted, lineHeight: 18 },
    imageCard: {
      backgroundColor: c.card,
      borderRadius: 20,
      borderWidth: 2,
      borderColor: c.borderSubtle,
      borderBottomWidth: 4,
      overflow: "hidden",
      padding: 8,
      alignItems: "center",
    },
    entryImage: { borderRadius: 14 },
    card: {
      backgroundColor: c.card,
      borderRadius: 20,
      padding: 14,
      borderWidth: 2,
      borderColor: c.borderSubtle,
      borderBottomWidth: 4,
      gap: 10,
    },
    cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
    cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    cardIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
    cardIconEmoji: { fontSize: 16 },
    cardTitle: { fontSize: 15, ...fontFaces.heavy, color: c.text },
    ttsBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: c.surfaceSoft,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: c.border,
    },
    ttsActive: { backgroundColor: AMBER_DEEP, borderColor: "#E67E22" },
    divider: { height: 1, backgroundColor: c.borderSubtle, borderRadius: 1 },
    definition: { fontSize: 14, ...fontFaces.medium, color: c.text, lineHeight: 22 },
    factRow: { flexDirection: "row", gap: 10, alignItems: "flex-start", paddingVertical: 6 },
    factNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: AMBER, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#FDE68A" },
    factNumText: { fontSize: 12, ...fontFaces.heavy, color: "#7C4A00" },
    factText: { flex: 1, fontSize: 13, ...fontFaces.medium, color: c.text, lineHeight: 19 },
    mythCard: { borderRadius: 20, overflow: "hidden", borderWidth: 2, borderColor: "#FECACA", borderBottomWidth: 4 },
    mythGradient: { padding: 14, gap: 10 },
    mythHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    mythTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    mythIconWrap: { width: 32, height: 32, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.22)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.3)" }, // theme-allow: inverse overlay on myth gradient
    mythIcon: { fontSize: 16 },
    mythTitle: { fontSize: 15, ...fontFaces.heavy, color: "#FFFFFF" },
    mythTts: { width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.3)" }, // theme-allow: inverse overlay on myth gradient
    mythTtsActive: { backgroundColor: "rgba(0,0,0,0.18)" }, // theme-allow: pressed tint on myth gradient
    mythText: { fontSize: 13, ...fontFaces.medium, color: "#FFFFFF", lineHeight: 20 },
    pillsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    pill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: c.surfaceSoft,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
    },
    pillText: { fontSize: 12, ...fontFaces.heavy, color: c.textSecondary, textTransform: "capitalize" },
    sourceRow: { gap: 6, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.borderSubtle },
    sourceOrg: { alignSelf: "flex-start", backgroundColor: AMBER, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: "#FDE68A" },
    sourceOrgText: { fontSize: 11, ...fontFaces.heavy, color: "#7C4A00" },
    sourceTitle: { fontSize: 13, ...fontFaces.heavy, color: c.text },
    sourceUrlRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    sourceUrl: { flex: 1, fontSize: 12, ...fontFaces.medium, color: "#7C4A00" },
  });
};
