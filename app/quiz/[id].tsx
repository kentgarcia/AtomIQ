import { Icon } from "@/components/ui/icon";
import { getQuizById } from "@/content/quizzes";
import type { Quiz } from "@/content/types";
import {useTheme, type Palette, fontFamilies} from "@/theme";
import { useStorage } from "@/services/StorageContext";
import {
    getLevelProgress,
    logDailyActivity,
    unlockNextLevel,
    updateLevelProgress,
} from "@/services/database";
import { toLocalIsoDate } from "@/services/utils";
import { playGameSfx, preloadGameSfx } from "@/services/game-sfx";
import { useLocalSearchParams, useRouter } from "expo-router";
import { speakSafely, stopSpeech } from "@/services/speech";
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

export default function QuizScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { addXP } = useStorage();
  const { theme } = useTheme();
  const THEME = theme.palettes.quiz;

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [showExplanation, setShowExplanation] = useState(false);
  const [quizComplete, setQuizComplete] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    void preloadGameSfx();
  }, []);

  useEffect(() => {
    let active = true;
    const quizId = Array.isArray(id) ? id[0] : id;
    if (!quizId) {
      setIsLoading(false);
      return;
    }
    void getQuizById(quizId).then((loadedQuiz) => {
      if (!active) return;
      setQuiz(loadedQuiz);
      setIsLoading(false);
    });
    return () => {
      active = false;
    };
  }, [id]);

  const loadingStyles = React.useMemo(() => createStyles(THEME), [THEME]);

  if (isLoading) {
    return (
      <View style={loadingStyles.fullScreenCenter}>
        <ActivityIndicator size="large" color={THEME.success} />
      </View>
    );
  }

  if (!quiz) {
    return (
      <View style={loadingStyles.fullScreenCenter}>
        <Icon name="Danger" size={64} color={THEME.error} />
        <Text style={loadingStyles.errorText}>Quiz not found</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={loadingStyles.backButton}
        >
          <Text style={loadingStyles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const totalQuestions = quiz.questions.length;
  const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;

  const speakQuestion = () => {
    if (isSpeaking) {
      stopSpeech();
      setIsSpeaking(false);
    } else {
      setIsSpeaking(true);
      speakSafely(currentQuestion.question, {
        language: "en",
        rate: 0.9,
        onDone: () => setIsSpeaking(false),
        onStopped: () => setIsSpeaking(false),
      });
    }
  };

  const handleAnswerSelect = (index: number) => {
    if (showExplanation) return;
    setSelectedAnswer(index);
  };

  // Helper to get correct answer index (handles both boolean and number)
  const getCorrectAnswerIndex = (question: typeof currentQuestion) => {
    if (typeof question.correctAnswer === "boolean") {
      return question.correctAnswer ? 0 : 1; // True=0, False=1
    }
    return question.correctAnswer as number;
  };

  const handleSubmitAnswer = () => {
    if (selectedAnswer === null) return;
    stopSpeech();
    setIsSpeaking(false);

    const correctIndex = getCorrectAnswerIndex(currentQuestion);
    const isCorrect = selectedAnswer === correctIndex;
    void playGameSfx(isCorrect ? "correct" : "wrong");
    setAnswers([...answers, isCorrect]);
    setShowExplanation(true);

    // Auto-scroll to feedback after a short delay
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleNext = async () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    } else {
      // answers already contains every submitted answer (FINISH only appears
      // after CHECK appends the last one), so count it directly. Adding
      // selectedAnswer on top double-counts the final question when answered
      // correctly — inflating the score enough to flip a fail into a pass
      // and wrongly mark the exam completed.
      const correctCount = answers.filter((a) => a).length;
      const score = Math.round((correctCount / totalQuestions) * 100);
      const passed = score >= quiz.passingScore;

      if (passed) {
        try {
          // Only award rewards on the first pass — replays must not farm XP
          const existingProgress = (await getLevelProgress(id as string)) as {
            status?: string;
          } | null;
          const isAlreadyCompleted = existingProgress?.status === "completed";

          // Mark quiz as completed in database
          await updateLevelProgress(id as string, {
            status: "completed",
            xp_earned: quiz.xpReward,
            stars: 3,
            completed_at: new Date().toISOString(),
          });

          if (!isAlreadyCompleted) {
            // Unlock next unit/lesson
            await unlockNextLevel(id as string);

            // Award XP and log activity
            await addXP(quiz.xpReward);
            await logDailyActivity(toLocalIsoDate(), {
              xp_earned: quiz.xpReward,
            });
          }
        } catch (error) {
          console.error("Error saving quiz progress:", error);
        }
      }

      setQuizComplete(true);
    }
  };

  // Results Screen
  if (quizComplete) {
    const correctCount = answers.filter((a) => a).length;
    const score = Math.round((correctCount / totalQuestions) * 100);
    const passed = score >= quiz.passingScore;
    const styles = loadingStyles;

    return (
      <View style={{ flex: 1, backgroundColor: THEME.bg }}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.resultsContainer}>
            {/* Result Icon */}
            <Animated.View
              entering={ZoomIn.springify().damping(12)}
              style={[
                styles.resultsIconCircle,
                { backgroundColor: passed ? THEME.success : THEME.error },
              ]}
            >
              <Icon
                name={passed ? "TickCircle" : "CloseCircle"}
                size={56}
                color="#FFF"
                variant="Bold"
              />
            </Animated.View>

            <Animated.Text
              entering={FadeInDown.delay(200)}
              style={styles.resultsTitle}
            >
              {passed ? "Quiz Passed!" : "Keep Practicing!"}
            </Animated.Text>
            <Animated.Text
              entering={FadeInDown.delay(300)}
              style={styles.resultsSubtitle}
            >
              You scored {score}%
            </Animated.Text>

            {/* Stats Card */}
            <Animated.View
              entering={FadeInDown.delay(400)}
              style={styles.statsCard}
            >
              <View style={styles.statItem}>
                <View
                  style={[
                    styles.statIcon,
                    { backgroundColor: THEME.success + "20" },
                  ]}
                >
                  <Icon
                    name="TickCircle"
                    size={24}
                    color={THEME.success}
                    variant="Bold"
                  />
                </View>
                <Text style={styles.statValue}>{correctCount}</Text>
                <Text style={styles.statLabel}>Correct</Text>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.statItem}>
                <View
                  style={[
                    styles.statIcon,
                    { backgroundColor: THEME.error + "20" },
                  ]}
                >
                  <Icon
                    name="CloseCircle"
                    size={24}
                    color={THEME.error}
                    variant="Bold"
                  />
                </View>
                <Text style={styles.statValue}>
                  {totalQuestions - correctCount}
                </Text>
                <Text style={styles.statLabel}>Incorrect</Text>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.statItem}>
                <View
                  style={[
                    styles.statIcon,
                    { backgroundColor: THEME.gold + "20" },
                  ]}
                >
                  <Icon
                    name="Flash"
                    size={24}
                    color={THEME.gold}
                    variant="Bold"
                  />
                </View>
                <Text style={styles.statValue}>
                  {passed ? quiz.xpReward : 0}
                </Text>
                <Text style={styles.statLabel}>XP</Text>
              </View>
            </Animated.View>

            {/* Mascot */}
            <Animated.View entering={FadeInDown.delay(500)}>
              <Image
                source={
                  passed
                    ? require("@/assets/images/mascot/happy.png")
                    : require("@/assets/images/mascot/fix.png")
                }
                style={styles.resultsMascot}
                resizeMode="contain"
              />
            </Animated.View>

            {/* Continue Button */}
            <Animated.View
              entering={FadeInDown.delay(600)}
              style={{ width: "100%" }}
            >
              <TouchableOpacity
                style={[
                  styles.continueButton,
                  passed && {
                    backgroundColor: THEME.success,
                    borderColor: "#25A25A",
                  },
                ]}
                onPress={() => router.back()}
              >
                <Text style={styles.continueButtonText}>CONTINUE</Text>
                <Icon
                  name="ArrowRight2"
                  size={20}
                  color="#FFF"
                  variant="Bold"
                />
              </TouchableOpacity>
            </Animated.View>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const isCorrect = selectedAnswer === getCorrectAnswerIndex(currentQuestion);

  const styles = loadingStyles;

  return (
    <View style={{ flex: 1, backgroundColor: THEME.bg }}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.closeBtn}
          >
            <Icon name="Close" size={24} color={THEME.textMuted} />
          </TouchableOpacity>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
          </View>
          <View style={styles.questionBadge}>
            <Text style={styles.questionBadgeText}>
              {currentQuestionIndex + 1}/{totalQuestions}
            </Text>
          </View>
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1 }}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Question Card */}
          <Animated.View
            key={currentQuestionIndex}
            entering={FadeInDown.duration(300)}
            style={styles.questionCard}
          >
            <View style={styles.questionHeader}>
              <View style={styles.quizBadge}>
                <Icon name="Cup" size={18} color="#FFF" variant="Bold" />
                <Text style={styles.quizBadgeText}>QUIZ</Text>
              </View>
              <TouchableOpacity
                style={styles.speakerBtn}
                onPress={speakQuestion}
              >
                <Icon
                  name={isSpeaking ? "VolumeSlash" : "VolumeHigh"}
                  size={20}
                  color={isSpeaking ? "#FFF" : THEME.gold}
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.questionText}>{currentQuestion.question}</Text>
          </Animated.View>

          {/* Options — an empty/missing options array (bad content row)
              would render zero buttons and soft-lock the quiz, so true/false
              questions always fall back to True/False choices. */}
          <View style={styles.optionsContainer}>
            {(currentQuestion.options?.length
              ? currentQuestion.options
              : currentQuestion.type === "true_false"
                ? ["True", "False"]
                : []
            ).map(
              (option, index) => {
                const isSelected = selectedAnswer === index;
                // For true/false, correctAnswer is boolean, convert to index (0=True, 1=False)
                const correctAnswerIndex =
                  typeof currentQuestion.correctAnswer === "boolean"
                    ? currentQuestion.correctAnswer
                      ? 0
                      : 1
                    : currentQuestion.correctAnswer;
                const showCorrectMark =
                  showExplanation && index === correctAnswerIndex;
                const showWrongMark =
                  showExplanation &&
                  isSelected &&
                  selectedAnswer !== correctAnswerIndex;
                const optionLetter = String.fromCharCode(65 + index);

                return (
                  <Animated.View
                    key={index}
                    entering={FadeInDown.delay(100 + index * 80)}
                  >
                    <TouchableOpacity
                      style={[
                        styles.optionCard,
                        isSelected && !showExplanation && styles.optionSelected,
                        showCorrectMark && styles.optionCorrect,
                        showWrongMark && styles.optionWrong,
                      ]}
                      onPress={() => handleAnswerSelect(index)}
                      disabled={showExplanation}
                      activeOpacity={0.8}
                    >
                      <View
                        style={[
                          styles.optionLetter,
                          isSelected &&
                            !showExplanation &&
                            styles.optionLetterSelected,
                          showCorrectMark && styles.optionLetterCorrect,
                          showWrongMark && styles.optionLetterWrong,
                        ]}
                      >
                        <Text
                          style={[
                            styles.optionLetterText,
                            (isSelected ||
                              showCorrectMark ||
                              showWrongMark) && { color: "#FFF" },
                          ]}
                        >
                          {optionLetter}
                        </Text>
                      </View>

                      <Text
                        style={[
                          styles.optionText,
                          isSelected &&
                            !showExplanation && {
                              color: THEME.primary,
                              fontFamily: fontFamilies.bold,
                            },
                          showCorrectMark && {
                            color: THEME.success,
                            fontFamily: fontFamilies.bold,
                          },
                          showWrongMark && {
                            color: THEME.error,
                            fontFamily: fontFamilies.bold,
                          },
                        ]}
                      >
                        {option}
                      </Text>

                      {showCorrectMark && (
                        <Icon
                          name="TickCircle"
                          size={24}
                          color={THEME.success}
                          variant="Bold"
                        />
                      )}
                      {showWrongMark && (
                        <Icon
                          name="CloseCircle"
                          size={24}
                          color={THEME.error}
                          variant="Bold"
                        />
                      )}
                    </TouchableOpacity>
                  </Animated.View>
                );
              },
            )}
          </View>

          {/* Explanation */}
          {showExplanation && (
            <Animated.View
              entering={FadeInDown.duration(300)}
              style={[
                styles.feedbackCard,
                isCorrect ? styles.feedbackCorrect : styles.feedbackWrong,
              ]}
            >
              <View style={styles.feedbackHeader}>
                <Icon
                  name={isCorrect ? "TickCircle" : "CloseCircle"}
                  size={24}
                  color={isCorrect ? THEME.success : THEME.error}
                  variant="Bold"
                />
                <Text
                  style={[
                    styles.feedbackTitle,
                    { color: isCorrect ? THEME.success : THEME.error },
                  ]}
                >
                  {isCorrect ? "Correct!" : "Not quite!"}
                </Text>
              </View>
              <Text style={styles.feedbackText}>
                {currentQuestion.explanation}
              </Text>
            </Animated.View>
          )}
        </ScrollView>

        {/* Bottom Button */}
        <View style={styles.actionContainer}>
          {!showExplanation ? (
            <TouchableOpacity
              style={[
                styles.checkBtn,
                selectedAnswer === null && styles.checkBtnDisabled,
              ]}
              onPress={handleSubmitAnswer}
              disabled={selectedAnswer === null}
            >
              <Text style={styles.checkBtnText}>CHECK</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.continueBtn,
                isCorrect && {
                  backgroundColor: THEME.success,
                  borderColor: "#25A25A",
                },
              ]}
              onPress={handleNext}
            >
              <Text style={styles.continueBtnText}>
                {currentQuestionIndex < totalQuestions - 1
                  ? "CONTINUE"
                  : "FINISH"}
              </Text>
              <Icon name="ArrowRight2" size={20} color="#FFF" variant="Bold" />
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const createStyles = (theme: Palette) =>
  StyleSheet.create({
    fullScreenCenter: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme.bg,
      padding: 20,
    },
    errorText: {
      fontSize: 18,
      fontFamily: fontFamilies.bold,
      color: theme.text,
      marginTop: 16,
      marginBottom: 20,
    },
    backButton: {
      backgroundColor: theme.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 12,
    },
    backButtonText: {
      color: "#FFF",
      fontFamily: fontFamilies.bold,
      fontSize: 16,
    },

    // Header
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 12,
    },
    closeBtn: {
      padding: 4,
    },
    progressBarBg: {
      flex: 1,
      height: 12,
      backgroundColor: "#E5E7EB",
      borderRadius: 6,
      overflow: "hidden",
    },
    progressBarFill: {
      height: "100%",
      backgroundColor: theme.primary,
      borderRadius: 6,
    },
    questionBadge: {
      backgroundColor: theme.primary + "15",
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
    },
    questionBadgeText: {
      fontSize: 13,
      fontFamily: fontFamilies.heavy,
      color: theme.primary,
    },

    // Content
    content: {
      padding: 20,
      paddingBottom: 16,
    },
    questionCard: {
      backgroundColor: theme.card,
      borderRadius: 20,
      padding: 20,
      borderWidth: 2,
      borderColor: theme.border,
      borderBottomWidth: 5,
      marginBottom: 20,
    },
    questionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 16,
    },
    quizBadge: {
      backgroundColor: theme.gold,
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 16,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderBottomWidth: 2,
      borderColor: "#D97706",
    },
    quizBadgeText: {
      color: "#FFF",
      fontFamily: fontFamilies.heavy,
      fontSize: 11,
      letterSpacing: 1,
    },
    speakerBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "#FEF3C7",
      alignItems: "center",
      justifyContent: "center",
    },
    questionText: {
      fontSize: 20,
      fontFamily: fontFamilies.bold,
      color: theme.text,
      lineHeight: 28,
      textAlign: "center",
    },

    // Options
    optionsContainer: {
      gap: 12,
    },
    optionCard: {
      backgroundColor: theme.card,
      borderRadius: 16,
      padding: 16,
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 2,
      borderColor: theme.border,
      borderBottomWidth: 4,
      gap: 14,
    },
    optionSelected: {
      borderColor: theme.primary,
      backgroundColor: theme.primary + "08",
    },
    optionCorrect: {
      borderColor: theme.success,
      backgroundColor: theme.success + "10",
    },
    optionWrong: {
      borderColor: theme.error,
      backgroundColor: theme.error + "10",
    },
    optionLetter: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: "#F3F4F6",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: "#E5E7EB",
    },
    optionLetterSelected: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    optionLetterCorrect: {
      backgroundColor: theme.success,
      borderColor: theme.success,
    },
    optionLetterWrong: {
      backgroundColor: theme.error,
      borderColor: theme.error,
    },
    optionLetterText: {
      fontSize: 16,
      fontFamily: fontFamilies.heavy,
      color: theme.textMuted,
    },
    optionText: {
      flex: 1,
      fontSize: 16,
      color: theme.text,
      fontFamily: fontFamilies.medium,
    },

    // Feedback
    feedbackCard: {
      borderRadius: 16,
      padding: 16,
      marginTop: 16,
    },
    feedbackCorrect: {
      backgroundColor: theme.success + "15",
    },
    feedbackWrong: {
      backgroundColor: theme.error + "15",
    },
    feedbackHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 8,
    },
    feedbackTitle: {
      fontSize: 18,
      fontFamily: fontFamilies.heavy,
    },
    feedbackText: {
      fontSize: 15,
      fontFamily: fontFamilies.regular,
      color: theme.text,
      lineHeight: 22,
    },

    // Action buttons
    actionContainer: {
      padding: 20,
      paddingBottom: 24,
    },
    checkBtn: {
      height: 56,
      borderRadius: 16,
      backgroundColor: theme.gold,
      borderBottomWidth: 4,
      borderColor: "#D97706",
      alignItems: "center",
      justifyContent: "center",
    },
    checkBtnDisabled: {
      backgroundColor: "#E5E7EB",
      borderColor: "#D1D5DB",
    },
    checkBtnText: {
      color: "#FFF",
      fontFamily: fontFamilies.heavy,
      fontSize: 16,
      letterSpacing: 0.5,
    },
    continueBtn: {
      height: 56,
      borderRadius: 16,
      backgroundColor: theme.primary,
      borderBottomWidth: 4,
      borderColor: theme.primaryDark,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    continueBtnText: {
      color: "#FFF",
      fontFamily: fontFamilies.heavy,
      fontSize: 16,
      letterSpacing: 0.5,
    },

    // Results
    resultsContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
    },
    resultsIconCircle: {
      width: 100,
      height: 100,
      borderRadius: 50,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 20,
    },
    resultsTitle: {
      fontSize: 28,
      fontFamily: fontFamilies.heavy,
      color: theme.text,
      marginBottom: 8,
    },
    resultsSubtitle: {
      fontSize: 16,
      fontFamily: fontFamilies.regular,
      color: theme.textMuted,
      marginBottom: 24,
    },
    statsCard: {
      flexDirection: "row",
      backgroundColor: theme.card,
      borderRadius: 20,
      padding: 20,
      borderWidth: 2,
      borderColor: theme.border,
      borderBottomWidth: 5,
      width: "100%",
      marginBottom: 24,
    },
    statItem: {
      flex: 1,
      alignItems: "center",
    },
    statIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 8,
    },
    statValue: {
      fontSize: 24,
      fontFamily: fontFamilies.heavy,
      color: theme.text,
    },
    statLabel: {
      fontSize: 12,
      fontFamily: fontFamilies.semibold,
      color: theme.textMuted,
      marginTop: 2,
    },
    statDivider: {
      width: 1,
      backgroundColor: theme.border,
      marginVertical: 8,
    },
    resultsMascot: {
      width: 100,
      height: 100,
      marginBottom: 24,
    },
    continueButton: {
      height: 56,
      borderRadius: 16,
      backgroundColor: theme.primary,
      borderBottomWidth: 4,
      borderColor: theme.primaryDark,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    continueButtonText: {
      color: "#FFF",
      fontFamily: fontFamilies.heavy,
      fontSize: 16,
      letterSpacing: 0.5,
    },
  });
