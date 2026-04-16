import { Icon } from "@/components/ui/icon";
import { getEncyclopediaEntryById } from "@/content/explorer";
import { getEncyclopediaImage } from "@/content/explorer/encyclopedia/images";
import { useColorScheme } from "@/hooks/use-color-scheme";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Speech from "expo-speech";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    Dimensions,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";

const { width } = Dimensions.get("window");
const ENTRY_IMAGE_MAX_WIDTH = width - 40;
const ENTRY_IMAGE_MAX_HEIGHT = 320;

const LightTHEME = {
  bg: "#F8F9FE",
  card: "#FFFFFF",
  text: "#32325D",
  textMuted: "#8898AA",
  primary: "#5E72E4",
  primaryDark: "#4C63D2",
  success: "#2ECC71",
  warning: "#FFC800",
  info: "#1CB0F6",
  purple: "#9E87F5",
  purpleDark: "#7C3AED",
  danger: "#FF4B4B",
  dangerDark: "#DC2626",
  border: "#E9ECEF",
};

const DarkTHEME = {
  bg: "#172B4D",
  card: "#213356",
  text: "#F6F9FC",
  textMuted: "#8898AA",
  primary: "#5E72E4",
  primaryDark: "#4C63D2",
  success: "#2ECC71",
  warning: "#FFC800",
  info: "#1CB0F6",
  purple: "#9E87F5",
  purpleDark: "#7C3AED",
  danger: "#FF4B4B",
  dangerDark: "#DC2626",
  border: "#2D3A56",
};

// Category color mappings
const CATEGORY_COLORS: Record<
  string,
  {
    bg: string;
    border: string;
    icon: string;
    gradient: readonly [string, string];
  }
> = {
  radiation: {
    bg: "#FEF3C7",
    border: "#F59E0B",
    icon: "☢️",
    gradient: ["#F59E0B", "#D97706"] as const,
  },
  nuclear: {
    bg: "#DBEAFE",
    border: "#3B82F6",
    icon: "⚛️",
    gradient: ["#3B82F6", "#2563EB"] as const,
  },
  safety: {
    bg: "#D1FAE5",
    border: "#10B981",
    icon: "🛡️",
    gradient: ["#10B981", "#059669"] as const,
  },
  physics: {
    bg: "#EDE9FE",
    border: "#8B5CF6",
    icon: "🔬",
    gradient: ["#8B5CF6", "#7C3AED"] as const,
  },
  energy: {
    bg: "#FEE2E2",
    border: "#EF4444",
    icon: "⚡",
    gradient: ["#EF4444", "#DC2626"] as const,
  },
  medicine: {
    bg: "#FCE7F3",
    border: "#EC4899",
    icon: "💊",
    gradient: ["#EC4899", "#DB2777"] as const,
  },
  environment: {
    bg: "#ECFDF5",
    border: "#059669",
    icon: "🌿",
    gradient: ["#059669", "#047857"] as const,
  },
  history: {
    bg: "#FEF9C3",
    border: "#CA8A04",
    icon: "📜",
    gradient: ["#CA8A04", "#A16207"] as const,
  },
  technology: {
    bg: "#E0E7FF",
    border: "#6366F1",
    icon: "🔧",
    gradient: ["#6366F1", "#4F46E5"] as const,
  },
  default: {
    bg: "#F3F4F6",
    border: "#6B7280",
    icon: "📖",
    gradient: ["#6B7280", "#4B5563"] as const,
  },
};

