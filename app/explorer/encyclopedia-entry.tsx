import { Icon } from "@/components/ui/icon";
import { getEncyclopediaEntryById } from "@/content/explorer";
import type { EncyclopediaEntry } from "@/content/explorer";
import { getEncyclopediaImage } from "@/content/explorer/images";
import { useTheme, fontFamilies } from "@/theme";
import { openExternalUrl } from "@/services/open-url";
import { impactLight, impactMedium } from "@/services/haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { speakSafely, stopSpeech } from "@/services/speech";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from "react-native";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ENTRY_IMAGE_MAX_HEIGHT = 320;

const AMBER = "#FFCA5F";
const AMBER_DEEP = "#FF8C00";
const CREAM_TOP = "#FFF3E0";
const CREAM_BOTTOM = "#FFFFFF";
const CARD_WHITE = "#FFFFFF";

const CATEGORY_COLORS: Record<string, { bg: string; border: string; icon: string; gradient: readonly [string, string] }> = {
  radiation: { bg: "#FEF3C7", border: "#F59E0B", icon: "☢️", gradient: ["#F59E0B", "#D97706"] as const },
  nuclear: { bg: "#DBEAFE", border: "#3B82F6", icon: "⚛️", gradient: ["#3B82F6", "#2563EB"] as const },
  safety: { bg: "#D1FAE5", border: "#10B981", icon: "🛡️", gradient: ["#10B981", "#059669"] as const },
  physics: { bg: "#EDE9FE", border: "#8B5CF6", icon: "🔬", gradient: ["#8B5CF6", "#7C3AED"] as const },
  science: { bg: "#EDE9FE", border: "#8B5CF6", icon: "🔬", gradient: ["#8B5CF6", "#7C3AED"] as const },
  energy: { bg: "#FEE2E2", border: "#EF4444", icon: "⚡", gradient: ["#EF4444", "#DC2626"] as const },
  medicine: { bg: "#FCE7F3", border: "#EC4899", icon: "💊", gradient: ["#EC4899", "#DB2777"] as const },
  environment: { bg: "#ECFDF5", border: "#059669", icon: "🌿", gradient: ["#059669", "#047857"] as const },
  history: { bg: "#FEF9C3", border: "#CA8A04", icon: "📜", gradient: ["#CA8A04", "#A16207"] as const },
  technology: { bg: "#E0E7FF", border: "#6366F1", icon: "🔧", gradient: ["#6366F1", "#4F46E5"] as const },
  people: { bg: "#FEF3C7", border: "#F59E0B", icon: "🧑‍🔬", gradient: ["#F59E0B", "#D97706"] as const },
  default: { bg: "#F3F4F6", border: "#6B7280", icon: "📖", gradient: ["#6B7280", "#4B5563"] as const },
};

