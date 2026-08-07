import { MarkdownText } from "@/components/markdown-text";
import { Icon } from "@/components/ui/icon";
import { MythTheme as THEME } from "@/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import { Image, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { type ModeConfig } from "./modes";
import type { createStyles } from "./styles";

interface ResultsScreenProps {
  myths: any[];
  answers: boolean[];
  selectedMode: ModeConfig;
  score: number;
  reviewTab: "all" | "wrong";
  setReviewTab: (tab: "all" | "wrong") => void;
  expandedCard: number | null;
  setExpandedCard: (index: number | null) => void;
  resetGame: () => void;
  styles: ReturnType<typeof createStyles>;
  backgroundColor: string;
  textColor: string;
  cardColor: string;
}

export default function ResultsScreen({
  myths,
  answers,
  selectedMode,
  score,
  reviewTab,
  setReviewTab,
  expandedCard,
  setExpandedCard,
  resetGame,
  styles,
  backgroundColor,
  textColor,
  cardColor,
}: ResultsScreenProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();

    const answeredMyths = myths
      .slice(0, answers.length)
      .map((myth, index) => ({ ...myth, originalIndex: index }));
    const totalAnswered = answeredMyths.length;
    const correctAnswers = answers.filter((a) => a).length;
    const accuracy =
      totalAnswered > 0
        ? Math.round((correctAnswers / totalAnswered) * 100)
        : 0;
    const wrongAnswers = totalAnswered - correctAnswers;

    // Get performance message based on accuracy
    const getPerformanceMessage = () => {
      if (accuracy >= 90) return { text: "Outstanding!", emoji: "🏆" };
      if (accuracy >= 70) return { text: "Great Job!", emoji: "⭐" };
      if (accuracy >= 50) return { text: "Good Effort!", emoji: "👍" };
      return { text: "Keep Learning!", emoji: "📚" };
    };
    const performance = getPerformanceMessage();

    const filteredMyths =
      reviewTab === "wrong"
        ? answeredMyths.filter((myth) => !answers[myth.originalIndex])
        : answeredMyths;

    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <LinearGradient
          colors={
            colorScheme === "dark"
              ? ["#1A1A2E", "#1A1A2E"]
              : ["#FFF9E6", "#FFF5D6", "#FFFBF0"]
          }
          style={styles.fullScreen}
        >
          <SafeAreaView style={styles.fullScreen}>
            {/* Header */}
            <View style={[styles.resultsHeader, { paddingTop: insets.top }]}>
              <View style={styles.resultsHeaderContent}>
                <TouchableOpacity
                  onPress={resetGame}
                  style={[
                    styles.resultsBackBtn,
                    {
                      backgroundColor:
                        colorScheme === "dark"
                          ? "rgba(255,255,255,0.1)"
                          : "rgba(255,255,255,0.2)",
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <Icon name="ArrowLeft2" size={20} color={textColor} />
                </TouchableOpacity>
                <View style={styles.resultsHeaderCenter}>
                  <Text
                    style={[styles.resultsHeaderTitle, { color: textColor }]}
                  >
                    Game Results
                  </Text>
                  <Text
                    style={[
                      styles.resultsHeaderSubtitle,
                      { color: textColor, opacity: 0.6 },
                    ]}
                  >
                    {selectedMode.title} Mode
                  </Text>
                </View>
                <View style={{ width: 44 }} />
              </View>
            </View>

            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.resultsContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Score Card with Mascot */}
              <View style={styles.resultsScoreCard}>
                <LinearGradient
                  colors={[selectedMode.color, selectedMode.color + "DD"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.resultsScoreGradient}
                >
                  <Image
                    source={
                      accuracy >= 50
                        ? require("@/assets/images/mascot/happy.png")
                        : require("@/assets/images/mascot/fix.png")
                    }
                    style={styles.resultsScoreMascot}
                    resizeMode="contain"
                  />
                  <Text style={styles.resultsScoreEmoji}>
                    {performance.emoji}
                  </Text>
                  <Text style={styles.resultsScoreTitle}>
                    {performance.text}
                  </Text>
                  <View style={styles.resultsXPBadge}>
                    <Icon name="Flash" size={20} color="#FFF" variant="Bold" />
                    <Text style={styles.resultsXPText}>{score} XP</Text>
                  </View>
                </LinearGradient>
              </View>

              {/* Stats Row */}
              <View style={styles.resultsStatsRow}>
                <View
                  style={[
                    styles.resultsStatCard,
                    { backgroundColor: cardColor },
                  ]}
                >
                  <View
                    style={[
                      styles.resultsStatIcon,
                      { backgroundColor: THEME.success + "20" },
                    ]}
                  >
                    <Icon
                      name="TickCircle"
                      size={20}
                      color={THEME.success}
                      variant="Bold"
                    />
                  </View>
                  <Text style={[styles.resultsStatValue, { color: textColor }]}>
                    {correctAnswers}
                  </Text>
                  <Text style={styles.resultsStatLabel}>Correct</Text>
                </View>
                <View
                  style={[
                    styles.resultsStatCard,
                    { backgroundColor: cardColor },
                  ]}
                >
                  <View
                    style={[
                      styles.resultsStatIcon,
                      { backgroundColor: THEME.error + "20" },
                    ]}
                  >
                    <Icon
                      name="CloseCircle"
                      size={20}
                      color={THEME.error}
                      variant="Bold"
                    />
                  </View>
                  <Text style={[styles.resultsStatValue, { color: textColor }]}>
                    {wrongAnswers}
                  </Text>
                  <Text style={styles.resultsStatLabel}>Wrong</Text>
                </View>
                <View
                  style={[
                    styles.resultsStatCard,
                    { backgroundColor: cardColor },
                  ]}
                >
                  <View
                    style={[
                      styles.resultsStatIcon,
                      { backgroundColor: selectedMode.color + "20" },
                    ]}
                  >
                    <Icon
                      name="Chart"
                      size={20}
                      color={selectedMode.color}
                      variant="Bold"
                    />
                  </View>
                  <Text style={[styles.resultsStatValue, { color: textColor }]}>
                    {accuracy}%
                  </Text>
                  <Text style={styles.resultsStatLabel}>Accuracy</Text>
                </View>
              </View>

              {/* Review Section */}
              <View style={styles.resultsReviewSection}>
                <View style={styles.resultsReviewHeader}>
                  <Text
                    style={[styles.resultsReviewTitle, { color: textColor }]}
                  >
                    Review Answers
                  </Text>
                  <Text style={styles.resultsReviewSubtitle}>
                    Tap cards to see explanations
                  </Text>
                </View>

                {/* Tab Buttons */}
                <View
                  style={[styles.resultsTabRow, { backgroundColor: cardColor }]}
                >
                  <TouchableOpacity
                    style={[
                      styles.resultsTab,
                      reviewTab === "all" && [
                        styles.resultsTabActive,
                        { backgroundColor: selectedMode.color },
                      ],
                    ]}
                    onPress={() => setReviewTab("all")}
                  >
                    <Text
                      style={[
                        styles.resultsTabText,
                        reviewTab === "all" && styles.resultsTabTextActive,
                      ]}
                    >
                      All ({totalAnswered})
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.resultsTab,
                      reviewTab === "wrong" && [
                        styles.resultsTabActive,
                        { backgroundColor: THEME.error },
                      ],
                    ]}
                    onPress={() => setReviewTab("wrong")}
                  >
                    <Text
                      style={[
                        styles.resultsTabText,
                        reviewTab === "wrong" && styles.resultsTabTextActive,
                      ]}
                    >
                      Missed ({wrongAnswers})
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Review Cards */}
                {filteredMyths.length === 0 ? (
                  <View
                    style={[
                      styles.resultsEmptyState,
                      { backgroundColor: cardColor },
                    ]}
                  >
                    <View style={styles.resultsEmptyIcon}>
                      <Icon
                        name="TickCircle"
                        size={40}
                        color={THEME.success}
                        variant="Bold"
                      />
                    </View>
                    <Text
                      style={[
                        styles.resultsEmptyTitle,
                        { color: THEME.success },
                      ]}
                    >
                      Perfect Score!
                    </Text>
                    <Text style={styles.resultsEmptyText}>
                      You got all answers correct!
                    </Text>
                  </View>
                ) : (
                  <View style={styles.resultsCardList}>
                    {filteredMyths.map((myth) => {
                      const isCorrect = answers[myth.originalIndex];
                      const isExpanded = expandedCard === myth.originalIndex;

                      return (
                        <TouchableOpacity
                          key={myth.originalIndex}
                          style={[
                            styles.resultsReviewCard,
                            { backgroundColor: cardColor },
                          ]}
                          onPress={() =>
                            setExpandedCard(
                              isExpanded ? null : myth.originalIndex,
                            )
                          }
                          activeOpacity={0.7}
                        >
                          {/* Colored side indicator */}
                          <View
                            style={[
                              styles.resultsCardIndicator,
                              {
                                backgroundColor: isCorrect
                                  ? THEME.success
                                  : THEME.error,
                              },
                            ]}
                          />

                          <View style={styles.resultsCardInner}>
                            {/* Card Header */}
                            <View style={styles.resultsCardHeader}>
                              <View
                                style={[
                                  styles.resultsCardNumber,
                                  {
                                    backgroundColor: isCorrect
                                      ? THEME.success
                                      : THEME.error,
                                  },
                                ]}
                              >
                                <Text style={styles.resultsCardNumberText}>
                                  {myth.originalIndex + 1}
                                </Text>
                              </View>
                              <View
                                style={[
                                  styles.resultsCardBadge,
                                  {
                                    backgroundColor: myth.isTrue
                                      ? THEME.success + "15"
                                      : THEME.error + "15",
                                  },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.resultsCardBadgeText,
                                    {
                                      color: myth.isTrue
                                        ? THEME.success
                                        : THEME.error,
                                    },
                                  ]}
                                >
                                  {myth.isTrue ? "TRUTH" : "MYTH"}
                                </Text>
                              </View>
                              <View style={{ flex: 1 }} />
                              <Icon
                                name={isCorrect ? "TickCircle" : "CloseCircle"}
                                size={22}
                                color={isCorrect ? THEME.success : THEME.error}
                                variant="Bold"
                              />
                            </View>

                            {/* Statement */}
                            <Text
                              style={[
                                styles.resultsCardStatement,
                                { color: textColor },
                              ]}
                              numberOfLines={isExpanded ? undefined : 2}
                            >
                              {myth.statement}
                            </Text>

                            {/* Expanded Content */}
                            {isExpanded && (
                              <View style={styles.resultsCardExpanded}>
                                <View style={styles.resultsCardDivider} />
                                <View
                                  style={[
                                    styles.resultsCardExplanation,
                                    { backgroundColor: backgroundColor },
                                  ]}
                                >
                                  <Icon
                                    name="Lamp"
                                    size={16}
                                    color={selectedMode.color}
                                    variant="Bold"
                                  />
                                  <MarkdownText
                                    text={myth.explanation}
                                    style={styles.resultsCardExplanationText}
                                    textColor={textColor}
                                  />
                                </View>
                              </View>
                            )}

                            {/* Expand hint */}
                            <View style={styles.resultsCardFooter}>
                              <Icon
                                name={isExpanded ? "ArrowUp2" : "ArrowDown2"}
                                size={16}
                                color={THEME.textMuted}
                              />
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>

              {/* Action Buttons */}
              <View style={styles.resultsActions}>
                <TouchableOpacity
                  style={[
                    styles.resultsPlayAgainBtn,
                    { backgroundColor: selectedMode.color },
                  ]}
                  onPress={resetGame}
                  activeOpacity={0.8}
                >
                  <Icon name="Refresh" size={20} color="#FFF" variant="Bold" />
                  <Text style={styles.resultsPlayAgainText}>Play Again</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.resultsHomeBtn,
                    {
                      backgroundColor: cardColor,
                      borderColor:
                        colorScheme === "dark" ? "#2D3748" : THEME.border,
                    },
                  ]}
                  onPress={() => router.back()}
                  activeOpacity={0.8}
                >
                  <Icon name="Home2" size={20} color={textColor} />
                  <Text style={[styles.resultsHomeText, { color: textColor }]}>
                    Back to Home
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={{ height: 40 }} />
            </ScrollView>
          </SafeAreaView>
        </LinearGradient>
      </GestureHandlerRootView>
    );
}
