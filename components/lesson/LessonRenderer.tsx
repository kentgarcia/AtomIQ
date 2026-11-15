import { createStyles, fontFaces, useTheme, withAlpha } from "@/theme";
/**
 * Dynamic Lesson Renderer
 * Renders lesson steps based on content from the content system
 */

import { Icon } from "@/components/ui/icon";
import { LinearGradient } from "expo-linear-gradient";
import { ReadAloudButton } from "@/components/ui/read-aloud-button";
import { playAnswerSfx } from "@/services/game-sfx";
import { readAloud } from "@/services/media";
import { buildMythFeedbackSpeech, buildMythSpeech } from "@/services/media-core";
import React, { useEffect, useMemo, useState } from "react";
import {
    Dimensions,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
    FadeInDown,
    interpolate,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    ZoomIn
} from "react-native-reanimated";

const { width } = Dimensions.get("window");

// ============================================
// STEP RENDERERS
// ============================================

// 1. Briefing
export const BriefingRenderer = ({
  data,
  onComplete,
}: {
  data: any;
  onComplete: () => void;
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  useEffect(() => {
    const timer = setTimeout(onComplete, 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.fullScreenCenter}>
      <Animated.View
        entering={FadeInDown.springify()}
        style={styles.mascotLarge}
      >
        <Image
          source={require("@/assets/images/mascot/explain.png")}
          style={styles.mascotImage}
          resizeMode="contain"
        />
      </Animated.View>
      <Text style={styles.briefingTitle}>Topic: {data.topic}</Text>
      <Text style={styles.briefingSubtitle}>Mission: {data.mission}</Text>
      <View style={styles.loadingBar}>
        <Animated.View
          entering={FadeInDown.delay(500).springify()}
          style={styles.loadingFill}
        />
      </View>
    </View>
  );
};

// 2. Myth Buster - Creative Flashcard Design
export const MythBusterRenderer = ({
  data,
  onComplete,
}: {
  data: any;
  onComplete: () => void;
}) => {
  const { theme } = useTheme();
  const LP = theme.palettes.lesson;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const mythStyles = useMemo(() => makeMythStyles(theme), [theme]);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const cardRotate = useSharedValue(0);
  const cardScale = useSharedValue(1);
  const [showFeedback, setShowFeedback] = useState<
    null | "correct" | "incorrect"
  >(null);
  const [leftIndicator, setLeftIndicator] = useState(0);
  const [rightIndicator, setRightIndicator] = useState(0);

  // Read Aloud policy: the claim before the swipe, the reality after it.
  // Both controls share one owner id so answering hands over cleanly.
  const readAloudOwner = `lesson-myth:${data.myth}`;
  const handleSwiped = (isLeft: boolean) => {
    readAloud.stop("answered", readAloudOwner);
    void playAnswerSfx(isLeft);
    setShowFeedback(isLeft ? "correct" : "incorrect");
  };

  const pan = Gesture.Pan()
    .onUpdate((event) => {
      if (showFeedback) return;
      translateX.value = event.translationX;
      translateY.value = event.translationY * 0.3;
      cardRotate.value = interpolate(
        event.translationX,
        [-width, width],
        [-20, 20],
      );
      cardScale.value = interpolate(
        Math.abs(event.translationX),
        [0, 150],
        [1, 0.95],
      );

      runOnJS(setLeftIndicator)(Math.max(0, -event.translationX / 150));
      runOnJS(setRightIndicator)(Math.max(0, event.translationX / 150));
    })
    .onEnd((event) => {
      if (showFeedback) return;
      runOnJS(setLeftIndicator)(0);
      runOnJS(setRightIndicator)(0);

      if (Math.abs(event.translationX) > 120) {
        const isLeft = event.translationX < 0;
        translateX.value = withSpring(isLeft ? -width * 1.5 : width * 1.5, {
          damping: 15,
        });
        translateY.value = withSpring(isLeft ? -50 : -50);
        cardScale.value = withSpring(0.8);
        runOnJS(handleSwiped)(isLeft);
      } else {
        translateX.value = withSpring(0, { damping: 15 });
        translateY.value = withSpring(0);
        cardRotate.value = withSpring(0);
        cardScale.value = withSpring(1);
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${cardRotate.value}deg` },
      { scale: cardScale.value },
    ],
  }));

  return (
    <View style={styles.stepContainer}>
      {/* Header */}
      <View style={mythStyles.header}>
        <View style={mythStyles.headerBadge}>
          <Icon name="Danger" size={20} color="#FFF" variant="Bold" />
          <Text style={mythStyles.headerText}>MYTH BUSTER</Text>
        </View>
        <Text style={mythStyles.headerSubtext}>Is this a myth or fact?</Text>
      </View>

      {/* Swipe Indicators */}
      <View style={mythStyles.indicatorContainer}>
        <Animated.View
          style={[mythStyles.indicatorLeft, { opacity: leftIndicator }]}
        >
          <LinearGradient
            colors={[withAlpha(theme.colors.error, 0.3), "transparent"]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
          <Icon name="Forbidden2" size={40} color={theme.colors.error} />
          <Text style={mythStyles.indicatorTextLeft}>MYTH</Text>
        </Animated.View>

        <Animated.View
          style={[mythStyles.indicatorRight, { opacity: rightIndicator }]}
        >
          <LinearGradient
            colors={["transparent", withAlpha(theme.colors.success, 0.3)]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
          <Icon
            name="TickCircle"
            size={40}
            color={theme.colors.success}
            variant="Bold"
          />
          <Text style={mythStyles.indicatorTextRight}>FACT</Text>
        </Animated.View>
      </View>

      <View style={styles.cardContainer}>
        {showFeedback ? (
          <Animated.View
            entering={ZoomIn.springify().damping(15)}
            style={[
              mythStyles.feedbackCard,
              showFeedback === "correct"
                ? mythStyles.feedbackCorrect
                : mythStyles.feedbackIncorrect,
            ]}
          >
            {/* Result Icon with Glow */}
            <View style={mythStyles.resultIconContainer}>
              <View
                style={[
                  mythStyles.resultIconGlow,
                  {
                    backgroundColor:
                      showFeedback === "correct"
                        ? withAlpha(theme.colors.success, 0.3)
                        : withAlpha(theme.colors.error, 0.3),
                  },
                ]}
              />
              <Icon
                name={showFeedback === "correct" ? "TickCircle" : "Forbidden2"}
                size={80}
                color="#FFF"
                variant="Bold"
              />
            </View>

            <Text style={mythStyles.feedbackTitle}>
              {showFeedback === "correct" ? "🎉 Correct!" : "😅 Not Quite!"}
            </Text>

            <Text style={mythStyles.feedbackSubtitle}>
              {showFeedback === "correct"
                ? "That was indeed a myth!"
                : "That was actually a myth!"}
            </Text>

            {/* Explanation Card */}
            <View style={mythStyles.explanationCard}>
              <View style={mythStyles.explanationHeader}>
                <Icon
                  name="InfoCircle"
                  size={20}
                  color={
                    showFeedback === "correct" ? theme.colors.success : theme.colors.error
                  }
                />
                <Text style={mythStyles.explanationLabel}>THE TRUTH</Text>
                <ReadAloudButton
                  ownerId={`${readAloudOwner}:feedback`}
                  subject="explanation"
                  size={36}
                  accent={
                    showFeedback === "correct" ? theme.colors.success : theme.colors.error
                  }
                  text={() => buildMythFeedbackSpeech(data.reality, data.explanation)}
                />
              </View>
              <Text style={mythStyles.explanationText}>{data.explanation}</Text>

              <View style={mythStyles.realitySection}>
                <Text style={mythStyles.realityLabel}>💡 REALITY:</Text>
                <Text style={mythStyles.realityText}>{data.reality}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={mythStyles.continueBtn}
              onPress={onComplete}
            >
              <LinearGradient
                colors={[theme.colors.card, theme.colors.surfaceSoft]}
                style={mythStyles.continueBtnGradient}
              >
                <Text
                  style={[
                    mythStyles.continueBtnText,
                    {
                      color:
                        showFeedback === "correct"
                          ? theme.colors.success
                          : theme.colors.error,
                    },
                  ]}
                >
                  CONTINUE
                </Text>
                <Icon
                  name="ArrowRight2"
                  size={20}
                  color={
                    showFeedback === "correct" ? theme.colors.success : theme.colors.error
                  }
                />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        ) : (
          <GestureDetector gesture={pan}>
            <Animated.View style={[mythStyles.flashCard, cardStyle]}>
              {/* Card Decorations */}
              <View style={mythStyles.cardCornerTL}>
                <Icon name="Danger" size={16} color={withAlpha(theme.colors.error, 0.3)} />
              </View>
              <View style={mythStyles.cardCornerTR}>
                <Icon name="Danger" size={16} color={withAlpha(theme.colors.error, 0.3)} />
              </View>
              <View style={mythStyles.cardCornerBL}>
                <Icon name="Danger" size={16} color={withAlpha(theme.colors.error, 0.3)} />
              </View>
              <View style={mythStyles.cardCornerBR}>
                <Icon name="Danger" size={16} color={withAlpha(theme.colors.error, 0.3)} />
              </View>

              {/* Question Mark Badge */}
              <View style={mythStyles.questionBadge}>
                <Text style={mythStyles.questionMark}>?</Text>
              </View>

              {/* Myth Content */}
              <View style={mythStyles.mythContent}>
                <Text style={mythStyles.quoteOpen}>&quot;</Text>
                <Text style={mythStyles.mythText}>{data.myth}</Text>
                <Text style={mythStyles.quoteClose}>&quot;</Text>
              </View>

              {data.image && (
                <Image
                  source={{ uri: data.image }}
                  style={mythStyles.mythImage}
                />
              )}

              {/* Read Aloud Button */}
              <ReadAloudButton
                ownerId={readAloudOwner}
                subject="myth"
                variant="pill"
                accent={LP.primary}
                text={() => buildMythSpeech(data.myth)}
                style={{ marginBottom: 24 }}
              />

              {/* Swipe Instructions */}
              <View style={mythStyles.swipeHint}>
                <View style={mythStyles.swipeHintLeft}>
                  <Icon name="ArrowLeft2" size={18} color={theme.colors.error} />
                  <Text
                    style={[mythStyles.swipeHintText, { color: theme.colors.error }]}
                  >
                    MYTH
                  </Text>
                </View>
                <Text style={mythStyles.swipeDivider}>Swipe to answer</Text>
                <View style={mythStyles.swipeHintRight}>
                  <Text
                    style={[mythStyles.swipeHintText, { color: theme.colors.success }]}
                  >
                    FACT
                  </Text>
                  <Icon name="ArrowRight2" size={18} color={theme.colors.success} />
                </View>
              </View>
            </Animated.View>
          </GestureDetector>
        )}
      </View>
    </View>
  );
};

// Myth Buster specific styles
const makeMythStyles = createStyles((theme) => ({
  header: {
    alignItems: "center",
    marginBottom: 16,
  },
  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.error,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    gap: 8,
    shadowColor: theme.colors.error,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  headerText: {
    color: theme.colors.onPrimary,
    fontSize: 16,
    ...fontFaces.heavy,
    letterSpacing: 1,
  },
  headerSubtext: {
    color: theme.colors.textMuted,
    fontSize: 14,
    ...fontFaces.regular,
    marginTop: 12,
  },
  indicatorContainer: {
    position: "absolute",
    top: 150,
    left: 0,
    right: 0,
    bottom: 100,
    flexDirection: "row",
    justifyContent: "space-between",
    pointerEvents: "none",
    zIndex: 10,
  },
  indicatorLeft: {
    width: 100,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  indicatorRight: {
    width: 100,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  indicatorTextLeft: {
    color: theme.colors.error,
    ...fontFaces.heavy,
    fontSize: 14,
  },
  indicatorTextRight: {
    color: theme.colors.success,
    ...fontFaces.heavy,
    fontSize: 14,
  },
  flashCard: {
    width: width - 48,
    backgroundColor: theme.colors.card,
    borderRadius: 28,
    padding: 28,
    alignItems: "center",
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
    borderWidth: 3,
    borderColor: withAlpha(theme.colors.error, 0.15),
    position: "relative",
    overflow: "hidden",
  },
  cardCornerTL: {
    position: "absolute",
    top: 12,
    left: 12,
  },
  cardCornerTR: {
    position: "absolute",
    top: 12,
    right: 12,
  },
  cardCornerBL: {
    position: "absolute",
    bottom: 12,
    left: 12,
  },
  cardCornerBR: {
    position: "absolute",
    bottom: 12,
    right: 12,
  },
  questionBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.creamTint,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 3,
    borderColor: theme.palettes.lesson.primary,
  },
  questionMark: {
    fontSize: 32,
    ...fontFaces.black,
    color: theme.palettes.lesson.primary,
  },
  mythContent: {
    alignItems: "center",
    marginBottom: 20,
  },
  quoteOpen: {
    fontSize: 48,
    color: withAlpha(theme.colors.error, 0.2),
    ...fontFaces.black,
    lineHeight: 48,
    marginBottom: -10,
  },
  mythText: {
    fontSize: 22,
    ...fontFaces.bold,
    color: theme.colors.text,
    textAlign: "center",
    lineHeight: 32,
    paddingHorizontal: 8,
  },
  quoteClose: {
    fontSize: 48,
    color: withAlpha(theme.colors.error, 0.2),
    ...fontFaces.black,
    lineHeight: 48,
    marginTop: -10,
    alignSelf: "flex-end",
  },
  mythImage: {
    width: "100%",
    height: 140,
    borderRadius: 16,
    marginBottom: 20,
  },
  speakBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.creamTint,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 10,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: theme.palettes.lesson.primary,
  },
  speakBtnActive: {
    backgroundColor: theme.palettes.lesson.primary,
    borderColor: theme.palettes.lesson.primaryDark,
  },
  speakBtnText: {
    color: theme.palettes.lesson.primary,
    ...fontFaces.bold,
    fontSize: 14,
  },
  swipeHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  swipeHintLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  swipeHintRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  swipeHintText: {
    ...fontFaces.bold,
    fontSize: 12,
  },
  swipeDivider: {
    color: theme.colors.textMuted,
    fontSize: 11,
    ...fontFaces.regular,
  },
  feedbackCard: {
    width: width - 32,
    padding: 28,
    borderRadius: 28,
    alignItems: "center",
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  feedbackCorrect: {
    backgroundColor: theme.colors.success,
  },
  feedbackIncorrect: {
    backgroundColor: theme.colors.error,
  },
  resultIconContainer: {
    marginBottom: 16,
    position: "relative",
  },
  resultIconGlow: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    top: -20,
    left: -20,
  },
  feedbackTitle: {
    fontSize: 32,
    ...fontFaces.black,
    color: theme.colors.onPrimary,
    marginBottom: 8,
  },
  feedbackSubtitle: {
    fontSize: 16,
    ...fontFaces.regular,
    color: withAlpha(theme.colors.onPrimary, 0.9),
    marginBottom: 20,
  },
  explanationCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 20,
    padding: 20,
    width: "100%",
    marginBottom: 20,
  },
  explanationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  explanationLabel: {
    fontSize: 12,
    ...fontFaces.heavy,
    color: theme.colors.text,
    flex: 1,
  },
  speakBtnSmall: {
    padding: 6,
    backgroundColor: theme.colors.surfaceSoft,
    borderRadius: 12,
  },
  explanationText: {
    fontSize: 15,
    ...fontFaces.regular,
    color: theme.colors.text,
    lineHeight: 22,
    marginBottom: 16,
  },
  realitySection: {
    backgroundColor: theme.colors.warningSurface,
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.gold,
  },
  realityLabel: {
    fontSize: 12,
    ...fontFaces.heavy,
    color: theme.colors.text,
    marginBottom: 6,
  },
  realityText: {
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20,
    ...fontFaces.semibold,
  },
  continueBtn: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  continueBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  continueBtnText: {
    fontSize: 16,
    ...fontFaces.heavy,
  },
}));

// 3. Micro Learn
export const MicroLearnRenderer = ({
  data,
  onComplete,
}: {
  data: any;
  onComplete: () => void;
}) => {
  const { theme } = useTheme();
  const LP = theme.palettes.lesson;
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepHeader}>THE CONCEPT</Text>
      <Animated.View
        entering={FadeInDown.delay(200)}
        style={styles.conceptCard}
      >
        {data.image && (
          <Image source={{ uri: data.image }} style={styles.conceptImage} />
        )}
        <Text style={styles.conceptTitle}>{data.title}</Text>
        <Text style={styles.conceptText}>{data.content}</Text>

        {data.keyPoints && data.keyPoints.length > 0 && (
          <View style={styles.keyPointsContainer}>
            <Text style={styles.keyPointsTitle}>Key Points:</Text>
            {data.keyPoints.map((point: string, index: number) => (
              <View key={index} style={styles.keyPoint}>
                <Icon
                  name="TickCircle"
                  size={16}
                  color={LP.primary}
                  variant="Bold"
                />
                <Text style={styles.keyPointText}>{point}</Text>
              </View>
            ))}
          </View>
        )}
      </Animated.View>

      <TouchableOpacity style={styles.mainBtn} onPress={onComplete}>
        <Text style={styles.mainBtnText}>GOT IT!</Text>
      </TouchableOpacity>
    </View>
  );
};

// 4. Lab
export const LabRenderer = ({
  data,
  onComplete,
}: {
  data: any;
  onComplete: () => void;
}) => {
  const { theme } = useTheme();
  const LP = theme.palettes.lesson;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);

  const handleCheck = () => {
    setShowResult(true);
  };

  const isCorrect = selectedOption === data.correctAnswer;

  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepHeader}>{data.title}</Text>
      <Text style={styles.stepSubHeader}>{data.description}</Text>

      <View style={styles.labCard}>
        <Text style={styles.taskText}>{data.task}</Text>

        <View style={styles.optionsRow}>
          {data.options.map((option: any) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.optionBtn,
                selectedOption === option.id && styles.optionBtnActive,
              ]}
              onPress={() => !showResult && setSelectedOption(option.id)}
            >
              {option.icon && (
                <Icon
                  name={option.icon}
                  size={24}
                  color={
                    selectedOption === option.id
                      ? LP.primary
                      : theme.colors.textMuted
                  }
                />
              )}
              <Text style={styles.optionText}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {showResult && (
          <Animated.View
            entering={FadeInDown}
            style={[
              styles.resultBox,
              isCorrect ? styles.resultCorrect : styles.resultIncorrect,
            ]}
          >
            <Icon
              name={isCorrect ? "TickCircle" : "CloseCircle"}
              size={32}
              color={isCorrect ? theme.colors.success : theme.colors.error}
              variant="Bold"
            />
            <Text style={styles.resultText}>{data.explanation}</Text>
          </Animated.View>
        )}
      </View>

      <TouchableOpacity
        style={[styles.mainBtn, !selectedOption && styles.mainBtnDisabled]}
        onPress={showResult ? onComplete : handleCheck}
        disabled={!selectedOption}
      >
        <Text style={styles.mainBtnText}>
          {showResult ? "CONTINUE" : "CHECK ANSWER"}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

// 5. Assessment
export const AssessmentRenderer = ({
  data,
  onComplete,
}: {
  data: any;
  onComplete: () => void;
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [selected, setSelected] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const handleCheck = () => {
    if (selected !== null && !confirmed) {
      setConfirmed(true);
    } else if (confirmed && selected === data.correctIndex) {
      onComplete();
    }
  };

  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepHeader}>ASSESSMENT</Text>

      <View style={styles.quizCard}>
        <Text style={styles.questionText}>{data.question}</Text>

        {data.image && (
          <Image source={{ uri: data.image }} style={styles.quizImage} />
        )}

        <View style={styles.quizOptions}>
          {data.options.map((opt: string, index: number) => {
            let extraStyle = {};
            if (confirmed) {
              if (index === data.correctIndex)
                extraStyle = styles.quizOptionCorrect;
              else if (index === selected) extraStyle = styles.quizOptionWrong;
            } else if (selected === index) {
              extraStyle = styles.quizOptionSelected;
            }

            return (
              <TouchableOpacity
                key={opt}
                style={[styles.quizOption, extraStyle]}
                onPress={() => !confirmed && setSelected(index)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.quizOptionText,
                  ]}
                >
                  {opt}
                </Text>
                {confirmed && index === data.correctIndex && (
                  <Icon
                    name="TickCircle"
                    size={20}
                    color={theme.colors.success}
                    variant="Bold"
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {confirmed && (
          <Animated.View entering={FadeInDown} style={styles.explanationBox}>
            <Text style={styles.explanationText}>{data.explanation}</Text>
          </Animated.View>
        )}
      </View>

      <TouchableOpacity
        style={[styles.mainBtn, selected === null && styles.mainBtnDisabled]}
        onPress={handleCheck}
        disabled={selected === null}
      >
        <Text style={styles.mainBtnText}>
          {confirmed
            ? selected === data.correctIndex
              ? "CONTINUE"
              : "TRY AGAIN"
            : "CHECK ANSWER"}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

// 6. Debrief
export const DebriefRenderer = ({
  data,
  levelId,
  onComplete,
}: {
  data: any;
  levelId: string;
  onComplete: () => void;
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View style={styles.fullScreenCenter}>
      <Animated.View
        entering={FadeInDown.springify()}
        style={styles.mascotLarge}
      >
        <Image
          source={require("@/assets/images/mascot/happy.png")}
          style={styles.mascotImageSuccess}
          resizeMode="contain"
        />
      </Animated.View>

      <Text style={styles.successTitle}>{data.title}</Text>
      <Text style={styles.successText}>{data.message}</Text>

      <View style={styles.rewardRow}>
        <View style={styles.rewardPill}>
          <Icon name="Flash" size={24} color={theme.colors.gold} variant="Bold" />
          <Text style={styles.rewardText}>+{data.rewards.xp} XP</Text>
        </View>
        <View style={styles.rewardPill}>
          <Icon name="Star1" size={24} color={theme.colors.gold} variant="Bold" />
          <Text style={styles.rewardText}>{data.rewards.stars} Stars</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.mainBtn} onPress={onComplete}>
        <Text style={styles.mainBtnText}>CONTINUE</Text>
      </TouchableOpacity>
    </View>
  );
};

// Styles
const makeStyles = createStyles((theme) => {
  const LP = theme.palettes.lesson;
  return {
  fullScreenCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  stepContainer: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
  },
  stepHeader: {
    fontSize: 14,
    ...fontFaces.heavy,
    color: LP.primary,
    textAlign: "center",
    letterSpacing: 2,
    marginBottom: 8,
  },
  stepSubHeader: {
    fontSize: 13,
    ...fontFaces.regular,
    color: theme.colors.textMuted,
    textAlign: "center",
    marginBottom: 24,
  },
  mascotLarge: {
    marginBottom: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  mascotImage: {
    width: 200,
    height: 200,
  },
  mascotImageSuccess: {
    width: 220,
    height: 220,
  },
  briefingTitle: {
    fontSize: 28,
    ...fontFaces.heavy,
    color: theme.colors.text,
    textAlign: "center",
    marginBottom: 8,
  },
  briefingSubtitle: {
    fontSize: 18,
    ...fontFaces.regular,
    color: theme.colors.textMuted,
    textAlign: "center",
    marginBottom: 32,
  },
  loadingBar: {
    width: 200,
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    overflow: "hidden",
  },
  loadingFill: {
    width: "100%",
    height: "100%",
    backgroundColor: LP.primary,
  },
  cardContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  swipeCard: {
    width: width - 48,
    backgroundColor: theme.colors.card,
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderBottomWidth: 6,
  },
  mythBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.error,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 24,
    gap: 8,
  },
  mythBadgeText: {
    color: theme.colors.onPrimary,
    ...fontFaces.heavy,
    fontSize: 12,
  },
  mythText: {
    fontSize: 24,
    ...fontFaces.bold,
    color: theme.colors.text,
    textAlign: "center",
    marginBottom: 24,
  },
  mythImage: {
    width: "100%",
    height: 150,
    borderRadius: 12,
    marginBottom: 24,
  },
  swipeInstructions: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 16,
  },
  swipeLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  swipeRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  feedbackCard: {
    width: width - 48,
    padding: 32,
    borderRadius: 24,
    alignItems: "center",
  },
  feedbackCorrect: {
    backgroundColor: theme.colors.success,
  },
  feedbackIncorrect: {
    backgroundColor: theme.colors.error,
  },
  feedbackTitle: {
    fontSize: 32,
    ...fontFaces.heavy,
    color: theme.colors.onPrimary,
    marginTop: 16,
    marginBottom: 16,
  },
  feedbackText: {
    fontSize: 16,
    ...fontFaces.regular,
    color: withAlpha(theme.colors.onPrimary, 0.9),
    textAlign: "center",
    marginBottom: 16,
  },
  realityBox: {
    backgroundColor: withAlpha(theme.colors.onPrimary, 0.2),
    padding: 16,
    borderRadius: 12,
    width: "100%",
    marginBottom: 24,
  },
  realityLabel: {
    fontSize: 12,
    ...fontFaces.heavy,
    color: theme.colors.onPrimary,
    marginBottom: 8,
  },
  realityText: {
    fontSize: 14,
    color: theme.colors.onPrimary,
    ...fontFaces.semibold,
  },
  continueBtn: {
    backgroundColor: theme.colors.card,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    borderBottomWidth: 4,
    borderBottomColor: withAlpha(theme.colors.shadow, 0.1),
  },
  continueBtnText: {
    fontSize: 16,
    ...fontFaces.heavy,
    color: theme.colors.text,
  },
  conceptCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderBottomWidth: 4,
  },
  conceptImage: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
  },
  conceptTitle: {
    fontSize: 22,
    ...fontFaces.heavy,
    color: theme.colors.text,
    marginBottom: 12,
  },
  conceptText: {
    fontSize: 16,
    ...fontFaces.regular,
    color: theme.colors.text,
    lineHeight: 24,
    marginBottom: 16,
  },
  keyPointsContainer: {
    marginTop: 16,
  },
  keyPointsTitle: {
    fontSize: 14,
    ...fontFaces.heavy,
    color: LP.primary,
    marginBottom: 12,
  },
  keyPoint: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 8,
  },
  keyPointText: {
    flex: 1,
    fontSize: 14,
    ...fontFaces.regular,
    color: theme.colors.text,
    lineHeight: 20,
  },
  labCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderBottomWidth: 4,
  },
  taskText: {
    fontSize: 18,
    ...fontFaces.bold,
    color: theme.colors.text,
    textAlign: "center",
    marginBottom: 24,
  },
  optionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-around",
    gap: 12,
    marginBottom: 24,
  },
  optionBtn: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: theme.colors.card,
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderBottomWidth: 4,
    gap: 8,
  },
  optionBtnActive: {
    borderColor: LP.primary,
    backgroundColor: theme.colors.creamTint,
  },
  optionText: {
    fontSize: 14,
    ...fontFaces.bold,
    color: theme.colors.text,
    textAlign: "center",
  },
  resultBox: {
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  resultCorrect: {
    backgroundColor: theme.colors.successSurface,
  },
  resultIncorrect: {
    backgroundColor: theme.colors.errorSurface,
  },
  resultText: {
    flex: 1,
    fontSize: 14,
    ...fontFaces.regular,
    color: theme.colors.text,
  },
  quizCard: {
    marginBottom: 24,
  },
  questionText: {
    fontSize: 20,
    ...fontFaces.bold,
    color: theme.colors.text,
    marginBottom: 24,
    lineHeight: 28,
  },
  quizImage: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    marginBottom: 24,
  },
  quizOptions: {
    gap: 12,
  },
  quizOption: {
    backgroundColor: theme.colors.card,
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderBottomWidth: 4,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  quizOptionSelected: {
    borderColor: LP.primary,
    backgroundColor: theme.colors.creamTint,
  },
  quizOptionCorrect: {
    borderColor: theme.colors.success,
    backgroundColor: theme.colors.successSurface,
  },
  quizOptionWrong: {
    borderColor: theme.colors.error,
    backgroundColor: theme.colors.errorSurface,
  },
  quizOptionText: {
    fontSize: 16,
    ...fontFaces.regular,
    color: theme.colors.text,
  },
  explanationBox: {
    backgroundColor: theme.colors.infoSurface,
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: LP.primary,
  },
  explanationText: {
    fontSize: 14,
    ...fontFaces.regular,
    color: theme.colors.text,
    lineHeight: 20,
  },
  mainBtn: {
    backgroundColor: LP.primary,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    borderBottomWidth: 4,
    borderBottomColor: LP.primaryDark,
  },
  mainBtnDisabled: {
    opacity: 0.5,
  },
  mainBtnText: {
    fontSize: 16,
    ...fontFaces.heavy,
    color: theme.colors.onPrimary,
  },
  successTitle: {
    fontSize: 32,
    ...fontFaces.heavy,
    color: LP.primary,
    marginBottom: 12,
  },
  successText: {
    fontSize: 18,
    ...fontFaces.regular,
    color: theme.colors.textMuted,
    textAlign: "center",
    marginBottom: 32,
  },
  rewardRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 48,
  },
  rewardPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.card,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderBottomWidth: 4,
    gap: 8,
  },
  rewardText: {
    fontSize: 18,
    ...fontFaces.heavy,
    color: theme.colors.text,
  },
  };
});

export default {
  BriefingRenderer,
  MythBusterRenderer,
  MicroLearnRenderer,
  LabRenderer,
  AssessmentRenderer,
  DebriefRenderer,
};