export default function EncyclopediaEntryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const ENTRY_IMAGE_MAX_WIDTH = width - 32;
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingSection, setSpeakingSection] = useState<string | null>(null);

  const THEME = theme.palettes.entry;
  const bgTop = isDark ? THEME.bg : CREAM_TOP;
  const bgBottom = isDark ? THEME.bg : CREAM_BOTTOM;
  const styles = useMemo(() => createStyles(isDark), [isDark]);

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
  }, [entryImageSource, width]);

  const getCategoryStyle = (category: string) => {
    const key = category?.toLowerCase() || "default";
    return CATEGORY_COLORS[key] || CATEGORY_COLORS["default"];
  };

  useEffect(() => {
    return () => {
      stopSpeech();
    };
  }, []);

  const speakText = useCallback(
    (text: string, section: string) => {
      impactLight();
      if (isSpeaking && speakingSection === section) {
        stopSpeech();
        setIsSpeaking(false);
        setSpeakingSection(null);
      } else {
        stopSpeech();
        setIsSpeaking(true);
        setSpeakingSection(section);
        speakSafely(text, {
          language: "en",
          rate: 0.85,
          pitch: 1.0,
          onDone: () => {
            setIsSpeaking(false);
            setSpeakingSection(null);
          },
          onStopped: () => {
            setIsSpeaking(false);
            setSpeakingSection(null);
          },
        });
      }
    },
    [isSpeaking, speakingSection]
  );

  const openSourceLink = useCallback(async (url: string) => {
    impactLight();
    const opened = await openExternalUrl(url);
    if (!opened) Alert.alert("Unable to open link", "Please try again in a moment.");
  }, []);

  const speakAll = useCallback(() => {
    if (!entry) return;
    impactMedium();
    if (isSpeaking) {
      stopSpeech();
      setIsSpeaking(false);
      setSpeakingSection(null);
    } else {
      setIsSpeaking(true);
      setSpeakingSection("all");
      let fullText = `${entry.term}. ${entry.definition}`;
      if (entry.quickFacts && entry.quickFacts.length > 0) fullText += ` Quick facts: ${entry.quickFacts.join(". ")}`;
      if (entry.debunkingSnippet) fullText += ` Myth debunking: ${entry.debunkingSnippet}`;
      speakSafely(fullText, {
        language: "en",
        rate: 0.85,
        pitch: 1.0,
        onDone: () => {
          setIsSpeaking(false);
          setSpeakingSection(null);
        },
        onStopped: () => {
          setIsSpeaking(false);
          setSpeakingSection(null);
        },
      });
    }
  }, [entry, isSpeaking]);

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
      <View style={[styles.headerWrap, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerBar}>
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.9}>
              <Icon name="ArrowLeft2" size={20} color="#7C4A00" variant="Bold" />
            </TouchableOpacity>
            <View style={styles.headerCopy}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {entry.term}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.speakAllBtn, isSpeaking && speakingSection === "all" && styles.speakAllActive]}
              onPress={speakAll}
              activeOpacity={0.9}
            >
              <Icon name={isSpeaking && speakingSection === "all" ? "VolumeSlash" : "VolumeHigh"} size={18} color={isSpeaking && speakingSection === "all" ? "#FFFFFF" : "#7C4A00"} variant="Bold" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
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
            <TouchableOpacity
              style={[styles.ttsBtn, speakingSection === "definition" && styles.ttsActive]}
              onPress={() => speakText(entry.definition, "definition")}
            >
              <Icon name={speakingSection === "definition" ? "VolumeSlash" : "VolumeHigh"} size={16} color={speakingSection === "definition" ? "#FFFFFF" : "#7C4A00"} variant="Bold" />
            </TouchableOpacity>
          </View>
          <View style={styles.divider} />
          <Text style={styles.definition}>{entry.definition}</Text>
        </Animated.View>

        {/* Quick Facts */}
        {entry.quickFacts && entry.quickFacts.length > 0 && (
          <Animated.View entering={FadeInDown.delay(220).springify()} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Quick Facts</Text>
              <TouchableOpacity
                style={[styles.ttsBtn, speakingSection === "facts" && styles.ttsActive]}
                onPress={() => speakText(`Quick facts about ${entry.term}: ${entry.quickFacts.join(". ")}`, "facts")}
              >
                <Icon name={speakingSection === "facts" ? "VolumeSlash" : "VolumeHigh"} size={16} color={speakingSection === "facts" ? "#FFFFFF" : "#7C4A00"} variant="Bold" />
              </TouchableOpacity>
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
                <TouchableOpacity
                  style={[styles.mythTts, speakingSection === "myth" && styles.mythTtsActive]}
                  onPress={() => speakText(`Myth busting: ${entry.debunkingSnippet}`, "myth")}
                >
                  <Icon name={speakingSection === "myth" ? "VolumeSlash" : "VolumeHigh"} size={16} color="#FFFFFF" variant="Bold" />
                </TouchableOpacity>
              </View>
              <Text style={styles.mythText}>{entry.debunkingSnippet}</Text>
            </LinearGradient>
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
                      stopSpeech();
                      router.replace(`/explorer/encyclopedia-entry?id=${term}`);
                    }}
                    activeOpacity={0.88}
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