export default function EncyclopediaEntryScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingSection, setSpeakingSection] = useState<string | null>(null);

  const THEME = colorScheme === "dark" ? DarkTHEME : LightTHEME;
  const styles = useMemo(() => createStyles(THEME), [THEME]);

  const entry = useMemo(() => {
    if (!id) return null;
    return getEncyclopediaEntryById(id);
  }, [id]);

  const entryImageSource = useMemo(() => {
    if (!entry) return undefined;
    return getEncyclopediaImage(entry.id);
  }, [entry]);

  const entryImageSize = useMemo(() => {
    if (!entryImageSource) {
      return { width: ENTRY_IMAGE_MAX_WIDTH, height: 220 };
    }

    const resolvedAsset = Image.resolveAssetSource(entryImageSource);
    const assetWidth = resolvedAsset?.width || ENTRY_IMAGE_MAX_WIDTH;
    const assetHeight = resolvedAsset?.height || 220;

    if (assetWidth <= 0 || assetHeight <= 0) {
      return { width: ENTRY_IMAGE_MAX_WIDTH, height: 220 };
    }

    const aspectRatio = assetWidth / assetHeight;
    let displayWidth = ENTRY_IMAGE_MAX_WIDTH;
    let displayHeight = displayWidth / aspectRatio;

    if (displayHeight > ENTRY_IMAGE_MAX_HEIGHT) {
      displayHeight = ENTRY_IMAGE_MAX_HEIGHT;
      displayWidth = displayHeight * aspectRatio;
    }

    return {
      width: Math.round(displayWidth),
      height: Math.round(displayHeight),
    };
  }, [entryImageSource]);

  const getCategoryStyle = (category: string) => {
    const key = category?.toLowerCase() || "default";
    return CATEGORY_COLORS[key] || CATEGORY_COLORS["default"];
  };

  // Cleanup speech on unmount
  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  const speakText = useCallback(
    (text: string, section: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      if (isSpeaking && speakingSection === section) {
        Speech.stop();
        setIsSpeaking(false);
        setSpeakingSection(null);
      } else {
        Speech.stop();
        setIsSpeaking(true);
        setSpeakingSection(section);
        Speech.speak(text, {
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
    [isSpeaking, speakingSection],
  );

  const speakAll = useCallback(() => {
    if (!entry) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
      setSpeakingSection(null);
    } else {
      setIsSpeaking(true);
      setSpeakingSection("all");

      let fullText = `${entry.term}. ${entry.definition}`;

      if (entry.quickFacts && entry.quickFacts.length > 0) {
        fullText += ` Quick facts: ${entry.quickFacts.join(". ")}`;
      }

      if (entry.debunkingSnippet) {
        fullText += ` Myth debunking: ${entry.debunkingSnippet}`;
      }

      Speech.speak(fullText, {
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
      <View style={styles.container}>
        <View style={styles.notFoundContainer}>
          <Text style={styles.notFoundEmoji}>🔍</Text>
          <Text style={styles.notFoundText}>Entry not found</Text>
          <TouchableOpacity
            style={styles.notFoundButton}
            onPress={() => router.back()}
          >
            <Text style={styles.notFoundButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const categoryStyle = getCategoryStyle(entry.category);

  return (
    <View style={[styles.container, { backgroundColor: THEME.bg }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Icon name="ArrowLeft2" size={24} color={THEME.text} variant="Bold" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{entry.term}</Text>
          <View
            style={[
              styles.categoryBadge,
              { backgroundColor: categoryStyle.bg },
            ]}
          >
            <Text style={styles.categoryIcon}>{categoryStyle.icon}</Text>
            <Text
              style={[styles.categoryText, { color: categoryStyle.border }]}
            >
              {entry.category}
            </Text>
          </View>
        </View>
        {/* Listen All Button */}
        <TouchableOpacity
          style={[
            styles.listenAllButton,
            isSpeaking &&
              speakingSection === "all" &&
              styles.listenAllButtonActive,
          ]}
          onPress={speakAll}
        >
          <Icon
            name={
              isSpeaking && speakingSection === "all"
                ? "VolumeSlash"
                : "VolumeHigh"
            }
            size={20}
            color={
              isSpeaking && speakingSection === "all"
                ? THEME.primary
                : THEME.textMuted
            }
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Term Header Card */}
        <Animated.View
          entering={FadeInDown.delay(100).springify()}
          style={styles.termCard}
        >
          <View style={styles.termHeader}>
            <View
              style={[
                styles.termLetter,
                { backgroundColor: categoryStyle.border },
              ]}
            >
              <Text style={styles.termLetterText}>
                {entry.term.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.termInfo}>
              <Text style={styles.term}>{entry.term}</Text>
              <View style={styles.termMeta}>
                <View
                  style={[
                    styles.metaBadge,
                    { backgroundColor: categoryStyle.bg },
                  ]}
                >
                  <Text style={styles.metaBadgeEmoji}>
                    {categoryStyle.icon}
                  </Text>
                  <Text
                    style={[
                      styles.metaBadgeText,
                      { color: categoryStyle.border },
                    ]}
                  >
                    {entry.category}
                  </Text>
                </View>
                <View style={styles.difficultyBadge}>
                  <Text style={styles.difficultyText}>{entry.difficulty}</Text>
                </View>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Entry Image */}
        {entry.image && entryImageSource && (
          <Animated.View
            entering={FadeInDown.delay(150).springify()}
            style={styles.imageCard}
          >
            <Image
              source={entryImageSource}
              style={[styles.entryImage, entryImageSize]}
              resizeMode="contain"
            />
          </Animated.View>
        )}

        {/* Definition */}
        <Animated.View
          entering={FadeInDown.delay(200).springify()}
          style={styles.sectionCard}
        >
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View
                style={[styles.sectionIcon, { backgroundColor: "#EFF6FF" }]}
              >
                <Text style={styles.sectionIconEmoji}>📝</Text>
              </View>
              <Text style={styles.sectionTitle}>Definition</Text>
            </View>
            <TouchableOpacity
              style={[
                styles.sectionTtsButton,
                speakingSection === "definition" &&
                  styles.sectionTtsButtonActive,
              ]}
              onPress={() => speakText(entry.definition, "definition")}
            >
              <Icon
                name={
                  speakingSection === "definition"
                    ? "VolumeSlash"
                    : "VolumeHigh"
                }
                size={16}
                color={speakingSection === "definition" ? "#FFF" : THEME.info}
              />
            </TouchableOpacity>
          </View>
          <Text style={styles.definition}>{entry.definition}</Text>
        </Animated.View>

        {/* Quick Facts */}
        {entry.quickFacts && entry.quickFacts.length > 0 && (
          <Animated.View
            entering={FadeInDown.delay(300).springify()}
            style={styles.sectionCard}
          >
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <View
                  style={[styles.sectionIcon, { backgroundColor: "#FFFBEB" }]}
                >
                  <Text style={styles.sectionIconEmoji}>⚡</Text>
                </View>
                <Text style={styles.sectionTitle}>Quick Facts</Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.sectionTtsButton,
                  speakingSection === "facts" && styles.sectionTtsButtonActive,
                ]}
                onPress={() =>
                  speakText(
                    `Quick facts about ${entry.term}: ${entry.quickFacts.join(". ")}`,
                    "facts",
                  )
                }
              >
                <Icon
                  name={
                    speakingSection === "facts" ? "VolumeSlash" : "VolumeHigh"
                  }
                  size={16}
                  color={speakingSection === "facts" ? "#FFF" : THEME.info}
                />
              </TouchableOpacity>
            </View>
            {entry.quickFacts.map((fact, index) => (
              <Animated.View
                key={index}
                entering={FadeInDown.delay(350 + index * 50)}
                style={styles.factItem}
              >
                <View style={styles.factNumber}>
                  <Text style={styles.factNumberText}>{index + 1}</Text>
                </View>
                <Text style={styles.factText}>{fact}</Text>
              </Animated.View>
            ))}
          </Animated.View>
        )}

        {/* Debunking Snippet */}
        {entry.debunkingSnippet && (
          <Animated.View
            entering={FadeInDown.delay(400).springify()}
            style={styles.debunkCard}
          >
            <LinearGradient
              colors={[THEME.danger, THEME.dangerDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.debunkGradient}
            >
              <View style={styles.debunkHeader}>
                <View style={styles.debunkTitleRow}>
                  <View style={styles.debunkIconContainer}>
                    <Text style={styles.debunkIconEmoji}>🔥</Text>
                  </View>
                  <Text style={styles.debunkTitle}>Myth Busted!</Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.debunkTtsButton,
                    speakingSection === "myth" && styles.debunkTtsButtonActive,
                  ]}
                  onPress={() =>
                    speakText(`Myth busting: ${entry.debunkingSnippet}`, "myth")
                  }
                >
                  <Icon
                    name={
                      speakingSection === "myth" ? "VolumeSlash" : "VolumeHigh"
                    }
                    size={16}
                    color="#FFF"
                  />
                </TouchableOpacity>
              </View>
              <Text style={styles.debunkText}>{entry.debunkingSnippet}</Text>
            </LinearGradient>
          </Animated.View>
        )}

        {/* Related Terms */}
        {entry.relatedTerms && entry.relatedTerms.length > 0 && (
          <Animated.View
            entering={FadeInDown.delay(500).springify()}
            style={styles.sectionCard}
          >
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <View
                  style={[styles.sectionIcon, { backgroundColor: "#F3E8FF" }]}
                >
                  <Text style={styles.sectionIconEmoji}>🔗</Text>
                </View>
                <Text style={styles.sectionTitle}>Related Terms</Text>
              </View>
            </View>
            <View style={styles.relatedTerms}>
              {entry.relatedTerms.map((term, index) => (
                <Animated.View
                  key={index}
                  entering={ZoomIn.delay(550 + index * 50)}
                >
                  <TouchableOpacity
                    style={styles.relatedTermPill}
                    onPress={() => {
                      const relatedEntry = getEncyclopediaEntryById(term);
                      if (relatedEntry) {
                        Speech.stop();
                        router.replace(
                          `/explorer/encyclopedia-entry?id=${term}`,
                        );
                      }
                    }}
                  >
                    <Text style={styles.relatedTermText}>
                      {term.replace(/-/g, " ")}
                    </Text>
                    <Icon name="ArrowRight2" size={14} color={THEME.purple} />
                  </TouchableOpacity>
                </Animated.View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* References */}
        {entry.sources && entry.sources.length > 0 && (
          <Animated.View
            entering={FadeInDown.delay(600).springify()}
            style={styles.sectionCard}
          >
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <View
                  style={[styles.sectionIcon, { backgroundColor: "#ECFDF5" }]}
                >
                  <Text style={styles.sectionIconEmoji}>📚</Text>
                </View>
                <Text style={styles.sectionTitle}>References</Text>
              </View>
            </View>
            {entry.sources.map((source, index) => (
              <Animated.View
                key={index}
                entering={FadeInDown.delay(650 + index * 50)}
                style={styles.sourceItem}
              >
                <View style={styles.sourceOrg}>
                  <Text style={styles.sourceOrgText}>
                    {source.organization}
                  </Text>
                </View>
                <Text style={styles.sourceTitle}>{source.title}</Text>
                <Text style={styles.sourceUrl} numberOfLines={1}>
                  {source.url}
                </Text>
              </Animated.View>
            ))}
          </Animated.View>
        )}

        {/* Bottom spacer */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: typeof LightTHEME) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    notFoundContainer: {
      alignItems: "center",
      justifyContent: "center",
      padding: 40,
    },
    notFoundEmoji: {
      fontSize: 64,
      marginBottom: 16,
    },
    notFoundText: {
      fontSize: 20,
      fontWeight: "800",
      color: theme.text,
      marginBottom: 20,
    },
    notFoundButton: {
      backgroundColor: theme.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 16,
      borderWidth: 2,
      borderColor: theme.primaryDark,
      borderBottomWidth: 4,
    },
    notFoundButtonText: {
      fontSize: 14,
      fontWeight: "800",
      color: "#FFF",
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingTop: 60,
      paddingBottom: 20,
      backgroundColor: theme.bg,
      gap: 12,
    },
    backButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.card,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
    },
    headerContent: {
      flex: 1,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: "800",
      color: theme.text,
      marginBottom: 4,
    },
    categoryBadge: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      gap: 4,
    },
    categoryIcon: {
      fontSize: 12,
    },
    categoryText: {
      fontSize: 11,
      fontWeight: "700",
      textTransform: "capitalize",
    },
    listenAllButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.card,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
    },
    listenAllButtonActive: {
      backgroundColor: theme.primary,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 20,
    },
    termCard: {
      backgroundColor: theme.card,
      borderRadius: 24,
      padding: 20,
      marginBottom: 16,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    imageCard: {
      backgroundColor: theme.card,
      borderRadius: 24,
      marginBottom: 16,
      overflow: "hidden",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
    entryImage: {
      alignSelf: "center",
    },
    termHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
    },
    termLetter: {
      width: 70,
      height: 70,
      borderRadius: 35,
      backgroundColor: theme.primary,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 6,
      elevation: 4,
    },
    termLetterText: {
      fontSize: 36,
      fontWeight: "800",
      color: "#FFF",
    },
    termInfo: {
      flex: 1,
    },
    term: {
      fontSize: 26,
      fontWeight: "800",
      color: theme.text,
      marginBottom: 10,
    },
    termMeta: {
      flexDirection: "row",
      gap: 8,
      flexWrap: "wrap",
    },
    metaBadge: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
      gap: 4,
    },
    metaBadgeEmoji: {
      fontSize: 12,
    },
    metaBadgeText: {
      fontSize: 11,
      fontWeight: "700",
      textTransform: "uppercase",
    },
    difficultyBadge: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
      backgroundColor: theme.bg,
    },
    difficultyText: {
      fontSize: 11,
      fontWeight: "700",
      color: theme.textMuted,
      textTransform: "uppercase",
    },
    sectionCard: {
      backgroundColor: theme.card,
      borderRadius: 24,
      padding: 20,
      marginBottom: 16,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
    },
    sectionTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    sectionIcon: {
      width: 36,
      height: 36,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    sectionIconEmoji: {
      fontSize: 18,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "800",
      color: theme.text,
    },
    sectionTtsButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.bg,
      alignItems: "center",
      justifyContent: "center",
    },
    sectionTtsButtonActive: {
      backgroundColor: theme.primary,
    },
    definition: {
      fontSize: 16,
      color: theme.text,
      lineHeight: 26,
      fontWeight: "500",
    },
    factItem: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
      marginBottom: 14,
      backgroundColor: theme.bg,
      padding: 12,
      borderRadius: 12,
    },
    factNumber: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: theme.success,
      alignItems: "center",
      justifyContent: "center",
    },
    factNumberText: {
      fontSize: 14,
      fontWeight: "800",
      color: "#FFF",
    },
    factText: {
      flex: 1,
      fontSize: 15,
      color: theme.text,
      lineHeight: 22,
    },
    debunkCard: {
      borderRadius: 24,
      overflow: "hidden",
      marginBottom: 16,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    debunkGradient: {
      padding: 20,
    },
    debunkHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 14,
    },
    debunkTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    debunkIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "rgba(255,255,255,0.2)",
      alignItems: "center",
      justifyContent: "center",
    },
    debunkIconEmoji: {
      fontSize: 20,
    },
    debunkTitle: {
      fontSize: 20,
      fontWeight: "800",
      color: "#FFF",
    },
    debunkTtsButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: "rgba(255,255,255,0.2)",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: "rgba(255,255,255,0.3)",
    },
    debunkTtsButtonActive: {
      backgroundColor: "rgba(0,0,0,0.2)",
    },
    debunkText: {
      fontSize: 15,
      color: "#FFF",
      lineHeight: 24,
    },
    relatedTerms: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    relatedTermPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 20,
      backgroundColor: "#F3E8FF",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
    },
    relatedTermText: {
      fontSize: 13,
      fontWeight: "700",
      color: theme.purpleDark,
      textTransform: "capitalize",
    },
    sourceItem: {
      marginBottom: 16,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    sourceOrg: {
      alignSelf: "flex-start",
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 10,
      backgroundColor: theme.success,
      marginBottom: 10,
    },
    sourceOrgText: {
      fontSize: 11,
      fontWeight: "800",
      color: "#FFF",
    },
    sourceTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: theme.text,
      marginBottom: 4,
    },
    sourceUrl: {
      fontSize: 12,
      color: theme.info,
    },
  });