const createStyles = (isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1 },
    notFoundWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
    notFoundCard: {
      backgroundColor: CARD_WHITE,
      borderRadius: 22,
      padding: 24,
      alignItems: "center",
      borderWidth: 2,
      borderColor: "#F5F5F4",
      borderBottomWidth: 4,
      width: "100%",
      maxWidth: 320,
    },
    notFoundEmoji: { fontSize: 48, marginBottom: 12 },
    notFoundText: { fontSize: 16, fontFamily: fontFamilies.heavy, color: "#44403C", marginBottom: 16 },
    notFoundButton: { backgroundColor: AMBER_DEEP, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 14, borderWidth: 2, borderColor: "#E67E22", borderBottomWidth: 4 },
    notFoundButtonText: { color: CARD_WHITE, fontFamily: fontFamilies.heavy, fontSize: 13 },
    headerWrap: { paddingHorizontal: 16, paddingBottom: 10, zIndex: 10 },
    headerBar: {
      backgroundColor: AMBER,
      borderRadius: 26,
      padding: 12,
      gap: 10,
      borderWidth: 2,
      borderColor: "rgba(124,74,0,0.08)",
      borderBottomWidth: 4,
      elevation: 6,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 10,
    },
    headerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    backBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: CARD_WHITE,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: "#FDE68A",
      borderBottomWidth: 4,
    },
    headerCopy: { flex: 1, gap: 6 },
    headerTitle: { fontSize: 18, fontFamily: fontFamilies.heavy, color: "#7C4A00", letterSpacing: -0.3 },
    headerSubRow: { flexDirection: "row", gap: 8, alignItems: "center", flexWrap: "wrap" },
    catPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
    catEmoji: { fontSize: 11 },
    catText: { fontSize: 11, fontFamily: fontFamilies.heavy, textTransform: "uppercase" },
    diffPill: { backgroundColor: CARD_WHITE, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, borderWidth: 1, borderColor: "#FDE68A" },
    diffText: { fontSize: 11, fontFamily: fontFamilies.heavy, color: "#7C4A00", textTransform: "uppercase" },
    speakAllBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: CARD_WHITE,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: "#FDE68A",
      borderBottomWidth: 4,
    },
    speakAllActive: { backgroundColor: AMBER_DEEP, borderColor: "#E67E22" },
    scrollContent: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 24, gap: 12 },
    heroCard: {
      backgroundColor: CARD_WHITE,
      borderRadius: 20,
      padding: 14,
      borderWidth: 2,
      borderColor: "#F5F5F4",
      borderBottomWidth: 4,
      flexDirection: "row",
      gap: 12,
      alignItems: "center",
    },
    heroRow: { flexDirection: "row", gap: 12, alignItems: "center", flex: 1 },
    letterAvatar: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 2 },
    letterText: { fontSize: 20, fontFamily: fontFamilies.heavy },
    heroText: { flex: 1, gap: 4 },
    heroTerm: { fontSize: 18, fontFamily: fontFamilies.heavy, color: "#1C1917" },
    heroDef: { fontSize: 13, fontFamily: fontFamilies.medium, color: "#78716C", lineHeight: 18 },
    imageCard: {
      backgroundColor: CARD_WHITE,
      borderRadius: 20,
      borderWidth: 2,
      borderColor: "#F5F5F4",
      borderBottomWidth: 4,
      overflow: "hidden",
      padding: 8,
      alignItems: "center",
    },
    entryImage: { borderRadius: 14 },
    card: {
      backgroundColor: CARD_WHITE,
      borderRadius: 20,
      padding: 14,
      borderWidth: 2,
      borderColor: "#F5F5F4",
      borderBottomWidth: 4,
      gap: 10,
    },
    cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
    cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    cardIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
    cardIconEmoji: { fontSize: 16 },
    cardTitle: { fontSize: 15, fontFamily: fontFamilies.heavy, color: "#1C1917" },
    ttsBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: "#F5F5F4",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: "#E7E5E4",
    },
    ttsActive: { backgroundColor: AMBER_DEEP, borderColor: "#E67E22" },
    divider: { height: 1, backgroundColor: "#F5F5F4", borderRadius: 1 },
    definition: { fontSize: 14, fontFamily: fontFamilies.medium, color: "#1C1917", lineHeight: 22 },
    factRow: { flexDirection: "row", gap: 10, alignItems: "flex-start", paddingVertical: 6 },
    factNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: AMBER, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#FDE68A" },
    factNumText: { fontSize: 12, fontFamily: fontFamilies.heavy, color: "#7C4A00" },
    factText: { flex: 1, fontSize: 13, fontFamily: fontFamilies.medium, color: "#1C1917", lineHeight: 19 },
    mythCard: { borderRadius: 20, overflow: "hidden", borderWidth: 2, borderColor: "#FECACA", borderBottomWidth: 4 },
    mythGradient: { padding: 14, gap: 10 },
    mythHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    mythTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    mythIconWrap: { width: 32, height: 32, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.22)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.3)" },
    mythIcon: { fontSize: 16 },
    mythTitle: { fontSize: 15, fontFamily: fontFamilies.heavy, color: "#FFFFFF" },
    mythTts: { width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.3)" },
    mythTtsActive: { backgroundColor: "rgba(0,0,0,0.18)" },
    mythText: { fontSize: 13, fontFamily: fontFamilies.medium, color: "#FFFFFF", lineHeight: 20 },
    pillsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    pill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: "#F5F5F4",
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: "#E7E5E4",
    },
    pillText: { fontSize: 12, fontFamily: fontFamilies.heavy, color: "#57534E", textTransform: "capitalize" },
    sourceRow: { gap: 6, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F5F5F4" },
    sourceOrg: { alignSelf: "flex-start", backgroundColor: AMBER, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: "#FDE68A" },
    sourceOrgText: { fontSize: 11, fontFamily: fontFamilies.heavy, color: "#7C4A00" },
    sourceTitle: { fontSize: 13, fontFamily: fontFamilies.heavy, color: "#1C1917" },
    sourceUrlRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    sourceUrl: { flex: 1, fontSize: 12, fontFamily: fontFamilies.medium, color: "#7C4A00" },
  });
